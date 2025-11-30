import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { HabitService } from '../habit.service';
import { TaskApi } from '../../../api/task.api';
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'habit-page',
  templateUrl: './habit-page.component.html',
  styleUrls: ['./habit-page.component.scss'],
  imports: [
    CommonModule,
    IonicModule,
    HabitCardComponent,
    MindfulNavigatorComponent,
    MindfulInputsModule,
    MindfulBadgeComponent,
    RouterModule
  ]
})
export class HabitPageComponent implements OnInit, OnDestroy {
  public title = 'Habits';
  public currentMainTab: 'habits' | 'tasks' = 'habits';
  public showContent: boolean = true;

  public subFilter: 'journey' | 'priorities' | 'routine' | 'all' = 'all';
  public journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'all' = 'all';
  public prioritySubFilter: 'high' | 'medium' | 'low' | 'all' = 'high';
  public routineSubFilter: 'morning' | 'evening' | 'night' | 'all' = 'morning';

  public allHabits: Habit[] = [];
  public filteredHabits: Habit[] = [];
  public tasks: any[] = [];
  public filteredTasks: any[] = [];

  public selectedDate: Date = new Date();
  public currentTimestamp: number = Date.now();
  public loading: boolean = false;

  private subscriptions: Subscription = new Subscription();
  private timestampInterval: any;

  public showSingleMode: boolean = false;
  public singleModeHabit: Habit | null = null;
  public MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

  constructor(
    private habitService: HabitService,
    private router: Router,
    private taskApi: TaskApi
  ) { }

  ngOnInit() {
    this.subscriptions.add(
      this.habitService.getHabits().subscribe(habits => {
        if (!habits?.length) return;
        console.log("Received habits from service:", habits);
        this.allHabits = habits;
        this.applyFilters();
      })
    );

    this.loadHabits();
    this.loadTasksForSelectedDate(new Date());

    this.timestampInterval = setInterval(() => {
      this.currentTimestamp = Date.now();
      this.applyFilters();
    }, 60000);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    clearInterval(this.timestampInterval);
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.applyFilters();
    this.loadTasksForSelectedDate(date);
  }
  loadHabits() {
    this.loading = true;
    const formattedDate = this.habitService.formatDateToYYYYMMDD(this.selectedDate);
    console.log("Loading habits for date:", formattedDate, "Selected date:", this.selectedDate);

    this.subscriptions.add(
      this.habitService.loadHabitsForDate(formattedDate).subscribe({
        next: (res: any) => {
          console.log("LOADED HABITS:", res);

          // Handle both cases: response might be directly an array or have a data property
          const habitData = Array.isArray(res) ? res : (res?.data || []);

          this.allHabits = habitData.map((h: any) => ({
            ...h,
            status: h.status?.trim().toLowerCase(),
            priority: h.priority?.trim().toLowerCase(),
            routine: h.routine?.trim().toLowerCase(),
          })) || [];

          console.log("Mapped habits:", this.allHabits);
          console.log("Current filters - subFilter:", this.subFilter, "journeySubFilter:", this.journeySubFilter);
          this.loading = false;
          this.applyFilters();

        },
        error: (err) => {
          console.error("Error loading habits:", err);
          this.loading = false;
          this.allHabits = [];
        }
      })
    );
  }


  loadTasksForSelectedDate(date: Date) {
    this.loading = true;
    const formatted = this.habitService.formatDateToYYYYMMDD(date);

    this.subscriptions.add(
      this.taskApi.getTasksByDate(formatted).subscribe({
        next: (res: any) => {
          console.log("LOADED TASKS:", res);
          const list = Array.isArray(res?.data || res?.tasks || res) ? res.data || res.tasks || res : [];
          this.tasks = list.map((t: any) => ({
            ...t,
            type: t.type || 'tasks',
            startTimeStamp: this.getTaskStartTimestamp(t),
            endTimeStamp: this.getTaskEndTimestamp(t),
            status: t.status?.trim().toLowerCase(),
            priority: t.priority?.trim().toLowerCase(),
            routine: t.routine?.trim().toLowerCase(),
          }));
          this.loading = false;
          this.applyFilters();
        },
        error: () => {
          this.tasks = [];
          this.loading = false;
          this.applyFilters();
        }
      })
    );
  }

  private getTaskStartTimestamp(t: any): number {
    const dt = new Date(`${t.startDate}T${t.startTime}`);
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }
  private getTaskEndTimestamp(t: any): number {
    const dt = new Date(`${t.endDate}T${t.endTime}`);
    return isNaN(dt.getTime()) ? Number.MAX_SAFE_INTEGER : dt.getTime();
  }

