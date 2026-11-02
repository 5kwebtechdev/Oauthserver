import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { SupermeInputsModule } from '../../../components/superme-inputs/superme-inputs.module';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { SupermeCalendarComponent } from '../../../components/superme-inputs/superme-calendar/superme-calendar.component';
import { CalendarService } from '../../../services/calendar.service';
import { MoodService } from '../../../services/mood.service';
import { ParentDataService } from '../../../services/parent-data.service';
import { AuthService } from '../../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-activity-calendar',
  templateUrl: './activity-calendar.component.html',
  styleUrls: ['./activity-calendar.component.scss'],
  imports: [CommonModule, IonicModule, SupermeInputsModule, SupermeButtonComponent, ActivityCardComponent, SupermeCalendarComponent]
})
export class ActivityCalendarComponent implements OnInit, OnDestroy {
  dateActivities: { [key: string]: { timetable?: boolean; task?: boolean; habit?: boolean } } = {};
  selectedDate: Date = new Date();
  habitsForSelectedDate: any[] = [];
  tasksForSelectedDate: any[] = [];
  eventsForSelectedDate: any[] = []; // Timetable events
  allActivitiesForDate: any[] = []; // Merged and sorted by time
  moodOn = false;
  showMoodPopup = false;
  moodData: any = null;
  moodTransitions: any[] = [];
  selectedMood: any = null;
  isParent = false;
  private childId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private calendarService: CalendarService,
    private moodService: MoodService,
    private parentDataService: ParentDataService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isParent = !!this.authService.isParentUser?.();

