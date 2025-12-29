import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { ModalController } from '@ionic/angular';
import { CalendarService } from '../../../services/calendar.service';
import { MoodService } from '../../../services/mood.service';
import { MoodTransition, MoodData } from '../../../models/mood.model';
import { Subject, takeUntil } from 'rxjs';
import { NavigationContextService } from '../../../services/navigation-context.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { HabitButtonLogicService } from '../habit-button-logic.service';

@Component({
  standalone: true,
  selector: 'calendar-main',
  templateUrl: './calendar-main.component.html',
  styleUrls: ['./calendar-main.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulInputsModule, MindfulButtonComponent, HabitCardComponent]
})
export class CalendarMainComponent implements OnInit, OnDestroy {
  dateActivities: { [key: string]: { timetable?: boolean, task?: boolean, habit?: boolean } } = {};
  selectedDate: Date = new Date(); // Current date selected by default
  habitsForSelectedDate: any[] = [];
  tasksForSelectedDate: any[] = [];
  eventsForSelectedDate: any[] = []; // Timetable events
  moodOn: boolean = false;
  showMoodPopup: boolean = false;
  moodData: MoodData = {}; // Mood transitions keyed by date
  selectedMoodTransition: MoodTransition | null = null; // Mood data for selected date
  private destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private calendarService: CalendarService,
    private moodService: MoodService,
    private navigationContext: NavigationContextService,
    private router: Router,
    private buttonLogic: HabitButtonLogicService
    ,
    private userService: UserService,
    private authService: AuthService
  ) {
    console.log('CalendarMainComponent initialized');
  }

  ngOnInit() {
    console.log('CalendarMainComponent ngOnInit');
    // Detect whether current viewer is a parent so we can pass the flag to habit-card instances
    try {
      const authParent = this.authService && this.authService.isParentUser && this.authService.isParentUser();
      if (authParent) {
        this.isParent = true;
      }
    } catch (e) {
      // ignore
    }

    this.userService.userProfile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      const profileIsParent = !!(profile && (profile.relationship || '').toString().toUpperCase() === 'PARENT');
      if (profileIsParent) this.isParent = true;
    });
    this.loadCalendarData();
    this.loadMoodData();
    // Populate habits/tasks for the initial selected date
    this.updateHabitsAndTasksForSelectedDate();
  }

  // Flag used to indicate viewer is a parent (passed down to habit-card)
  public isParent: boolean = false;

  // Handler called from template when mindful-calendar emits a dateSelected event
  onDateSelected(date: Date | { start: Date | null, end: Date | null }) {
    if (date && date instanceof Date) {
      this.selectedDate = date;
    } else if ((date as any)?.start) {
      this.selectedDate = (date as any).start || this.selectedDate;
    }

    // Load habits/tasks for the selected date
    this.updateHabitsAndTasksForSelectedDate();

    // Load mood data for selected date
    this.loadMoodForSelectedDate();

    // If mood toggle is on, show the mood popup; otherwise ensure it's hidden
    if (this.moodOn) {
      this.showMoodPopup = true;
    } else {
      this.showMoodPopup = false;
    }
  }

  // Handler for mood toggle events coming from mindful-calendar
  onMoodToggled(state: boolean) {
    this.moodOn = state;
    // If mood is turned off, hide the popup
    if (!this.moodOn) {
      this.showMoodPopup = false;
    } else {
      // If mood is turned on and we have a selected date, load its mood data
      this.loadMoodForSelectedDate();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load mood transition data for the current month
   */
  loadMoodData() {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth() + 1; // JavaScript months are 0-indexed

    const userId = this.userService.getUserProfile()?.userId;
    this.moodService.getMoodTransitionsMonthly(year, month, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transitions) => {
          console.log('Mood transitions loaded:', transitions);
          this.moodData = this.moodService.transformToMoodData(transitions);
          // Load mood for currently selected date if mood toggle is on
          if (this.moodOn) {
            this.loadMoodForSelectedDate();
          }
        },
        error: (error) => {
          console.error('Error loading mood data:', error);
          this.moodData = {};
        }
      });
  }

  /**
   * Load mood transition for the currently selected date
   */
  loadMoodForSelectedDate() {
    const dateStr = this.formatDateToYYYYMMDD(this.selectedDate);
    this.selectedMoodTransition = this.moodData[dateStr] || null;

    console.log('Selected mood transition for', dateStr, ':', this.selectedMoodTransition);

    // Show popup only if mood toggle is on and we have mood data for this date
    if (this.moodOn && this.selectedMoodTransition) {
      this.showMoodPopup = true;
    } else if (this.moodOn && !this.selectedMoodTransition) {
      // Mood is on but no data for this date
      this.showMoodPopup = false;
    }
  }

  /**
   * Get mood emoji path for a specific mood name
   */
  getMoodEmoji(moodName: string): string {
    return this.moodService.getMoodEmojiPath(moodName);
  }

  /**
   * Validate a mood content line: must be non-empty and not equal to 'NA' (case-insensitive)
   */
  isValidLine(text?: string | null): boolean {
    if (text == null) return false;
    const t = String(text).trim();
    if (!t) return false;
    // Normalize by removing common separators and punctuation
    const normalized = t.replace(/[\s._\-/\\]+/g, '').toLowerCase();
    const placeholders = new Set(['na', 'n/a', 'null', 'none', 'nil', '-', '--', 'na-', '-na']);
    if (placeholders.has(normalized)) return false;
    // If after stripping non-alphanumerics nothing remains, treat as invalid
    const alnum = normalized.replace(/[^a-z0-9]/g, '');
    return alnum.length > 0;
  }

  /**
   * Return a safe display string for a mood line; returns '' if invalid
   */
  displayLine(text?: string | null): string {
    return this.isValidLine(text) ? String(text).trim() : '';
  }

  loadCalendarData() {
    // Load data for the current month
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Create date for first day of current month
    const firstDayOfMonth = new Date(year, month, 1);
    const dateStr = this.formatDateToYYYYMMDD(firstDayOfMonth);

    // Load data and process date ranges
    this.loadDayData(dateStr);
  }

  loadDayData(dateStr: string) {
    const userId = this.userService.getUserProfile()?.userId;
    this.calendarService.getUserCalendarMonth(dateStr, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`Calendar data for ${dateStr}:`, response);

          // Clear existing activities for this month
          this.dateActivities = {};

          // Process events (timetable)
          if (response.events && response.events.length > 0) {
            response.events.forEach((event: any) => {
              const dates = this.getDateRangeFromItem(event);
              dates.forEach(date => {
                if (!this.dateActivities[date]) {
                  this.dateActivities[date] = {};
                }
                this.dateActivities[date].timetable = true;
              });
            });
          }

          // Process tasks
          if (response.tasks && response.tasks.length > 0) {
            response.tasks.forEach((task: any) => {
              const dates = this.getDateRangeFromItem(task);
              dates.forEach(date => {
                if (!this.dateActivities[date]) {
                  this.dateActivities[date] = {};
                }
                this.dateActivities[date].task = true;
              });
            });
          }

          // Process habits
          if (response.habits && response.habits.length > 0) {
            response.habits.forEach((habit: any) => {
              const dates = this.getDateRangeFromItem(habit);
              dates.forEach(date => {
                if (!this.dateActivities[date]) {
                  this.dateActivities[date] = {};
                }
                this.dateActivities[date].habit = true;
              });
            });
          }

          console.log('All dateActivities:', this.dateActivities);
        },
        error: (error) => {
          console.error(`Error loading calendar data for ${dateStr}:`, error);
        }
      });
  }

  /**
   * Extract all dates from an item's date range, considering daysOfWeek if present
   */
  private getDateRangeFromItem(item: any): string[] {
    const dates: string[] = [];

    // Get start and end dates
    const startDateStr = item.startDate || item.start_date || item.date;
    const endDateStr = item.endDate || item.end_date || item.date;

    if (!startDateStr) return dates;

    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : startDate;

    // If item has daysOfWeek, only include those specific days
    const daysOfWeek = item.daysOfWeek;
    const dayMap: { [key: string]: number } = {
      'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
      'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };

    // Iterate through all dates in range
    const current = new Date(startDate);
    while (current <= endDate) {
      // If daysOfWeek is specified, check if current day is included
      if (daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
        const currentDayOfWeek = current.getDay();
        const isIncluded = daysOfWeek.some((day: string) => dayMap[day] === currentDayOfWeek);

        if (isIncluded) {
          dates.push(this.formatDateToYYYYMMDD(current));
        }
      } else {
        // No daysOfWeek restriction, include all dates
        dates.push(this.formatDateToYYYYMMDD(current));
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  formatDateToYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // Fetch habits and tasks for the currently selected date and populate arrays used by template
  updateHabitsAndTasksForSelectedDate() {
    const dateStr = this.formatDateToYYYYMMDD(this.selectedDate);
    const userId2 = this.userService.getUserProfile()?.userId;
    this.calendarService.getUserCalendar(dateStr, 'day', userId2)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Use the raw habit/task/event objects but filter them by selected date
          const rawHabits = response.habits || [];
          const rawTasks = response.tasks || [];
          const rawEvents = response.events || [];

          // Filter habits to only those scheduled for the selected date
          this.habitsForSelectedDate = rawHabits
            .filter((h: any) => this.isItemScheduledForDate(h, dateStr))
            .map((h: any) => {
              const timestamps = this.buttonLogic.calculateTimestamps({
                ...h,
                startDate: h.startDate || dateStr,
                endDate: h.endDate || dateStr
              });
              return {
                ...h,
                title: h.title || h.name || h.habitName || 'Habit',
                status: this.buttonLogic.normalizeStatus(h.status),
                startTimeStamp: timestamps.startTimeStamp,
                endTimeStamp: timestamps.endTimeStamp
              };
            });

          // Filter tasks to only those scheduled for the selected date
          this.tasksForSelectedDate = rawTasks
            .filter((t: any) => this.isItemScheduledForDate(t, dateStr))
            .map((t: any) => {
              const timestamps = this.buttonLogic.calculateTimestamps({
                ...t,
                startDate: t.startDate || dateStr,
                endDate: t.endDate || dateStr
              });
              return {
                ...t,
                type: t?.type || 'tasks',
                title: t.title || t.name || t.taskName || 'Task',
                status: this.buttonLogic.normalizeStatus(t.status),
                startTimeStamp: timestamps.startTimeStamp,
                endTimeStamp: timestamps.endTimeStamp
              };
            });

          // Filter events (timetable) to only those scheduled for the selected date
          this.eventsForSelectedDate = rawEvents
            .filter((e: any) => this.isItemScheduledForDate(e, dateStr))
            .map((e: any) => {
              const timestamps = this.buttonLogic.calculateTimestamps({
                ...e,
                startDate: e.startDate || dateStr,
                endDate: e.endDate || dateStr
              });
              return {
                ...e,
                type: 'EVENT',
                title: e.title || e.name || 'Event',
                tags: e.tags || [],
                startTimeStamp: timestamps.startTimeStamp,
                endTimeStamp: timestamps.endTimeStamp
              };
            });
        },
        error: (err) => {
          console.error('Error loading items for selected date', err);
          this.habitsForSelectedDate = [];
          this.tasksForSelectedDate = [];
          this.eventsForSelectedDate = [];
        }
      });
  }

  /**
   * Check if an item (habit/task/event) is scheduled for a specific date
   */
  private isItemScheduledForDate(item: any, targetDateStr: string): boolean {
    const scheduledDates = this.getDateRangeFromItem(item);
    return scheduledDates.includes(targetDateStr);
  }

  // Extract a numeric timestamp from the first matching candidate field on the item
  private extractTimestamp(item: any, candidates: string[]): number {
    if (!item) return 0;
    for (const k of candidates) {
      const val = item[k];
      if (!val) continue;
      // if already number (timestamp)
      if (typeof val === 'number') return val;
      // if Date
      if (val instanceof Date) return val.getTime();
      // try parseable string
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
      // if time-only like '14:30' - create a date on selectedDate with that time
      if (typeof val === 'string' && /^\d{1,2}:\d{2}$/.test(val)) {
        const parts = val.split(':');
        const d = new Date(this.selectedDate);
        d.setHours(Number(parts[0]));
        d.setMinutes(Number(parts[1]));
        d.setSeconds(0);
        return d.getTime();
      }
    }
    return 0;
  }

  // Try to format an item's start/end or single time into "HH.mm-HH.mm" or a readable string.
  private formatItemTime(item: any): string {
    // Common field names to check
    const startCandidates = ['startTime', 'start_time', 'start', 'from', 'scheduledAt', 'time'];
    const endCandidates = ['endTime', 'end_time', 'end', 'to', 'scheduledEnd'];

    let startVal: any = null;
    let endVal: any = null;

    for (const k of startCandidates) {
      if (item[k]) {
        startVal = item[k];
        break;
      }
    }
    for (const k of endCandidates) {
      if (item[k]) {
        endVal = item[k];
        break;
      }
    }

    const parseToDate = (val: any) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      // if it's a number (timestamp)
      if (typeof val === 'number') return new Date(val);
      // if it's ISO string or time-only string
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      return null;
    };

    const startDate = parseToDate(startVal);
    const endDate = parseToDate(endVal);

    const fmt = (dt: Date) => {
      if (!dt) return '';
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `${hh}.${mm}`;
    };

    if (startDate && endDate) return `${fmt(startDate)}-${fmt(endDate)}`;
    if (startDate) return fmt(startDate);
    // fallback to any readable time property
    if (item.time && typeof item.time === 'string') return item.time;
    return '';
  }

  async openHabitInput() {
    // Store context - calendar opened as modal
    this.navigationContext.pushContext('/authed/calendar', { selectedDate: this.selectedDate }, true);

    const { HabitInputComponent } = await import('../habit-input/habit-input.component');
    const modal = await this.modalCtrl.create({
      component: HabitInputComponent,
      componentProps: {}
    });
    await modal.present();

    // Reload calendar data when modal is dismissed
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadCalendarData();
      this.updateHabitsAndTasksForSelectedDate();
    }
  }

  // Determine if an item (habit or task) is currently in progress based on start/end timestamps
  isItemInProgress(item: any): boolean {
    if (!item) return false;
    const now = Date.now();
    const start = item.startTimeStamp || 0;
    const end = item.endTimeStamp || 0;
    if (!start && !end) return false;
    if (start && end) return start <= now && now <= end;
    if (start && !end) return start <= now;
    if (!start && end) return now <= end;
    return false;
  }

  // Format a time string (HH:mm:ss or HH:mm) to display format (HH.mm)
  formatTimeString(timeStr: string | undefined): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`;
    }
    return timeStr;
  }

  // Format a timestamp to time display format (HH.mm)
  getFormattedTime(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}.${mm}`;
  }
}
