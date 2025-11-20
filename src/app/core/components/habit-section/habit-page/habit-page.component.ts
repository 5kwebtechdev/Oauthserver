import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { HabitListComponent } from './habit-list.component';
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
  imports: [CommonModule, IonicModule, HabitCardComponent, HabitListComponent, MindfulNavigatorComponent, MindfulInputsModule, MindfulBadgeComponent, RouterModule]
})
export class HabitPageComponent implements OnInit, OnDestroy {
  public title = 'Habits';
  public currentMainTab: 'habits' | 'tasks' = 'habits';
  public showContent: boolean = true;

  public subFilter: 'journey' | 'priorities' | 'routine' | 'all' = 'all';
  public journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'all' = 'pending';
  public prioritySubFilter: 'high' | 'medium' | 'low' | 'all' = 'high';
  public routineSubFilter: 'morning' | 'evening' | 'night' | 'all' = 'morning';

  public allHabits: Habit[] = [];
  public filteredHabits: Habit[] = [];
  public tasks: any[] = [];
  public filteredTasks: any[] = [];
  public selectedDate: Date = new Date(); // Current selected date
  public currentTimestamp: number = Date.now(); // Current timestamp for habit status
  public MAX_SAFE_INTEGER: number = Number.MAX_SAFE_INTEGER;
  private subscriptions: Subscription = new Subscription();
  public loading: boolean = false; // Track API loading state

  private timestampInterval: any;
  public showSingleMode: boolean = false;
  public singleModeHabit: Habit | null = null;

