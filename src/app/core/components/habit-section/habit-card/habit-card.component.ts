import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy } from '@angular/core';
import { NgClass, NgIf, CommonModule, NgForOf } from "@angular/common";
import { RouterModule } from '@angular/router';
import { LongPressDirective } from "../../../directives/gestureControlDirective";
import { MindfulButtonComponent } from "../../mindful-button/mindful-button.component";
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HabitCardService } from 'src/app/core/components/habit-section/habit-card/habit-card.service';
import { HabitApi } from 'src/app/core/api/habit.api';
import { TaskApi } from 'src/app/core/api/task.api';
import { HabitService } from '../habit.service';
import { CoerceBoolean } from "../../../coerceBoolean.decorator";
import { Habit } from '../habit.types';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { Subscription } from 'rxjs';
import { NavigationContextService } from '../../../services/navigation-context.service';

@Component({
  selector: 'habit-card',
  templateUrl: './habit-card.component.html',
  styleUrls: ['./habit-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgClass,
    NgForOf,
    LongPressDirective,
    MindfulButtonComponent,
    MindfulCardHeaderComponent,
    ViewAllComponent,
    RouterModule,
    // MindfulBadgeComponent (not used in template)
  ]
})
export class HabitCardComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input()
  habit: Habit | null = null;

  @Input()
  mode: 'single' | 'list' = 'single';

  @Input()
  expanded: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  inProgress: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  isEmpty: boolean = true;

  @Input()
  percentageCompleted: number = 0;

  @Input()
  startTime !: number;

  @Input()
  endTime !: number;

  // Properties for list mode
  public currentActive: string = 'habits';
  public showContent: boolean = false;

  public isRunningLate: boolean = false;
  public missedTime: boolean = false;
  public isHabitStarted: boolean = false;

  public habits: Habit[] = [];
  public tasks: any[] = [];
  public hasHabits: boolean = false;
  public hasTasks: boolean = false;
  private habitSubscription?: Subscription;
  private taskSubscription?: Subscription;

  private lastUpdateTime: number = 0;

  public maxItemsToShow: number = 4;  // percentageWrapper is inside the single-card template which is rendered conditionally,
  // so query it with static: false and guard access in code.
  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  private _intervalId: any;

  constructor(
    private habitCardService: HabitCardService,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private habitService: HabitService,
    private modalCtrl: ModalController,
    private router: Router,
    private navigationContext: NavigationContextService
  ) {
    this.habitCardService.lastToggled$.subscribe((data: any) => {
      if (!data) return;

      if (data.action && data.time !== this.lastUpdateTime) {
        this.expanded = false;
      }
    });
  }

  /**
   * Called when user taps "Let's Go" - set status to ONGOING
   */
  onStartHabit() {
    if (!this.habit) return;
    // const payload = this.buildUpdatePayload(this.habit, 'ONGOING');
    this.habitApi.letsGoHabit(this.habit.id).subscribe({
      next: (res) => {
        // update local store and UI
        const updated = { ...this.habit!, status: 'ongoing' } as Habit;
        this.habitService.updateHabit(updated);
        this.habit = updated;
        this.isHabitStarted = true;
      },
      error: (err) => {
        console.error('Failed to start habit', err);
      }
    });
  }

  onAbortHabit() {
    this.console.log('Abort habit clicked');
    this.isHabitStarted = true;
  }

  /**
   * Called when user taps "Done?" - set status to COMPLETED
   */
  onCompleteHabit() {
    if (!this.habit) return;
    this.habitApi.completeHabit(this.habit.id).subscribe({
      next: (res) => {
        const updated = { ...this.habit!, status: 'completed' } as Habit;
        this.habitService.completeHabit(updated.id);
        this.habit = updated;
      },
      error: (err) => {
        console.error('Failed to complete habit', err);
      }
    });
  }

  /**
   * Build a payload matching the backend expected shape. Keep other fields intact but set status.
   */
  private buildUpdatePayload(habit: Habit, status: 'ONGOING' | 'COMPLETED' | 'PENDING') {
    // The API expects a top-level structure with 'habit' containing only metadata
    // and scheduling/reward fields at the top level. Match the example payload.
    const routineVal = (habit.selectedRoutine || habit.routine || '')?.toString() || '';
    return {
      habit: {
        title: habit.title,
        tags: habit.tags || [],
        description: habit.notes || '',
        status: status || 'PENDING',
        priority: habit.priority ? habit.priority.toUpperCase() : undefined,
        routine: routineVal ? routineVal.toUpperCase() : undefined
      },
      rewardCoins: habit.coinReward || 0,
      startDate: habit.startDate ? this.formatDateForApi(habit.startDate) : undefined,
      startTime: habit.startTime ? `${habit.startTime}:00` : undefined,
      endDate: habit.endDate ? this.formatDateForApi(habit.endDate) : undefined,
      endTime: habit.endTime ? `${habit.endTime}:00` : undefined,
      everyday: (habit as any).everyday || false,
      daysOfWeek: habit.selectedDays || []
    };
  }

  private formatDateForApi(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Handle long-press (1.5s) by navigating to the habit detail page.
   * If a habit is available, pass it through navigation state so the
   * HabitDetailComponent can receive it via @Input or navigation extras.
   */
  // async onLongPress() {
  //   try {
  //     if (this.habit) {
  //       await this.router.navigateByUrl(`/authed/habit-detail/1'`, { state: { habit: this.habit } } as any);
  //     } else {
  //       await this.router.navigateByUrl(`/authed/habit-detail/1`);
  //     }
  //   } catch (err) {
  //     console.error('Navigation to habit-detail failed', err);
  //   }
  // }

  onLongPress() {
    if (!this.habit?.id) {
      console.warn('No habit ID found for long press');
      return;
    }

    // Simply navigate with the current habit data we already have
    // The detail page will load fresh data if needed
    const itemType = this.habit.type || 'habits';
    const itemId = Number(this.habit.id);

    console.log(`Long press detected - navigating to ${itemType} detail:`, itemId);

    // Push navigation context so callers (habit-input/habit-detail) can return here
    // after edits/deletes. Use the current URL as the returnUrl and include a
    // minimal returnState so navigation back can restore relevant info.
    try {
      this.navigationContext.pushContext(this.router.url, { fromLongPress: true, habitId: this.habit.id, type: itemType }, false);
    } catch (pushErr) {
      console.warn('Failed to push navigation context before long-press navigation', pushErr);
    }

    // Navigate immediately with existing habit data. The detail page will
    // read `history.state` as before to render immediate UI.
    this.router.navigate(['/authed/habit-detail', itemId], {
      state: { habit: this.habit, type: itemType, fromLongPress: true },
      queryParams: { type: itemType }
    }).catch(err => {
      console.error('Navigation to habit detail failed:', err);
    });
  }

  async openHabitPage() {
    // Navigate to the habit page route so the user lands on the full Habit Page
    await this.router.navigateByUrl('/habit-page');
  }

  async openTimeline() {
    // Navigate to the app timeline page. The AuthenticatedModule is mounted at '/authed'
    // so the timeline route is available at '/authed/timeline'.
    await this.router.navigateByUrl('/authed/timeline');
  }

  async openHabitInput() {
    // Store context - habit-card can be on various pages, use current URL
    const currentUrl = this.router.url;
    this.navigationContext.pushContext(currentUrl, { currentActive: this.currentActive }, true);

    // Open the habit input as a modal
    const { HabitInputComponent } = await import('../habit-input/habit-input.component');
    const modal = await this.modalCtrl.create({
      component: HabitInputComponent,
      componentProps: {}
    });
    await modal.present();

    // Reload habits/tasks when modal is dismissed
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.switchTab(this.currentActive);
    }
  }

  ngOnInit() {
    // If habit is provided, set properties from it
    if (this.habit) {
      this.startTime = this.habit.startTimeStamp;
      this.endTime = this.habit.endTimeStamp;
      this.inProgress = this.habit.type === 'habits'; // Example, adjust as needed
      this.isEmpty = false;
    }

    // If in list mode, load data based on current active tab
    if (this.mode === 'list') {
      this.isEmpty = true; // Default to empty until we know otherwise

      // Load data for current active tab
      this.switchTab(this.currentActive);
    }

  }  /**
   * Load habits from the API
   */
  loadHabits() {
    // Get all habits using the service
    // this.habitService.loadHabitsBySearch({}).subscribe({
    this.habitService.loadTodayHabits().subscribe({
      next: () => {
        this.habits = this.habitService.getCurrentHabits()
          .sort((a: Habit, b: Habit) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime; // newest first
          })
          .slice(0, this.maxItemsToShow);
        this.hasHabits = this.habits.length > 0;
        this.updateEmptyState();
      },
      error: (error) => {
        console.error('Error fetching habits:', error);
        this.habits = [];
        this.hasHabits = false;
        this.updateEmptyState();
      }
    });
  }

  /**
   * Load tasks from the API
   */
  loadTasks() {
    this.taskApi.getAllTasks().subscribe({
      next: (tasks) => {
        this.tasks = (tasks || [])
          .map((task: any) => ({
            ...task,
            type: 'tasks',
            startTimeStamp: task.startTimeStamp || (task.startDate ? new Date(task.startDate).getTime() : 0),
            endTimeStamp: task.endTimeStamp || (task.endDate ? new Date(task.endDate).getTime() : 0),
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date()
          }))
          .sort((a: any, b: any) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime; // newest first
          })
          .slice(0, this.maxItemsToShow);

        this.hasTasks = this.tasks.length > 0;
        this.updateEmptyState();
      },
      error: (error) => {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
        this.hasTasks = false;
        this.updateEmptyState();
      }
    });
  }

  loadTodayTasks() {
    this.taskApi.getTodayTasks().subscribe({
      next: (tasks) => {
        this.tasks = (tasks || [])
          .map((task: any) => ({
            ...task,
            type: 'tasks',
            startTimeStamp: task.startTimeStamp || (task.startDate ? new Date(task.startDate).getTime() : 0),
            endTimeStamp: task.endTimeStamp || (task.endDate ? new Date(task.endDate).getTime() : 0),
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date()
          }))
          .sort((a: any, b: any) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime; // newest first
          })
          .slice(0, this.maxItemsToShow);

        this.hasTasks = this.tasks.length > 0;
        this.updateEmptyState();
      },
      error: (error) => {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
        this.hasTasks = false;
        this.updateEmptyState();
      }
    });
  }

  /**
   * Update the empty state based on current tab
   */
  updateEmptyState() {
    if (this.currentActive === 'habits') {
      this.isEmpty = !this.hasHabits;
    } else if (this.currentActive === 'tasks') {
      this.isEmpty = !this.hasTasks;
    } else {
      // 'all' tab
      this.isEmpty = !this.hasHabits && !this.hasTasks;
    }

    this.showContent = !this.isEmpty;
  }

  /**
   * Determines if a habit is currently in progress based on time
   * @param habit The habit to check
   * @returns boolean true if the habit is currently in progress
   */
  isHabitInProgress(habit: Habit): boolean {
    if (!habit) return false;

    const now = new Date().getTime();
    return habit.startTimeStamp <= now && now <= habit.endTimeStamp;
  }

  /**
   * Switch between tabs
   * @param tab The tab to switch to: 'all', 'habits', or 'tasks'
   */
  switchTab(tab: string) {
    this.currentActive = tab;

    // Load data if needed
    if (tab === 'habits' && this.habits.length === 0) {
      this.loadHabits();
    } else if (tab === 'tasks' && this.tasks.length === 0) {
      this.loadTodayTasks();
    } else if (tab === 'all') {
      if (this.habits.length === 0) this.loadHabits();
      if (this.tasks.length === 0) this.loadTodayTasks();
    }

    this.updateEmptyState();
  } ngAfterViewInit(): void {
    // run calculation after view (and the percentageWrapper element) is available
    this.calculatePercentageCompleted();
    this._intervalId = setInterval(() => {
      this.calculatePercentageCompleted();
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }

    // Unsubscribe from subscriptions
    if (this.habitSubscription) {
      this.habitSubscription.unsubscribe();
    }

    if (this.taskSubscription) {
      this.taskSubscription.unsubscribe();
    }
  } calculatePercentageCompleted() {
    if (this.startTime < new Date().getTime()) {
      let duration = this.endTime - this.startTime;
      this.percentageCompleted = Math.floor((new Date().getTime() - this.startTime) / duration * 100);

      if (this.percentageCompleted > 100) {
        this.percentageCompleted = 100;
      }
      if (this.percentageCompleted < 0) {
        this.percentageCompleted = 0;
      }

      this.percentageCompleted = Math.floor(this.percentageCompleted);
      // Guard the element reference in case the template didn't render the single-card view
      if (this.percentageWrapper && this.percentageWrapper.nativeElement) {
        this.percentageWrapper.nativeElement.style.width = `calc(${this.percentageCompleted}% - var(--card_offset) - 4px)`;
      }

      if (!this.inProgress) {
        if (this.endTime < new Date().getTime()) {
          this.missedTime = true;
        } else {
          this.isRunningLate = true;
        }
      }
    }
  }

  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.lastUpdateTime = new Date().getTime();
      this.habitCardService.updatelast({
        time: this.lastUpdateTime,
        action: true
      })
    }
  }

  showContentNow() {
    this.showContent = true;
  }

  protected readonly console = console;

  getFormattedTime(time: number) {
    if (!time) {
      return '00:00';
    }

    try {
      const date = new Date(time);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '00:00';
    }
  }

  formatTimeString(t?: string | null): string {
    if (!t) return '';
    const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m) {
      const hh = m[1].padStart(2, '0');
      const mm = m[2];
      return `${hh}:${mm}`;
    }
    return t.slice(0, 5);
  }

  /**
   * Safely get the first tag or routine name
   */
  getTagOrRoutine(): string {
    if (this.habit && this.habit.tags && Array.isArray(this.habit.tags) && this.habit.tags.length > 0) {
      return this.habit.tags[0];
    } else if (this.habit && this.habit.selectedRoutine) {
      return this.habit.selectedRoutine;
    } else {
      return 'Routine';
    }
  }

  getRoutine(): string {
    // Handle both routine and selectedRoutine from backend
    if (this.habit) {
      const routine = this.habit.routine || this.habit.selectedRoutine;
      if (routine) {
        return routine.toUpperCase();
      }
    }
    return '';
  }

  /**
   * Safely get the coin reward
   */
  getCoinReward(): number {
    return this.habit && this.habit.coinReward ? this.habit.coinReward : 0;
  }

  /**
   * Return the asset path for the routine icon based on habit.routine or habit.selectedRoutine.
   * Accepts values like 'MORNING', 'EVENING', 'NIGHT' from backend. Falls back to Morning.
   */
  getRoutineIcon(): string {
    try {
      // Get routine from either routine or selectedRoutine field
      const routineValue = this.habit?.routine || this.habit?.selectedRoutine;
      if (!routineValue) {
        return '/assets/Icons-Neutral/Icon-Routine-Morning.png';
      }

      // Convert to lowercase and capitalize first letter for filename
      const routine = String(routineValue).toLowerCase();
      const capitalizedRoutine = routine.charAt(0).toUpperCase() + routine.slice(1);
      const fileName = `Icon-Routine-${capitalizedRoutine}.png`;

      return `/assets/Icons-Neutral/${fileName}`;
    } catch (e) {
      console.error('Error getting routine icon:', e);
      return '/assets/Icons-Neutral/Icon-Routine-Morning.png';
    }
  }
}
