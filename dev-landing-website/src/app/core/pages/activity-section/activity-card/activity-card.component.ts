
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { HostBinding } from '@angular/core';
import { NgClass, NgIf, CommonModule, NgForOf } from "@angular/common";
import { RouterModule, Router } from '@angular/router';
import { SupermeButtonComponent } from "../../../components/superme-button/superme-button.component";
import { SupermeCardHeaderComponent } from '../../../components/superme-navigator/superme-card-header/superme-card-header.component';
import { ViewAllComponent } from '../../../components/superme-navigator/view-all/view-all.component';
import { SupermePopupComponent, SupermePopupConfig } from '../../../components/superme-popup/superme-popup.component';
import { SupermeEmptyStateComponent } from '../../../components/superme-empty-state/superme-empty-state.component';
import { ActivityCardService } from './activity-card.service';
import { ActivityService } from '../activity.service';
import { HabitApi } from '../../../api/habit.api';
import { TaskApi } from '../../../api/task.api';
import { ActivityButtonLogicService } from '../activity-button-logic.service';
import { MoodService } from '../../../services/mood.service';
import { CoerceBoolean } from "../../../coerceBoolean.decorator";
import { Activity } from '../activity.types';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'activity-card',
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIf, NgClass, NgForOf, SupermeButtonComponent, SupermeCardHeaderComponent, RouterModule, ViewAllComponent, SupermePopupComponent, SupermeEmptyStateComponent]
})
export class ActivityCardComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() activity: Activity | null = null;
  @Input() mode: 'single' | 'list' | 'recent' = 'single';
  @Input() recentActivities: Activity[] = [];
  @Input() recentTasks: any[] = [];
  @Input() expanded: boolean = false;
  @Input({ transform: booleanAttribute }) @CoerceBoolean() inProgress: boolean = false;
  @Input({ transform: booleanAttribute }) @CoerceBoolean() isEmpty: boolean = true;
  @Input() startTime!: number;
  @Input() endTime!: number;
  @Input() isParentOverride?: boolean;
  @Input() variant?: 'task' | 'Activity' | 'timetable' | string;

  @Input() set totalTasks(value: number) { this.totalTasksLoaded = value; }
  @Input() totalTasksLoaded: number = 0;
  @Input() totalTasksCompleted: number = 0;
  @Input() set totalHabits(value: number) { this.totalHabitsLoaded = value; }
  @Input() totalHabitsLoaded: number = 0;
  @Input() totalHabitsCompleted: number = 0;
  @Input() taskCompletionRate: number = 0;
  @Input() habitCompletionRate: number = 0;
  @Input({ transform: booleanAttribute }) isCurrentDateView: boolean = true;
  @Input() selectedDate?: string;
  @Input({ transform: booleanAttribute }) emitClickEvents: boolean = false;

  @Output() cardClick = new EventEmitter<Activity>();

  @HostBinding('class.task') get hostIsTask(): boolean {
    return this.variant === 'task' || this.activity?.type === 'tasks';
  }

  @HostBinding('class.timetable') get hostIsTimetable(): boolean {
    return this.variant === 'timetable' || this.activity?.type === 'timetable';
  }

  public currentActive: string = 'all';
  public showContent: boolean = false;
  public isRunningLate: boolean = false;
  public missedTime: boolean = false;
  public activities: Activity[] = [];
  public tasks: any[] = [];
  public hasActivities: boolean = false;
  public hasTasks: boolean = false;
  public taskAllDoneComputed: boolean = false;
  public habitAllDoneComputed: boolean = false;
  public percentageCompleted: number = 0;
  public showLocalTimer: boolean = false;
  public showStartBubble: boolean = false;
  public isParent: boolean = false;
  public maxItemsToShow: number = 6;

  // Popup state
  public showStartPopup: boolean = false;
  public showCompletePopup: boolean = false;
  public showAbortPopup: boolean = false;

  // Popup configs
  startPopupConfig: SupermePopupConfig = {
    heading: 'Ready to Start?',
    subtitle: "You're about to begin this activity! Stay focused and crush it.",
    primaryCTA: { text: 'Start Now', type: 'primary', buttonStyle: 'magenta' },
    secondaryCTA: { text: 'Discard', type: 'secondary', buttonStyle: 'magenta-transparent' },
    showCloseButton: true
  };
  completePopupConfig: SupermePopupConfig = {
    heading: 'Mark as Done?',
    subtitle: "Great job! You're about to mark this activity as completed.",
    primaryCTA: { text: 'Complete', type: 'primary', buttonStyle: 'green' },
    secondaryCTA: { text: 'Cancel', type: 'secondary', buttonStyle: 'magenta-transparent' },
    showCloseButton: true
  };
  abortPopupConfig: SupermePopupConfig = {
    heading: 'Abort Activity?',
    subtitle: 'Are you sure you want to abort? You can always restart later.',
    primaryCTA: { text: 'Keep Going', type: 'primary', buttonStyle: 'magenta' },
    secondaryCTA: { text: 'Abort', type: 'secondary', buttonStyle: 'magenta-transparent' },
    showCloseButton: true
  };

  private activitySubscription?: Subscription;
  private taskSubscription?: Subscription;
  private lastUpdateTime: number = 0;
  private progressInterval: any;
  private buttonStateCheckerInterval: any;
  private startBubbleTimer: any;
  private _intervalId: any;

  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  constructor(
    private activityCardService: ActivityCardService,
    private activityService: ActivityService,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private buttonLogic: ActivityButtonLogicService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private moodService: MoodService
  ) {
    this.activityCardService.lastToggled$.subscribe((data: any) => {
      if (data?.action && data.time !== this.lastUpdateTime) this.expanded = false;
    });
  }

  ngOnInit() {
    this.detectParentRole();
    if (this.activity) {
      const ts = this.buttonLogic.calculateTimestamps(this.activity);
      this.activity.startTimeStamp = this.activity.startTimeStamp || ts.startTimeStamp;
      this.activity.endTimeStamp = this.activity.endTimeStamp || ts.endTimeStamp;
      this.startTime = this.activity.startTimeStamp;
      this.endTime = this.activity.endTimeStamp;
      this.inProgress = this.activity.type === 'habits';
      this.isEmpty = false;

      if (this.activity.status?.toLowerCase() === 'ongoing') {
        this.restoreOngoingState();
        this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
        this.startProgress();
        this.showLocalTimer = true;
      }
    }

    if (this.mode === 'list') {
      this.isEmpty = true;
      this.switchTab(this.currentActive);
    }

    if (this.mode === 'recent') {
      this.hasActivities = this.filteredRecentActivities.length > 0;
      this.hasTasks = this.filteredRecentTasks.length > 0;
      this.isEmpty = !this.hasActivities && !this.hasTasks;
      this.showContent = !this.isEmpty;
    }

    this.setupButtonStateChecker();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['Activity'] && !changes['Activity'].isFirstChange()) {
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    this.calculatePercentageCompleted();
    this._intervalId = setInterval(() => this.calculatePercentageCompleted(), 6000);
  }

  ngOnDestroy(): void {
    this.clearProgress();
    if (this._intervalId) clearInterval(this._intervalId);
    if (this.buttonStateCheckerInterval) clearInterval(this.buttonStateCheckerInterval);
    if (this.startBubbleTimer) { clearTimeout(this.startBubbleTimer); this.startBubbleTimer = null; }
    this.activitySubscription?.unsubscribe();
    this.taskSubscription?.unsubscribe();
  }

  private detectParentRole() {
    if (this.isParentOverride !== undefined) {
      this.isParent = !!this.isParentOverride;
      return;
    }
    try {
      const ud = localStorage.getItem('user_data');
      if (ud) {
        const parsed = JSON.parse(ud);
        const rel = (parsed.relationship || parsed.role || '').toString().toUpperCase();
        this.isParent = rel === 'PARENT';
      }
      if (this.authService?.isParentUser?.()) this.isParent = true;
    } catch { this.isParent = false; }
  }

  private setupButtonStateChecker(): void {
    if (this.buttonStateCheckerInterval) clearInterval(this.buttonStateCheckerInterval);
    this.buttonStateCheckerInterval = setInterval(() => this.cdr.detectChanges(), 1000);
  }

  // Button visibility/enable logic using shared service
  isLetsGoVisible(): boolean { return this.buttonLogic.isLetsGoVisible(this.activity); }
  isLetsGoEnabled(): boolean { return this.buttonLogic.isLetsGoEnabled(this.activity); }
  isAbortVisible(): boolean { return this.buttonLogic.isAbortVisible(this.activity); }
  isDoneEnabled(): boolean { return this.buttonLogic.isDoneEnabled(this.activity); }
  isDoneVisible(): boolean { return this.buttonLogic.isDoneVisible(this.activity); }
  getStatus(): string { return this.buttonLogic.normalizeStatus(this.activity?.status); }
  formatTimeString(t?: string | null): string { return this.buttonLogic.formatTimeString(t); }

  /** Get title color based on type */
  getTitleColor(a: Activity | null): string {
    if (!a) return '#524F84';
    if (a.type === 'tasks') return '#E04D16';
    if (a.type === 'timetable') return '#89B3B6';
    return '#524F84';
  }

  /** Get time text color based on type and status */
  getTimeColor(a: Activity | null): string {
    if (!a) return '#6360A2';
    if (a.type === 'tasks') return '#BB2124';
    if (a.type === 'timetable') return '#89B3B6';
    return '#6360A2';
  }

  /** Get combined and sorted items for 'all' tab */
  get combinedAndSortedItems(): any[] {
    const combined = [
      ...this.activities.map(h => ({ ...h })),
      ...this.tasks.map(t => ({ ...t }))
    ];
    return combined.sort((a, b) => {
      const aStart = a.startTimeStamp || 0;
      const bStart = b.startTimeStamp || 0;
      return aStart - bStart;
    });
  }

  onStartHabit() {
    if (!this.activity || !this.isLetsGoEnabled()) return;
    const api$ = this.activity.type === 'tasks'
      ? this.taskApi.letsGoTask(this.activity.id)
      : this.habitApi.letsGoHabit(this.activity.id);

    api$.subscribe({
      next: () => {
        const updated = { ...this.activity!, status: 'ongoing' } as Activity;
        this.activityService.updateHabit(updated);
        this.activity = updated;
        this.saveOngoingState();
        this.showLocalTimer = true;
        // Show start bubble for 10 seconds
        this.showStartBubble = true;
        if (this.startBubbleTimer) clearTimeout(this.startBubbleTimer);
        this.startBubbleTimer = setTimeout(() => {
          this.showStartBubble = false;
          this.startBubbleTimer = null;
          this.cdr.detectChanges();
        }, 10000);
        this.startProgress();
        this.loadData();
        if (this.activity!.type === 'tasks') this.activityService.notifyTaskStarted();
        else this.activityService.notifyHabitStarted();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to start', err)
    });
  }

  onAbortHabit() {
    if (!this.activity) return;
    const api$ = this.activity.type === 'tasks'
      ? this.taskApi.abortTask(this.activity.id)
      : this.habitApi.abortHabit(this.activity.id);

    api$.subscribe({
      next: () => {
        const updated = { ...this.activity!, status: 'pending' } as Activity;
        if (this.activity!.type !== 'tasks') this.activityService.abortHabit(updated.id);
        this.activity = updated;
        this.clearOngoingState();
        this.percentageCompleted = 0;
        this.clearProgress();
        this.showLocalTimer = false;
        this.showStartBubble = false;
        if (this.startBubbleTimer) { clearTimeout(this.startBubbleTimer); this.startBubbleTimer = null; }
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to abort', err)
    });
  }

  onCompleteHabit() {
    if (!this.activity) return;
    const status = this.activity.status?.toLowerCase();
    if (status !== 'skipped' && !this.isDoneEnabled()) return;

    const api$ = this.activity.type === 'tasks'
      ? this.taskApi.completeTask(this.activity.id)
      : this.habitApi.completeHabit(this.activity.id);

    api$.subscribe({
      next: () => {
        const updated = { ...this.activity!, status: 'completed' } as Activity;
        this.activityService.completeHabit(updated.id);
        this.activity = updated;
        this.clearOngoingState();
        this.percentageCompleted = 100;
        this.showLocalTimer = false;
        this.showStartBubble = false;
        if (this.startBubbleTimer) { clearTimeout(this.startBubbleTimer); this.startBubbleTimer = null; }
        this.clearProgress();
        this.loadData();
        if (this.activity!.type === 'tasks') this.activityService.notifyTaskCompleted();
        else this.activityService.notifyHabitCompleted();
        this.moodService.refreshRewardStats();
        this.cdr.detectChanges();
        // Refresh habits for today
        try {
          const today = new Date();
          const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          this.activityService.loadHabitsForDate(formatted, true).subscribe({ next: () => this.cdr.detectChanges(), error: () => {} });
        } catch { /* ignore */ }
      },
      error: (err: any) => console.error('Failed to complete', err)
    });
  }

  // Popup handlers for Start confirmation
  openStartPopup() { this.showStartPopup = true; }
  closeStartPopup() { this.showStartPopup = false; }
  handleStartConfirm() {
    this.showLocalTimer = true;
    this.showStartBubble = true;
    if (this.startBubbleTimer) clearTimeout(this.startBubbleTimer);
    this.startBubbleTimer = setTimeout(() => { this.showStartBubble = false; this.cdr.detectChanges(); }, 3000);
    this.onStartHabit();
    this.closeStartPopup();
  }
  handleStartDiscard() { this.closeStartPopup(); }

  // Popup handlers for Complete confirmation
  openCompletePopup() { this.showCompletePopup = true; }
  closeCompletePopup() { this.showCompletePopup = false; }
  handleCompleteConfirm() { this.onCompleteHabit(); this.closeCompletePopup(); }
  handleCompleteDiscard() { this.closeCompletePopup(); }

  // Popup handlers for Abort confirmation
  openAbortPopup() { this.showAbortPopup = true; }
  closeAbortPopup() { this.showAbortPopup = false; }
  handleAbortKeepGoing() { this.closeAbortPopup(); }
  handleAbortConfirm() { this.onAbortHabit(); this.closeAbortPopup(); }

  private loadData() {
    if (this.activity?.type === 'tasks') this.loadTasks();
    else this.loadHabits();
  }

  loadHabits() {
    const today = new Date().toISOString().split('T')[0];
    this.activityService.loadHabitsForDate(today, true).subscribe(habits => {
      this.activities = habits || [];
      this.hasActivities = this.activities.length > 0;
      this.updateEmptyState();
    });
  }

  loadTasks() {
    const today = new Date().toISOString().split('T')[0];
    this.taskApi.getTasksByDate(today).subscribe({
      next: (tasks) => {
        this.tasks = tasks || [];
        this.hasTasks = this.tasks.length > 0;
        this.updateEmptyState();
      },
      error: () => {
        this.tasks = [];
        this.hasTasks = false;
        this.updateEmptyState();
      }
    });
  }

  updateEmptyState() {
    if (this.currentActive === 'habits') this.isEmpty = !this.hasActivities;
    else if (this.currentActive === 'tasks') this.isEmpty = !this.hasTasks;
    else this.isEmpty = !this.hasActivities && !this.hasTasks;
    this.showContent = !this.isEmpty;
  }

  switchTab(tab: string) {
    this.currentActive = tab;
    if (tab === 'habits' && !this.activities.length) this.loadHabits();
    else if (tab === 'tasks' && !this.tasks.length) this.loadTasks();
    else if (tab === 'all') {
      if (!this.activities.length) this.loadHabits();
      if (!this.tasks.length) this.loadTasks();
    }
    this.updateEmptyState();
  }

  // Progress tracking
  startProgress(): void {
    this.clearProgress();
    this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
    this.cdr.markForCheck();
    this.progressInterval = setInterval(() => {
      this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
      this.cdr.markForCheck();
    }, 1000);
  }

  clearProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
      this.cdr.markForCheck();
    }
  }

  calculatePercentageCompleted() {
    if (this.startTime < Date.now()) {
      const duration = this.endTime - this.startTime;
      this.percentageCompleted = Math.max(0, Math.min(100, Math.floor((Date.now() - this.startTime) / duration * 100)));
      if (this.percentageWrapper?.nativeElement) {
        this.percentageWrapper.nativeElement.style.width = `calc(${this.percentageCompleted}% - var(--card_offset, 0px) - 4px)`;
      }
      if (!this.inProgress) {
        if (this.endTime < Date.now()) this.missedTime = true;
        else this.isRunningLate = true;
      }
      this.cdr.markForCheck();
    }
  }

  // LocalStorage state management
  private saveOngoingState(): void { this.buttonLogic.saveOngoingState(this.activity); }
  private clearOngoingState(): void { this.buttonLogic.clearOngoingState(this.activity); }
  private restoreOngoingState(): void {
    if (this.buttonLogic.isOngoingStateValid(this.activity) && this.activity?.status?.toLowerCase() === 'ongoing') {
      this.showLocalTimer = true;
      this.startProgress();
      this.cdr.markForCheck();
    }
  }

  // Filtered recent items
  get filteredRecentActivities(): Activity[] {
    return (this.recentActivities || []).filter(a => a.status?.toLowerCase() !== 'completed');
  }

  get filteredRecentTasks(): any[] {
    return (this.recentTasks || []).filter(t => t.status?.toLowerCase() !== 'completed');
  }

  // Navigation
  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.lastUpdateTime = Date.now();
      this.activityCardService.updatelast({ time: this.lastUpdateTime, action: true });
    }
  }

  /**
   * Navigate to Activity-detail page when card is clicked.
   * For timetable type, navigates to Activity-input in edit mode on timetable tab.
   * For habits/tasks, navigates to Activity-detail page.
   */
  openDetail() {
    if (!this.activity || !this.activity.id) {
      console.warn('No Activity or Activity ID available for navigation');
      this.router.navigate(['/home/activity-detail']);
      return;
    }

    const itemId = Number(this.activity.id);
    const itemType = this.activity.type || 'habits';

    // For timetable, navigate to Activity-input in edit mode on timetable tab
    if (itemType === 'timetable') {
      console.log('🔵 Navigating to activity-input (edit mode) for timetable ID:', itemId);
      this.router.navigate(
        ['/home/activity-input'],
        {
          state: {
            Activity: this.activity,
            type: itemType,
            currentActive: 'timetable'
          }
        }
      ).then(success => {
        if (!success) {
          console.error('❌ Navigation to Activity-input failed');
        } else {
          console.log('✅ Navigation to Activity-input successful');
        }
      }).catch(err => {
        console.error('Navigation to Activity-input failed:', err);
      });
      return;
    }

    console.log('🔵 Navigating to Activity-detail with ID:', itemId, 'Type:', itemType);

    // Determine the date to use - either the provided selectedDate or today's date
    let dateForApi: string;
    if ((this as any).selectedDate) {
      dateForApi = (this as any).selectedDate;
    } else {
      const today = new Date();
      dateForApi = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // Navigate to activity-detail with state containing the activity data
    // Matches the MindfulBuddy-App pattern
    this.router.navigate(
      ['/home/activity-detail', itemId],
      {
        state: {
          habit: this.activity,
          type: itemType,
          selectedDate: dateForApi
        },
        queryParams: { type: itemType }
      }
    ).then(success => {
      if (!success) {
        console.error('❌ Navigation to Activity detail failed');
      } else {
        console.log('✅ Navigation to Activity detail successful');
      }
    }).catch(err => {
      console.error('Navigation to Activity detail failed:', err);
    });
  }

  /**
   * Handle card click event - either emit event or navigate to Activity detail
   */
  onCardClick() {
    console.log('Card clicked:', this.activity?.title);
    if (this.emitClickEvents && this.activity) {
      this.cardClick.emit(this.activity);
    } else {
      this.openDetail();
    }
  }

  async openActivityInput() {
    await this.router.navigate(['/home/activity-input']);
  }

  async openTimeline() {
    await this.router.navigateByUrl('/home/timeline');
  }

  openTimer(): void {
    // TODO: Implement focus timer page/modal for website
    console.log('openTimer: Focus timer not yet implemented for website');
  }

  isActivityInProgress(activity: Activity): boolean {
    if (!activity) return false;
    const now = Date.now();
    return activity.startTimeStamp <= now && now <= activity.endTimeStamp;
  }

  getFormattedTime(time: number) {
    if (!time) return '00:00';
    try {
      const date = new Date(time);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch { return '00:00'; }
  }

  getTagOrRoutine(): string {
    const routine = this.activity?.selectedRoutine || this.activity?.routine || '';
    return routine ? routine.toUpperCase() : 'Routine';
  }

  getActivityTags(): string[] {
    const raw = this.activity?.tags;
    if (!Array.isArray(raw) || !raw.length) return [];
    return raw.map((t: any) => {
      if (typeof t === 'string') return t;
      return t?.tagName || t?.name || t?.value || t?.title || '';
    }).filter(Boolean);
  }

  hasTags(): boolean {
    return this.getActivityTags().length > 0;
  }

  getRoutine(): string {
    return (this.activity?.selectedRoutine || this.activity?.routine || '').toUpperCase();
  }

  hasRoutine(): boolean {
    const r = this.getRoutine();
    return r === 'MORNING' || r === 'EVENING' || r === 'NIGHT';
  }

  getRoutineIcon(): string {
    const r = this.getRoutine();
    if (r === 'MORNING') return '/assets/Icons-Neutral/Icon-Routine-Morning.png';
    if (r === 'EVENING') return '/assets/Icons-Neutral/Icon-Routine-Evening.png';
    if (r === 'NIGHT') return '/assets/Icons-Neutral/Icon-Routine-Night.png';
    return '';
  }

  getCoinReward(): number {
    return this.activity?.coinReward || this.activity?.rewardCoins || 0;
  }

  getStreak(): number {
    return this.activity?.streak || 0;
  }

  protected readonly console = console;
}
