import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { ModalController } from '@ionic/angular';
import { CalendarService } from '../../../services/calendar.service';
import { MoodService } from '../../../services/mood.service';
import { MoodTransition, MoodData } from '../../../models/mood.model';
import { Subject, takeUntil, Observable } from 'rxjs';
import { CustomToastService, Toast } from '../../../services/custom-toast.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { LongPressDirective } from '../../../directives/gestureControlDirective';

@Component({
  standalone: true,
  selector: 'activity-calendar',
  templateUrl: './activity-calendar.component.html',
  styleUrls: ['./activity-calendar.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulInputsModule, MindfulButtonComponent, ActivityCardComponent, LongPressDirective, EmptyStateComponent]
})
export class ActivityCalendarComponent implements OnInit, OnDestroy {
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
  // Combined items for selected date (events + habits + tasks) sorted for display
  public combinedForSelectedDate: any[] = [];
  public toast$: Observable<Toast | null>;

  constructor(
    private modalCtrl: ModalController,
    private calendarService: CalendarService,
    private moodService: MoodService,
    private router: Router,
    private buttonLogic: HabitButtonLogicService,
    private profileSelector: ProfileSelectorService,
    private authService: AuthService,
    private toastService: CustomToastService
  ) {
    console.log('ActivityCalendarComponent initialized');
    this.toast$ = this.toastService.toast$;
  }


  ngOnInit() {
    console.log('ActivityCalendarComponent ngOnInit');
    // Detect whether current viewer is a parent so we can pass the flag to activity-card instances
    try {
      const authParent = this.authService && this.authService.isParentUser && this.authService.isParentUser();
      if (authParent) {
        this.isParent = true;
      }
    } catch (e) {
      // ignore
    }

    this.loadCalendarData();
    this.loadMoodData();
    // Populate habits/tasks for the initial selected date
    this.updateHabitsAndTasksForSelectedDate();

    // Reload when parent switches child
    this.profileSelector.childChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadCalendarData();
      this.loadMoodData();
      this.updateHabitsAndTasksForSelectedDate();
    });
  }

  // Flag used to indicate viewer is a parent (passed down to activity-card)
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
   * Handle month navigation from the child calendar.
   * The calendar emits the first day of the new month.
   */
  onMonthChanged(monthDate: Date) {
    if (!monthDate) return;
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const dateStr = this.formatDateToYYYYMMDD(firstDay);
    this.loadDayData(dateStr);
  }

  /**
   * Load mood transition data for the current month
   */
  loadMoodData() {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Interceptor handles userId - no need to pass manually
    this.moodService.getMoodTransitionsMonthly(year, month)
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
    // Interceptor handles userId - no need to pass manually
    this.calendarService.getUserCalendarMonth(dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`Calendar data for ${dateStr}:`, response);

          // Clear existing activities for this month
          this.dateActivities = {};

          // Process events (timetable) using `completionDate` field for dots
          if (response.events && response.events.length > 0) {
            response.events.forEach((event: any) => {
              const dates = this.getDatesFromCompletionDate(event);
              dates.forEach(date => {
                if (!this.dateActivities[date]) {
                  this.dateActivities[date] = {};
                }
                this.dateActivities[date].timetable = true;
              });
            });
          }

          // Process tasks using `completionDate`
          if (response.tasks && response.tasks.length > 0) {
            response.tasks.forEach((task: any) => {
              const dates = this.getDatesFromCompletionDate(task);
              dates.forEach(date => {
                if (!this.dateActivities[date]) {
                  this.dateActivities[date] = {};
                }
                this.dateActivities[date].task = true;
              });
            });
          }

          // Process habits using `completionDate`
          if (response.habits && response.habits.length > 0) {
            response.habits.forEach((habit: any) => {
              const dates = this.getDatesFromCompletionDate(habit);
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
   * Extract one or more completion dates from an item using `completionDate`.
   * Handles a single ISO/string date or an array of dates. Returns dates
   * normalized to YYYY-MM-DD format.
   */
  private getDatesFromCompletionDate(item: any): string[] {
    const dates: string[] = [];
    if (!item) return dates;

    const vals = item.completionDate ?? item.completion_date ?? item.completions ?? null;
    const addIfValid = (v: any) => {
      if (!v) return;
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        dates.push(this.formatDateToYYYYMMDD(d));
      }
    };

    if (Array.isArray(vals)) {
      vals.forEach(addIfValid);
    } else {
      addIfValid(vals);
    }

    return dates;
  }

  /**
   * Return true if an item has a completion date matching the target date string
   */
  private hasCompletionOnDate(item: any, targetDateStr: string): boolean {
    const dates = this.getDatesFromCompletionDate(item);
    return dates.includes(targetDateStr);
  }

  formatDateToYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get the currently selected date as a YYYY-MM-DD string
   */
  getSelectedDateString(): string {
    return this.formatDateToYYYYMMDD(this.selectedDate);
  }

  // Fetch habits and tasks for the currently selected date and populate arrays used by template
  updateHabitsAndTasksForSelectedDate() {
    const dateStr = this.formatDateToYYYYMMDD(this.selectedDate);
    console.log('updateHabitsAndTasksForSelectedDate - dateStr:', dateStr, 'selectedDate:', this.selectedDate);
    
    // Interceptor handles userId - no need to pass manually
    this.calendarService.getUserCalendar(dateStr, 'day')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Calendar response received:', response);
          
          let rawHabits = response.habits || [];
          let rawTasks = response.tasks || [];
          let rawEvents = response.events || [];
          
          console.log('Raw data - habits:', rawHabits.length, 'tasks:', rawTasks.length, 'events:', rawEvents.length);

          // ONLY filter by selected child if PARENT is viewing a child profile
          // This prevents filtering when regular users are viewing their own data
          const selectedChildId = this.profileSelector.getChildId();
          console.log('isParent:', this.isParent, 'selectedChildId:', selectedChildId);
          
          if (this.isParent && selectedChildId !== null) {
            const beforeHabits = rawHabits.length;
            const beforeTasks = rawTasks.length;
            const beforeEvents = rawEvents.length;
            
            rawHabits = rawHabits.filter((h: any) => {
              const userId = h.userId ?? h.user_id ?? h.assignedTo ?? h.assigned_to;
              return userId == selectedChildId;
            });
            rawTasks = rawTasks.filter((t: any) => {
              const userId = t.userId ?? t.user_id ?? t.assignedTo ?? t.assigned_to;
              return userId == selectedChildId;
            });
            rawEvents = rawEvents.filter((e: any) => {
              const userId = e.userId ?? e.user_id ?? e.assignedTo ?? e.assigned_to;
              // If event doesn't have a user ID field, include it (don't filter it out)
              if (userId === undefined || userId === null) return true;
              return userId == selectedChildId;
            });
            
            console.log('After child filter - habits:', beforeHabits, '->', rawHabits.length, 'tasks:', beforeTasks, '->', rawTasks.length, 'events:', beforeEvents, '->', rawEvents.length);
          }

          // Display ALL habits regardless of completion status (no completion date filtering)
          this.habitsForSelectedDate = rawHabits
            .map((h: any) => {
              // For recurring items, use today's date to calculate correct timestamps
              const isRecurring = h.daysOfWeek?.length || h.everyday || h.everyWeekend;
              const itemForTimestamp = isRecurring ? { ...h, startDate: dateStr, endDate: dateStr } : { ...h, startDate: h.startDate || dateStr, endDate: h.endDate || dateStr };
              const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);
              return {
                ...h,
                title: h.title || h.name || h.habitName || 'Habit',
                status: this.buttonLogic.normalizeStatus(h.status),
                coinReward: h.rewardCoins ?? h.reward_coins ?? h.coinReward ?? 0,
                streak: (h.currentHabitStreak ?? h.streak ?? h.habitStreak ?? 0),
                startTimeStamp: timestamps.startTimeStamp,
                endTimeStamp: timestamps.endTimeStamp
              };
            });

          // Display ALL tasks regardless of completion status (no completion date filtering)
          this.tasksForSelectedDate = rawTasks
            .map((t: any) => {
              // For recurring items, use today's date to calculate correct timestamps
              const isRecurring = t.daysOfWeek?.length || t.everyday || t.everyWeekend;
              const itemForTimestamp = isRecurring ? { ...t, startDate: dateStr, endDate: dateStr } : { ...t, startDate: t.startDate || dateStr, endDate: t.endDate || dateStr };
              const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);
              return {
                ...t,
                type: t?.type || 'tasks',
                title: t.title || t.name || t.taskName || 'Task',
                status: this.buttonLogic.normalizeStatus(t.status),
                coinReward: t.rewardCoins ?? t.reward_coins ?? t.coinReward ?? 0,
                streak: (t.currentTaskStreak ?? t.streak ?? t.habitStreak ?? 0),
                startTimeStamp: timestamps.startTimeStamp,
                endTimeStamp: timestamps.endTimeStamp
              };
            });

          // Display ALL events regardless of completion status (no completion date filtering)
          this.eventsForSelectedDate = rawEvents
            .map((e: any) => {
              // For recurring items, use today's date to calculate correct timestamps
              const isRecurring = e.daysOfWeek?.length || e.everyday || e.everyWeekend;
              const itemForTimestamp = isRecurring ? { ...e, startDate: dateStr, endDate: dateStr } : { ...e, startDate: e.startDate || dateStr, endDate: e.endDate || dateStr };
              const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);
              return {
                ...e,
                type: 'EVENT',
                title: e.title || e.name || 'Event',
                tags: e.tags || [],
                startTimeStamp: timestamps.startTimeStamp,
                endTimeStamp: timestamps.endTimeStamp
              };
            });
            
          // Sort items so upcoming (future) times appear first
          this.habitsForSelectedDate = this.sortArrayByUpcoming(this.habitsForSelectedDate);
          this.tasksForSelectedDate = this.sortArrayByUpcoming(this.tasksForSelectedDate);
          this.eventsForSelectedDate = this.sortArrayByUpcoming(this.eventsForSelectedDate);

          // Also prepare combined sorted list for template convenience
          // (combined: events + habits + tasks)
          // Note: we intentionally concatenate events first so timetable events appear alongside other items
          // when sorted; final ordering is determined by sortArrayByUpcoming.
          // Keep this as a property so template can bind to it.
          (this as any).combinedForSelectedDate = this.sortArrayByUpcoming([
            ...(this.eventsForSelectedDate || []),
            ...(this.habitsForSelectedDate || []),
            ...(this.tasksForSelectedDate || [])
          ]);

          console.log('Final arrays - habitsForSelectedDate:', this.habitsForSelectedDate.length, 'tasksForSelectedDate:', this.tasksForSelectedDate.length, 'eventsForSelectedDate:', this.eventsForSelectedDate.length);
        },
        error: (err) => {
          console.error('Error loading items for selected date', err);
          this.habitsForSelectedDate = [];
          this.tasksForSelectedDate = [];
          this.eventsForSelectedDate = [];
        }
      });
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
    const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    const modal = await this.modalCtrl.create({
      component: ActivityInputComponent,
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

  // Return true when the calendar shows the empty state (no items and mood toggle off)
  isCalendarEmpty(): boolean {
    return (!this.habitsForSelectedDate?.length && !this.tasksForSelectedDate?.length && !this.eventsForSelectedDate?.length) && !this.moodOn;
  }

  // Return true if the currently selected date is today's date
  isSelectedDateToday(): boolean {
    if (!this.selectedDate) return false;
    const today = new Date();
    return this.formatDateToYYYYMMDD(this.selectedDate) === this.formatDateToYYYYMMDD(today);
  }

  // Sort helper: order items strictly by their start time (ascending)
  // No "now" logic — items are ordered morning → night based on `startTimeStamp`.
  private sortArrayByUpcoming(arr: any[] = []): any[] {
    if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
    // Use a stable-ish sort by startTimeStamp ascending. Items without a timestamp
    // (0 / undefined) are placed after items with valid timestamps.
    return arr.slice().sort((a, b) => {
      const ta = Number(a?.startTimeStamp ?? 0);
      const tb = Number(b?.startTimeStamp ?? 0);
      if (ta === tb) return 0;
      if (ta === 0) return 1;
      if (tb === 0) return -1;
      return ta - tb;
    });
  }

  // Format a timestamp to time display format (HH.mm)
  getFormattedTime(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}.${mm}`;
  }

  /**
   * Handle long-press on timetable card to open edit mode
   */
  async onTimetableLongPress(event: any) {
    if (!event || !event.id) {
      return;
    }

    const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    const modal = await this.modalCtrl.create({
      component: ActivityInputComponent,
      componentProps: {
        editingHabit: event,
        initialTab: 'timetable'
      }
    });

    await modal.present();

    // Reload calendar data when modal is dismissed
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadCalendarData();
      this.updateHabitsAndTasksForSelectedDate();
    }
  }
}
