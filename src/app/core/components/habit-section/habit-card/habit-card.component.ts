import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgIf, CommonModule, NgForOf } from "@angular/common";
import { RouterModule } from '@angular/router';
import { LongPressDirective } from "../../../directives/gestureControlDirective";
import { MindfulButtonComponent } from "../../mindful-button/mindful-button.component";
import { MindfulPetComponent } from "../../mindful-pet/mindful-pet.component";

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
    MindfulPetComponent,

    MindfulCardHeaderComponent,
    ViewAllComponent,
    RouterModule,
  ]
})
export class HabitCardComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input()
  habit: Habit | null = null;

  @Input()
  mode: 'single' | 'list' | 'recent' = 'single';

  @Input()
  recentHabits: Habit[] = [];

  @Input()
  recentTasks: any[] = [];

  @Input()
  expanded: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  inProgress: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  isEmpty: boolean = true;

  @Input()
  startTime !: number;

  @Input()
  endTime !: number;

  // Properties for list mode
  public currentActive: string = 'all';
  public showContent: boolean = false;

  public isRunningLate: boolean = false;
  public missedTime: boolean = false;
  // public isHabitStarted: boolean = false;

  public habits: Habit[] = [];
  public tasks: any[] = [];
  public hasHabits: boolean = false;
  public hasTasks: boolean = false;
  private habitSubscription?: Subscription;
  private taskSubscription?: Subscription;

  private lastUpdateTime: number = 0;
  percentageCompleted: number = 0;
  progressInterval: any;


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
    private navigationContext: NavigationContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.habitCardService.lastToggled$.subscribe((data: any) => {
      if (!data) return;

      if (data.action && data.time !== this.lastUpdateTime) {
        this.expanded = false;
      }
    });
  }

  startProgress(): void {
    this.clearProgress(); // Clear old timers

    // Initialize percentage to 0 when starting
    this.percentageCompleted = 0;

    // Start progress updater immediately
    this.startProgressUpdater();

    // Also trigger an immediate update to ensure the progress bar starts
    this.percentageCompleted = this.calculateProgressPercentage();
  }

  /**
   * Called when user taps "Let's Go" - set status to ONGOING
   */
  onStartHabit() {
    if (!this.habit) return;

    // Check if this is a task or habit and call the appropriate API
    if (this.habit.type === 'tasks') {
      // Call task API for tasks
      this.taskApi.letsGoTask(this.habit.id).subscribe({
        next: (res: any) => {
          // update local store and UI
          const updated = { ...this.habit!, status: 'ongoing' } as any;
          // For tasks, we might need to update differently
          // You might need to implement a task service similar to habitService
          this.habit = updated;
          // Start progress with proper initialization
          this.startProgress();
          this.loadTodayTasks(); // This might need adjustment for tasks
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to start task', err);
        }
      });
    } else {
      // Call habit API for habits (existing code)
      this.habitApi.letsGoHabit(this.habit.id).subscribe({
        next: (res: any) => {
          // update local store and UI
          const updated = { ...this.habit!, status: 'ongoing' } as Habit;
          this.habitService.updateHabit(updated);
          this.habit = updated;
          // Start progress with proper initialization
          this.startProgress();
          this.loadHabits();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to start habit', err);
        }
      });
    }
  }

  onAbortHabit() {
    this.console.log('Abort habit clicked');
    if (!this.habit) return;

    // Check if this is a task or habit and call the appropriate API
    if (this.habit.type === 'tasks') {
      // Call task API for tasks
      this.taskApi.abortTask(this.habit.id).subscribe({
        next: (res: any) => {
          const updated = { ...this.habit!, status: 'skipped' } as any;
          // For tasks, we might need to update differently
          this.habit = updated;
          // Reset progress when aborting
          this.percentageCompleted = 0;
          this.resetProgress();
          this.loadTodayTasks();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to abort task', err);
        }
      });
    } else {
      // Call habit API for habits (existing code)
      this.habitApi.abortHabit(this.habit.id).subscribe({
        next: (res: any) => {
          const updated = { ...this.habit!, status: 'skipped' } as Habit;
          this.habitService.abortHabit(updated.id);
          this.habit = updated;
          // Reset progress when aborting
          this.percentageCompleted = 0;
          this.resetProgress();
          this.loadHabits();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to abort habit', err);
        }
      });
    }
  }

  resetProgress(): void {
    this.clearProgress();
    this.percentageCompleted = 0;
  }

  clearProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Called when user taps "Done?" - set status to COMPLETED
   */
  onCompleteHabit() {
    if (!this.habit) return;

    // Check if this is a task or habit and call the appropriate API
    if (this.habit.type === 'tasks') {
      // For tasks, use updateTask to mark as completed
      const payload = {
        status: 'completed'
      };

      this.taskApi.completeTask(this.habit.id).subscribe({
        next: (res: any) => {
          const updated = { ...this.habit!, status: 'completed' } as any;
          // For tasks, we might need to update differently
          this.habit = updated;
          // Set progress to 100% when completed
          this.percentageCompleted = 100;
          this.loadTodayTasks();
          this.clearProgress();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to complete task', err);
        }
      });
    } else {
      // Call habit API for habits (existing code)
      this.habitApi.completeHabit(this.habit.id).subscribe({
        next: (res: any) => {
          const updated = { ...this.habit!, status: 'completed' } as Habit;
          this.habitService.completeHabit(updated.id);
          this.habit = updated;
          // Set progress to 100% when completed
          this.percentageCompleted = 100;
          this.loadHabits();
          this.clearProgress();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to complete habit', err);
        }
      });
    }
  }

  /**
   * Calculate progress percentage based on current time relative to start and end times
   * @returns number between 0 and 100 representing completion percentage
   */
  calculateProgressPercentage(): number {
    if (!this.habit) {
      return 0;
    }

    const now = Date.now();
    const start = this.habit.startTimeStamp;
    const end = this.habit.endTimeStamp;

    // If no valid timestamps, return 0
    if (!start || !end) {
      return 0;
    }

    // If not started yet, return 0
    if (now < start) {
      return 0;
    }

    // If already ended, return 100
    if (now > end) {
      return 100;
    }

    // Calculate progress percentage
    const totalTime = end - start;
    const elapsedTime = now - start;
    const percentage = (elapsedTime / totalTime) * 100;

    // Ensure percentage is between 0 and 100
    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * Start periodic updates for progress bar
   */
  startProgressUpdater(): void {
    // Clear any existing interval
    this.clearProgress();

    // Update progress immediately when starting
    this.percentageCompleted = this.calculateProgressPercentage();

    // Update progress every second
    this.progressInterval = setInterval(() => {
      // Update the percentageCompleted property which will trigger change detection
      this.percentageCompleted = this.calculateProgressPercentage();
    }, 1000);
  }

  /**
   * Check if habit/task is currently in progress
   * @returns boolean
   */
  isCurrentlyInProgress(): boolean {
    if (!this.habit) return false;

    const now = Date.now();
    const start = this.habit.startTimeStamp;
    const end = this.habit.endTimeStamp;

    return start <= now && now <= end;
  }

  ngOnInit() {
    console.log('HabitCardComponent ngOnInit, mode:', this.mode);

    // If habit is provided, set properties from it
    if (this.habit) {
      this.startTime = this.habit.startTimeStamp;
      this.endTime = this.habit.endTimeStamp;
      this.inProgress = this.habit.type === 'habits'; // Example, adjust as needed
      this.isEmpty = false;
    }

    // Initialize percentage to 0 for new habits/tasks
    // For ongoing habits, it will be updated when startProgress is called
    this.percentageCompleted = 0;

    if (this.habit?.status === 'ongoing') {
      this.startProgress();
    }

    // If in list mode, load data based on current active tab
    if (this.mode === 'list') {
      this.isEmpty = true; // Default to empty until we know otherwise

      // Load data for current active tab
      this.switchTab(this.currentActive);
    }

    // If in recent mode, check if we have recent habits/tasks (excluding completed ones)
    if (this.mode === 'recent') {
      this.hasHabits = this.filteredRecentHabits.length > 0;
      this.hasTasks = this.filteredRecentTasks.length > 0;
      this.isEmpty = !this.hasHabits && !this.hasTasks;
      this.showContent = !this.isEmpty;

      // Force change detection
      this.cdr.detectChanges();
    }

    // Start progress updater for ongoing habits
    if (this.habit && this.habit.status === 'ongoing') {
      this.startProgressUpdater();
    }

    // Set up interval to periodically check button states
    this.setupButtonStateChecker();
  }

  private buttonStateCheckerInterval: any;

  /**
   * Set up interval to periodically check button states
   */
  private setupButtonStateChecker(): void {
    // Clear any existing interval
    if (this.buttonStateCheckerInterval) {
      clearInterval(this.buttonStateCheckerInterval);
    }

    // Check button states every second
    this.buttonStateCheckerInterval = setInterval(() => {
      // Trigger change detection to update button states
      this.cdr.detectChanges();
    }, 1000);
  }

  ngAfterViewInit(): void {
    // Initialize percentage to 0
    this.percentageCompleted = 0;

    // For ongoing habits, make sure the progress updater is running
    if (this.habit && this.habit.status === 'ongoing') {
      // If progress updater is not running, start it
      if (!this.progressInterval) {
        this.startProgressUpdater();
      }
    }
  }

  ngOnDestroy(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // Clear button state checker interval
    if (this.buttonStateCheckerInterval) {
      clearInterval(this.buttonStateCheckerInterval);
    }

    // Unsubscribe from subscriptions
    if (this.habitSubscription) {
      this.habitSubscription.unsubscribe();
    }

    if (this.taskSubscription) {
      this.taskSubscription.unsubscribe();
    }
  }

  calculatePercentageCompleted() {
    this.percentageCompleted = this.calculateProgressPercentage();

    // Removed manual DOM manipulation to avoid conflicts with Angular binding
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

  ngOnChanges(changes: SimpleChanges) {
    // If in recent mode and recent habits or tasks change, update the display
    if (this.mode === 'recent' && (changes['recentHabits'] || changes['recentTasks'])) {
      this.updateRecentDisplay();
      // Trigger change detection to update button states
      this.cdr.detectChanges();
    }
  }

  /**
   * Update the display when recent habits or tasks change
   */
  public updateRecentDisplay(): void {
    if (this.mode === 'recent') {
      // Use filtered arrays to determine if we have habits/tasks
      this.hasHabits = this.filteredRecentHabits.length > 0;
      this.hasTasks = this.filteredRecentTasks.length > 0;
      this.isEmpty = !this.hasHabits && !this.hasTasks;
      this.showContent = !this.isEmpty;

      // Force change detection
      this.cdr.detectChanges();
    }
  }

  /**
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
        // Trigger change detection to update button states
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching habits:', error);
        this.habits = [];
        this.hasHabits = false;
        this.updateEmptyState();
        // Trigger change detection to update button states
        this.cdr.detectChanges();
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
        // Trigger change detection to update button states
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
        this.hasTasks = false;
        this.updateEmptyState();
        // Trigger change detection to update button states
        this.cdr.detectChanges();
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
        // Trigger change detection to update button states
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
        this.hasTasks = false;
        this.updateEmptyState();
        // Trigger change detection to update button states
        this.cdr.detectChanges();
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

    // For recent mode, we don't need to load data as it's already provided
    // Just update the UI state using filtered arrays
    if (this.mode === 'recent') {
      this.hasHabits = this.filteredRecentHabits.length > 0;
      this.hasTasks = this.filteredRecentTasks.length > 0;
      this.isEmpty = !this.hasHabits && !this.hasTasks;
      this.showContent = !this.isEmpty;
      // Trigger change detection to update button states
      this.cdr.detectChanges();
      return;
    }

    // Load data if needed (for list mode)
    if (tab === 'habits' && this.habits.length === 0) {
      this.loadHabits();
    } else if (tab === 'tasks' && this.tasks.length === 0) {
      this.loadTodayTasks();
    } else if (tab === 'all') {
      if (this.habits.length === 0) this.loadHabits();
      if (this.tasks.length === 0) this.loadTodayTasks();
    }

    this.updateEmptyState();
    // Trigger change detection to update button states
    this.cdr.detectChanges();
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

  calculateAndStartProgress() {
    // Initialize to 0% when starting
    this.percentageCompleted = 0;
    this.calculatePercentage(); // initial fill

    this.progressInterval = setInterval(() => {
      this.calculatePercentage();
      // console log for test
      console.log("Progress:", this.percentageCompleted);

      if (this.percentageCompleted >= 100) {
        this.clearProgress();
      }
    }, 1000); // update every 1 sec
  }

  calculatePercentage() {
    if (!this.habit?.startTimeStamp || !this.habit?.endTimeStamp) return;

    const now = Date.now();
    const start = this.habit.startTimeStamp;
    const end = this.habit.endTimeStamp;
    const total = end - start;
    const completed = now - start;

    this.percentageCompleted =
      Math.min(100, Math.max(0, (completed / total) * 100));

    // Removed manual DOM manipulation to avoid conflicts with Angular binding
    // The percentageCompleted property will automatically update the UI
  }

  showContentNow() {
    this.showContent = true;
  }

  getStatus(): string {
    return (this.habit?.status ?? '').toLowerCase();
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

  getStreak(): number {
    return this.habit && this.habit.streak ? this.habit.streak : 0;
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

  /**
   * Get filtered recent habits excluding completed and skipped ones
   */
  get filteredRecentHabits(): Habit[] {
    if (!this.recentHabits) return [];
    return this.recentHabits.filter(habit => {
      const status = (habit.status || '').toLowerCase();
      return status !== 'completed' && status !== 'skipped';
    });
  }

  /**
   * Get filtered recent tasks excluding completed and skipped ones
   */
  get filteredRecentTasks(): any[] {
    if (!this.recentTasks) return [];
    return this.recentTasks.filter(task => {
      const status = (task.status || '').toLowerCase();
      return status !== 'completed' && status !== 'skipped';
    });
  }

  /**
   * Check if there's any ongoing habit or task in the current list
   */
  private hasAnyOngoingActivity(): boolean {
    // For single mode, check if there are any ongoing activities in the recent lists
    if (this.mode === 'single') {
      // Check recent habits passed from parent
      if (this.recentHabits && this.recentHabits.some(habit =>
        habit.status === 'ongoing')) {
        return true;
      }
      // Check recent tasks passed from parent
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status === 'ongoing')) {
        return true;
      }
    }

    // Check in list mode
    if (this.mode === 'list') {
      // Check habits
      if (this.habits && this.habits.some(habit =>
        habit.status === 'ongoing')) {
        return true;
      }
      // Check tasks
      if (this.tasks && this.tasks.some(task =>
        task.status === 'ongoing')) {
        return true;
      }
    }

    // Check in recent mode
    if (this.mode === 'recent') {
      // Check recent habits
      if (this.recentHabits && this.recentHabits.some(habit =>
        habit.status === 'ongoing')) {
        return true;
      }
      // Check recent tasks
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status === 'ongoing')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if there's any ongoing habit or task in the current list EXCEPT the current habit/task
   */
  private hasOtherOngoingActivity(): boolean {
    // For single mode, check if there are other ongoing activities in the recent lists
    if (this.mode === 'single') {
      // Check recent habits passed from parent (excluding current habit if it exists)
      if (this.recentHabits && this.recentHabits.some(habit =>
        habit.status === 'ongoing' &&
        (!this.habit || habit.id !== this.habit.id))) {
        return true;
      }
      // Check recent tasks passed from parent (excluding current task if it exists)
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status === 'ongoing' &&
        (!this.habit || task.id !== this.habit.id))) {
        return true;
      }
    }

    // Check in list mode
    if (this.mode === 'list') {
      // Check habits (excluding current habit if it exists)
      if (this.habits && this.habits.some(habit =>
        habit.status === 'ongoing' &&
        (!this.habit || habit.id !== this.habit.id))) {
        return true;
      }
      // Check tasks (excluding current task if it exists)
      if (this.tasks && this.tasks.some(task =>
        task.status === 'ongoing' &&
        (!this.habit || task.id !== this.habit.id))) {
        return true;
      }
    }

    // Check in recent mode
    if (this.mode === 'recent') {
      // Check recent habits (excluding current habit if it exists)
      if (this.recentHabits && this.recentHabits.some(habit =>
        habit.status === 'ongoing' &&
        (!this.habit || habit.id !== this.habit.id))) {
        return true;
      }
      // Check recent tasks (excluding current task if it exists)
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status === 'ongoing' &&
        (!this.habit || task.id !== this.habit.id))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the current habit/task is within the "Let's Go" window
   * (5 minutes before start time to 5 minutes after start time)
   */
  private isWithinLetsGoWindow(): boolean {
    if (!this.habit) return false;

    const now = Date.now();
    const startTime = this.habit.startTimeStamp;

    // Check if we're within 5 minutes before or after start time
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (now >= (startTime - fiveMinutes)) && (now <= (startTime + fiveMinutes));
  }

  /**
   * Check if the current time is after the end time
   */
  private isAfterEndTime(): boolean {
    if (!this.habit) return false;

    const now = Date.now();
    const endTime = this.habit.endTimeStamp;

    return now > endTime;
  }

  /**
   * Check if "Let's Go" button should be enabled
   */
  isLetsGoEnabled(): boolean {
    // If there's already another ongoing activity, disable this button
    if (this.hasOtherOngoingActivity()) {
      return false;
    }

    // Check if we're within the "Let's Go" window
    return this.isWithinLetsGoWindow();
  }

  /**
   * Check if "Let's Go" button should be visible
   */
  isLetsGoVisible(): boolean {
    // Hide if we're after end time
    if (this.isAfterEndTime()) {
      return false;
    }

    // Hide if current habit/task is ongoing (show Abort instead)
    if (this.habit && this.habit.status === 'ongoing') {
      return false;
    }

    return true;
  }

  /**
   * Check if "Abort" button should be visible
   */
  isAbortVisible(): boolean {
    // Show abort button only if current habit/task is ongoing
    return !!(this.habit && this.habit.status === 'ongoing');
  }

  /**
   * Check if "Done" button should be enabled
   */
  isDoneEnabled(): boolean {
    // If current habit/task is ongoing, always enable Done button
    if (this.habit && this.habit.status === 'ongoing') {
      return true;
    }

    // If there's already another ongoing activity, disable this button
    if (this.hasOtherOngoingActivity()) {
      return false;
    }

    // Enable if we're NOT within the "Let's Go" window
    return !this.isWithinLetsGoWindow();
  }

}