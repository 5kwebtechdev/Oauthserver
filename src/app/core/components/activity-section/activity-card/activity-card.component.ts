import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgIf, CommonModule, NgForOf } from "@angular/common";
import { RouterModule } from '@angular/router';
import { LongPressDirective } from "../../../directives/gestureControlDirective";
import { SupermeButtonComponent } from "../../superme-button/superme-button.component";
import { SupermePopupComponent, SupermePopupConfig, SupermePopupCTA } from '../../superme-popup/superme-popup.component';

import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';
import { GlanceBlankStateComponent } from './glance-blank-state.component';
import { GlanceBlankState, GlanceDailyData, GlanceTab, resolveGlanceBlankState } from './glance-blank-state';
import { IonicModule, ModalController } from '@ionic/angular';
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
import { FocusTimerService } from '../../superme-timer/focus-timer.service';
import { focusSchedule, timerSnapshot } from '../../superme-timer/timer-state';
import { catchError, forkJoin, of, skip, Subscription } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
import { EventApi } from '../../../api/event.api';
import { CalendarApi } from '../../../api/calendar.api';
import { getEventTypeIcon } from '../event-type-icon';
import { isCalendarMirrorOfPersonalEvent, isHomePersonalEvent, isHomePlannerSchedule } from '../home-calendar-kind';
import { CustomToastService } from '../../../services/custom-toast.service';

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
    RouterModule,
    SupermePopupComponent,
    GlanceBlankStateComponent,
    IonicModule,
  ]
})
export class ActivityCardComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input()
  habit: Habit | null = null;

  @Input()
  mode: 'single' | 'list' | 'recent' = 'single';

  /** Allows dashboards to use the same dynamic card with role-specific copy. */
  @Input()
  headerTitle: string = 'Today at a Glance';

  @Input()
  addButtonLabel: string = 'Add New';

  @Input()
  recentHabits: Habit[] = [];

  @Input()
  recentTasks: any[] = [];

  @Input()
  recentTimetables: any[] = [];

  /** Unfiltered daily calendar records, before Home truncates/hides cards. */
  @Input() glanceDailyData: GlanceDailyData | null = null;
  private loadedDailyHabits: any[] | null = null;
  private loadedDailyTasks: any[] | null = null;
  private loadedDailyPlanners: any[] = [];

  get glanceBlankState(): GlanceBlankState | null {
    if (this.mode === 'single' || this.glancePlannerLoading) return null;
    const data = this.glanceDailyData || (this.mode === 'list' && this.loadedDailyHabits && this.loadedDailyTasks
      ? { habits: this.loadedDailyHabits, tasks: this.loadedDailyTasks, planners: this.loadedDailyPlanners }
      : null);
    if (!data) return null;
    const classify = (item: any, planner = false) => {
      const status = String(item?.status || '').toLowerCase();
      return {
        completed: status === 'completed' || item.completed === true,
        // Use the same Home deadline as card visibility, including end-time grace.
        passed: planner ? (item.expired === true || this.isGlancePlannerEntryPassed(item))
          : !this.buttonLogic.homeTiming(item).visible
      };
    };
    // Grouped schedules contain the complete set of today's slots, without
    // counting a second copy of the flat calendar records.
    const planners = this.hasGlancePlannerCards
      ? this.glancePlannerCards.reduce<any[]>((items, card) => items.concat(card.entries.map(entry => ({ ...entry,
          completed: entry.completed ?? card.source.completed,
          status: entry.status ?? card.source.status }))), [])
      : data.planners.filter(item => isHomePlannerSchedule(item) && !this.isConfirmedEventMirror(item));
    return resolveGlanceBlankState(this.currentActive as GlanceTab, {
      habits: data.habits.map(item => classify(item)),
      tasks: data.tasks.map(item => classify(item)),
      timetable: planners.map(item => classify(item, true))
    });
  }

  openBlankStateSecondary(state: GlanceBlankState): void {
    if (state.secondaryRoute === 'calendar') {
      void this.router.navigate(['/authed/activity-page'], { queryParams: { tab: 'all' } });
    }
    else void this.openHabitPage();
  }

  @Input()
  expanded: boolean = false;

  @Input() autoExpand: boolean = false;

  /** The simplified Figma presentation is exclusive to Home Habit items. */
  @Input() homeHabitCard = false;
  @Input() homeTaskCard = false;
  @Input() homeTiming = false;

  get isCompactHomeHabit(): boolean {
    return this.homeHabitCard && this.habit?.type === 'habits';
  }

  get isCompactHomeActivity(): boolean {
    return this.isCompactHomeHabit || (this.homeTaskCard && this.habit?.type === 'tasks');
  }

  get habitRemainingLabel(): string {
    const now = Date.now();
    const schedule = focusSchedule(this.habit, now);
    const snapshot = timerSnapshot(schedule.start, schedule.end, now);
    if (!snapshot) return '';
    const seconds = snapshot.remainingSeconds;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} left`;
  }

  /** Figma's compact clock notation; scheduling still uses the original values. */
  compactHabitTime(value: string | undefined, timestamp: number): string {
    const formatted = this.formatTimeString(value) || this.getFormattedTime(timestamp);
    return formatted.replace(/^0?(\d{1,2}):(\d{2})$/, '$1.$2');
  }

  get isCardExpanded(): boolean {
    if (!this.autoExpand) return this.expanded;
    const status = this.getStatus();
    if (status === 'completed' || status === 'skipped') return false;
    const now = Date.now();
    const start = Number(this.startTime);
    const end = Number(this.endTime);
    return Number.isFinite(start) && start > 0 && Number.isFinite(end) && end > start
      && now >= start - 5 * 60_000 && now <= end;
  }

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
   * Optional input for total timetable entries (alias for totalTimetablesLoaded)
   */
  @Input()
  set totalTimetables(value: number) {
    this.totalTimetablesLoaded = value;
  }

  /**
   * Optional input for total timetable entries loaded from API
   */
  @Input()
  totalTimetablesLoaded: number = 0;

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
  public timetables: any[] = [];
  public hasHabits: boolean = false;
  public hasTasks: boolean = false;
  public hasTimetables: boolean = false;
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

  // Swipe-to-delete state
  public swipeOffset: number = 0;
  public isSwipedOpen: boolean = false;
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  public swipeTracking: boolean = false;
  private readonly SWIPE_THRESHOLD = 50;
  readonly DELETE_REVEAL_WIDTH = 80;
  public actionSwipeKey: string | null = null;
  public actionSwipeOffset = 0;
  private actionSwipeStartX = 0;
  private actionSwipeStartY = 0;
  private actionSwipeTracking = false;
  private actionSwipeInitialOffset = 0;

  // Delete popup state
  public showDeletePopup: boolean = false;
  public deletePopupConfig: SupermePopupConfig = {};
  public deletingItem = false;
  private pendingDeleteItem: any = null;
  private pendingDeleteType: 'habit' | 'task' | 'event' | 'timetable' = 'habit';

  // Auto-reload timers
  private letsGoWindowTimer: any;
  private endTimeTimer: any;
  private startBubbleTimer: any;
  private taskCountdownTimer: any;

  public maxItemsToShow: number = 4;  // percentageWrapper is inside the single-card template which is rendered conditionally,
  // so query it with static: false and guard access in code.
  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  private _intervalId: any;
  private userProfileSubscription?: Subscription;
  private childSelectionSubscription?: Subscription;

  constructor(
    private habitCardService: HabitCardService,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private calendarApi: CalendarApi,
    private calendarService: CalendarService,
    private eventApi: EventApi,
    private toastService: CustomToastService,
    private habitService: HabitService,
    private modalCtrl: ModalController,
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private authApiService: AuthApi,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private buttonLogic: HabitButtonLogicService,
    private autoAbortService: AutoAbortService,
    private focusTimer: FocusTimerService,
    private profileSelectorService: ProfileSelectorService
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
  openStartPopup(event?: Event) {
    // Expanded calendar cards use swipe and long-press gestures. Handling the
    // CTA directly prevents those parent gestures from swallowing the action.
    event?.stopPropagation();

    if (!this.isLetsGoEnabled()) return;

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
      image: 'assets/Images-Transparent/Image-Home-Start.webp',
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
    const headingHtml = `Great Work!<br/><span style="font-weight:400;font-size:16px;">You're about to mark this activity as completed<br/>Confirm below to earn your coins and streak:</span><div style=\"display:flex;flex-direction:column;align-items: center;gap:8px;margin-top:12px;text-align:left;\"><div style=\"display:flex;align-items:center;gap:8px;\"><img src='assets/figma/parent-home/coin.webp' style=\"width:20px;height:20px;\" alt=\"coins\"/><div style=\"margin-left:8px;\"></div><div style=\"font-weight:600;\">${coins}</div></div><div style=\"display:flex;align-items:center;gap:8px;\"><img src='assets/figma/parent-home/streak.webp' style=\"width:20px;height:20px;\" alt=\"streak\"/><div style=\"margin-left:8px;\"></div><div style=\"font-weight:600;\">${streak}</div></div></div>`;

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
      image: 'assets/Images-Transparent/Image-Home-GreatWork.webp',
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
      image: 'assets/Images-Transparent/Image-Home-GreatWork.webp',
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

    const headingHtml = `You\u2019re halfway there! Want to stop now?<br/><span style="font-weight:400;font-size:16px;">You are about to lose:</span><div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;align-items:center;justify-content:center;"><div style="display:flex;align-items:center;gap:12px;"><img src='assets/figma/parent-home/coin.webp' style="width:20px;height:20px;" alt="coins"/><div style="font-weight:600;">${coins}</div></div><div style="display:flex;align-items:center;gap:12px;"><img src='assets/figma/parent-home/streak.webp' style="width:20px;height:20px;" alt="streak"/><div style="font-weight:600;">${streak}</div></div></div>`;

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
      image: 'assets/Images-Transparent/Image-Home-Abort.webp',
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

    // Skipped is a terminal state and must never be completed from a stale UI.
    const status = this.habit.status?.toLowerCase();
    if (status === 'skipped' || !this.isDoneEnabled()) {
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
    // Every new dashboard/list instance starts from the complete overview.
    // Tab changes remain local to the current session, but a logout/login (or
    // a fresh component instance) must not reopen the previously active type.
    if (this.mode === 'recent' || this.mode === 'list') {
      this.currentActive = 'all';
      // Re-evaluate time-gone presentation as the clock advances without API polling.
      this.taskCountdownTimer = setInterval(() => this.cdr.markForCheck(), 30_000);
    }

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

      // Keep the child-friendly "Time left" copy current without requiring a refresh.
      if (this.habit.type === 'tasks' || this.autoExpand || this.isCompactHomeHabit) {
        this.taskCountdownTimer = setInterval(() => this.cdr.markForCheck(), this.isCompactHomeActivity ? 1000 : 30_000);
      }
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

    // Planner tab cards are grouped by schedule and need their own fetch
    // regardless of mode, since `recentTimetables`/`timetables` are flat
    // per-entry lists without schedule-level grouping (title, date range).
    if (this.mode === 'list' || this.mode === 'recent') {
      this.loadGlancePlannerCards();
    }

    // A parent's selected child can settle (or change) asynchronously after
    // this component's own initial load has already fired — the profile
    // selector interceptor only knows the child that is selected *at request
    // time*, so an initial request racing ahead of that selection quietly
    // fetches the parent's own (usually empty) calendar instead. Re-fetch
    // whenever the selected child actually changes so this card never gets
    // stuck showing another user's data.
    const watchesChildSelection = (this.mode === 'list' || this.mode === 'recent')
      && (this.isParentOverride ?? this.authService.isParentUser());
    if (watchesChildSelection) {
      // Skip the BehaviorSubject's current value: the initial request above
      // already uses that context through ProfileSelectorInterceptor.
      this.childSelectionSubscription = this.profileSelectorService.childChanged$.pipe(skip(1)).subscribe(() => {
        // The list screen owns these collections. The recent dashboard receives
        // habits/tasks from its parent, but both modes own the event/planner feed.
        if (this.mode === 'list') {
          this.habits = [];
          this.tasks = [];
          this.timetables = [];
          this.loadedDailyHabits = null;
          this.loadedDailyTasks = null;
          this.loadedDailyPlanners = [];
          // force=true bypasses HabitApi's date-keyed cache, which otherwise
          // has no notion of "which user" and would keep serving whichever
          // account's response was cached first for today's date.
          this.loadHabits(true);
          this.loadTodayTasks();
        }
        // Clear the prior profile immediately so Child A's cards are never
        // visible while Child B's requests are in flight.
        this.glancePlannerRaw = [];
        this.glanceUpcomingEventRaw = [];
        this.loadGlancePlannerCards(true);
      });
    }

    // If in recent mode, check if we have recent habits/tasks (excluding completed ones)
    if (this.mode === 'recent') {
      this.hasHabits = this.filteredRecentHabits.length > 0;
      this.hasTasks = this.filteredRecentTasks.length > 0;
      this.hasTimetables = this.filteredRecentTimetables.length > 0;

      // Compute habit-all-done for recent mode using `recentHabits` if provided (it may contain completed items)
      const recentList = (this.recentHabits && this.recentHabits.length > 0) ? this.recentHabits : this.filteredRecentHabits;
      this.habitAllDoneComputed = Array.isArray(recentList) && recentList.length > 0 && recentList.every(h => {
        const s = (h?.status || '').toString().toLowerCase();
        return s === 'completed';
      });

      // Compute task-all-done for recent mode using `recentTasks` if provided
      const recentTaskList = (this.recentTasks && this.recentTasks.length > 0) ? this.recentTasks : this.filteredRecentTasks;
      this.taskAllDoneComputed = Array.isArray(recentTaskList) && recentTaskList.length > 0 && recentTaskList.every(t => {
        const s = (t?.status || '').toString().toLowerCase();
        return s === 'completed';
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
      } else if (this.currentActive === 'timetable') {
        this.isEmpty = !this.hasTimetables && !this.hasGlancePlannerCards;
      } else {
        this.isEmpty = !this.hasHabits && !this.hasTasks && !this.hasTimetables && !this.hasGlancePlannerCards;
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
        const authenticatedRelationship = this.authService?.getUserRelationship?.();
        // The authenticated session is authoritative. A stale parent profile
        // must not hide activity actions after a Child/Self user logs in.
        this.isParent = authenticatedRelationship
          ? authenticatedRelationship === 'PARENT'
          : profileIsParent;
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
        const authenticatedRelationship = this.authService?.getUserRelationship?.();
        if (authenticatedRelationship) {
          this.isParent = authenticatedRelationship === 'PARENT';
          this.cdr.detectChanges();
        } else if (signupRole) {
          // Signup storage is only a fallback before an authenticated profile
          // exists; it must never override an active Child/Self session.
          this.isParent = signupRole.toString().toUpperCase() === 'PARENT';
          this.cdr.detectChanges();
        }
      } else {
        this.isParent = !!this.isParentOverride;
        this.cdr.detectChanges();
      }

      // Also check AuthService if available (authoritative logged-in role stored under user_data)
      try {
        if (this.isParentOverride === undefined) {
          const authenticatedRelationship = this.authService?.getUserRelationship?.();
          if (authenticatedRelationship) {
            this.isParent = authenticatedRelationship === 'PARENT';
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
   * Home refreshes at start - 5m, start + 10m, and immediately after end + 10m.
   * Other views retain their existing refresh boundaries.
   */
  private setupAutoReloadTimers(): void {
    // Clear any existing timers
    this.clearAutoReloadTimers();

    const now = Date.now();
    const upcomingEvents: { time: number, type: 'letsgo' | 'end' }[] = [];

    // Home/calendar rows render nested cards in single mode, so they also need
    // a boundary refresh without requiring the user to leave and reopen them.
    const allActivities = this.mode === 'single'
      ? [this.habit]
      : [...this.habits, ...this.tasks, ...this.recentHabits, ...this.recentTasks];

    allActivities.forEach(activity => {
      if (activity) {
        const { startTimeStamp, endTimeStamp } = this.buttonLogic.calculateTimestamps(activity);
        if (!startTimeStamp || !endTimeStamp) return;

        if (this.mode !== 'single' || this.homeTiming) {
          const timing = this.buttonLogic.homeTiming(activity, now);
          for (const time of [timing.opens, timing.handoff, timing.closes + 1]) {
            if (timing.valid && time > now) upcomingEvents.push({ time, type: 'letsgo' });
          }
          return;
        }
        const letsGoWindowStart = this.autoExpand ? startTimeStamp - 5 * 60_000 : startTimeStamp;
        if (now < letsGoWindowStart) {
          upcomingEvents.push({ time: letsGoWindowStart, type: 'letsgo' });
        }
        if (now <= endTimeStamp) {
          upcomingEvents.push({ time: endTimeStamp + 1, type: 'end' });
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
        if (this.mode === 'single') {
          this.cdr.detectChanges();
        } else {
          this.reloadData();
        }
        // After reloading, set up timers again for next events
        this.setupAutoReloadTimers();
      }, Math.max(0, timeUntilEvent));
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

  /** Refresh the visible list after the parent switches the selected child. */
  public refresh(): void {
    this.reloadData();
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

  // ─── Swipe-to-delete ───────────────────────────────────────────────────────

  onSwipeStart(event: TouchEvent): void {
    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartY = event.touches[0].clientY;
    this.swipeTracking = true;
  }

  onSwipeMove(event: TouchEvent): void {
    if (!this.swipeTracking) return;
    const dx = event.touches[0].clientX - this.swipeStartX;
    const dy = event.touches[0].clientY - this.swipeStartY;
    if (Math.abs(dy) > Math.abs(dx) + 5) { this.swipeTracking = false; return; }
    if (dx > 0 && !this.isSwipedOpen) return;
    const base = this.isSwipedOpen ? this.DELETE_REVEAL_WIDTH : 0;
    const raw = base + (-dx);
    this.swipeOffset = Math.max(0, Math.min(raw, this.DELETE_REVEAL_WIDTH));
    if (dx < 0) event.preventDefault();
  }

  onSwipeEnd(): void {
    if (!this.swipeTracking) return;
    this.swipeTracking = false;
    if (this.swipeOffset >= this.SWIPE_THRESHOLD) {
      this.isSwipedOpen = true;
      this.swipeOffset = this.DELETE_REVEAL_WIDTH;
    } else {
      this.isSwipedOpen = false;
      this.swipeOffset = 0;
    }
  }

  closeSwipe(): void {
    this.isSwipedOpen = false;
    this.swipeOffset = 0;
  }

  onActionSwipeStart(event: TouchEvent, key: string): void {
    if (this.actionSwipeKey && this.actionSwipeKey !== key) this.closeActionSwipe();
    this.actionSwipeKey = key;
    this.actionSwipeStartX = event.touches[0].clientX;
    this.actionSwipeStartY = event.touches[0].clientY;
    this.actionSwipeInitialOffset = this.actionSwipeOffset;
    this.actionSwipeTracking = true;
  }

  onActionSwipeMove(event: TouchEvent, key: string): void {
    if (!this.actionSwipeTracking || this.actionSwipeKey !== key) return;
    const dx = event.touches[0].clientX - this.actionSwipeStartX;
    const dy = event.touches[0].clientY - this.actionSwipeStartY;
    if (Math.abs(dy) > Math.abs(dx) + 5) {
      this.actionSwipeTracking = false;
      return;
    }
    this.actionSwipeOffset = Math.max(0, Math.min(this.actionSwipeInitialOffset - dx, this.DELETE_REVEAL_WIDTH));
    if (dx < 0) event.preventDefault();
  }

  onActionSwipeEnd(key: string): void {
    if (!this.actionSwipeTracking || this.actionSwipeKey !== key) return;
    this.actionSwipeTracking = false;
    if (this.actionSwipeOffset >= this.SWIPE_THRESHOLD) {
      this.actionSwipeOffset = this.DELETE_REVEAL_WIDTH;
    } else {
      this.closeActionSwipe();
    }
  }

  getActionSwipeOffset(key: string): number {
    return this.actionSwipeKey === key ? this.actionSwipeOffset : 0;
  }

  closeActionSwipe(): void {
    this.actionSwipeKey = null;
    this.actionSwipeOffset = 0;
    this.actionSwipeTracking = false;
  }

  onUpcomingEventTap(event: any): void {
    void this.router.navigate(['/authed/event-detail', event.id], {
      state: { event, origin: this.router.url }
    });
  }

  onPlannerCardTap(card: { id: string }, index: number): void {
    const key = `planner-${card.id}`;
    if (this.getActionSwipeOffset(key) > 0) {
      this.closeActionSwipe();
      return;
    }
    this.toggleGlancePlannerCard(card, index);
  }

  async openGlancePlannerEditor(source: any, entry: any, event: Event): Promise<void> {
    this.plannerHeldAt = Date.now();
    event?.stopPropagation();
    // The calendar API stores one planner schedule with its timetable entries.
    // Edit that parent schedule so every row keeps its correct id and dates.
    const planner = {
      ...source,
      type: 'timetable',
      activities: Array.isArray(source?.activities) && source.activities.length
        ? source.activities
        : [entry]
    };
    await this.openTimetableEditorFor(planner);
  }

  async editPlannerFromCard(event: Event): Promise<void> {
    event.stopPropagation();
    await this.openTimetableEditor();
  }

  private plannerHeldAt = 0;
  async viewPlanner(source: any, entry: any, event: Event): Promise<void> {
    event.stopPropagation();
    if (Date.now() - this.plannerHeldAt < 1000) return;
    // Match the calendar flow: keep the loaded schedule and clicked entry in
    // navigation state instead of passing through the legacy redirect.
    await this.router.navigate(['/activity-detail', source.id], {
      queryParams: { type: 'timetable' },
      state: {
        habit: { ...source, type: 'timetable' },
        plannerEntry: entry,
        type: 'timetable',
        selectedDate: this.selectedDate || this.formatDateForApi(new Date())
      }
    });
  }

  openDeletePopup(item: any = this.habit, forcedType?: 'habit' | 'task' | 'event' | 'timetable'): void {
    this.closeSwipe();
    this.closeActionSwipe();
    if (!item || this.deletingItem) return;

    this.pendingDeleteItem = item;
    this.pendingDeleteType = forcedType || this.resolveDeleteType(item);
    const coins = this.getCoinReward();
    const label = this.pendingDeleteType === 'timetable' ? 'planner entry' : this.pendingDeleteType;
    const lossHtml = coins > 0
      ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;align-items:center;justify-content:center;"><span style="font-weight:400;font-size:13px;opacity:0.7;">You are about to lose:</span><div style="display:flex;align-items:center;gap:8px;"><img src='assets/figma/parent-home/coin.webp' style="width:20px;height:20px;" alt="coins"/><span style="font-weight:600;">${coins}</span></div></div>`
      : '';
    const headingHtml = `Delete this ${label}?<br/><span style="font-weight:400;font-size:14px;">This action cannot be undone.</span>${lossHtml}`;
    this.deletePopupConfig = {
      image: 'assets/Images-Transparent/Image-Input-Delete.webp',
      imageAlt: 'Delete',
      heading: headingHtml,
      subtitle: '',
      primaryCTA: { text: 'Cancel', buttonStyle: 'white-black', buttonMedium: true },
      secondaryCTA: { text: 'Delete', buttonStyle: 'red', buttonMedium: true },
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'row'
    };
    this.showDeletePopup = true;
  }

  closeDeletePopup(): void {
    this.showDeletePopup = false;
  }

  handleDeleteCancel(): void {
    this.closeDeletePopup();
  }

  handleDeleteConfirm(): void {
    const item = this.pendingDeleteItem;
    const type = this.pendingDeleteType;
    if (!item || this.deletingItem) return;

    const id = String(item.entryId ?? item.id ?? item.calendarId ?? '');
    if (!id) {
      this.toastService.error('Unable to identify this item. Please refresh and try again.');
      this.closeDeletePopup();
      return;
    }

    this.deletingItem = true;
    const request$ = type === 'task'
      ? this.taskApi.deleteTask(id)
      : type === 'event'
      ? this.eventApi.deleteEvent(id)
      : type === 'timetable'
      ? (Array.isArray(item.activities)
        ? this.calendarApi.deleteCalendarEvent(String(item.id ?? item.calendarId))
        : this.calendarApi.deleteTimetableEntry(id))
      : this.habitApi.deleteHabit(id);

    request$.subscribe({
      next: () => {
        this.deletingItem = false;
        this.closeDeletePopup();
        this.removeDeletedItemFromView(id, type);
        if (type === 'task') this.habitService.notifyTaskDeleted();
        else if (type === 'event') this.habitService.notifyEventDeleted();
        else if (type === 'timetable') this.habitService.notifyPlannerDeleted();
        else this.habitService.deleteHabit(id);
        this.toastService.success(`${type === 'timetable' ? 'Planner entry' : this.capitalize(type)} deleted.`);
      },
      error: (err: any) => {
        this.deletingItem = false;
        this.toastService.error(err?.error?.message || `Could not delete this ${type}. Please try again.`);
      }
    });
  }

  private resolveDeleteType(item: any): 'habit' | 'task' | 'event' | 'timetable' {
    const raw = String(item?.type ?? item?.entityType ?? '').toLowerCase();
    if (raw.includes('task')) return 'task';
    if (raw.includes('event')) return 'event';
    if (raw.includes('time') || raw.includes('planner') || item?.entryId != null) return 'timetable';
    return 'habit';
  }

  private removeDeletedItemFromView(id: string, type: 'habit' | 'task' | 'event' | 'timetable'): void {
    const differs = (item: any) => String(item?.entryId ?? item?.id ?? item?.calendarId ?? '') !== id;
    if (type === 'task') this.tasks = this.tasks.filter(differs);
    if (type === 'habit') this.habits = this.habits.filter(differs);
    if (type === 'event') this.glanceUpcomingEventRaw = this.glanceUpcomingEventRaw.filter(differs);
    if (type === 'timetable') {
      this.timetables = this.timetables.filter(differs);
      this.glancePlannerRaw = this.glancePlannerRaw.filter(differs);
    }
    this.hasTasks = this.tasks.length > 0;
    this.hasHabits = this.habits.length > 0;
    this.hasTimetables = this.timetables.length > 0;
    this.updateEmptyState();
    this.cdr.detectChanges();
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  // ───────────────────────────────────────────────────────────────────────────

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

    if (this.taskCountdownTimer) {
      clearInterval(this.taskCountdownTimer);
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

    if (this.childSelectionSubscription) {
      this.childSelectionSubscription.unsubscribe();
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
    if (this.habit?.type === 'timetable') this.plannerHeldAt = Date.now();
    this.openActivityDetail(true);
  }

  private openActivityDetail(fromLongPress: boolean): void {
    const itemId = Number(this.habit?.id ?? (this.habit as any)?.taskId ?? (this.habit as any)?.habitId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return;
    }

    const rawType = String(this.habit?.type || 'habits').toLowerCase();
    const itemType = rawType.includes('task') ? 'tasks' : rawType === 'timetable' ? 'timetable' : 'habits';

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
    this.router.navigate(['/activity-detail', itemId], {
      state: { 
        habit: { ...this.habit, id: itemId, type: itemType },
        type: itemType, 
        fromLongPress,
        selectedDate: dateForApi 
      },
      queryParams: { type: itemType, date: dateForApi }
    }).catch(err => {
      console.error('Navigation to habit detail failed:', err);
    });
  }

  openCardContent(event: Event): void {
    const target = event.target as HTMLElement | null;
    const isNestedControl = target?.closest(
      'button, a, input, textarea, select, ion-button, superme-button, [role="button"]'
    );

    // Let controls inside the card keep their own actions without also opening
    // the activity detail screen.
    if (isNestedControl && isNestedControl !== event.currentTarget) {
      return;
    }

    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }

    if (this.isSwipedOpen || this.swipeOffset > 0) {
      this.closeSwipe();
      return;
    }

    if (this.habit?.type === 'timetable') {
      void this.viewPlanner(this.habit, null, event);
      return;
    }
    this.openActivityDetail(false);
  }

  /**
   * Open activity-input component in edit mode for timetable
   */
  private async openTimetableEditor() {
    if (!this.habit) return;
    await this.openTimetableEditorFor(this.habit);
  }

  private async openTimetableEditorFor(planner: any): Promise<void> {
    if (!planner) return;

    const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    const modal = await this.modalCtrl.create({
      component: ActivityInputComponent,
      componentProps: {
        editingHabit: planner,
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
    // Keep the add form on the tab the user selected in Today at a Glance.
    // Planner is represented internally as `timetable`, which the input screen
    // maps to the visible Planner tab for Self and Child users.
    const initialTab = this.currentActive === 'tasks'
      ? 'tasks'
      : this.currentActive === 'timetable'
      ? 'timetable'
      : this.currentActive === 'habits'
      ? 'habits'
      : this.habit?.type === 'tasks'
      ? 'tasks'
      : this.habit?.type === 'timetable'
      ? 'timetable'
      : 'habits';
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
    if (!this.habit || this.isParent) return;
    const activity = this.habit;
    if (await this.focusTimer.open(activity)) {
      this.trackCompletion(activity.type === 'tasks' ? 'tasks' : 'habits', activity.title || '');
      this.habit = { ...activity, status: 'completed' };
      this.showLocalTimer = false;
      this.clearProgress();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // If a parent override is passed from a parent component, apply it immediately
    if (changes['isParentOverride']) {
      this.isParent = !!changes['isParentOverride'].currentValue;
      this.cdr.detectChanges();
    }
    if (this.mode === 'single' && changes['habit']) {
      this.setupAutoReloadTimers();
    }
    // If in recent mode and recent habits or tasks change, update the display
    if (this.mode === 'recent' && (changes['recentHabits'] || changes['recentTasks'] || changes['recentTimetables'])) {
      this.updateRecentDisplay();

      // The Home dashboard passes flat calendar entries through
      // `recentTimetables`, while the intended Planner card needs the grouped
      // month response. Refresh that grouped response whenever the parent
      // receives new planner data; otherwise the component keeps its initial
      // empty result and temporarily renders the generic fallback card until a
      // full browser refresh.
      if (changes['recentTimetables'] && !changes['recentTimetables'].firstChange) {
        this.loadGlancePlannerCards(true);
      }

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
      this.hasTimetables = this.filteredRecentTimetables.length > 0;

      // Compute habit-all-done and task-all-done using recent arrays (these may include completed items)
      const recentList = (this.recentHabits && this.recentHabits.length > 0) ? this.recentHabits : this.filteredRecentHabits;
      this.habitAllDoneComputed = Array.isArray(recentList) && recentList.length > 0 && recentList.every(h => {
        const s = (h?.status || '').toString().toLowerCase();
        return s === 'completed';
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
      } else if (this.currentActive === 'timetable') {
        this.isEmpty = !this.hasTimetables && !this.hasGlancePlannerCards;
      } else {
        this.isEmpty = !this.hasHabits && !this.hasTasks && !this.hasTimetables && !this.hasGlancePlannerCards;
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
  loadHabits(force: boolean = false) {
    // Get all habits using the service
    // this.habitService.loadHabitsBySearch({}).subscribe({
    this.habitService.loadTodayHabits(force).subscribe({
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
        this.loadedDailyHabits = allHabits;
        
        // Count how many habits are actually completed/skipped (from raw data)
        this.totalHabitsCompleted = allHabits.filter((h: Habit) => {
          const s = (h.status || '').toString().toLowerCase();
          return s === 'completed';
        }).length;
        
        this.habits = allHabits
          // Exclude completed and skipped items from Home (completed disappear instantly)
          .filter((h: Habit) => {
            const s = (h.status || '').toString().toLowerCase();
            return s !== 'completed' && s !== 'skipped' && this.buttonLogic.homeTiming(h).visible;
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
            return s !== 'completed' && s !== 'skipped' && this.buttonLogic.homeTiming(t).visible;
          })
          // This API returns all tasks; keep only today's occurrences on Home.
          .filter((t: any) => {
            const start = new Date(t.startTimeStamp);
            const today = new Date(now);
            return t.today === true || (start.getFullYear() === today.getFullYear()
              && start.getMonth() === today.getMonth() && start.getDate() === today.getDate());
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
        this.loadedDailyTasks = rawTasks;
        this.loadedDailyPlanners = Array.isArray(resp?.events)
          ? resp.events.filter((item: any) => isHomePlannerSchedule(item) && !this.isConfirmedEventMirror(item)) : [];

        // The same calendar response also contains planner/time-table entries.
        // Populate them here so list mode (including the parent home card) gets
        // the count and content without needing a second request.
        const rawTimetables = Array.isArray(resp?.events)
          ? resp.events.filter((item: any) => item?.expired !== true
            && isHomePlannerSchedule(item) && !this.isConfirmedEventMirror(item))
          : [];
        const plannerTotalForToday = Number(resp?.totalPlannerForTheday);
        this.totalTimetablesLoaded = Number.isFinite(plannerTotalForToday) && !resp?.events?.some(isHomePersonalEvent)
          ? Math.max(0, plannerTotalForToday)
          : rawTimetables.length;
        this.timetables = rawTimetables
          .map((item: any) => {
            const isRecurring = item.daysOfWeek?.length || item.everyday || item.everyWeekend;
            const itemForTimestamp = isRecurring
              ? { ...item, startDate: formatted, endDate: formatted }
              : item;
            const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);

            return {
              ...item,
              type: 'timetable',
              originalCalendarType: item.originalCalendarType || item.type || '',
              title: item.title || item.name || 'Planner',
              notes: item.description || item.notes || '',
              startTimeStamp: timestamps.startTimeStamp,
              endTimeStamp: timestamps.endTimeStamp,
              status: item.completed ? 'completed' : 'pending',
              coinReward: 0,
              routine: null
            };
          })
          .filter((item: any) => item.status !== 'completed')
          .sort((a: any, b: any) => Number(a.startTimeStamp || 0) - Number(b.startTimeStamp || 0))
          .slice(0, this.maxItemsToShow);
        this.hasTimetables = this.timetables.length > 0;

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
            return s !== 'completed' && s !== 'skipped' && this.buttonLogic.homeTiming(t).visible;
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
        this.timetables = [];
        this.hasTasks = false;
        this.hasTimetables = false;
        this.totalTasksLoaded = 0;
        this.totalTasksCompleted = 0;
        this.totalTimetablesLoaded = 0;
        this.updateEmptyState();
        this.cdr.detectChanges();
      }
    });
  }

  // ── Planner tab: grouped schedule cards (title, date range, expand/collapse) ──
  // Fetches the same planner-schedule API used by the full Planner page, grouped
  // by schedule rather than the flat per-entry list `timetables`/`recentTimetables`
  // use elsewhere in this component.
  public glancePlannerRaw: any[] = [];
  public glanceUpcomingEventRaw: any[] = [];
  public glancePlannerLoading = false;
  public glancePlannerLoaded = false;
  private glancePlannerLoadError = false;
  private glancePlannerExcludedEventMirrors = false;
  private glancePlannerReloadPending = false;
  private readonly glancePlannerExpansion = new Map<string, boolean>();

  get glancePlannerCards(): Array<{ id: string; source: any; color: string; entries: any[] }> {
    const today = new Date();
    return this.mergeDuplicateGlancePlannerSchedules(this.glancePlannerRaw)
      .filter(item => this.glancePlannerOccursOnDate(item, today))
      .map((source, index) => ({
        // Fall back to an index-qualified key (not just the title) so that
        // multiple schedules sharing the same title never collide on the
        // same expand/collapse state — each card must be independently
        // toggleable regardless of backend id/title duplication.
        id: String(source?.id ?? source?.calendarId ?? `${source?.title ?? 'entry'}-${index}`),
        source,
        color: this.getGlancePlannerColor(source),
        entries: this.getGlancePlannerEntriesForDate(source, today)
      }))
      .filter(card => card.entries.length > 0)
      .sort((left, right) => this.getGlancePlannerStartTimestamp(left.source) - this.getGlancePlannerStartTimestamp(right.source));
  }

  get hasGlancePlannerCards(): boolean {
    return this.glancePlannerCards.length > 0;
  }

  /** Upcoming personal events for the current month, resolved without demo data. */
  get glanceUpcomingEvents(): any[] {
    const today = this.glanceStartOfDay(new Date());
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return this.glanceUpcomingEventRaw
      .map(event => {
        const occurrence = this.getGlanceUpcomingEventOccurrence(event, today);
        return occurrence ? { ...event, __glanceEventDate: occurrence } : null;
      })
      .filter((event: any) => {
        const occurrence = event?.__glanceEventDate as Date | undefined;
        return !!occurrence && occurrence >= today && occurrence <= monthEnd;
      })
      .sort((left, right) => left.__glanceEventDate.getTime() - right.__glanceEventDate.getTime());
  }

  loadGlancePlannerCards(force = false): void {
    if (this.glancePlannerLoading) {
      // A save can complete while the initial grouped request is still in
      // flight. Remember the forced refresh and run it after that request
      // settles so its older response cannot leave the UI stale.
      this.glancePlannerReloadPending = this.glancePlannerReloadPending || force;
      return;
    }
    if (this.glancePlannerLoaded && !force) return;

    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    this.glancePlannerLoading = true;
    // Compare both existing endpoints before rendering calendar rows as Planner.
    forkJoin({
      calendar: this.calendarService.getUserPlannerCalendarMonth(formatted),
      events: this.eventApi.getEvents().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ calendar, events }: { calendar: any; events: any[] }) => {
        const calendarEvents = Array.isArray(calendar?.events) ? calendar.events : [];
        // The calendar endpoint supplies Planner schedules, while /events/all
        // supplies personal Events. Calendar timetable rows may have event-like
        // fields, so do not feed them into Upcoming Events.
        this.glanceUpcomingEventRaw = this.mergeGlanceUpcomingEvents([], events || []);
        const eventMirrors = calendarEvents.filter((item: any) => this.isConfirmedEventMirror(item));
        const plannerCandidates = calendarEvents.filter((item: any) => this.isGlancePlannerSchedule(item));
        this.glancePlannerRaw = plannerCandidates.filter((item: any) => !this.isConfirmedEventMirror(item));
        this.glancePlannerExcludedEventMirrors = eventMirrors.length > 0;
        this.glancePlannerLoadError = !!calendar?.loadError;
        this.finishGlancePlannerLoad();
      },
      error: () => {
        this.glancePlannerRaw = [];
        this.glanceUpcomingEventRaw = [];
        this.glancePlannerLoadError = true;
        this.glancePlannerExcludedEventMirrors = false;
        this.finishGlancePlannerLoad();
      }
    });
  }

  private finishGlancePlannerLoad(): void {
    this.glancePlannerLoading = false;
    this.glancePlannerLoaded = true;
    if (this.mode === 'recent') this.hasTimetables = this.filteredRecentTimetables.length > 0;
    if (this.mode === 'list') {
      this.timetables = this.timetables.filter(item => !this.isConfirmedEventMirror(item));
      this.hasTimetables = this.timetables.length > 0;
    }
    this.refreshTimetableEmptyState();
    this.cdr.detectChanges();

    if (this.glancePlannerReloadPending) {
      this.glancePlannerReloadPending = false;
      this.loadGlancePlannerCards(true);
    }
  }

  /** Re-checks the active Planner/All tab once grouped planner cards resolve asynchronously. */
  private refreshTimetableEmptyState(): void {
    if (this.currentActive !== 'timetable' && this.currentActive !== 'all') return;
    this.isEmpty = this.currentActive === 'timetable'
      ? !this.hasTimetables && !this.hasGlancePlannerCards
      : !this.hasHabits && !this.hasTasks && !this.hasTimetables && !this.hasGlancePlannerCards;
    this.showContent = !this.isEmpty;
  }

  isGlancePlannerExpanded(card: { id: string }, index: number): boolean {
    return this.glancePlannerExpansion.has(card.id) ? !!this.glancePlannerExpansion.get(card.id) : index === 0;
  }

  toggleGlancePlannerCard(card: { id: string }, index: number): void {
    this.glancePlannerExpansion.set(card.id, !this.isGlancePlannerExpanded(card, index));
  }

  trackGlancePlannerCard(_index: number, card: { id: string }): string {
    return card.id;
  }

  trackGlancePlannerEntry(index: number, entry: any): string | number {
    return entry?.id ?? entry?.activityId ?? `${entry?.name ?? entry?.title ?? 'entry'}-${entry?.startTime ?? index}`;
  }

  trackGlanceUpcomingEvent(index: number, event: any): string | number {
    return event?.id ?? `${event?.name ?? event?.title ?? 'event'}-${event?.eventDate ?? event?.startDate ?? index}`;
  }

  getGlancePlannerTitle(source: any): string {
    // Planner APIs use `label` for the user-facing timetable name in some
    // responses, while older responses expose it as `name`/`title`. Prefer the
    // explicit label so generated placeholders such as "timetable 00" never
    // replace what the user entered.
    return source?.label || source?.plannerLabel || source?.activityLabel
      || source?.name || source?.title || 'Planner';
  }

  getGlancePlannerIcon(source: any): string {
    const rows = [source, ...(Array.isArray(source?.activities) ? source.activities : [])];
    for (const row of rows) {
      const icon = String(row?.selectedIcon ?? row?.iconUrl ?? row?.icon_url
        ?? row?.iconPath ?? row?.icon ?? '').trim();
      if (icon) return icon;
    }
    return 'assets/figma/child-planner/superme-planner-timetable.webp';
  }

  getGlanceUpcomingEventIcon(event: any): string {
    const cachedEvent = this.eventApi.getCachedEvent(event?.id);
    const eventType = event?.eventType || event?.event_type || cachedEvent?.eventType;
    const fallback = `${event?.title || cachedEvent?.name || ''} ${event?.name || cachedEvent?.name || ''}`;
    return getEventTypeIcon(eventType, fallback);
  }

  getGlanceUpcomingEventCountdown(event: any): string {
    const occurrence = event?.__glanceEventDate instanceof Date
      ? event.__glanceEventDate
      : this.getGlanceUpcomingEventOccurrence(event, this.glanceStartOfDay(new Date()));
    if (!occurrence) return 'This month';

    const today = this.glanceStartOfDay(new Date());
    const days = Math.round((this.glanceStartOfDay(occurrence).getTime() - today.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'In 1 Day';
    return days > 1 ? `In ${days} Days` : new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short'
    }).format(occurrence);
  }

  async openUpcomingEvents(): Promise<void> {
    await this.router.navigate(['/authed/activity-page']);
  }

  getGlancePlannerDateRange(source: any): string {
    const start = this.getGlanceLocalDate(source?.startDate || source?.start_date);
    const end = this.getGlanceLocalDate(source?.endDate || source?.end_date) || start;
    if (!start) return '';
    const format = (date: Date) => new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(date);
    return end && this.glanceDateKey(start) !== this.glanceDateKey(end) ? `${format(start)} - ${format(end)}` : format(start);
  }

  getGlancePlannerEntryTime(entry: any): string {
    const format = (value: any): string => {
      const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
      if (!match) return '';
      return `${Number(match[1])}.${match[2]}`;
    };
    const start = format(entry?.startTime || entry?.start_time);
    const end = format(entry?.endTime || entry?.end_time);
    return start && end ? `${start} - ${end}` : (start || end || 'Any time');
  }

  isGlancePlannerEntryPassed(entry: any): boolean {
    const end = this.getGlancePlannerEntryTimestamp(entry, 'end');
    return end > 0 && end < Date.now();
  }

  getGlancePlannerEntryCountdown(entry: any): string | null {
    const now = Date.now();
    const start = this.getGlancePlannerEntryTimestamp(entry, 'start');
    const end = this.getGlancePlannerEntryTimestamp(entry, 'end');
    if (!start || start <= now) {
      return end >= now ? 'Now' : null;
    }

    const diffMinutes = Math.ceil((start - now) / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (hours > 0) return `In ${hours}h ${minutes} min`;
    return `In ${Math.max(minutes, 1)} min`;
  }

  private isGlancePlannerSchedule(item: any): boolean {
    return isHomePlannerSchedule(item);
  }

  private isConfirmedEventMirror(item: any): boolean {
    return this.glanceUpcomingEventRaw.some(event => isCalendarMirrorOfPersonalEvent(item, event));
  }

  private getGlanceUpcomingEventOccurrence(event: any, referenceDate: Date): Date | null {
    const original = this.getGlanceLocalDate(event?.eventDate || event?.event_date || event?.startDate || event?.start_date);
    if (!original) return null;

    const recurrence = String(event?.recurrence || '').toUpperCase();
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    if (recurrence === 'YEARLY') {
      if (original.getMonth() !== month) return null;
      return new Date(year, month, Math.min(original.getDate(), new Date(year, month + 1, 0).getDate()));
    }
    if (recurrence === 'MONTHLY') {
      return new Date(year, month, Math.min(original.getDate(), new Date(year, month + 1, 0).getDate()));
    }
    return this.glanceStartOfDay(original);
  }

  private mergeGlanceUpcomingEvents(calendarEvents: any[], personalEvents: any[]): any[] {
    // Prefer the complete Event API record when the calendar also includes it.
    const merged = [...(personalEvents || []), ...(calendarEvents || [])]
      .filter(event => this.isGlancePersonalEventRecord(event));
    const unique = new Map<string, any>();
    merged.forEach((event, index) => {
      // Numeric IDs belong to different API domains. Include name and date so
      // an unrelated calendar event with the same ID is not lost.
      const key = [
        event?.id ?? index,
        String(event?.name ?? event?.title ?? '').trim().toLowerCase(),
        String(event?.eventDate ?? event?.event_date ?? event?.startDate ?? event?.start_date ?? '').slice(0, 10)
      ].join('|');
      if (!unique.has(key)) unique.set(key, event);
    });
    return Array.from(unique.values());
  }

  private isGlancePersonalEventRecord(item: any): boolean {
    // These fields are required by the personal Event API contract. A calendar
    // timetable mirrored as an event-shaped row must not enter Upcoming Events.
    return isHomePersonalEvent(item)
      && Boolean(String(item?.name || '').trim())
      && Boolean(String(item?.eventDate || item?.event_date || '').trim())
      && Boolean(String(item?.eventType || item?.event_type || '').trim())
      && typeof (item?.isPrivate ?? item?.is_private) === 'boolean'
      && typeof (item?.allDay ?? item?.all_day) === 'boolean';
  }

  private glancePlannerOccursOnDate(item: any, date: Date): boolean {
    const candidate = this.glanceStartOfDay(date);
    const start = this.glanceStartOfDay(this.getGlanceLocalDate(item?.startDate || item?.start_date) || candidate);
    const end = this.glanceStartOfDay(this.getGlanceLocalDate(item?.endDate || item?.end_date) || start);
    if (candidate < start || candidate > end) return false;

    const entries = Array.isArray(item?.activities) && item.activities.length ? item.activities : [item];
    return entries.some((entry: any) => this.glanceEntryOccursOnDate(entry, candidate, item?.daysOfWeek));
  }

  private getGlancePlannerEntriesForDate(item: any, date: Date): any[] {
    const entries = Array.isArray(item?.activities) && item.activities.length ? item.activities : [item];
    const uniqueEntries = new Map<string, any>();
    entries.forEach((entry: any, index: number) => {
      const key = this.glancePlannerEntryIdentity(entry, index);
      if (!uniqueEntries.has(key)) uniqueEntries.set(key, entry);
    });
    return Array.from(uniqueEntries.values())
      .filter((entry: any) => this.glanceEntryOccursOnDate(entry, date, item?.daysOfWeek))
      .sort((left: any, right: any) => this.getGlancePlannerEntryTimestamp(left, 'start') - this.getGlancePlannerEntryTimestamp(right, 'start'));
  }

  private mergeDuplicateGlancePlannerSchedules(items: any[]): any[] {
    const schedules = new Map<string, any>();
    (items || []).forEach((item: any, index: number) => {
      const key = this.glancePlannerScheduleIdentity(item, index);
      const entries = Array.isArray(item?.activities) && item.activities.length ? item.activities : [item];
      const existing = schedules.get(key);
      if (!existing) {
        schedules.set(key, { ...item, activities: [...entries] });
        return;
      }

      const uniqueEntries = new Map<string, any>();
      [...(existing.activities || []), ...entries].forEach((entry: any, entryIndex: number) => {
        const entryKey = this.glancePlannerEntryIdentity(entry, entryIndex);
        if (!uniqueEntries.has(entryKey)) uniqueEntries.set(entryKey, entry);
      });
      existing.activities = Array.from(uniqueEntries.values());
    });
    return Array.from(schedules.values());
  }

  private glancePlannerScheduleIdentity(item: any, index: number): string {
    const parentId = item?.timetableId ?? item?.timetable_id ?? item?.plannerId
      ?? item?.planner_id ?? item?.scheduleId ?? item?.schedule_id ?? item?.seriesId ?? item?.series_id;
    if (parentId !== null && parentId !== undefined && parentId !== '') return `schedule:${parentId}`;
    // The calendar API always tags each row with its own `id`; trust that over a
    // content match so two distinct rows that happen to share title/date/color
    // (e.g. two separately-created "parentTT2" entries) aren't merged into one card.
    const rowId = item?.id ?? item?.calendarId ?? item?.calendar_id;
    if (rowId !== null && rowId !== undefined && rowId !== '') return `row:${rowId}`;
    const title = this.getGlancePlannerTitle(item).trim().toLowerCase();
    const start = String(item?.startDate ?? item?.start_date ?? '').slice(0, 10);
    const end = String(item?.endDate ?? item?.end_date ?? '').slice(0, 10);
    const color = String(item?.colorCode ?? item?.color_code ?? '').toLowerCase();
    const fallback = `${title}|${start}|${end}|${color}`;
    return fallback.replace(/\|/g, '') ? `details:${fallback}` : `row:${index}`;
  }

  private glancePlannerEntryIdentity(entry: any, index: number): string {
    const id = entry?.entryId ?? entry?.entry_id ?? entry?.activityId ?? entry?.activity_id ?? entry?.id;
    if (id !== null && id !== undefined && id !== '') return `entry:${id}`;
    const name = this.getGlancePlannerTitle(entry).trim().toLowerCase();
    const start = String(entry?.startTime ?? entry?.start_time ?? '');
    const end = String(entry?.endTime ?? entry?.end_time ?? '');
    const rawDays = entry?.daysOfWeek ?? entry?.days ?? [];
    const days = (Array.isArray(rawDays) ? rawDays : [rawDays]).map(String).sort().join(',');
    const fallback = `${name}|${start}|${end}|${days}`;
    return fallback.replace(/\|/g, '') ? `details:${fallback}` : `row:${index}`;
  }

  private glanceEntryOccursOnDate(entry: any, date: Date, inheritedDays?: any): boolean {
    const rawDays = entry?.daysOfWeek ?? entry?.days ?? inheritedDays;
    const days = Array.isArray(rawDays) ? rawDays : [];
    if (!days.length) return true;
    const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    return days.some((value: any) => {
      const normalized = String(value || '').trim().toUpperCase();
      return normalized === day
        || normalized === day.slice(0, 3)
        || normalized === day.slice(0, 1)
        || (day === 'THURSDAY' && (normalized === 'TH' || normalized === 'THU'))
        || (day === 'SATURDAY' && normalized === 'SA');
    });
  }

  private getGlancePlannerEntryTimestamp(entry: any, part: 'start' | 'end'): number {
    const field = part === 'start' ? 'startTime' : 'endTime';
    const time = entry?.[field] ?? entry?.[`${field}_time`] ?? entry?.[`${part}Time`];
    const match = String(time || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const timestamp = this.glanceStartOfDay(new Date());
    timestamp.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return timestamp.getTime();
  }

  private getGlancePlannerStartTimestamp(item: any): number {
    const start = this.getGlanceLocalDate(item?.startDate || item?.start_date);
    return start ? start.getTime() : Number.MAX_SAFE_INTEGER;
  }

  private getGlancePlannerColor(item: any): string {
    // Timetable APIs can return the colour on the schedule itself or on an
    // activity row within `activities`. Resolve both shapes so the coloured
    // dot and left rail always match the colour picked while creating it.
    const rows = [item, ...(Array.isArray(item?.activities) ? item.activities : [])];
    for (const row of rows) {
      const color = String(row?.colorCode ?? row?.color_code ?? row?.color ?? '').trim();
      if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
    }
    return '#537C81';
  }

  private getGlanceLocalDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value.getTime());
    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const parsed = new Date(text);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private glanceStartOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private glanceDateKey(date: Date): string {
    return this.habitService.formatDateToYYYYMMDD(date);
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
    
    // Keep the empty state scoped to the selected tab. Previously the generic
    // habit/task check could render together with a tab-specific blank state.
    switch (this.currentActive) {
      case 'habits':
        this.isEmpty = !this.hasHabits;
        break;
      case 'tasks':
        this.isEmpty = !this.hasTasks;
        break;
      case 'timetable':
        this.isEmpty = !this.hasTimetables && !this.hasGlancePlannerCards;
        break;
      default:
        this.isEmpty = !this.hasHabits && !this.hasTasks && !this.hasTimetables && !this.hasGlancePlannerCards;
    }

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
      this.hasTimetables = this.filteredRecentTimetables.length > 0;

      const recentList = (this.recentHabits && this.recentHabits.length > 0) ? this.recentHabits : this.filteredRecentHabits;
      this.habitAllDoneComputed = Array.isArray(recentList) && recentList.length > 0 && recentList.every(h => {
        const s = (h?.status || '').toString().toLowerCase();
        return s === 'completed';
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
      } else if (this.currentActive === 'timetable') {
        this.isEmpty = !this.hasTimetables && !this.hasGlancePlannerCards;
      } else {
        this.isEmpty = !this.hasHabits && !this.hasTasks && !this.hasTimetables && !this.hasGlancePlannerCards;
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
    } else if (tab === 'timetable' && this.timetables.length === 0) {
      this.loadTodayTasks();
      this.loadGlancePlannerCards();
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

  /** Compact, child-friendly date used by expanded task cards on Home. */
  getTaskCardDate(value: Date | string | null | undefined, fallbackTimestamp?: number): string {
    const date = this.getGlanceLocalDate(value)
      || (fallbackTimestamp ? new Date(this.normalizePossibleTimestamp(fallbackTimestamp)) : null);
    if (!date || isNaN(date.getTime())) return 'Not set';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** Urgency copy deliberately avoids technical date/time language for children. */
  getTaskTimeLeft(task: Habit | null | undefined): string {
    if (!task) return 'Not set';
    const now = new Date();

    // When today's task has a scheduled time, show the useful near-term countdown
    // instead of counting down to the final date of a multi-day task.
    const startDate = this.getGlanceLocalDate(task.startDate);
    const endDate = this.getGlanceLocalDate(task.endDate);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const isWithinTaskDates = (!startDate || startDate.getTime() <= todayEnd.getTime())
      && (!endDate || endDate.getTime() >= todayStart.getTime());

    if (isWithinTaskDates && task.startTime) {
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const sessionStart = new Date(this.combineDateAndTime(todayKey, task.startTime));
      const sessionEnd = task.endTime
        ? new Date(this.combineDateAndTime(todayKey, task.endTime))
        : null;

      if (!isNaN(sessionStart.getTime()) && now.getTime() < sessionStart.getTime()) {
        return this.formatTaskCountdown(sessionStart.getTime() - now.getTime());
      }

      if (sessionEnd && !isNaN(sessionEnd.getTime())) {
        if (now.getTime() <= sessionEnd.getTime()) {
          return this.formatTaskCountdown(sessionEnd.getTime() - now.getTime());
        }
        return "Today's time passed";
      }
    }

    const due = this.getGlanceLocalDate(task.endDate)
      || (task.endTimeStamp ? new Date(this.normalizePossibleTimestamp(task.endTimeStamp)) : null);
    if (!due || isNaN(due.getTime())) return 'Not set';

    // A date-only API value represents the whole due day, not midnight at its start.
    if (!task.endTime && due.getHours() === 0 && due.getMinutes() === 0) {
      due.setHours(23, 59, 59, 999);
    }

    const sameDay = due.getFullYear() === now.getFullYear()
      && due.getMonth() === now.getMonth()
      && due.getDate() === now.getDate();
    if (sameDay) return 'Due today';

    const remainingMs = due.getTime() - now.getTime();
    if (remainingMs <= 0) return 'Due now';
    const hours = Math.ceil(remainingMs / 3_600_000);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
    const days = Math.ceil(remainingMs / 86_400_000);
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  }

  private formatTaskCountdown(remainingMs: number): string {
    const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
    if (minutes < 60) return `${minutes} min left`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
  }

  /** Date-range countdown for a repeating habit; today's session time does not replace its goal duration. */
  getHabitTimeLeft(habit: Habit | null | undefined): string {
    if (!habit) return 'Not set';
    const end = this.getGlanceLocalDate(habit.endDate)
      || (habit.endTimeStamp ? new Date(this.normalizePossibleTimestamp(habit.endTimeStamp)) : null);
    if (!end || isNaN(end.getTime())) return 'Ongoing';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const days = Math.ceil((endDay.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return 'Goal ended';
    if (days === 0) return 'Ends today';
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  }

  getTaskNote(task: Habit | null | undefined): string {
    return String(task?.notes || task?.description || '').trim();
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
    const h = this.habit as any;
    if (h?.tags && Array.isArray(h.tags) && h.tags.length > 0) {
      const first = h.tags[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (typeof first === 'object' && first !== null) {
        const name = (first.value || first.name || first.text || first.title || first.label || '').toString().trim();
        if (name) return name;
        if (first.tag && typeof first.tag === 'object') {
          const n = (first.tag.value || first.tag.name || first.tag.text || first.tag.title || '').toString().trim();
          if (n) return n;
        }
      }
    }
    if (h?.tag) {
      if (typeof h.tag === 'string' && h.tag.trim()) return h.tag.trim();
      if (typeof h.tag === 'object') {
        const n = (h.tag.value || h.tag.name || h.tag.text || h.tag.title || '').toString().trim();
        if (n) return n;
      }
    }
    return '';
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
      const fileName = `Icon-Routine-${capitalizedRoutine}.webp`;

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
   * Get recent habits to display. A skipped habit remains visible as a missed
   * item so users can review or complete it instead of seeing an empty state.
   */
  get filteredRecentHabits(): Habit[] {
    return (this.mode === 'list' ? this.habits : this.recentHabits || []).filter(habit => {
      const status = (habit.status || '').toLowerCase();
      return status !== 'completed' && this.buttonLogic.homeTiming(habit).visible;
    });
  }

  /**
   * Get filtered recent tasks excluding completed and skipped ones
   */
  get filteredRecentTasks(): any[] {
    return (this.mode === 'list' ? this.tasks : this.recentTasks || []).filter(task => {
      const status = (task.status || '').toLowerCase();
      return status !== 'completed' && status !== 'skipped' && this.buttonLogic.homeTiming(task).visible;
    });
  }

  /**
   * Get filtered recent timetable entries excluding completed ones
   */
  get filteredRecentTimetables(): any[] {
    if (!this.recentTimetables) return [];
    return this.recentTimetables.filter(item => {
      const status = (item.status || '').toLowerCase();
      return status !== 'completed' && status !== 'skipped'
        && this.isGlancePlannerSchedule(item) && !this.isConfirmedEventMirror(item);
    });
  }

  /**
   * Get combined habits, tasks and timetable entries sorted by start time (closest to current time on top)
   */
  get combinedAndSortedItems(): any[] {
    // For list mode, combine habits and tasks
    if (this.mode === 'list') {
      // Grouped planner schedules are rendered by the same planner-card
      // template used on the Planner tab. Do not render their flat calendar
      // entries again in All, otherwise the same planner appears twice and
      // with the generic Habit/Task card layout.
      const timetableItems = this.hasGlancePlannerCards ? [] : (this.timetables || []);
      const combined = [...this.filteredRecentHabits, ...this.filteredRecentTasks, ...timetableItems];
      return combined.sort((a, b) => {
        // Sort by start time: closest to current time first
        const aStart = a.startTimeStamp || 0;
        const bStart = b.startTimeStamp || 0;
        return Math.abs(aStart - Date.now()) - Math.abs(bStart - Date.now());
      });
    }

    // For recent mode, combine recent habits, tasks and timetable entries
    if (this.mode === 'recent') {
      const timetableItems = this.hasGlancePlannerCards ? [] : this.filteredRecentTimetables;
      const combined = [...this.filteredRecentHabits, ...this.filteredRecentTasks, ...timetableItems];
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

  /** "Today at a Glance" header subtitle, e.g. "5 Habits • 3 Tasks • 1 Planner" */
  /** Planner label/icon is shared across every role. */
  get usesPlannerExperience(): boolean {
    return true;
  }

  get plannerTabLabel(): string {
    return 'Planner';
  }

  get plannerTabIcon(): string {
    return 'assets/figma/home-glance/tab-planner.webp';
  }

  get viewActionLabel(): string {
    switch (this.currentActive) {
      case 'habits':
        return 'View All Habits';
      case 'tasks':
        return 'View All Tasks';
      case 'timetable':
        return 'View All Planners';
      default:
        return 'View All';
    }
  }

  get addActionLabel(): string {
    switch (this.currentActive) {
      case 'habits':
        return 'Add Habit';
      case 'tasks':
        return 'Add Task';
      case 'timetable':
        return `Add ${this.plannerTabLabel}`;
      default:
        return 'Add New';
    }
  }

  get glanceSubtitle(): string {
    // Personal Events do not determine the Planner count. Keep the daily
    // calendar total even when Upcoming Events has items of its own.
    const plannerCount = this.glancePlannerLoaded && !this.glancePlannerLoadError
      && this.glancePlannerExcludedEventMirrors
      ? this.glancePlannerCards.length
      : Math.max(this.totalTimetablesLoaded, this.glancePlannerLoaded ? this.glancePlannerCards.length : 0);
    const parts = [
      `${this.totalHabitsLoaded} Habit${this.totalHabitsLoaded === 1 ? '' : 's'}`,
      `${this.totalTasksLoaded} Task${this.totalTasksLoaded === 1 ? '' : 's'}`,
      this.glanceBlankState ? `${plannerCount} Time Table${plannerCount === 1 ? '' : 's'}`
        : `${plannerCount} Planner${plannerCount === 1 ? '' : 's'}`
    ];
    return parts.join(' • ');
  }

  /** True when every loaded habit/task is complete; timetable entries do not have completion state. */
  get isAllLoadedContentCompleted(): boolean {
    const trackableTotal = this.totalHabitsLoaded + this.totalTasksLoaded;
    if (trackableTotal === 0 || this.totalTimetablesLoaded > 0) return false;

    return this.totalHabitsCompleted + this.totalTasksCompleted === trackableTotal;
  }

  /** Combined habit+task completion percentage shown in the header pill */
  get overallCompletionRate(): number {
    const total = this.totalHabitsLoaded + this.totalTasksLoaded;
    if (total === 0) return 0;
    const completed = this.totalHabitsCompleted + this.totalTasksCompleted;
    return Math.round((completed / total) * 100);
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
    if (this.homeTiming) return this.buttonLogic.homeTiming(this.habit).letsGo
      && this.getStatus() === 'pending' && !this.hasOtherOngoingActivity();
    return this.buttonLogic.isLetsGoEnabled(this.habit, this.hasOtherOngoingActivity());
  }

  /**
   * Check if "Let's Go" button should be visible
   */
  isLetsGoVisible(): boolean {
    if (this.homeTiming) return this.getStatus() === 'pending';
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
    if (this.homeTiming) return this.buttonLogic.homeTiming(this.habit).done
      && ['pending', 'ongoing'].includes(this.getStatus()) && !this.hasOtherOngoingActivity();
    return this.buttonLogic.isDoneEnabled(this.habit, this.hasOtherOngoingActivity());
  }

  /**
   * Check if "Done" button should be visible (uses button logic service)
   */
  isDoneVisible(): boolean {
    if (this.homeTiming) return ['pending', 'ongoing'].includes(this.getStatus());
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
