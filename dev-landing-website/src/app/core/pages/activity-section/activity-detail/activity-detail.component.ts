import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { SupermeBadgeComponent } from '../../../components/superme-badge/superme-badge.component';
import { SupermeCalendarComponent } from '../../../components/superme-inputs/superme-calendar/superme-calendar.component';
import { SupermeInputsModule } from '../../../components/superme-inputs/superme-inputs.module';
import { HabitApi } from '../../../api/habit.api';
import { TaskApi } from '../../../api/task.api';
import { ActivityService } from '../activity.service';
import { ActivityButtonLogicService } from '../activity-button-logic.service';
import { AuthService } from '../../../services/auth.service';
import { MoodService } from '../../../services/mood.service';
import { Activity } from '../activity.types';
import { finalize } from 'rxjs/operators';

type ActivityType = 'habits' | 'tasks' | 'timetable';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [CommonModule, SupermeNavigatorComponent, SupermeBadgeComponent, SupermeButtonComponent, SupermeCalendarComponent, SupermeInputsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './activity-detail.component.html',
  styleUrls: ['./activity-detail.component.scss']
})
export class ActivityDetailComponent implements OnInit, OnDestroy, OnChanges {
  @Input() activity: Activity | null = null;

  // Navigation state
  public navigationOriginType: string = '';
  private selectedDateFromState: string | null = null;

  // User role flags
  isParent = false;
  isChild = false;

  public title: string = 'Activity Details';
  public isLoading: boolean = false;

  // Progress tracking
  percentageCompleted: number = 0;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private buttonStateCheckerInterval: ReturnType<typeof setInterval> | null = null;

  // Calendar
  public calendarStatusData: Record<string, 'COMPLETED' | 'SKIPPED' | 'PENDING'> = {};
  public currentCalendarMonth: Date = new Date();

  // Coin stats for display
  public coinStats = {
    userCoins: 0,
    userStreaks: 0,
    userDays: 0,
    userBadges: 0,
    successPercentage: 0,
    totalStreaks: 0
  };

  // Milestone badges
  public badgeList: Array<{
    name: string;
    description: string;
    currentProgress: number;
    targetProgress: number;
    progressText: string;
    completionPercent: number;
    isEarned: boolean;
    progressColor: string;
    iconUrl: string;
  }> = [];

  // Badge icon mapping
  private readonly BADGE_ICON_MAP: Record<string, string> = {
    'Coin Collector': 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
    'Streak Keeper': 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png',
    'Activity Master': 'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
    'Task Terminator': 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png'
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private activityService: ActivityService,
    private buttonLogic: ActivityButtonLogicService,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private authService: AuthService,
    private moodService: MoodService
  ) {}

  ngOnInit() {
    this.initUserRole();
    this.initNavigationState();
    this.loadActivityFromRoute();
    this.setupButtonStateChecker();
  }

