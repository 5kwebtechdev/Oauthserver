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
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { CoerceBoolean } from "../../../coerceBoolean.decorator";
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
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

  /**
   * Optional input that allows parent components to force parent-mode behavior.
   * When defined, this value takes precedence over internal user profile detection.
   */
  @Input()
  isParentOverride?: boolean;

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
  // Local flag to show timer icon only for this card when user clicked "Let's Go"
  public showLocalTimer: boolean = false;
  // Flag set when logged in user is a parent (can be overridden by `isParentOverride` input)
  public isParent: boolean = false;

  // Auto-reload timers
  private letsGoWindowTimer: any;
  private endTimeTimer: any;

  public maxItemsToShow: number = 4;  // percentageWrapper is inside the single-card template which is rendered conditionally,
  // so query it with static: false and guard access in code.
  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  private _intervalId: any;
  private userProfileSubscription?: Subscription;

  constructor(
    private habitCardService: HabitCardService,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private habitService: HabitService,
    private modalCtrl: ModalController,
    private router: Router,
    private navigationContext: NavigationContextService,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private buttonLogic: HabitButtonLogicService
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

    // Calculate actual percentage based on current time (don't reset to 0)
    this.percentageCompleted = this.calculateProgressPercentage();

    // Start progress updater to keep it updating every second
    this.startProgressUpdater();
  }

  /**
   * Called when user taps "Let's Go" - set status to ONGOING
   */
  onStartHabit() {
    if (!this.habit) return;

    // Check if Let's Go is enabled (within 5 min window)
    if (!this.isLetsGoEnabled()) {
      console.log('Let\'s Go button is not enabled yet');
      return;
    }

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
          // Store the start time in localStorage for progress persistence
          this.saveOngoingState();
          // Start progress with proper initialization
          // Show timer icon locally for this card since user pressed Let's Go
          this.showLocalTimer = true;
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
          // Store the start time in localStorage for progress persistence
          this.saveOngoingState();
          // Show timer icon locally for this card since user pressed Let's Go
          this.showLocalTimer = true;
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
    if (!this.habit) return;

    // Check if this is a task or habit and call the appropriate API
    if (this.habit.type === 'tasks') {
      // Call task API for tasks
      this.taskApi.abortTask(this.habit.id).subscribe({
        next: (res: any) => {
          // Reset to pending state so card stays on Home and acts like a fresh activity
          const updated = { ...this.habit!, status: 'pending' } as any;
          this.habit = updated;
          // Clear the saved ongoing state
          this.clearOngoingState();
          // Reset progress when aborting
          this.percentageCompleted = 0;
          this.resetProgress();
          // Hide local timer icon for this card
          this.showLocalTimer = false;
          this.loadTodayTasks();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to abort task', err);
        }
      });
    } else {
      // Call habit API for habits
      this.habitApi.abortHabit(this.habit.id).subscribe({
        next: (res: any) => {
          // Reset to pending state so card stays on Home and acts like a fresh activity
          const updated = { ...this.habit!, status: 'pending' } as Habit;
          this.habitService.abortHabit(updated.id);
          this.habit = updated;
          // Clear the saved ongoing state
          this.clearOngoingState();
          // Reset progress when aborting
          this.percentageCompleted = 0;
          this.resetProgress();
          // Hide local timer icon for this card
          this.showLocalTimer = false;
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
   * Save ongoing state to localStorage for persistence across sessions
   */
  private saveOngoingState(): void {
    if (!this.habit) return;
    
    const key = `ongoing_${this.habit.type}_${this.habit.id}`;
    const state = {
      startedAt: Date.now(),
      habitStartTime: this.habit.startTimeStamp,
      habitEndTime: this.habit.endTimeStamp
    };
    localStorage.setItem(key, JSON.stringify(state));
  }

  /**
   * Clear ongoing state from localStorage
   */
  private clearOngoingState(): void {
    if (!this.habit) return;
    
    const key = `ongoing_${this.habit.type}_${this.habit.id}`;
    localStorage.removeItem(key);
  }

  /**
   * Restore ongoing state from localStorage if available
   */
  private restoreOngoingState(): void {
    if (!this.habit) return;
    
    const key = `ongoing_${this.habit.type}_${this.habit.id}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const state = JSON.parse(stored);
        // Verify that the stored state is still valid (same day, etc.)
        if (state.habitStartTime === this.habit.startTimeStamp && 
            state.habitEndTime === this.habit.endTimeStamp) {
          // State is valid, start progress if habit is ongoing
          if (this.habit.status?.toLowerCase() === 'ongoing') {
            this.showLocalTimer = true;
            this.startProgress();
          }
        } else {
          // State is outdated, clear it
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Error restoring ongoing state:', e);
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Called when user taps "Done?" - set status to COMPLETED
   */
  onCompleteHabit() {
    if (!this.habit) return;

    // Check if Done button is enabled (for non-skipped status)
    const status = this.habit.status?.toLowerCase();
    if (status !== 'skipped' && !this.isDoneEnabled()) {
      console.log('Done button is not enabled - need to click Let\'s Go first');
      return;
    }

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
          // Clear the saved ongoing state
          this.clearOngoingState();
          // Set progress to 100% when completed
          this.percentageCompleted = 100;
          // Hide local timer icon for this card when completed
          this.showLocalTimer = false;
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
          // Clear the saved ongoing state
          this.clearOngoingState();
          // Set progress to 100% when completed
          this.percentageCompleted = 100;
          // Hide local timer icon for this card when completed
          this.showLocalTimer = false;
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
   */
  calculateProgressPercentage(): number {
    if (!this.habit) return 0;

    // Ensure we have timestamps - calculate from date+time if missing
    let start = this.habit.startTimeStamp;
    let end = this.habit.endTimeStamp;

    if (!start || !end) {
      const ts = this.buttonLogic.calculateTimestamps(this.habit);
      start = start || ts.startTimeStamp;
      end = end || ts.endTimeStamp;
    }

    if (!start || !end || start >= end) return 0;

    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;

    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
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

    // If habit is provided, set properties from it
    if (this.habit) {
      // Calculate timestamps from date+time if not present
      const ts = this.buttonLogic.calculateTimestamps(this.habit);
      this.habit.startTimeStamp = this.habit.startTimeStamp || ts.startTimeStamp;
      this.habit.endTimeStamp = this.habit.endTimeStamp || ts.endTimeStamp;

      this.startTime = this.habit.startTimeStamp;
      this.endTime = this.habit.endTimeStamp;
      this.inProgress = this.habit.type === 'habits';
      this.isEmpty = false;
    }

    // For ongoing habits, calculate the actual percentage based on elapsed time
    // Don't initialize to 0 - this allows the progress bar to show correct state on page refresh
    if (this.habit?.status?.toLowerCase() === 'ongoing') {
      // Restore any saved ongoing state from localStorage (for session persistence)
      this.restoreOngoingState();
      // Calculate actual progress immediately based on startTime and endTime
      this.percentageCompleted = this.calculateProgressPercentage();
      this.startProgress();
      // Show timer icon and bubble for ongoing habits (persists across reloads)
      this.showLocalTimer = true;
    } else {
      // For non-ongoing habits, initialize to 0
      this.percentageCompleted = 0;
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
    if (this.habit && this.habit.status?.toLowerCase() === 'ongoing') {
      this.startProgressUpdater();
    }

    // Subscribe to user profile to detect parent relationship and hide certain CTAs
    this.userProfileSubscription = this.userService.userProfile$.subscribe(profile => {
      if (this.isParentOverride === undefined) {
        const profileIsParent = !!(profile && (profile.relationship || '').toString().toUpperCase() === 'PARENT');
        const authIsParent = !!this.authService && this.authService.isParentUser && this.authService.isParentUser();
        this.isParent = profileIsParent || authIsParent;
      } else {
        this.isParent = !!this.isParentOverride;
      }
      // Ensure template updates
      this.cdr.detectChanges();
    });

    // Fallback: some flows set role in sessionStorage/localStorage (e.g., `signup_role`) or store user_profile
    // Check those places in case the UserService observable is not populated yet.
    try {
      let signupRole = sessionStorage.getItem('signup_role') || localStorage.getItem('signup_role');
      if (!signupRole) {
        const stored = localStorage.getItem('user_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          signupRole = (parsed && (parsed.relationship || parsed.role)) ? (parsed.relationship || parsed.role) : signupRole;
        }
      }

      if (this.isParentOverride === undefined) {
        if (signupRole && signupRole.toString().toUpperCase() === 'PARENT') {
          this.isParent = true;
          this.cdr.detectChanges();
        }
      } else {
        this.isParent = !!this.isParentOverride;
        this.cdr.detectChanges();
      }

    // Also check AuthService if available (authoritative logged-in role stored under user_data)
      try {
        if (this.isParentOverride === undefined) {
          const authParent = this.authService && this.authService.isParentUser && this.authService.isParentUser();
          if (authParent) {
            this.isParent = true;
            this.cdr.detectChanges();
          }
        } else {
          this.isParent = !!this.isParentOverride;
          this.cdr.detectChanges();
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore parsing errors
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

    // Set up auto-reload timers for key time points
    this.setupAutoReloadTimers();
  }

  /**
   * Set up timers to automatically reload habits/tasks at key time points:
   * 1. When "Let's Go" window opens (5 min before start time)
   * 2. When activity ends (at end time)
   */
  private setupAutoReloadTimers(): void {
    // Clear any existing timers
    this.clearAutoReloadTimers();

    // Only set up timers for list or recent mode
    if (this.mode !== 'list' && this.mode !== 'recent') {
      return;
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const upcomingEvents: { time: number, type: 'letsgo' | 'end' }[] = [];

    // Check all habits and tasks in list or recent mode
    const allActivities = [...this.habits, ...this.tasks, ...this.recentHabits, ...this.recentTasks];

    allActivities.forEach(activity => {
      if (activity && activity.startTimeStamp && activity.endTimeStamp) {
        const letsGoWindowStart = activity.startTimeStamp - fiveMinutes;
        if (now < letsGoWindowStart) {
          upcomingEvents.push({ time: letsGoWindowStart, type: 'letsgo' });
        }
        if (now < activity.endTimeStamp) {
          upcomingEvents.push({ time: activity.endTimeStamp, type: 'end' });
        }
      }
    });

    // Find the next upcoming event (earliest time)
    if (upcomingEvents.length > 0) {
      upcomingEvents.sort((a, b) => a.time - b.time);
      const nextEvent = upcomingEvents[0];
      const timeUntilEvent = nextEvent.time - now;

      // Set a single timer for the next event
      this.letsGoWindowTimer = setTimeout(() => {
        this.reloadData();
        // After reloading, set up timers again for next events
        this.setupAutoReloadTimers();
      }, timeUntilEvent);
    }
  }

  /**
   * Clear auto-reload timers
   */
  private clearAutoReloadTimers(): void {
    if (this.letsGoWindowTimer) {
      clearTimeout(this.letsGoWindowTimer);
      this.letsGoWindowTimer = null;
    }
    if (this.endTimeTimer) {
      clearTimeout(this.endTimeTimer);
      this.endTimeTimer = null;
    }
  }

  /**
   * Reload habits and tasks based on current mode
   */
  private reloadData(): void {
    if (this.mode === 'list') {
      // Reload based on current active tab
      if (this.currentActive === 'habits') {
        this.loadHabits();
      } else if (this.currentActive === 'tasks') {
        this.loadTodayTasks();
      } else {
        // Load both for 'all' tab
        this.loadHabits();
        this.loadTodayTasks();
      }
    } else if (this.mode === 'recent') {
      // In recent mode, parent component provides data
      // Trigger change detection to update filtered lists
      this.updateRecentDisplay();
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    // Don't reset percentage here - it's already calculated in ngOnInit
    // For ongoing habits, ensure the progress updater is running
    if (this.habit && this.habit.status?.toLowerCase() === 'ongoing') {
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

    // Clear auto-reload timers
    this.clearAutoReloadTimers();

    // Unsubscribe from subscriptions
    if (this.habitSubscription) {
      this.habitSubscription.unsubscribe();
    }

    if (this.taskSubscription) {
      this.taskSubscription.unsubscribe();
    }

    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
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


  onLongPress() {
    if (!this.habit?.id) {
      return;
    }

    const itemType = this.habit.type || 'habits';
    const itemId = Number(this.habit.id);


    try {
      this.navigationContext.pushContext(this.router.url, { fromLongPress: true, habitId: this.habit.id, type: itemType }, false);
    } catch (pushErr) {
      console.warn('Failed to push navigation context before long-press navigation', pushErr);
    }

    this.router.navigate(['/authed/habit-detail', itemId], {
      state: { habit: this.habit, type: itemType, fromLongPress: true },
      queryParams: { type: itemType }
    }).catch(err => {
      console.error('Navigation to habit detail failed:', err);
    });
  }

  async openHabitPage() {
    await this.router.navigateByUrl('/habit-page');
  }

  async openTimeline() {
    await this.router.navigateByUrl('/authed/timeline');
  }

  async openHabitInput() {
    const currentUrl = this.router.url;
    this.navigationContext.pushContext(currentUrl, { currentActive: this.currentActive }, true);

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

  async openTimer() {
    if (!this.habit) return;

    const { SupermeTimerComponent } = await import('../../superme-timer/superme-timer.component');
    const modal = await this.modalCtrl.create({
      component: SupermeTimerComponent,
      componentProps: {
        startTime: this.startTime || this.habit.startTimeStamp,
        endTime: this.endTime || this.habit.endTimeStamp,
        title: this.habit.title || ''
      }
    });
    await modal.present();
  }

  ngOnChanges(changes: SimpleChanges) {
    // If a parent override is passed from a parent component, apply it immediately
    if (changes['isParentOverride']) {
      this.isParent = !!changes['isParentOverride'].currentValue;
      this.cdr.detectChanges();
    }
    // If in recent mode and recent habits or tasks change, update the display
    if (this.mode === 'recent' && (changes['recentHabits'] || changes['recentTasks'])) {
      this.updateRecentDisplay();
      // Trigger change detection to update button states
      this.cdr.detectChanges();
      // Re-setup auto-reload timers with new data
      this.setupAutoReloadTimers();
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
          .map((habit: Habit) => ({
            ...habit,
            // Normalize status to lowercase for consistency
            status: habit.status ? habit.status.toLowerCase() as any : 'pending'
          }))
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
        // Re-setup auto-reload timers after loading new habits
        this.setupAutoReloadTimers();
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
          .map((task: any) => {
            // Combine date and time to create proper timestamps
            // Always recalculate from date+time to ensure accuracy
            const startTimeStr = task.startTime || '00:00:00';
            const endTimeStr = task.endTime || '23:59:59';
            const startDateStr = task.startDate || new Date().toISOString().split('T')[0];
            const endDateStr = task.endDate || startDateStr;
            
            // Calculate proper timestamps using date + time combination
            const calculatedStartTimeStamp = this.combineDateAndTime(startDateStr, startTimeStr);
            const calculatedEndTimeStamp = this.combineDateAndTime(endDateStr, endTimeStr);
            
            return {
              ...task,
              type: 'tasks',
              // Always use calculated timestamps when we have startTime/endTime strings
              startTimeStamp: (task.startTime && task.startDate) ? calculatedStartTimeStamp : (task.startTimeStamp || calculatedStartTimeStamp),
              endTimeStamp: (task.endTime && task.endDate) ? calculatedEndTimeStamp : (task.endTimeStamp || calculatedEndTimeStamp),
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              // Normalize status to lowercase for consistency
              status: task.status ? task.status.toLowerCase() : 'pending'
            };
          })
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
          .map((task: any) => {
            // Combine date and time to create proper timestamps
            // Always recalculate from date+time to ensure accuracy
            const startTimeStr = task.startTime || '00:00:00';
            const endTimeStr = task.endTime || '23:59:59';
            const startDateStr = task.startDate || new Date().toISOString().split('T')[0];
            const endDateStr = task.endDate || startDateStr;
            
            // Calculate proper timestamps using date + time combination
            const calculatedStartTimeStamp = this.combineDateAndTime(startDateStr, startTimeStr);
            const calculatedEndTimeStamp = this.combineDateAndTime(endDateStr, endTimeStr);
            
            return {
              ...task,
              type: 'tasks',
              // Always use calculated timestamps when we have startTime/endTime strings
              startTimeStamp: (task.startTime && task.startDate) ? calculatedStartTimeStamp : (task.startTimeStamp || calculatedStartTimeStamp),
              endTimeStamp: (task.endTime && task.endDate) ? calculatedEndTimeStamp : (task.endTimeStamp || calculatedEndTimeStamp),
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              // Normalize status to lowercase for consistency
              status: task.status ? task.status.toLowerCase() : 'pending'
            };
          })
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

    // Re-setup auto-reload timers after data changes
    this.setupAutoReloadTimers();
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
    const status = (this.habit?.status ?? '').toLowerCase();
    if (this.habit?.title) {
    }
    return status;
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
        habit.status?.toLowerCase() === 'ongoing')) {
        return true;
      }
      // Check recent tasks passed from parent
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status?.toLowerCase() === 'ongoing')) {
        return true;
      }
    }

    // Check in list mode
    if (this.mode === 'list') {
      // Check habits
      if (this.habits && this.habits.some(habit =>
        habit.status?.toLowerCase() === 'ongoing')) {
        return true;
      }
      // Check tasks
      if (this.tasks && this.tasks.some(task =>
        task.status?.toLowerCase() === 'ongoing')) {
        return true;
      }
    }

    // Check in recent mode
    if (this.mode === 'recent') {
      // Check recent habits
      if (this.recentHabits && this.recentHabits.some(habit =>
        habit.status?.toLowerCase() === 'ongoing')) {
        return true;
      }
      // Check recent tasks
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status?.toLowerCase() === 'ongoing')) {
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
        habit.status?.toLowerCase() === 'ongoing' &&
        (!this.habit || habit.id !== this.habit.id))) {
        return true;
      }
      // Check recent tasks passed from parent (excluding current task if it exists)
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status?.toLowerCase() === 'ongoing' &&
        (!this.habit || task.id !== this.habit.id))) {
        return true;
      }
    }

    // Check in list mode
    if (this.mode === 'list') {
      // Check habits (excluding current habit if it exists)
      if (this.habits && this.habits.some(habit =>
        habit.status?.toLowerCase() === 'ongoing' &&
        (!this.habit || habit.id !== this.habit.id))) {
        return true;
      }
      // Check tasks (excluding current task if it exists)
      if (this.tasks && this.tasks.some(task =>
        task.status?.toLowerCase() === 'ongoing' &&
        (!this.habit || task.id !== this.habit.id))) {
        return true;
      }
    }

    // Check in recent mode
    if (this.mode === 'recent') {
      // Check recent habits (excluding current habit if it exists)
      if (this.recentHabits && this.recentHabits.some(habit =>
        habit.status?.toLowerCase() === 'ongoing' &&
        (!this.habit || habit.id !== this.habit.id))) {
        return true;
      }
      // Check recent tasks (excluding current task if it exists)
      if (this.recentTasks && this.recentTasks.some(task =>
        task.status?.toLowerCase() === 'ongoing' &&
        (!this.habit || task.id !== this.habit.id))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if "Let's Go" button should be enabled
   */
  isLetsGoEnabled(): boolean {
    return this.buttonLogic.isLetsGoEnabled(this.habit, this.hasOtherOngoingActivity());
  }

  /**
   * Check if "Let's Go" button should be visible
   */
  isLetsGoVisible(): boolean {
    return this.buttonLogic.isLetsGoVisible(this.habit);
  }

  /**
   * Check if "Abort" button should be visible
   */
  isAbortVisible(): boolean {
    return this.buttonLogic.isAbortVisible(this.habit);
  }

  /**
   * Check if "Done" button should be enabled
   */
  isDoneEnabled(): boolean {
    return this.buttonLogic.isDoneEnabled(this.habit);
  }

  /**
   * Combine date string (YYYY-MM-DD) with time string (HH:MM:SS or HH:MM) to create timestamp
   */
  private combineDateAndTime(dateStr: string, timeStr: string): number {
    return this.buttonLogic.combineDateAndTime(dateStr, timeStr);
  }

}