  constructor(private habitService: HabitService, private router: Router, private taskApi: TaskApi) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state as any;
      if (state.newHabit && state.showSingleMode) {
        this.singleModeHabit = state.newHabit;
        this.showSingleMode = true;
        this.showContent = false;
      }
      if ((navigation.extras.state as any).initialTab) {
        const t = (navigation.extras.state as any).initialTab as string;
        if (t === 'tasks' || t === 'habits') {
          this.currentMainTab = t as 'habits' | 'tasks';
        }
      }
    }

    this.subscriptions.add(
      this.habitService.getHabits().subscribe(habits => {
        this.allHabits = habits;
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

    if (this.timestampInterval) {
      clearInterval(this.timestampInterval);
    }
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.loadHabits();
    this.loadTasksForSelectedDate(date);
  }


  loadHabits() {
    this.loading = true;
    const filters = this.buildFilters();
    this.subscriptions.add(
      this.habitService.loadHabitsBySearch(filters).subscribe({
        next: () => {
          this.loading = false;
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading habits:', error);
          this.loading = false;
        }
      })
    );
  }

  loadTasksForSelectedDate(date: Date) {
    const formattedDate = this.habitService.formatDateToYYYYMMDD(date);
    this.loading = true;
    this.subscriptions.add(
      this.taskApi.getTasksByDate(formattedDate).subscribe({
        next: (res: any) => {
          const list = res?.data || res?.tasks || res || [];
          this.tasks = Array.isArray(list) ? list : [];
          // Ensure each task item and any nested `task.task` object has a `type` so
          // `habit-card` can apply the correct task styles (checks `habit?.type === 'tasks'`).
          this.tasks = this.tasks.map((t: any) => {
            const base = {
              ...t,
              type: t.type || 'tasks',
              startTimeStamp: this.getTaskStartTimestamp(t),
              endTimeStamp: this.getTaskEndTimestamp(t)
            };
            // If API returns a nested `task` object, ensure it also carries `type: 'tasks'`.
            if (base.task && typeof base.task === 'object') {
              base.task = { ...base.task, type: base.task.type || 'tasks' };
            }
            return base;
          });
          this.loading = false;
          this.applyFilters();
        },
        error: (err: any) => {
          console.error('Error loading tasks:', err);
          this.tasks = [];
          this.loading = false;
          this.applyFilters();
        }
      })
    );
  }

  // Helpers to compute numeric timestamps for tasks (backend may provide epoch or date/time strings)
  private getTaskStartTimestamp(t: any): number {
    if (!t) return 0;
    if (t.startTimeStamp && !isNaN(Number(t.startTimeStamp))) return Number(t.startTimeStamp);
    // If API returned nested task object, check there
    const inner = t.task || t;
    if (inner.startTimeStamp && !isNaN(Number(inner.startTimeStamp))) return Number(inner.startTimeStamp);
    if (inner.startDate && inner.startTime) {
      const dt = new Date(`${inner.startDate}T${inner.startTime}`);
      const ts = dt.getTime();
      return isNaN(ts) ? 0 : ts;
    }
    return 0;
  }

  private getTaskEndTimestamp(t: any): number {
    if (!t) return 0;
    if (t.endTimeStamp && !isNaN(Number(t.endTimeStamp))) return Number(t.endTimeStamp);
    const inner = t.task || t;
    if (inner.endTimeStamp && !isNaN(Number(inner.endTimeStamp))) return Number(inner.endTimeStamp);
    if (inner.endDate && inner.endTime) {
      const dt = new Date(`${inner.endDate}T${inner.endTime}`);
      const ts = dt.getTime();
      return isNaN(ts) ? 0 : ts;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  selectMainTab(tab: 'habits' | 'tasks') {
    this.currentMainTab = tab;
    this.applyFilters();
  }

  selectSubFilter(filter: 'journey' | 'priorities' | 'routine' | 'all') {
    this.subFilter = filter;
    this.loadHabits();
  }

  selectJourneySubFilter(filter: 'pending' | 'ongoing' | 'completed' | 'all') {
    this.journeySubFilter = filter;
    this.loadHabits();
  }

  selectPrioritySubFilter(filter: 'high' | 'medium' | 'low' | 'all') {
    this.prioritySubFilter = filter;
    this.loadHabits();
  }

  selectRoutineSubFilter(filter: 'morning' | 'evening' | 'night' | 'all') {
    this.routineSubFilter = filter;
    this.loadHabits();
  }

  private applyFilters() {
    // If tasks tab selected, filter tasks and set filteredTasks
    if (this.currentMainTab === 'tasks') {
      let list = [...this.tasks];

      // Journey filter uses numeric timestamps
      if (this.subFilter === 'journey' && this.journeySubFilter !== 'all') {
        const now = Date.now();
        if (this.journeySubFilter === 'pending') {
          list = list.filter(t => (t.startTimeStamp || 0) > now);
        } else if (this.journeySubFilter === 'ongoing') {
          list = list.filter(t => (t.startTimeStamp || 0) <= now && (t.endTimeStamp || Number.MAX_SAFE_INTEGER) >= now);
        } else if (this.journeySubFilter === 'completed') {
          list = list.filter(t => (t.endTimeStamp || 0) < now);
        }
      }

      // Priority filter (string)
      if (this.subFilter === 'priorities' && this.prioritySubFilter !== 'all') {
        list = list.filter(t => ((t.priority || t.task?.priority) || '').toString().toLowerCase() === this.prioritySubFilter);
      }

      // Routine filter (string)
      if (this.subFilter === 'routine' && this.routineSubFilter !== 'all') {
        list = list.filter(t => ((t.routine || t.task?.routine || t.selectedRoutine) || '').toString().toLowerCase() === this.routineSubFilter);
      }

      this.filteredTasks = list;
      return;
    }

    let filtered = [...this.allHabits];

    filtered = this.filterByDate(filtered);

    console.log('Filtering by type. Expected:', this.currentMainTab, 'Available types:', filtered.map(h => h.type));
    if (this.currentMainTab === 'habits') {
      filtered = filtered;
    } else {
      filtered = filtered.filter(habit => habit.type === this.currentMainTab);
    }
    console.log('After type filter:', filtered.length);

    if (this.subFilter === 'journey' && this.journeySubFilter !== 'all') {
      filtered = this.filterByJourney(filtered, this.journeySubFilter);
    }

    this.filteredHabits = filtered;
  }

  private filterByJourney(habits: Habit[], status: 'pending' | 'ongoing' | 'completed'): Habit[] {
    return habits.filter(habit => habit.status === status);
  }

  private buildFilters(): any {
    const filters: any = {};
    if (this.subFilter === 'priorities' && this.prioritySubFilter !== 'all') {
      filters.priority = this.prioritySubFilter.toUpperCase();
    } else if (this.subFilter === 'routine' && this.routineSubFilter !== 'all') {
      filters.routine = this.routineSubFilter.toUpperCase();
    }
    // Status is filtered client-side
    return filters;
  }

  private filterByDate(habits: Habit[]): Habit[] {
    const selectedDate = new Date(this.selectedDate);
    return habits.filter(habit => {
      const start = habit.startDate ? new Date(habit.startDate) : new Date(0);
      const end = habit.endDate ? new Date(habit.endDate) : new Date(Number.MAX_SAFE_INTEGER);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      return start <= selectedDate && selectedDate <= end && habit.selectedDays.includes(dayOfWeek);
    });
  }

  onOpenCalendar() {
    this.router.navigateByUrl('/authed/habit-detail');
  }

  onOpenHabit(habit: Habit) {
    if (!habit) return;
    this.singleModeHabit = habit;
    this.showSingleMode = true;
    this.showContent = false;
  }

  onDoneHabit(habit: Habit) {
    console.log('Mark done called for habit:', habit?.id || habit?.title);
  }
}
