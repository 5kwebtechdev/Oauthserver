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
  public journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'all' = 'pending';
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
    clearInterval(this.timestampInterval);
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.applyFilters();
    this.loadTasksForSelectedDate(date);
  }
  loadHabits() {
    this.loading = true;
    this.subscriptions.add(
      this.habitService.loadTodayHabits().subscribe({
        next: (res: any) => {
          console.log("LOADED HABITS:", this.allHabits);

          this.allHabits = res?.data?.map((h: any) => ({
            ...h,
            status: h.status?.trim().toLowerCase(),
            priority: h.priority?.trim().toLowerCase(),
            routine: h.routine?.trim().toLowerCase(),
          })) || [];

          this.loading = false;
          this.applyFilters();

        },
        error: () => {
          this.loading = false;
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
    this.applyFilters();
  }
  selectPrioritySubFilter(filter: any) {
    this.prioritySubFilter = filter;
    this.applyFilters();
  }
  selectRoutineSubFilter(filter: any) {
    this.routineSubFilter = filter;
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

    switch (this.subFilter) {
      case 'journey':
        if (this.journeySubFilter !== 'all') {
          list = list.filter(h => h.status === this.journeySubFilter);
        }
        break;

      case 'priorities':
        if (this.prioritySubFilter !== 'all') {
          list = list.filter(h => (h.priority || '').toLowerCase() === this.prioritySubFilter);
        }
        break;

      case 'routine':
        if (this.routineSubFilter !== 'all') {
          list = list.filter(h => (h.routine || '').toLowerCase() === this.routineSubFilter);
        }
        break;

      default:
        // 'all' => no extra filter
        break;
    }

    return list;
  }


  private filterTasks(): any[] {
    let list = [...this.tasks];
    const now = Date.now();

    switch (this.subFilter) {
      case 'journey':
        if (this.journeySubFilter === 'pending')
          list = list.filter(t => t.startTimeStamp > now);

        if (this.journeySubFilter === 'ongoing')
          list = list.filter(t => t.startTimeStamp <= now && t.endTimeStamp >= now);

        if (this.journeySubFilter === 'completed')
          list = list.filter(t => t.endTimeStamp < now);
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

    return habits.filter(h => {
      const start = h.startDate ? new Date(h.startDate) : selected;
      const end = h.endDate ? new Date(h.endDate) : selected;
      return start <= selected &&
        selected <= end &&
        (h.selectedDays?.includes(day) ?? true);
    });
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