  ngOnDestroy(): void {
    this.clearAllIntervals();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activity'] && !changes['activity'].isFirstChange()) {
      this.prepareCoinStats();
      this.prepareMilestoneBadges();
    }
  }

  // ============================================
  // INITIALIZATION HELPERS
  // ============================================

  private initUserRole(): void {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const { relationship, role } = JSON.parse(userData);
        this.isChild = (relationship || role || '').toString().toUpperCase() === 'CHILD';
      }
    } catch { this.isChild = false; }

    try {
      this.isParent = !!this.authService?.isParentUser?.();
    } catch { this.isParent = false; }
  }

  private initNavigationState(): void {
    const state = history.state || {};
    this.selectedDateFromState = state['selectedDate'] || null;

    // Support both 'Activity' (from card) and 'activity' (from dashboard/page) and 'habit' (from MindfulBuddy pattern)
    const stateActivity = state['habit'] || state['Activity'] || state['activity'];
    this.navigationOriginType = String(state['type'] || stateActivity?.type || 'habits');
  }

  private loadActivityFromRoute(): void {
    const state = history.state || {};
    // Support both 'Activity' (capital, from card), 'activity' (lowercase, from dashboard/page), and 'habit' (from MindfulBuddy pattern)
    const stateActivity = state['habit'] || state['Activity'] || state['activity'];

    const id = stateActivity?.id || this.route.snapshot.paramMap.get('id');
    const type = (state['type'] || stateActivity?.type ||
      this.route.snapshot.queryParamMap.get('type') || 'habits') as ActivityType;

    if (id) {
      this.loadDetail(+id, type, this.selectedDateFromState || undefined);
    } else if (stateActivity) {
      this.activity = this.normalizeResponse(stateActivity, type);
      this.prepareCoinStats();
      this.prepareMilestoneBadges();
      this.loadMonthlyStatus(this.currentCalendarMonth);
      if (this.activity?.status?.toLowerCase() === 'ongoing') {
        this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
        this.startProgress();
      }
    }
  }

  private clearAllIntervals(): void {
    this.clearProgress();
    if (this.buttonStateCheckerInterval) {
      clearInterval(this.buttonStateCheckerInterval);
      this.buttonStateCheckerInterval = null;
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadDetail(id: number, type: ActivityType, date?: string) {
    this.isLoading = true;
    const effectiveDate = date || this.getStoredSelectedDate(type, id);

    if (date) this.setStoredSelectedDate(type, id, date);

    const api$ = effectiveDate
      ? (type === 'tasks'
          ? this.taskApi.getTaskByIdWithDate(id, effectiveDate)
          : this.habitApi.getHabitByIdWithDate(id, effectiveDate))
      : (type === 'tasks'
          ? this.taskApi.getTaskById(id)
          : this.habitApi.getHabitById(id));

    api$.pipe(finalize(() => { this.isLoading = false; })).subscribe({
      next: (res) => {
        this.activity = this.normalizeResponse(res, type);
        this.prepareCoinStats();
        this.prepareMilestoneBadges();
        this.loadMonthlyStatus(this.currentCalendarMonth);

        if (this.activity?.status?.toLowerCase() === 'ongoing') {
          this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
          this.startProgress();
        } else {
          this.percentageCompleted = 0;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`Error loading ${type} detail:`, err);
        if (err?.status === 404 || err?.status === 400) {
          this.router.navigate(['/home']).catch(() => {});
        }
      }
    });
  }

  // ============================================
  // STORAGE HELPERS
  // ============================================

  private setStoredSelectedDate(type: string, id: number, dateStr: string): void {
    try {
      sessionStorage.setItem(`activity_detail_selected_date:${type}:${id}`, dateStr);
    } catch { /* Storage unavailable */ }
  }

  private getStoredSelectedDate(type: string, id: number): string | null {
    try {
      return sessionStorage.getItem(`activity_detail_selected_date:${type}:${id}`) || null;
    } catch { return null; }
  }

  // ============================================
  // RESPONSE NORMALIZATION
  // ============================================

  private normalizeResponse(res: any, type: ActivityType): Activity {
    const timestamps = this.buttonLogic.calculateTimestamps(res);
    const tags = (res.tags || []).map((t: any) => this.normalizeTag(t));

    return {
      ...res,
      type,
      id: res.id?.toString() || '',
      notes: res.description || res.notes || '',
      description: res.description || res.notes || '',
      startDate: res.startDate ? new Date(res.startDate) : null,
      endDate: res.endDate ? new Date(res.endDate) : null,
      startTime: res.startTime || res.start_time || '',
      endTime: res.endTime || res.end_time || '',
      startTimeStamp: timestamps.startTimeStamp,
      endTimeStamp: timestamps.endTimeStamp,
      isPrivate: !res.sharedWithParents,
      selectedRoutine: res.routine || '',
      routineTags: [],
      everyday: res.everyday || false,
      selectedDays: res.daysOfWeek || [],
      daysOfWeek: res.daysOfWeek || [],
      priority: (res.priority?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high',
      routine: res.routine || '',
      status: this.buttonLogic.normalizeStatus(res.status) as 'pending' | 'ongoing' | 'completed' | 'skipped',
      createdAt: res.createdAt ? new Date(res.createdAt) : new Date(),
      tags,
      coinReward: res.coinReward ?? res.rewardCoins ?? res.coin ?? 0,
      rewardCoins: res.rewardCoins ?? res.coinReward ?? res.coin ?? 0,
      streak: res.streak ?? res.streakCount ?? 0,
      highestStreak: res.highestStreak || 0,
      currentHabitStreak: res.currentHabitStreak ?? 0,
      highestHabitStreak: res.highestHabitStreak ?? 0,
      currentTaskStreak: res.currentTaskStreak ?? 0,
      highestTaskStreak: res.highestTaskStreak ?? 0,
      coinsEarned: res.coinsEarned || 0,
      completionPercentage: res.completionPercentage || 0,
      totalScheduledDays: res.totalScheduledDays || 0,
      totalCompletedDays: res.totalCompletedDays || 0,
      milestoneBadges: res.milestoneBadges || [],
      assignedToId: res.assignedToId,
      assignedToName: res.assignedToName,
      createdById: res.createdById,
      createdByName: res.createdByName,
      createdBy: res.createdBy || res.createdByName,
      sharedWithParents: res.sharedWithParents || false,
      completed: res.completed || false,
      familyId: res.familyId,
      updatedAt: res.updatedAt
    };
  }

  private normalizeTag(t: any): string {
    if (!t && t !== 0) return '';
    if (typeof t === 'string') return t;
    if (typeof t === 'object') return (t.value || t.text || t.name || t.key || '').toString();
    return String(t);
  }

  // ============================================
  // CALENDAR & MONTHLY STATUS
  // ============================================

  loadMonthlyStatus(month: Date) {
    if (!this.activity?.id) return;
    const year = month.getFullYear();
    const monthNum = month.getMonth() + 1;
    const id = Number(this.activity.id);

    const api$ = this.activity.type === 'tasks'
      ? this.taskApi.getTaskMonthlyCompletion(id, year, monthNum)
      : this.habitApi.getHabitMonthlyCompletion(id, year, monthNum);

    api$.subscribe({
      next: (res) => {
        this.calendarStatusData = {};
        const completionArray = Array.isArray(res) ? res : (res?.monthlyCompletion || []);
        completionArray.forEach((item: any) => {
          if (item.date && item.status) {
            this.calendarStatusData[item.date] = item.status.toUpperCase() as 'COMPLETED' | 'SKIPPED' | 'PENDING';
          }
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading monthly status:', err);
        this.calendarStatusData = {};
      }
    });
  }

  onCalendarMonthChange(newMonth: Date): void {
    this.currentCalendarMonth = newMonth;
    this.loadMonthlyStatus(newMonth);
  }

  // ============================================
  // COIN STATS & BADGES
  // ============================================

  private prepareCoinStats() {
    if (!this.activity) return;
    const h = this.activity as any;

    const coins = Number(h?.coinsEarned ?? h?.coinReward ?? 0) || 0;
    const currentStreak = this.activity?.type === 'tasks'
      ? Number(h?.currentTaskStreak ?? 0)
      : Number(h?.currentHabitStreak ?? 0);
    const highestStreak = this.activity?.type === 'tasks'
      ? Number(h?.highestTaskStreak ?? 0)
      : Number(h?.highestHabitStreak ?? 0);
    const totalCompletedDays = Number(h?.totalCompletedDays ?? 0) || 0;
    const completion = this.normalizeCompletion(h?.completionPercentage ?? 0);
    const badgesEarned = (h?.milestoneBadges || []).filter((b: any) => b.isEarned).length;

    this.coinStats = {
      userCoins: coins,
      userStreaks: currentStreak,
      userDays: totalCompletedDays,
      userBadges: badgesEarned,
      successPercentage: completion,
      totalStreaks: highestStreak
    };
  }

  private normalizeCompletion(value: number): number {
    const num = Number(value) || 0;
    return num <= 1 ? Math.round(num * 100) : Math.round(num);
  }

  private prepareMilestoneBadges() {
    const h = this.activity as any;
    this.badgeList = (h?.milestoneBadges || []).map((b: any) => {
      const progress = Number(b?.progress ?? 0) || 0;
      const target = Number(b?.target ?? 0) || 0;
      const percent = target > 0 ? Math.round((progress / target) * 100) : 0;

      return {
        name: b.title || b.name || 'Badge',
        description: b.description || b.achievementText || '',
        currentProgress: progress,
        targetProgress: target,
        progressText: `${progress}/${target}`,
        completionPercent: Math.min(percent, 100),
        isEarned: !!b?.isEarned,
        progressColor: this.getBadgeColor(percent),
        iconUrl: this.BADGE_ICON_MAP[b.title || b.name || ''] || 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png'
      };
    });
  }

  private getBadgeColor(percent: number): string {
    if (percent >= 100) return '#4CAF50';
    if (percent >= 50) return '#FF9800';
    if (percent > 0) return '#2196F3';
    return '#9E9E9E';
  }

  // ============================================
  // DATE HELPERS
  // ============================================

  isViewingToday(): boolean {
    const effectiveDate = this.getEffectiveSelectedDate();
    if (effectiveDate) {
      const selected = new Date(effectiveDate);
      if (!isNaN(selected.getTime())) return this.isSameDay(selected, new Date());
    }

    if (this.activity) {
      const ts = Number((this.activity as any).startTimeStamp || 0);
      if (ts) return this.isSameDay(new Date(ts), new Date());

      if (this.activity.startDate) {
        const d = new Date(this.activity.startDate);
        if (!isNaN(d.getTime())) return this.isSameDay(d, new Date());
      }
    }
    return false;
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  private getEffectiveSelectedDate(): string | null {
    if (this.selectedDateFromState) return this.selectedDateFromState;
    if (this.activity) {
      return this.getStoredSelectedDate(this.activity.type || 'habits', Number(this.activity.id));
    }
    return null;
  }

  private isViewingFutureDate(): boolean {
    if (!this.activity) return false;

    const effectiveDate = this.getEffectiveSelectedDate();
    if (!effectiveDate) return false;

    const d = new Date(effectiveDate);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dateOnly.getTime() > todayOnly.getTime();
  }

  // ============================================
  // COMPUTED PROPERTIES
  // ============================================

  get tagText(): string {
    const tags = this.activity?.tags || [];
    const first: any = tags[0];
    if (!first) return 'Focus';
    if (typeof first === 'string') return first.trim() || 'Focus';
    if (typeof first === 'object') return (first.value || first.text || first.name || first.key || 'Focus').toString();
    return String(first).trim() || 'Focus';
  }

  get speechMessage(): string {
    const desc = (this.activity as any)?.description ?? (this.activity as any)?.notes ?? '';
    return desc ? String(desc).trim() : '';
  }

  get shortDaysOfWeek(): string {
    const rawDays = this.activity?.daysOfWeek || (this.activity as any)?.selectedDays || [];
    if ((this.activity as any)?.everyday || rawDays.length === 7) return 'Everyday';

    const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const abbr: Record<string, string> = {
      MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
      FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun'
    };

    const normalized = rawDays.map((d: string) => String(d).trim().toUpperCase());
    const filtered = order.filter(c => normalized.includes(c));

    return filtered.length ? filtered.map(d => abbr[d]).join(', ') : '—';
  }

  // ============================================
  // NAVIGATION & EDITING
  // ============================================

  goBack() {
    this.location.back();
  }

  onEdit() {
    if (!this.activity) {
      this.router.navigate(['/home/Activity-input'], {
        state: { origin: this.router.url || '/home' }
      });
      return;
    }

    this.router.navigate(['/home/Activity-input'], {
      state: {
        Activity: this.activity,
        type: this.activity.type,
        currentActive: this.activity.type || 'habits',
        selectedDate: this.selectedDateFromState,
        originType: this.navigationOriginType,
        origin: this.router.url || '/home',
        fromDetail: true
      }
    });
  }

  canEdit(): boolean {
    try {
      const currentUserId = this.authService?.getUserId?.();
      if (!currentUserId || !this.activity) return false;

      const createdBy = (this.activity as any).createdById ?? (this.activity as any).createdBy ?? (this.activity as any).createdByName;
      const isCreator = createdBy != null && String(createdBy) === String(currentUserId);

      // Check if end date has passed
      if (this.activity.endDate) {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const endDate = new Date(this.activity.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (currentDate > endDate) {
          return false;
        }
      }

      return isCreator;
    } catch { return false; }
  }

  // ============================================
  // ROUTINE HELPERS
  // ============================================

  hasRoutine(): boolean {
    const routine = this.activity?.routine;
    return !!(routine && String(routine).toLowerCase() !== 'null' && String(routine).trim());
  }

  getRoutineIcon(): string {
    if (!this.hasRoutine()) return '';
    const routine = String(this.activity!.routine).toLowerCase();
    const capitalized = routine.charAt(0).toUpperCase() + routine.slice(1);
    return `assets/Icons-Neutral/Icon-Routine-${capitalized}.png`;
  }

  getRoutineName(): string {
    if (!this.hasRoutine()) return '';
    const routine = String(this.activity!.routine).toLowerCase();
    return routine.charAt(0).toUpperCase() + routine.slice(1);
  }

  getTimeColor(activity: Activity | null): string {
    if (!activity) return '#BB2124';

    const status = activity.status?.toLowerCase() || 'pending';
    const type = activity.type;

    if (status === 'completed') return '#4CAF50';
    if (status === 'skipped') return '#BB2124';
    if (status === 'pending') {
      const now = Date.now();
      const endTime = (activity as any).endTimeStamp || 0;
      if (now > endTime) return '#BB2124';
    }

    return type === 'tasks' ? '#EE6621' : '#6360A2';
  }

  formatTimeString(t?: string | null): string {
    return this.buttonLogic.formatTimeString(t);
  }

  getPriorityClass(): string {
    const priority = (this.activity?.priority || 'medium').toLowerCase();
    return `priority-badge priority-${priority}`;
  }

  // ============================================
  // BUTTON STATE LOGIC
  // ============================================

  private setupButtonStateChecker(): void {
    // No polling needed - manual detectChanges on actions
    if (this.buttonStateCheckerInterval) clearInterval(this.buttonStateCheckerInterval);
  }

  isLetsGoEnabled(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isLetsGoEnabled(this.getActivityForButtonLogic(), false);
  }

  isLetsGoVisible(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isLetsGoVisible(this.getActivityForButtonLogic());
  }

  isAbortVisible(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isAbortVisible(this.getActivityForButtonLogic());
  }

  isDoneEnabled(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isDoneEnabled(this.getActivityForButtonLogic(), false);
  }

  getStatus(): string {
    return this.buttonLogic.normalizeStatus(this.activity?.status);
  }

  private getActivityForButtonLogic(): any {
    if (!this.activity) return null;

    const effectiveDate = this.getEffectiveSelectedDate();
    if (!effectiveDate) return this.activity;

    const copy: any = { ...this.activity, startDate: effectiveDate, endDate: effectiveDate };
    try {
      const ts = this.buttonLogic.calculateTimestamps(copy);
      copy.startTimeStamp = ts.startTimeStamp;
      copy.endTimeStamp = ts.endTimeStamp;
    } catch { /* Use shallow copy */ }

    return copy;
  }

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  startProgress(): void {
    this.clearProgress();
    this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
    this.progressInterval = setInterval(() => {
      this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.activity);
      this.cdr.detectChanges();
    }, 10000); // Update every 10s
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

  // ============================================
  // HABIT ACTIONS (API calls)
  // ============================================

  onStartHabit() {
    if (!this.activity || !this.isLetsGoEnabled()) return;

    const isTask = this.activity.type === 'tasks';
    const api$ = isTask
      ? this.taskApi.letsGoTask(this.activity.id)
      : this.habitApi.letsGoHabit(this.activity.id);

    api$.subscribe({
      next: () => {
        this.activity = { ...this.activity!, status: 'ongoing' } as Activity;
        this.buttonLogic.saveOngoingState(this.activity);
        this.startProgress();
        if (isTask) {
          this.activityService.notifyTaskStarted();
        } else {
          this.activityService.notifyHabitStarted();
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to start', err)
    });
  }

  onAbortHabit() {
    if (!this.activity) return;

    const isTask = this.activity.type === 'tasks';
    const api$ = isTask
      ? this.taskApi.abortTask(this.activity.id)
      : this.habitApi.abortHabit(this.activity.id);

    api$.subscribe({
      next: () => {
        this.activity = { ...this.activity!, status: 'pending' } as Activity;
        this.buttonLogic.clearOngoingState(this.activity);
        this.resetProgress();
        if (isTask) {
          this.activityService.notifyTaskUpdated();
        } else {
          this.activityService.notifyHabitStarted();
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to abort', err)
    });
  }

  onCompleteHabit() {
    if (!this.activity) return;
    const status = this.activity.status?.toLowerCase();
    if (status !== 'skipped' && !this.isDoneEnabled()) return;

    const isTask = this.activity.type === 'tasks';
    const api$ = isTask
      ? this.taskApi.completeTask(this.activity.id)
      : this.habitApi.completeHabit(this.activity.id);

    api$.subscribe({
      next: () => {
        this.activity = { ...this.activity!, status: 'completed' } as Activity;
        this.activityService.completeHabit(this.activity.id);
        this.buttonLogic.clearOngoingState(this.activity);
        this.resetProgress();
        if (isTask) {
          this.activityService.notifyTaskCompleted();
        } else {
          this.activityService.notifyHabitCompleted();
        }
        this.moodService.refreshRewardStats();
        this.loadMonthlyStatus(this.currentCalendarMonth);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to complete', err)
    });
  }
}