    if (this.isParent) {
      this.parentDataService.selectedChild$
        .pipe(takeUntil(this.destroy$))
        .subscribe(child => {
          this.childId = child?.assignedTo || child?.userId || null;
          this.loadCalendarData();
          this.updateHabitsAndTasksForSelectedDate();
        });
    } else {
      this.loadCalendarData();
      this.updateHabitsAndTasksForSelectedDate();
    }
  }

  onDateSelected(date: Date | { start: Date | null; end: Date | null }) {
    if (date && date instanceof Date) {
      this.selectedDate = date;
    } else if ((date as any)?.start) {
      this.selectedDate = (date as any).start || this.selectedDate;
    }

    // Load month data if month changed
    if (this.selectedDate.getMonth() !== new Date().getMonth() ||
      this.selectedDate.getFullYear() !== new Date().getFullYear()) {
      this.loadCalendarData();
    }

    // Load habits/tasks/events for the selected date
    this.updateHabitsAndTasksForSelectedDate();

    // Show mood popup for selected date when mood is on
    if (this.moodOn) {
      const key = this.formatDateKey(this.selectedDate);
      this.selectedMood = this.moodTransitions.find((m: any) => m.date === key) || null;
      this.showMoodPopup = !!this.selectedMood;
    } else {
      this.showMoodPopup = false;
    }
  }

  onMoodToggled(state: boolean) {
    this.moodOn = state;
    if (this.moodOn) {
      this.loadMoodData();
      this.showMoodPopup = true;
    } else {
      this.moodTransitions = [];
      this.showMoodPopup = false;
    }
  }

  onMonthChanged(date: Date) {
    this.selectedDate = date;
    this.loadCalendarData();
    if (this.moodOn) {
      this.loadMoodData();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load calendar month data for showing activity dots on calendar
   * Uses month viewType to get all dates at once
   */
  loadCalendarData() {
    const refDate = this.selectedDate || new Date();
    const year = refDate.getFullYear();
    const month = refDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const dateStr = this.calendarService.formatDateToYYYYMMDD(firstDayOfMonth);

    this.calendarService.getUserCalendarMonth(dateStr, this.childId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`Calendar month data:`, response);

          // Clear existing activities
          this.dateActivities = {};

          // Process events (timetable) - check name 'event' in response
          if (response.events && response.events.length > 0) {
            response.events.forEach((event: any) => {
              const dates = this.calendarService.getDateRangeFromItem(event);
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
              const dates = this.calendarService.getDateRangeFromItem(task);
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
              const dates = this.calendarService.getDateRangeFromItem(habit);
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
        error: (error: any) => {
          console.error('Error loading calendar month data:', error);
        }
      });
  }

  /**
   * Load mood transition data for the current month
   */
  loadMoodData() {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth() + 1;

    this.moodService.getMoodTransitionsMonthly(year, month)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const list: any[] = Array.isArray(response) ? response : (response?.data ?? response?.transitions ?? []);
          this.moodTransitions = list;
        },
        error: (error: any) => {
          console.error('Error loading mood data:', error);
          this.moodTransitions = [];
        }
      });
  }

  /**
   * Check if an item is scheduled for a specific date
   */
  private isItemScheduledForDate(item: any, targetDateStr: string): boolean {
    const scheduledDates = this.calendarService.getDateRangeFromItem(item);
    return scheduledDates.includes(targetDateStr);
  }

  /**
   * Load habits, tasks, and events for the selected date
   * Uses day viewType
   */
  updateHabitsAndTasksForSelectedDate() {
    const dateStr = this.calendarService.formatDateToYYYYMMDD(this.selectedDate);

    this.calendarService.getUserCalendar(dateStr, 'day', this.childId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const rawHabits = response.habits || [];
          const rawTasks = response.tasks || [];
          const rawEvents = response.events || [];

          // Filter habits to only those scheduled for the selected date
          this.habitsForSelectedDate = rawHabits
            .filter((h: any) => this.isItemScheduledForDate(h, dateStr))
            .map((h: any) => {
              const start = this.extractTimestamp(h, ['startTime', 'start_time', 'start', 'from', 'scheduledAt', 'time', 'startTimeStamp']);
              const end = this.extractTimestamp(h, ['endTime', 'end_time', 'end', 'to', 'scheduledEnd', 'endTimeStamp']);
              return {
                ...h,
                title: h.title || h.name || h.habitName || 'Habit',
                startTimeStamp: start || h.startTimeStamp || 0,
                endTimeStamp: end || h.endTimeStamp || 0,
                type: 'habits'
              };
            });

          // Filter tasks to only those scheduled for the selected date
          this.tasksForSelectedDate = rawTasks
            .filter((t: any) => this.isItemScheduledForDate(t, dateStr))
            .map((t: any) => {
              const start = this.extractTimestamp(t, ['startTime', 'start_time', 'start', 'from', 'scheduledAt', 'time', 'startTimeStamp']);
              const end = this.extractTimestamp(t, ['endTime', 'end_time', 'end', 'to', 'scheduledEnd', 'endTimeStamp']);
              return {
                ...t,
                title: t.title || t.name || t.taskName || 'Task',
                startTimeStamp: start || t.startTimeStamp || 0,
                endTimeStamp: end || t.endTimeStamp || 0,
                type: 'tasks'
              };
            });

          // Filter events (timetable) to only those scheduled for the selected date
          this.eventsForSelectedDate = rawEvents
            .filter((e: any) => this.isItemScheduledForDate(e, dateStr))
            .map((e: any) => {
              const start = this.extractTimestamp(e, ['startTime', 'start_time', 'start', 'from', 'scheduledAt', 'time', 'startTimeStamp']);
              const end = this.extractTimestamp(e, ['endTime', 'end_time', 'end', 'to', 'scheduledEnd', 'endTimeStamp']);
              return {
                ...e,
                title: e.title || e.name || e.eventName || 'Timetable',
                startTimeStamp: start || e.startTimeStamp || 0,
                endTimeStamp: end || e.endTimeStamp || 0,
                type: 'timetable',
                variant: 'timetable'
              };
            });

          this.allActivitiesForDate = [
            ...this.habitsForSelectedDate,
            ...this.tasksForSelectedDate,
            ...this.eventsForSelectedDate
          ].sort((a, b) => (a.startTimeStamp || 0) - (b.startTimeStamp || 0));
        },
        error: (err: any) => {
          console.error('Error loading items for selected date', err);
          this.habitsForSelectedDate = [];
          this.tasksForSelectedDate = [];
          this.eventsForSelectedDate = [];
          this.allActivitiesForDate = [];
        }
      });
  }

  /**
   * Extract timestamp from item using candidate field names
   */
  private extractTimestamp(item: any, candidates: string[]): number {
    if (!item) return 0;
    for (const k of candidates) {
      const val = item[k];
      if (!val) continue;
      if (typeof val === 'number') return val;
      if (val instanceof Date) return val.getTime();
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
      if (typeof val === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val)) {
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

  async openHabitInput() {
    const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    const modal = await this.modalCtrl.create({ component: ActivityInputComponent, componentProps: {} });
    await modal.present();

    // Reload calendar data when modal is dismissed
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadCalendarData();
      this.updateHabitsAndTasksForSelectedDate();
    }
  }

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

  getFormattedTime(timestamp: number): string {
    if (!timestamp) return '00:00';
    const date = new Date(timestamp);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}.${mm}`;
  }

  getMoodEmojiPath(moodName: string): string {
    return this.moodService.getMoodEmojiPath(moodName);
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}