  // ---------- TAB & FILTER ACTIONS (FRONTEND ONLY) ----------
  selectMainTab(tab: 'habits' | 'tasks') {
    this.currentMainTab = tab;
    this.applyFilters();
  }
  selectSubFilter(filter: any) {
    this.subFilter = filter;
    this.applyFilters();
  }
  selectJourneySubFilter(filter: any) {
    this.journeySubFilter = filter;
    this.subFilter = 'journey'; // Set the main filter to 'journey'
    this.applyFilters();
  }
  selectPrioritySubFilter(filter: any) {
    this.prioritySubFilter = filter;
    this.subFilter = 'priorities'; // Set the main filter to 'priorities'
    this.applyFilters();
  }
  selectRoutineSubFilter(filter: any) {
    this.routineSubFilter = filter;
    this.subFilter = 'routine'; // Set the main filter to 'routine'
    this.applyFilters();
  }

  // ---------- MAIN FILTER LOGIC ----------
  private applyFilters() {
    if (this.currentMainTab === 'tasks') {
      this.filteredTasks = this.filterTasks();
      return;
    }

    this.filteredHabits = this.filterHabits();
  }

  private filterHabits(): Habit[] {
    let list = this.filterByDate(this.allHabits);
    console.log("After date filtering:", list);

    switch (this.subFilter) {
      case 'journey':
        if (this.journeySubFilter !== 'all') {
          list = list.filter(h => h.status === this.journeySubFilter);
          console.log("After journey filtering (" + this.journeySubFilter + "):", list);
        }
        break;

      case 'priorities':
        if (this.prioritySubFilter !== 'all') {
          list = list.filter(h => (h.priority || '').toLowerCase() === this.prioritySubFilter);
          console.log("After priority filtering (" + this.prioritySubFilter + "):", list);
        }
        break;

      case 'routine':
        if (this.routineSubFilter !== 'all') {
          list = list.filter(h => (h.routine || '').toLowerCase() === this.routineSubFilter);
          console.log("After routine filtering (" + this.routineSubFilter + "):", list);
        }
        break;

      default:
        // 'all' => no extra filter
        console.log("No additional filtering (showing all)");
        break;
    }

    console.log("Final filtered habits:", list);
    return list;
  }


  private filterTasks(): any[] {
    let list = [...this.tasks];

    switch (this.subFilter) {
      case 'journey':
        if (this.journeySubFilter !== 'all') {
          list = list.filter(t => t.status === this.journeySubFilter);
        }
        break;

      case 'priorities':
        if (this.prioritySubFilter !== 'all') {
          list = list.filter(t => (t.priority || '').toLowerCase() === this.prioritySubFilter);
        }
        break;

      case 'routine':
        if (this.routineSubFilter !== 'all') {
          list = list.filter(t => (t.routine || '').toLowerCase() === this.routineSubFilter);
        }
        break;

      default:
        break;
    }

    return list;
  }


  private filterByDate(habits: Habit[]): Habit[] {
    if (!habits.length) return [];

    const selected = this.selectedDate;
    const day = selected
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    console.log("Filtering by date:", selected, "Day of week:", day);

    return habits.filter(h => {
      // Make sure we're handling the dates correctly
      const start = h.startDate ? new Date(h.startDate) : selected;
      const end = h.endDate ? new Date(h.endDate) : selected;

      // Log for debugging
      console.log("Checking habit:", h.title, "Start:", start, "End:", end, "Selected:", selected, "Day:", day);
      console.log("Habit selectedDays:", h.selectedDays);
      console.log("Start date valid:", !isNaN(start.getTime()), "End date valid:", !isNaN(end.getTime()));

      const isInRange = start <= selected && selected <= end;
      const hasCorrectDay = h.selectedDays && h.selectedDays.length > 0 ? h.selectedDays.includes(day) : true;

      console.log("Is in range:", isInRange, "Has correct day:", hasCorrectDay);

      const result = isInRange && hasCorrectDay;
      console.log("Including habit:", h.title, "?", result);

      return result;
    });
  }

  get habitPrioritySummary() {
    return this.countByPriority(this.getHabitsForSelectedDate());
  }

  get taskPrioritySummary() {
    return this.countByPriority(this.tasks);
  }

  private getHabitsForSelectedDate(): Habit[] {
    if (!this.allHabits.length) {
      return [];
    }

    const selected = this.selectedDate;
    const day = selected
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    return this.allHabits.filter(habit => {
      const start = habit.startDate ? new Date(habit.startDate) : selected;
      const end = habit.endDate ? new Date(habit.endDate) : selected;
      const isInRange = start <= selected && selected <= end;
      const hasCorrectDay = habit.selectedDays && habit.selectedDays.length > 0
        ? habit.selectedDays.includes(day)
        : true;

      return isInRange && hasCorrectDay;
    });
  }

  private countByPriority(items: Array<{ priority?: string }>) {
    const counts = { high: 0, medium: 0, low: 0 };

    items.forEach(item => {
      const priority = (item.priority || '').toLowerCase();

      if (priority === 'high') {
        counts.high += 1;
      }
      if (priority === 'medium') {
        counts.medium += 1;
      }
      if (priority === 'low') {
        counts.low += 1;
      }
    });

    return counts;
  }



  onOpenCalendar() {
    this.router.navigateByUrl('/authed/habit-detail');
  }

  onOpenHabit(habit: Habit) {
    this.singleModeHabit = habit;
    this.showSingleMode = true;
    this.showContent = false;
  }
}
