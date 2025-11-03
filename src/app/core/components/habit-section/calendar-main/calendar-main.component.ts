import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { ModalController } from '@ionic/angular';
import { CalendarService } from '../../../services/calendar.service';
import { Subject, takeUntil } from 'rxjs';

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
  moodOn: boolean = false;
  showMoodPopup: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private calendarService: CalendarService
  ) {
    console.log('CalendarMainComponent initialized');
  }

  ngOnInit() {
    console.log('CalendarMainComponent ngOnInit');
    this.loadCalendarData();
    // Populate habits/tasks for the initial selected date
    this.updateHabitsAndTasksForSelectedDate();
  }

  // Handler called from template when mindful-calendar emits a dateSelected event
  onDateSelected(date: Date | { start: Date | null, end: Date | null }) {
    if (date && date instanceof Date) {
      this.selectedDate = date;
    } else if ((date as any)?.start) {
      this.selectedDate = (date as any).start || this.selectedDate;
    }

    // Load habits/tasks for the selected date
    this.updateHabitsAndTasksForSelectedDate();

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
    if (!this.moodOn) this.showMoodPopup = false;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCalendarData() {
    // Load data for the first day of current month only
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Create date for first day of current month
    const firstDayOfMonth = new Date(year, month, 1);
    const dateStr = this.formatDateToYYYYMMDD(firstDayOfMonth);

    // Load data for first day of month
    this.loadDayData(dateStr);
  }

  loadDayData(dateStr: string) {
    this.calendarService.getUserCalendar(dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`Calendar data for ${dateStr}:`, response);
          const hasTimeTable = response.events && response.events.length > 0;
          const hasTask = response.tasks && response.tasks.length > 0;
          const hasHabit = response.habits && response.habits.length > 0;

          // Always set the date activities, even if empty
          this.dateActivities[dateStr] = {
            timetable: hasTimeTable,
            task: hasTask,
            habit: hasHabit
          };

          console.log(`Activities for ${dateStr}:`, this.dateActivities[dateStr]);
          console.log('All dateActivities:', this.dateActivities);
        },
        error: (error) => {
          console.error(`Error loading calendar data for ${dateStr}:`, error);
        }
      });
  }

  formatDateToYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // Fetch habits and tasks for the currently selected date and populate arrays used by template
  updateHabitsAndTasksForSelectedDate() {
    const dateStr = this.formatDateToYYYYMMDD(this.selectedDate);
    this.calendarService.getUserCalendar(dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Use the raw habit/task objects but ensure they contain timestamps and titles
          const rawHabits = response.habits || [];
          const rawTasks = response.tasks || [];

          this.habitsForSelectedDate = rawHabits.map((h: any) => {
            const start = this.extractTimestamp(h, ['startTime', 'start_time', 'start', 'from', 'scheduledAt', 'time', 'startTimeStamp']);
            const end = this.extractTimestamp(h, ['endTime', 'end_time', 'end', 'to', 'scheduledEnd', 'endTimeStamp']);
            return {
              ...(h || {}),
              title: h.title || h.name || h.habitName || 'Habit',
              startTimeStamp: start || h.startTimeStamp || 0,
              endTimeStamp: end || h.endTimeStamp || 0
            };
          });

          this.tasksForSelectedDate = rawTasks.map((t: any) => {
            const start = this.extractTimestamp(t, ['startTime', 'start_time', 'start', 'from', 'scheduledAt', 'time', 'startTimeStamp']);
            const end = this.extractTimestamp(t, ['endTime', 'end_time', 'end', 'to', 'scheduledEnd', 'endTimeStamp']);
            return {
              ...(t || {}),
              title: t.title || t.name || t.taskName || 'Task',
              startTimeStamp: start || t.startTimeStamp || 0,
              endTimeStamp: end || t.endTimeStamp || 0
            };
          });
        },
        error: (err) => {
          console.error('Error loading items for selected date', err);
          this.habitsForSelectedDate = [];
          this.tasksForSelectedDate = [];
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
    const { HabitInputComponent } = await import('../habit-input/habit-input.component');
    const modal = await this.modalCtrl.create({
      component: HabitInputComponent,
      componentProps: {}
    });
    await modal.present();
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
}
