import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgIf, CommonModule, NgForOf } from "@angular/common";
import { RouterModule } from '@angular/router';
import { LongPressDirective } from "../../../directives/gestureControlDirective";
import { SupermeButtonComponent } from "../../superme-button/superme-button.component";
import { SupermePopupComponent, SupermePopupConfig, SupermePopupCTA } from '../../superme-popup/superme-popup.component';

import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HabitCardService } from 'src/app/core/components/activity-section/activity-card/activity-card.service';
import { HabitApi } from 'src/app/core/api/habit.api';
import { TaskApi } from 'src/app/core/api/task.api';
import { CalendarService } from '../../../services/calendar.service';
import { HabitService } from '../habit.service';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { AutoAbortService } from '../auto-abort.service';
import { CoerceBoolean } from "../../../coerceBoolean.decorator";
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgClass,
    NgForOf,
    LongPressDirective,
    SupermeButtonComponent,

    SupermeCardHeaderComponent,
    ViewAllComponent,
    RouterModule,
    SupermePopupComponent,
    EmptyStateComponent,
  ]
})
export class ActivityCardComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

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
   * Optional input for total tasks (alias for totalTasksLoaded)
   */
  @Input()
  set totalTasks(value: number) {
    this.totalTasksLoaded = value;
  }

  /**
   * Optional input for total tasks loaded from API
   */
  @Input()
  totalTasksLoaded: number = 0;

  /**
   * Optional input for total tasks completed
   */
  @Input()
  totalTasksCompleted: number = 0;

  /**
   * Optional input for total habits (alias for totalHabitsLoaded)
   */
  @Input()
  set totalHabits(value: number) {
    this.totalHabitsLoaded = value;
  }

  /**
   * Optional input for total habits loaded from API
   */
  @Input()
  totalHabitsLoaded: number = 0;

  /**
   * Optional input for total habits completed
   */
  @Input()
  totalHabitsCompleted: number = 0;

  /**
   * Optional input for task completion rate (0-100)
   */
  @Input()
  taskCompletionRate: number = 0;

  /**
   * Optional input for habit completion rate (0-100)
   */
  @Input()
  habitCompletionRate: number = 0;

  /**
   * Optional input that allows parent components to force parent-mode behavior.
   * When defined, this value takes precedence over internal user profile detection.
   */
  @Input()
  isParentOverride?: boolean;

  /**
   * Optional input to indicate if viewing today's date (for activity-calendar and activity-page).
   * When false (viewing past or future dates), CTA buttons will be hidden.
   * Default is true to show buttons.
   */
  @Input({ transform: booleanAttribute })
  isCurrentDateView: boolean = true;

  /**
   * When true, fires POST /tasks-habits-track/add on Done completion.
   * Only enable from the calendar page — not the dashboard.
   */
  @Input({ transform: booleanAttribute })
  trackOnComplete: boolean = false;
  /**
   * Optional input for the selected date (used when long-pressing to view details)
   * Format: YYYY-MM-DD
   */
  @Input()
  selectedDate?: string;


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
  // Flags to control task-specific empty states
  public taskAllDoneComputed: boolean = false;
  // Flags to control habit-specific empty states
  public habitAllDoneComputed: boolean = false;
  private habitSubscription?: Subscription;
  private taskSubscription?: Subscription;

  private lastUpdateTime: number = 0;
  percentageCompleted: number = 0;
  progressInterval: any;
  // Local flag to show timer icon only for this card when user clicked "Let's Go"
  public showLocalTimer: boolean = false;
  // Local flag to show the short-lived "Start focus timer" bubble
  public showStartBubble: boolean = false;

  // Popup state for start confirmation
  public showStartPopup: boolean = false;
  public startPopupConfig: SupermePopupConfig = {};
  
  // Complete popup state
  public showCompletePopup: boolean = false;
  public completePopupConfig: SupermePopupConfig = {};
  // Flag set when logged in user is a parent (can be overridden by `isParentOverride` input)
  public isParent: boolean = false;

  // Auto-reload timers
  private letsGoWindowTimer: any;
  private endTimeTimer: any;
  private startBubbleTimer: any;

  public maxItemsToShow: number = 4;  // percentageWrapper is inside the single-card template which is rendered conditionally,
  // so query it with static: false and guard access in code.
  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  private _intervalId: any;
  private userProfileSubscription?: Subscription;

  constructor(
    private habitCardService: HabitCardService,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private calendarService: CalendarService,
    private habitService: HabitService,
    private modalCtrl: ModalController,
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private authApiService: AuthApi,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private buttonLogic: HabitButtonLogicService,
    private autoAbortService: AutoAbortService
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
          this.autoAbortService.scheduleAutoAbort({
            id: this.habit!.id,
            type: 'tasks',
            endTimeStamp: this.habit!.endTimeStamp
          });
          // Start progress with proper initialization
          // Show timer icon locally for this card since user pressed Let's Go
          this.showLocalTimer = true;
          // Show the short-lived start bubble for 3s
          if (!this.showStartBubble) {
            if (this.startBubbleTimer) {
              clearTimeout(this.startBubbleTimer);
              this.startBubbleTimer = null;
            }
            this.showStartBubble = true;
            this.startBubbleTimer = setTimeout(() => {
              this.showStartBubble = false;
              this.startBubbleTimer = null;
              this.cdr.detectChanges();
            }, 10000);
          }
          this.startProgress();
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            this.calendarService.clearCache(formatted, 'day');
          } catch (e) { /* ignore */ }
          this.loadTodayTasks(); // This might need adjustment for tasks
          // Notify that a task was started so dashboard refreshes
          this.habitService.notifyTaskStarted();
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
          this.autoAbortService.scheduleAutoAbort({
            id: this.habit!.id,
            type: 'habits',
            endTimeStamp: this.habit!.endTimeStamp
          });
          // Show timer icon locally for this card since user pressed Let's Go
          this.showLocalTimer = true;
          // Show the short-lived start bubble for 3s
          if (!this.showStartBubble) {
            if (this.startBubbleTimer) {
              clearTimeout(this.startBubbleTimer);
              this.startBubbleTimer = null;
            }
            this.showStartBubble = true;
            this.startBubbleTimer = setTimeout(() => {
              this.showStartBubble = false;
              this.startBubbleTimer = null;
              this.cdr.detectChanges();
            }, 3000);
          }
          // Start progress with proper initialization
          this.startProgress();
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            this.calendarService.clearCache(formatted, 'day');
          } catch (e) { /* ignore */ }
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

  /**
   * Open the start-confirmation popup for Let's Go
   */
  openStartPopup() {
    // Configure popup content (image, heading, subtitle, CTAs)
    const primary: SupermePopupCTA = {
      text: 'Start Now',
      buttonStyle: 'green',
      buttonMedium: true,
      // callback intentionally omitted; handled via (primaryAction) output
    };

    const secondary: SupermePopupCTA = {
      text: 'Discard',
      buttonStyle: 'bronze-transparent',
      buttonMedium: true,
      // callback intentionally omitted; handled via (secondaryAction) output
    };

    this.startPopupConfig = {
      image: 'assets/Images-Transparent/Image-Home-Start.png',
      imageAlt: 'Ready to Start',
      heading: 'Ready to Start?',
      subtitle: "You're about to begin this habit!",
      primaryCTA: primary,
      secondaryCTA: secondary,
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'row'
    };

    this.showStartPopup = true;
  }

  closeStartPopup() {
    this.showStartPopup = false;
  }

  handlePopupPrimary() {
    // Show the start bubble immediately for 3s and show local timer icon
    if (this.startBubbleTimer) {
      clearTimeout(this.startBubbleTimer);
      this.startBubbleTimer = null;
    }
    this.showLocalTimer = true;
    this.showStartBubble = true;
    this.startBubbleTimer = setTimeout(() => {
      this.showStartBubble = false;
      this.startBubbleTimer = null;
      this.cdr.detectChanges();
    }, 3000);

    this.onStartHabit();
    this.closeStartPopup();
  }

  handlePopupSecondary() {
    this.closeStartPopup();
  }

  /**
   * Open the completion confirmation popup for Done?
   */
  openCompletePopup() {
    const coins = this.getCoinReward();
    const streak = this.getStreak();

    // Build heading HTML to include coin and streak rows
    const headingHtml = `Great Work!<br/><span style="font-weight:400;font-size:16px;">You're about to mark this activity as completed<br/>Confirm below to earn your coins and streak:</span><div style=\"display:flex;flex-direction:column;align-items: center;gap:8px;margin-top:12px;text-align:left;\"><div style=\"display:flex;align-items:center;gap:8px;\"><img src='assets/Icons-Neutral/Icons-Coins.png' style=\"width:20px;height:20px;\" alt=\"coins\"/><div style=\"margin-left:8px;\"></div><div style=\"font-weight:600;\">${coins}</div></div><div style=\"display:flex;align-items:center;gap:8px;\"><img src='assets/Icons-Neutral/Icon-Streak.png' style=\"width:20px;height:20px;\" alt=\"streak\"/><div style=\"margin-left:8px;\"></div><div style=\"font-weight:600;\">${streak}</div></div></div>`;

    const primary: SupermePopupCTA = {
      text: 'Confirm',
      buttonStyle: 'green',
      buttonMedium: true,
      // callback intentionally omitted; handled via (primaryAction) output
    };

    const secondary: SupermePopupCTA = {
      text: 'Discard',
      buttonStyle: 'bronze-transparent',
      buttonMedium: true,
      // callback intentionally omitted; handled via (secondaryAction) output
    };

    this.completePopupConfig = {
      image: 'assets/Images-Transparent/Image-Home-GreatWork.png',
      imageAlt: 'Great Work',
      heading: headingHtml,
      subtitle: '',
      primaryCTA: primary,
      secondaryCTA: secondary,
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'row'
    };

    this.showCompletePopup = true;
  }

  closeCompletePopup() {
    this.showCompletePopup = false;
  }

  handleCompletePrimary() {
    this.onCompleteHabit();
    this.closeCompletePopup();
  }

  handleCompleteSecondary() {
    this.closeCompletePopup();
  }

  // Coin cap confirmation popup (requiresConfirmation: true from API)
  public showCoinCapPopup: boolean = false;
  public coinCapPopupConfig: SupermePopupConfig = {};
  private coinCapPendingId: string = '';
  private coinCapPendingType: 'habits' | 'tasks' = 'habits';

  openCoinCapConfirmPopup(message: string, id: string, type: 'habits' | 'tasks'): void {
    this.coinCapPendingId = id;
    this.coinCapPendingType = type;

    this.coinCapPopupConfig = {
      image: 'assets/Images-Transparent/Image-Home-GreatWork.png',
      imageAlt: 'Daily Cap Reached',
      heading: 'Daily Coin Limit Reached',
      subtitle: message || "You've already earned the maximum coins for today. Mark as complete anyway?",
      primaryCTA: { text: 'Yes, mark complete', buttonStyle: 'green', buttonMedium: true },
      secondaryCTA: { text: 'Cancel', buttonStyle: 'bronze-transparent', buttonMedium: true },
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'row'
    };

    this.showCoinCapPopup = true;
  }

  closeCoinCapPopup(): void {
    this.showCoinCapPopup = false;
  }

  handleCoinCapConfirmPrimary(): void {
    this.closeCoinCapPopup();
    this.onCompleteHabitConfirmed(this.coinCapPendingId, this.coinCapPendingType);
  }

  handleCoinCapConfirmSecondary(): void {
    this.closeCoinCapPopup();
  }

  private onCompleteHabitConfirmed(id: string, type: 'habits' | 'tasks'): void {
    if (type === 'tasks') {
      this.taskApi.completeTask(id, true).subscribe({
        next: () => {
          this.trackCompletion('tasks', this.habit?.title || '');
          this.habit = { ...this.habit!, status: 'completed' } as any;
          this.clearOngoingState();
          this.autoAbortService.cancelAutoAbort(this.habit!.id, 'tasks');
          this.percentageCompleted = 100;
          this.showLocalTimer = false;
          this.showStartBubble = false;
          if (this.startBubbleTimer) { clearTimeout(this.startBubbleTimer); this.startBubbleTimer = null; }
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            this.calendarService.clearCache(formatted, 'day');
          } catch (e) { /* ignore */ }
          this.loadTodayTasks();
          this.clearProgress();
          this.habitService.notifyTaskCompleted();
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Failed to confirm-complete task', err)
      });
    } else {
      this.habitApi.completeHabit(id, true).subscribe({
        next: () => {
          this.trackCompletion('habits', this.habit?.title || '');
          const updated = { ...this.habit!, status: 'completed' } as Habit;
          this.habitService.completeHabit(updated.id);
          this.habit = updated;
          this.clearOngoingState();
          this.autoAbortService.cancelAutoAbort(this.habit!.id, 'habits');
          this.percentageCompleted = 100;
          this.showLocalTimer = false;
          this.showStartBubble = false;
          if (this.startBubbleTimer) { clearTimeout(this.startBubbleTimer); this.startBubbleTimer = null; }
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            this.calendarService.clearCache(formatted, 'day');
          } catch (e) { /* ignore */ }
          this.loadHabits();
          this.clearProgress();
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Failed to confirm-complete habit', err)
      });
    }
  }

  // Abort popup state and handlers
  public showAbortPopup: boolean = false;
  public abortPopupConfig: SupermePopupConfig = {};

  openAbortPopup() {
    const coins = this.getCoinReward();
    const streak = this.getStreak();

    const headingHtml = `You\u2019re halfway there! Want to stop now?<br/><span style="font-weight:400;font-size:16px;">You are about to lose:</span><div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;align-items:center;justify-content:center;"><div style="display:flex;align-items:center;gap:12px;"><img src='assets/Icons-Neutral/Icons-Coins.png' style="width:20px;height:20px;" alt="coins"/><div style="font-weight:600;">${coins}</div></div><div style="display:flex;align-items:center;gap:12px;"><img src='assets/Icons-Neutral/Icon-Streak.png' style="width:20px;height:20px;" alt="streak"/><div style="font-weight:600;">${streak}</div></div></div>`;

    const primary: SupermePopupCTA = {
      text: 'Keep Going',
      buttonStyle: 'green',
      buttonMedium: true,
      // callback intentionally omitted; handled via (primaryAction) output
    };

    const secondary: SupermePopupCTA = {
      text: 'Abort Anyways',
      buttonStyle: 'bronze-transparent',
      buttonMedium: true,
      // callback intentionally omitted; handled via (secondaryAction) output
    };

    this.abortPopupConfig = {
      image: 'assets/Images-Transparent/Image-Home-Abort.png',
      imageAlt: 'Abort',
      heading: headingHtml,
      subtitle: '',
      primaryCTA: primary,
      secondaryCTA: secondary,
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'row'
    };

    this.showAbortPopup = true;
  }

  closeAbortPopup() {
    this.showAbortPopup = false;
  }

  handleAbortPrimary() {
    this.closeAbortPopup();
  }

  handleAbortSecondary() {
    this.onAbortHabit();
    this.closeAbortPopup();
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
          this.autoAbortService.cancelAutoAbort(this.habit!.id, 'tasks');
          // Reset progress when aborting
          this.percentageCompleted = 0;
          this.resetProgress();
          // Hide local timer icon for this card
          this.showLocalTimer = false;
          // Hide and clear start bubble timer if present
          this.showStartBubble = false;
          if (this.startBubbleTimer) {
            clearTimeout(this.startBubbleTimer);
            this.startBubbleTimer = null;
          }
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
          this.autoAbortService.cancelAutoAbort(this.habit!.id, 'habits');
          // Reset progress when aborting
          this.percentageCompleted = 0;
          this.resetProgress();
          // Hide local timer icon for this card
          this.showLocalTimer = false;
          // Hide and clear start bubble timer if present
          this.showStartBubble = false;
          if (this.startBubbleTimer) {
            clearTimeout(this.startBubbleTimer);
            this.startBubbleTimer = null;
          }
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
   * POST /tasks-habits-track/add after a successful completion
   */
  private trackCompletion(type: 'habits' | 'tasks', name: string): void {
    if (!this.trackOnComplete) return;
    const userId = Number(localStorage.getItem('user_id')) || 0;
    if (!userId || !name) return;

    const payload: any = { userId };
    if (type === 'tasks') {
      payload.task = name;
    } else {
      payload.habit = name;
    }

    const token = this.authApiService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);

    this.http.post(`${environment.apiUrl}/tasks-habits-track/add`, payload, { headers }).subscribe({
      next: () => console.log('[Track] completion recorded:', payload),
      error: (err) => console.warn('[Track] failed to record completion:', err)
    });
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
          if (res && res.requiresConfirmation === true) {
            this.openCoinCapConfirmPopup(res.message || '', this.habit!.id, 'tasks');
            return;
          }
          this.trackCompletion('tasks', this.habit?.title || '');
          const updated = { ...this.habit!, status: 'completed' } as any;
          this.habit = updated;
          // Clear the saved ongoing state
          this.clearOngoingState();
          this.autoAbortService.cancelAutoAbort(this.habit!.id, 'tasks');
          // Set progress to 100% when completed
          this.percentageCompleted = 100;
          // Hide local timer icon for this card when completed
              this.showLocalTimer = false;
              // Hide and clear start bubble timer if present
              this.showStartBubble = false;
              if (this.startBubbleTimer) {
                clearTimeout(this.startBubbleTimer);
                this.startBubbleTimer = null;
              }
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            this.calendarService.clearCache(formatted, 'day');
          } catch (e) { /* ignore */ }
          this.loadTodayTasks();
          this.clearProgress();
          // Notify that a task was completed so dashboard refreshes
          this.habitService.notifyTaskCompleted();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();

          // Ensure today's habits endpoint is refreshed after marking done
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            console.log('Refreshing habits-by-date API for', formatted);
            this.habitService.loadHabitsForDate(formatted, true).subscribe({ next: () => { this.cdr.detectChanges(); }, error: () => {} });
          } catch (e) {
            // ignore
          }
        },
        error: (err: any) => {
          console.error('Failed to complete task', err);
        }
      });
    } else {
      // Call habit API for habits (existing code)
      this.habitApi.completeHabit(this.habit.id).subscribe({
        next: (res: any) => {
          if (res && res.requiresConfirmation === true) {
            this.openCoinCapConfirmPopup(res.message || '', this.habit!.id, 'habits');
            return;
          }
          this.trackCompletion('habits', this.habit?.title || '');
          const updated = { ...this.habit!, status: 'completed' } as Habit;
          this.habitService.completeHabit(updated.id);
          this.habit = updated;
          // Clear the saved ongoing state
          this.clearOngoingState();
          this.autoAbortService.cancelAutoAbort(this.habit!.id, 'habits');
          // Set progress to 100% when completed
          this.percentageCompleted = 100;
          // Hide local timer icon for this card when completed
          this.showLocalTimer = false;
          // Hide and clear start bubble timer if present
          this.showStartBubble = false;
          if (this.startBubbleTimer) {
            clearTimeout(this.startBubbleTimer);
            this.startBubbleTimer = null;
          }
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            this.calendarService.clearCache(formatted, 'day');
          } catch (e) { /* ignore */ }
          this.loadHabits();
          this.clearProgress();
          // Trigger change detection to update button states in other components
          this.cdr.detectChanges();

          // Ensure today's habits endpoint is refreshed after marking done
          try {
            const today = new Date();
            const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            console.log('Refreshing habits-by-date API for', formatted);
            this.habitService.loadHabitsForDate(formatted, true).subscribe({ next: () => { this.cdr.detectChanges(); }, error: () => {} });
          } catch (e) {
            // ignore
          }
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

    // Update progress every 10 seconds (reduced from 1s to prevent System UI ANR)
    this.progressInterval = setInterval(() => {
      // Update the percentageCompleted property which will trigger change detection
      this.percentageCompleted = this.calculateProgressPercentage();

      // Stop updating when progress reaches 100% (scheduled end reached)
      if (this.percentageCompleted >= 100) {
        this.percentageCompleted = 100;
        this.clearProgress();
      }
    }, 10000);
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

      // Compute habit-all-done for recent mode using `recentHabits` if provided (it may contain completed items)
      const recentList = (this.recentHabits && this.recentHabits.length > 0) ? this.recentHabits : this.filteredRecentHabits;
      this.habitAllDoneComputed = Array.isArray(recentList) && recentList.length > 0 && recentList.every(h => {
        const s = (h?.status || '').toString().toLowerCase();
        return s === 'completed' || s === 'skipped';
      });

      // Compute task-all-done for recent mode using `recentTasks` if provided
      const recentTaskList = (this.recentTasks && this.recentTasks.length > 0) ? this.recentTasks : this.filteredRecentTasks;
      this.taskAllDoneComputed = Array.isArray(recentTaskList) && recentTaskList.length > 0 && recentTaskList.every(t => {
        const s = (t?.status || '').toString().toLowerCase();
        return s === 'completed' || s === 'skipped';
      });

      // Determine empty: for recent mode, if user selected 'habits' tab and all habits are done, show empty
      if (this.currentActive === 'habits') {
        if (!recentList || recentList.length === 0) {
          this.isEmpty = true;
        } else if (this.habitAllDoneComputed) {
          this.isEmpty = true;
        } else {
          this.isEmpty = false;
        }
      } else if (this.currentActive === 'tasks') {
        if (!recentTaskList || recentTaskList.length === 0) {
          this.isEmpty = true;
          this.taskAllDoneComputed = false;
        } else if (this.taskAllDoneComputed) {
          this.isEmpty = true;
        } else {
          this.isEmpty = false;
        }
      } else {
        this.isEmpty = !this.hasHabits && !this.hasTasks;
      }
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

  // Helper: normalize timestamps received from API (seconds -> ms)
  private normalizePossibleTimestamp(ts: any): number {
    if (!ts && ts !== 0) return ts;
    const n = Number(ts) || 0;
    return n > 0 && n < 1e12 ? n * 1000 : n;
  }

  private buttonStateCheckerInterval: any;

  /**
   * Set up interval to periodically check button states
   */
  private setupButtonStateChecker(): void {
    // Removed aggressive polling that was causing System UI ANR
    // Change detection now relies on Angular's OnPush strategy and natural component updates
    // This prevents excessive detectChanges() calls that blocked the main thread

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
    // Clear start bubble timer if present
    if (this.startBubbleTimer) {
      clearTimeout(this.startBubbleTimer);
      this.startBubbleTimer = null;
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

    // For timetable, open activity-input in edit mode
    if (itemType === 'timetable') {
      this.openTimetableEditor();
      return;
    }

    // Determine the date to use - either the provided selectedDate or today's date
    let dateForApi: string;
    if (this.selectedDate) {
      dateForApi = this.selectedDate;
    } else {
      // Default to today's date in YYYY-MM-DD format
      const today = new Date();
      dateForApi = this.formatDateForApi(today);
    }

    // For habits and tasks, navigate to activity-detail page with date information
    this.router.navigate(['/authed/activity-detail', itemId], {
      state: { 
        habit: this.habit, 
        type: itemType, 
        fromLongPress: true,
        selectedDate: dateForApi 
      },
      queryParams: { type: itemType }
    }).catch(err => {
      console.error('Navigation to habit detail failed:', err);
    });
  }

  /**
   * Open activity-input component in edit mode for timetable
   */
  private async openTimetableEditor() {
    if (!this.habit) return;

    const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    const modal = await this.modalCtrl.create({
      component: ActivityInputComponent,
      componentProps: {
        editingHabit: this.habit,
        initialTab: 'timetable'
      }
    });

    await modal.present();

    // Reload timetables when modal is dismissed
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadHabits();
    }
  }

  async openHabitPage() {
    // Navigate to the authenticated activity page route and pass the current tab
    await this.router.navigate(['/authed/activity-page'], { queryParams: { tab: this.currentActive } });
  }

  async openTimeline() {
    await this.router.navigateByUrl('/authed/activity-timeline');
  }

  async openHabitInput() {
    const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    // Determine which tab to open in the ActivityInput modal. If the dashboard/list toggle
    // is set to 'tasks', open the modal on the tasks tab; otherwise default to 'habits'.
    const initialTab = (this.currentActive === 'tasks') ? 'tasks' : (this.currentActive === 'habits' ? 'habits' : (this.habit?.type === 'tasks' ? 'tasks' : 'habits'));
    const modal = await this.modalCtrl.create({
      component: ActivityInputComponent,
      componentProps: { initialTab }
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

      // Compute habit-all-done and task-all-done using recent arrays (these may include completed items)
      const recentList = (this.recentHabits && this.recentHabits.length > 0) ? this.recentHabits : this.filteredRecentHabits;
      this.habitAllDoneComputed = Array.isArray(recentList) && recentList.length > 0 && recentList.every(h => {
        const s = (h?.status || '').toString().toLowerCase();
        return s === 'completed' || s === 'skipped';
      });

      const recentTaskList = (this.recentTasks && this.recentTasks.length > 0) ? this.recentTasks : this.filteredRecentTasks;
      this.taskAllDoneComputed = Array.isArray(recentTaskList) && recentTaskList.length > 0 && recentTaskList.every(t => {
        const s = (t?.status || '').toString().toLowerCase();
        return s === 'completed' || s === 'skipped';
      });

      // Decide empty state based on the currently selected tab
      if (this.currentActive === 'habits') {
        if (!recentList || recentList.length === 0) {
          this.isEmpty = true;
          this.habitAllDoneComputed = false;
        } else if (this.habitAllDoneComputed) {
          this.isEmpty = true;
        } else {
          this.isEmpty = false;
        }
      } else if (this.currentActive === 'tasks') {
        if (!recentTaskList || recentTaskList.length === 0) {
          this.isEmpty = true;
          this.taskAllDoneComputed = false;
        } else if (this.taskAllDoneComputed) {
          this.isEmpty = true;
        } else {
          this.isEmpty = false;
        }
      } else {
        this.isEmpty = !this.hasHabits && !this.hasTasks;
      }

      this.showContent = !this.isEmpty;

      // Force change detection
      this.cdr.detectChanges();
      // Also run fallback check to detect "all completed" when parent passed filtered arrays
      this.checkAllCompletedFallback();
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
        // Only today's activities show on Home. Sort by proximity to current time (recency relative to now)
        const now = Date.now();
        
        // Get all today's habits BEFORE filtering to track total loaded
        const allHabits = this.habitService.getCurrentHabits()
          .map((habit: Habit) => ({
            ...habit,
            // Normalize status to lowercase for consistency
            status: habit.status ? habit.status.toLowerCase() as any : 'pending'
          }));
        
        this.totalHabitsLoaded = allHabits.length;
        
        // Count how many habits are actually completed/skipped (from raw data)
        this.totalHabitsCompleted = allHabits.filter((h: Habit) => {
          const s = (h.status || '').toString().toLowerCase();
          return s === 'completed' || s === 'skipped';
        }).length;
        
        this.habits = allHabits
          // Exclude completed and skipped items from Home (completed disappear instantly)
          .filter((h: Habit) => {
            const s = (h.status || '').toString().toLowerCase();
            return s !== 'completed' && s !== 'skipped';
          })
          // Hide expired items: if endTime has passed and status is not ongoing, exclude them
          .filter((h: Habit) => {
            const endTime = Number(h.endTimeStamp || 0) < 1e12 ? Number(h.endTimeStamp || 0) * 1000 : Number(h.endTimeStamp || 0);
            const isOngoing = (h.status || '').toString().toLowerCase() === 'ongoing';
            // Keep item if end time hasn't passed yet, or if it's ongoing (show during grace period)
            return endTime > now || isOngoing;
          })
          // Sort by absolute difference between start time and now (closest to now first)
          .sort((a: Habit, b: Habit) => {
            const aStart = Number(a.startTimeStamp || 0) < 1e12 ? Number(a.startTimeStamp || 0) * 1000 : Number(a.startTimeStamp || 0);
            const bStart = Number(b.startTimeStamp || 0) < 1e12 ? Number(b.startTimeStamp || 0) * 1000 : Number(b.startTimeStamp || 0);
            const aDiff = Math.abs(aStart - now);
            const bDiff = Math.abs(bStart - now);
            return aDiff - bDiff;
          })
          .slice(0, this.maxItemsToShow);
        this.hasHabits = this.habits.length > 0;
        this.updateEmptyState();
        // Trigger change detection to update button states
        this.cdr.detectChanges();
        // Re-setup auto-reload timers after loading new habits
        this.setupAutoReloadTimers();

        // Schedule grace removal timers for ongoing habits:
        const fiveMinutes = 5 * 60 * 1000;
        this.habits.forEach(h => {
          try {
            if (!h || !h.endTimeStamp) return;
            const now2 = Date.now();
            // Only apply grace when habit was started (ongoing)
            if ((h.status || '').toLowerCase() === 'ongoing') {
              const graceExpiry = h.endTimeStamp + fiveMinutes;
              if (now2 >= graceExpiry) {
                // Grace already expired - enforce removal immediately
                this.handleGraceRemoval(h);
              } else if (now2 >= h.endTimeStamp) {
                // End time passed, schedule removal at end + 5min
                const delay = graceExpiry - now2;
                setTimeout(() => this.handleGraceRemoval(h), delay);
              } else {
                // End time still in future - schedule removal at end + 5min
                const delay = (h.endTimeStamp + fiveMinutes) - now2;
                setTimeout(() => this.handleGraceRemoval(h), delay);
              }
            }
          } catch (e) {
            console.error('Error scheduling grace removal:', e);
          }
        });
      },
      error: (error) => {
        console.error('Error fetching habits:', error);
        this.habits = [];
        this.hasHabits = false;
        this.totalHabitsLoaded = 0;
        this.totalHabitsCompleted = 0;
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
        const now = Date.now();
        const rawTasks = tasks || [];
        
        // Track total tasks loaded BEFORE filtering
        this.totalTasksLoaded = rawTasks.length;
        
        // Count how many tasks are actually completed/skipped (from raw API data)
        this.totalTasksCompleted = rawTasks.filter((t: any) => {
          const s = (t.status || '').toString().toUpperCase();
          return s === 'COMPLETED' || s === 'SKIPPED';
        }).length;
        
        this.tasks = rawTasks
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
              // Always use calculated timestamps when we have startTime/endTime strings. Normalize any existing timestamps.
              startTimeStamp: this.normalizePossibleTimestamp((task.startTime && task.startDate) ? calculatedStartTimeStamp : (task.startTimeStamp || calculatedStartTimeStamp)),
              endTimeStamp: this.normalizePossibleTimestamp((task.endTime && task.endDate) ? calculatedEndTimeStamp : (task.endTimeStamp || calculatedEndTimeStamp)),
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              // Normalize status to lowercase for consistency
              status: task.status ? task.status.toLowerCase() : 'pending'
            };
          })
          // Exclude completed and skipped items
          .filter((t: any) => {
            const s = (t.status || '').toString().toLowerCase();
            return s !== 'completed' && s !== 'skipped';
          })
          // Hide expired items: if endTime has passed and status is not ongoing, exclude them
          .filter((t: any) => {
            const endTimeRaw = t.endTimeStamp || 0;
            const endTime = Number(endTimeRaw) < 1e12 ? Number(endTimeRaw) * 1000 : Number(endTimeRaw);
            const isOngoing = (t.status || '').toString().toLowerCase() === 'ongoing';
            // Keep item if end time hasn't passed yet, or if it's ongoing
            return endTime > now || isOngoing;
          })
          // Sort by upcoming logic: treat items as active until their endTimeStamp passes
          .sort((a: any, b: any) => {
            const aEnd = Number(a.endTimeStamp ?? Number.MAX_SAFE_INTEGER);
            const bEnd = Number(b.endTimeStamp ?? Number.MAX_SAFE_INTEGER);
            const aStart = Number(a.startTimeStamp ?? 0);
            const bStart = Number(b.startTimeStamp ?? 0);
            const nowNum = now;
            const aIsFuture = aEnd >= nowNum;
            const bIsFuture = bEnd >= nowNum;
            if (aIsFuture && bIsFuture) return aStart - bStart; // upcoming: earliest start first
            if (!aIsFuture && !bIsFuture) return bStart - aStart; // past: most recent first
            return aIsFuture ? -1 : 1; // future items come before past items
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
        this.totalTasksLoaded = 0;
        this.totalTasksCompleted = 0;
        this.updateEmptyState();
        // Trigger change detection to update button states
        this.cdr.detectChanges();
      }
    });
  }

  loadTodayTasks() {
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const now = Date.now();

    this.calendarService.getUserCalendar(formatted, 'day').subscribe({
      next: (resp: any) => {
        const rawTasks = Array.isArray(resp?.tasks) ? resp.tasks : [];

        // Track total tasks loaded BEFORE any filtering
        this.totalTasksLoaded = rawTasks.length;
        
        // Count how many tasks are actually completed/skipped (from raw API data)
        this.totalTasksCompleted = rawTasks.filter((t: any) => {
          const s = (t.status || '').toString().toUpperCase();
          return s === 'COMPLETED' || s === 'SKIPPED';
        }).length;

        this.tasks = (rawTasks || [])
          .map((task: any) => {
            const startTimeStr = task.startTime || '00:00:00';
            const endTimeStr = task.endTime || '23:59:59';
            const startDateStr = task.startDate || formatted;
            const endDateStr = task.endDate || startDateStr;

            const calculatedStartTimeStamp = this.combineDateAndTime(startDateStr, startTimeStr);
            const calculatedEndTimeStamp = this.combineDateAndTime(endDateStr, endTimeStr);

            return {
              ...task,
              type: 'tasks',
              startTimeStamp: this.normalizePossibleTimestamp((task.startTime && task.startDate) ? calculatedStartTimeStamp : (task.startTimeStamp || calculatedStartTimeStamp)),
              endTimeStamp: this.normalizePossibleTimestamp((task.endTime && task.endDate) ? calculatedEndTimeStamp : (task.endTimeStamp || calculatedEndTimeStamp)),
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
              status: task.status ? task.status.toLowerCase() : 'pending'
            };
          })
          // Exclude completed and skipped items
          .filter((t: any) => {
            const s = (t.status || '').toString().toLowerCase();
            return s !== 'completed' && s !== 'skipped';
          })
          // Hide expired items: if endTime has passed and status is not ongoing, exclude them
          .filter((t: any) => {
            const endTime = this.normalizePossibleTimestamp(t.endTimeStamp || 0);
            const isOngoing = (t.status || '').toString().toLowerCase() === 'ongoing';
            // Keep item if end time hasn't passed yet, or if it's ongoing
            return endTime > now || isOngoing;
          })
          // Sort by upcoming logic: treat items as active until their endTimeStamp passes
          .sort((a: any, b: any) => {
            const aEnd = this.normalizePossibleTimestamp(a.endTimeStamp ?? Number.MAX_SAFE_INTEGER);
            const bEnd = this.normalizePossibleTimestamp(b.endTimeStamp ?? Number.MAX_SAFE_INTEGER);
            const aStart = this.normalizePossibleTimestamp(a.startTimeStamp ?? 0);
            const bStart = this.normalizePossibleTimestamp(b.startTimeStamp ?? 0);
            const nowNum = now;
            const aIsFuture = aEnd >= nowNum;
            const bIsFuture = bEnd >= nowNum;
            if (aIsFuture && bIsFuture) return aStart - bStart; // upcoming: earliest start first
            if (!aIsFuture && !bIsFuture) return bStart - aStart; // past: most recent first
            return aIsFuture ? -1 : 1; // future items come before past items
          })
          .slice(0, this.maxItemsToShow);

        this.hasTasks = this.tasks.length > 0;
        this.updateEmptyState();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching calendar tasks:', error);
        this.tasks = [];
        this.hasTasks = false;
        this.totalTasksLoaded = 0;
        this.totalTasksCompleted = 0;
        this.updateEmptyState();
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Update the empty state based on current tab
   */
  /**
   * Update the empty state based on current tab
   * 
   * NEW ALGORITHM (based on completion rates):
   * - habitCompletionRate = (totalHabitsCompleted / totalHabitsLoaded) * 100
   * - taskCompletionRate = (totalTasksCompleted / totalTasksLoaded) * 100
   * - "All done" shows when completion rate is 100%
   * - "No items lined up" shows when total count is 0
   */
  updateEmptyState() {
    // Calculate completion rates based on total loaded vs completed
    this.habitCompletionRate = this.totalHabitsLoaded > 0 
      ? (this.totalHabitsCompleted / this.totalHabitsLoaded) * 100 
      : 0;
    
    this.taskCompletionRate = this.totalTasksLoaded > 0 
      ? (this.totalTasksCompleted / this.totalTasksLoaded) * 100 
      : 0;
    
    // Update completion flags based on completion rates
    this.habitAllDoneComputed = this.habitCompletionRate === 100 && this.totalHabitsLoaded > 0;
    this.taskAllDoneComputed = this.taskCompletionRate === 100 && this.totalTasksLoaded > 0;
    
    // Update isEmpty based on filtered items
    this.isEmpty = !this.hasHabits && !this.hasTasks;

    this.showContent = !this.isEmpty;
  }

  /**
   * Return true when all habits in the current list are either completed or skipped
   */
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

      const recentList = (this.recentHabits && this.recentHabits.length > 0) ? this.recentHabits : this.filteredRecentHabits;
      this.habitAllDoneComputed = Array.isArray(recentList) && recentList.length > 0 && recentList.every(h => {
        const s = (h?.status || '').toString().toLowerCase();
        return s === 'completed' || s === 'skipped';
      });

      if (this.currentActive === 'habits') {
        if (!recentList || recentList.length === 0) {
          this.isEmpty = true;
        } else if (this.habitAllDoneComputed) {
          this.isEmpty = true;
        } else {
          this.isEmpty = false;
        }
      } else if (this.currentActive === 'tasks') {
        const recentTaskList = (this.recentTasks && this.recentTasks.length > 0) ? this.recentTasks : this.filteredRecentTasks;
        this.taskAllDoneComputed = Array.isArray(recentTaskList) && recentTaskList.length > 0 && recentTaskList.every(t => {
          const s = (t?.status || '').toString().toLowerCase();
          return s === 'completed' || s === 'skipped';
        });
        if (!recentTaskList || recentTaskList.length === 0) {
          this.isEmpty = true;
          this.taskAllDoneComputed = false;
        } else if (this.taskAllDoneComputed) {
          this.isEmpty = true;
        } else {
          this.isEmpty = false;
        }
      } else {
        this.isEmpty = !this.hasHabits && !this.hasTasks;
      }

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

    // Update every 10 seconds (reduced from 1s to prevent System UI ANR)
    this.progressInterval = setInterval(() => {
      this.calculatePercentage();

      if (this.percentageCompleted >= 100) {
        this.clearProgress();
      }
    }, 10000);
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
    if (!this.habit) return 0;
    const h: any = this.habit;
    return Number(h.coinReward ?? h.rewardCoins ?? h.reward_coins ?? h.rewardsCoins ?? (h.rewards && (h.rewards.coins ?? h.rewards.rewardCoins)) ?? h.coins ?? 0);
  }

  getStreak(): number {
    if (!this.habit) return 0;
    const h: any = this.habit;
    if (h.type === 'habits') {
      return Number(h.currentHabitStreak ?? h.streak ?? h.streakCount ?? h.streak_count ?? (h.rewards && h.rewards.streak) ?? 0);
    } else if (h.type === 'tasks') {
      return Number(h.currentTaskStreak ?? h.streak ?? h.streakCount ?? h.streak_count ?? (h.rewards && h.rewards.streak) ?? 0);
    }
    return Number(h.streak ?? h.streakCount ?? h.streak_count ?? (h.rewards && h.rewards.streak) ?? 0);
  }

  /**
   * Return the asset path for the routine icon based on habit.routine or habit.selectedRoutine.
   * Accepts values like 'MORNING', 'EVENING', 'NIGHT' from backend. Falls back to Morning.
   */
  getRoutineIcon(): string | null {
    try {
      // Get routine from either routine or selectedRoutine field
      const routineValue = this.habit?.routine ?? this.habit?.selectedRoutine;
      // If backend explicitly returned null/empty, do not show any icon here
      if (routineValue === null || routineValue === undefined || String(routineValue).toLowerCase() === 'null' || String(routineValue).trim() === '') {
        return null;
      }

      // Convert to lowercase and capitalize first letter for filename
      const routine = String(routineValue).toLowerCase();
      const capitalizedRoutine = routine.charAt(0).toUpperCase() + routine.slice(1);
      const fileName = `Icon-Routine-${capitalizedRoutine}.png`;

      return `/assets/Icons-Neutral/${fileName}`;
    } catch (e) {
      console.error('Error getting routine icon:', e);
      return null;
    }
  }

  hasRoutine(): boolean {
    const routineValue = this.habit?.routine ?? this.habit?.selectedRoutine;
    return !(routineValue === null || routineValue === undefined || String(routineValue).toLowerCase() === 'null' || String(routineValue).trim() === '');
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
   * Get combined habits and tasks sorted by start time (closest to current time on top)
   */
  get combinedAndSortedItems(): any[] {
    // For list mode, combine habits and tasks
    if (this.mode === 'list') {
      const combined = [...(this.habits || []), ...(this.tasks || [])];
      return combined.sort((a, b) => {
        // Sort by start time: closest to current time first
        const aStart = a.startTimeStamp || 0;
        const bStart = b.startTimeStamp || 0;
        return Math.abs(aStart - Date.now()) - Math.abs(bStart - Date.now());
      });
    }

    // For recent mode, combine recent habits and tasks
    if (this.mode === 'recent') {
      const combined = [...(this.recentHabits || []), ...(this.recentTasks || [])];
      return combined.sort((a, b) => {
        // Sort by start time: closest to current time first
        const aStart = a.startTimeStamp || 0;
        const bStart = b.startTimeStamp || 0;
        return Math.abs(aStart - Date.now()) - Math.abs(bStart - Date.now());
      });
    }

    return [];
  }

  /**
   * Return true when all items (habits+tasks) for the current mode are completed.
   * Used to show a different empty state when everything is completed for the day.
   */
  get isAllCompleted(): boolean {
    // Determine lists to check depending on mode. Use original lists (which include completed items)
    const habitList = (this.mode === 'recent') ? (this.recentHabits || []) : (this.habits || []);
    const taskList = (this.mode === 'recent') ? (this.recentTasks || []) : (this.tasks || []);

    const allItems = [...habitList, ...taskList];

    // If no items returned from API, not considered 'all completed'
    if (!allItems || allItems.length === 0) return false;

    // If at least one item exists and every item's status is 'completed', return true
    return allItems.every(item => ((item?.status || '').toString().toLowerCase() === 'completed'));
  }

  /**
   * True when current tab is 'tasks' and there are habits present but no tasks.
   * Used to show a task-specific empty message in the Tasks tab.
   */
  get isTaskTabNoTasks(): boolean {
    return this.currentActive === 'tasks' && !!this.hasHabits && !this.hasTasks;
  }

  // Fallback computed flag used for recent mode when parent inputs may be pre-filtered.
  public isAllCompletedComputed: boolean = false;

  /**
   * Check API/service data to determine if ALL items for today are completed.
   * Used as a fallback in `recent` mode when parent passes pre-filtered arrays.
   */
  private checkAllCompletedFallback(): void {
    // Only run this in recent mode, otherwise rely on isAllCompleted getter
    if (this.mode !== 'recent') {
      this.isAllCompletedComputed = false;
      return;
    }

    // Get habits from HabitService (synchronous current value)
    const allHabits = this.habitService.getCurrentHabits() || [];

    // Get tasks from calendar API for today (async). Combine and evaluate when response arrives.
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    this.calendarService.getUserCalendar(formatted, 'day').subscribe({
      next: (resp: any) => {
        const allTasks = Array.isArray(resp?.tasks) ? resp.tasks : [];
        const combined = [...allHabits, ...allTasks];

        if (!combined || combined.length === 0) {
          this.isAllCompletedComputed = false;
          this.cdr.detectChanges();
          return;
        }

        this.isAllCompletedComputed = combined.every(item => ((item?.status || '').toString().toLowerCase() === 'completed'));
        this.cdr.detectChanges();
      },
      error: () => {
        this.isAllCompletedComputed = false;
        this.cdr.detectChanges();
      }
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
   * Handle grace-period removal for an ongoing habit when end time + grace has passed
   */
  private handleGraceRemoval(habit: Habit): void {
    if (!habit) return;
    try {
      // Get current habit from service to ensure latest status
      const current = this.habitService.getHabitById(habit.id as string) as Habit | undefined;
      const target = current || habit;

      // If already completed or skipped, nothing to do
      const s = (target.status || '').toString().toLowerCase();
      if (s === 'completed' || s === 'skipped') return;

      // Only apply grace-removal if it was started (ongoing) and still not completed
      if (s === 'ongoing') {
        // Set status -> pending for the day (user can still mark done via history or other flows)
        const updated = { ...target, status: 'pending' } as Habit;
        this.habitService.updateHabit(updated);

        // Remove from the local Home display (so it disappears from Home)
        this.habits = (this.habits || []).filter(h => h.id !== (habit.id));
        this.hasHabits = this.habits.length > 0;
        this.updateEmptyState();
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.error('Error in handleGraceRemoval:', e);
    }
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
    return this.buttonLogic.isDoneEnabled(this.habit, this.hasOtherOngoingActivity());
  }

  /**
   * Check if "Done" button should be visible (uses button logic service)
   */
  isDoneVisible(): boolean {
    return this.buttonLogic.isDoneVisible(this.habit);
  }

  /**
   * Combine date string (YYYY-MM-DD) with time string (HH:MM:SS or HH:MM) to create timestamp
   */
  private combineDateAndTime(dateStr: string, timeStr: string): number {
    return this.buttonLogic.combineDateAndTime(dateStr, timeStr);
  }

  getTimeColor(habit: Habit | null): string {
    if (!habit) return '#BB2124'; // default to pending color

    const status = habit.status?.toLowerCase() || 'pending';
    const type = habit.type;

    // For timetable, always return the fixed color
    if (type === 'timetable') {
      return '#6B656A';
    }

    // Status-based logic first, regardless of date
    if (status === 'completed') {
      return '#4CAF50';
    } else if (status === 'skipped') {
      return '#BB2124';
    }

    // For future dates (not current date view), use future colors
    if (!this.isCurrentDateView) {
      return type === 'tasks' ? '#EE6621' : '#6360A2';
    }

    // For current date pending/ongoing
    if (status === 'pending') {
      // Check if end time has passed
      const now = Date.now();
      const endTime = habit.endTimeStamp || 0;
      if (now > endTime) {
        return '#BB2124';
      }
    }

    // Default colors for current date pending/ongoing
    return type === 'tasks' ? '#EE6621' : '#6360A2';
  }

  getTitleColor(habit: Habit | null): string {
    if (!habit) return '#BB2124'; // default to pending color

    const type = habit.type;

    // For tasks, always use the fixed color
    if (type === 'tasks') {
      return '#E04D16';
    }

    // For habits and timetables, use the same logic as time color
    return this.getTimeColor(habit);
  }

}