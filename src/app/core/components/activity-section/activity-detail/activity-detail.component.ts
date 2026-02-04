import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Habit } from '../habit.types';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { HabitApi } from 'src/app/core/api/habit.api';
import { TaskApi } from 'src/app/core/api/task.api';
import { HabitService } from '../habit.service';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulCoinsStatsComponent } from '../../mindful-coins-stats/mindful-coins-stats.component';
import { MindfulCalendarComponent } from '../../mindful-inputs/mindful-calendar/mindful-calendar.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,

  selector: 'activity-detail',
  templateUrl: './activity-detail.component.html',
  styleUrls: ['./activity-detail.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, MindfulCoinsStatsComponent, MindfulCalendarComponent, MindfulButtonComponent, MindfulInputsModule, MindfulBadgeComponent]
})
export class ActivityDetailComponent implements OnInit, OnChanges, OnDestroy {
  public title: string = 'Habit Details';

  // true when navigated from a long-press on a card
  public cameFromLongPress: boolean = false;
  // 'habits' | 'tasks' | 'timetable' - origin type from navigation state
  public navigationOriginType: string = '';

  // true when the current user is a parent account
  public isParent: boolean = false;
  // true when the current user is a child account
  public isChild: boolean = false;

  @Input()
  public habit: Habit | null = null;

  // Progress tracking
  percentageCompleted: number = 0;
  private progressInterval: any;
  private buttonStateCheckerInterval: any;

  // Calendar status data
  public calendarStatusData: { [key: string]: 'COMPLETED' | 'SKIPPED' | 'PENDING' } = {};
  public currentCalendarMonth: Date = new Date();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private HabitApi: HabitApi,
    private TaskApi: TaskApi,
    private habitService: HabitService,
    private buttonLogic: HabitButtonLogicService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // Determine whether current user is a child (only children see some UI like private toggle)
    try {
      const ud = localStorage.getItem('user_data');
      if (ud) {
        const parsed = JSON.parse(ud || '{}');
        const rel = (parsed.relationship || parsed.role || '').toString().toUpperCase();
        this.isChild = rel === 'CHILD';
      }
    } catch (e) {
      this.isChild = false;
    }

    // Determine whether current user is a parent - parent accounts should not see CTA buttons
    try {
      this.isParent = !!(this.authService && this.authService.isParentUser && this.authService.isParentUser());
    } catch (e) {
      this.isParent = false;
    }
    // Detect whether we arrived here via a long-press navigation
    this.cameFromLongPress = !!history.state?.['fromLongPress'];

    // Get ID and type from either navigation state or URL params
    const stateHabit = history.state?.['habit'];
    const habitType = history.state?.['type'] || stateHabit?.type;
    this.navigationOriginType = String(habitType || 'habits');

    // Get selectedDate from navigation state (from long-press)
      const selectedDate = history.state?.['selectedDate'];
      this.selectedDateFromState = selectedDate || null;

    // Get ID from state or URL
    const idFromState = stateHabit?.id;
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    const id = idFromState || idFromUrl;

    // Get type from state or URL query params
    const typeFromState = history.state?.['type'] || stateHabit?.type;
    const typeFromUrl = this.route.snapshot.queryParamMap.get('type');
    const type = (typeFromState || typeFromUrl || 'habits') as 'habits' | 'tasks' | 'timetable';

    // Always call API to get fresh data
    if (id) {
      this.loadDetail(+id, type, selectedDate);
    } else {
      console.warn('❌ No ID found in navigation state or URL params');
    }

    // Start progress tracking and button state checker
    this.setupButtonStateChecker();
  }

  // If navigation provided a selected date (from long-press), store it here for view checks
  private selectedDateFromState: string | null = null;

  ngOnDestroy(): void {
    // Clear all intervals
    this.clearProgress();
    if (this.buttonStateCheckerInterval) {
      clearInterval(this.buttonStateCheckerInterval);
      this.buttonStateCheckerInterval = null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['habit'] && !changes['habit'].isFirstChange()) {
      // Recompute derived values when habit @Input changes
      this.prepareCoinStats();
      this.prepareMilestoneBadges();
    }
  }

  loadDetail(id: number, type: 'habits' | 'tasks' | 'timetable', date?: string) {
    // If a date was provided, persist it for this id so future reloads (eg. after
    // returning from edit/cancel) can reuse the same date-aware API. If no date
    // is provided, consult sessionStorage for a previously saved date for this id.
    let effectiveDate = date;
    if (!effectiveDate) {
      const stored = this.getStoredSelectedDate(type, id);
      if (stored) {
        effectiveDate = stored;
      }
    } else {
      // persist provided date
      this.setStoredSelectedDate(type, id, effectiveDate);
    }

    // Choose the appropriate API observable: prefer date-specific endpoints when
    // we have an effectiveDate.
    let api$;
    if (effectiveDate) {
      api$ = type === 'tasks'
        ? this.TaskApi.getTaskByIdWithDate(id, effectiveDate)
        : this.HabitApi.getHabitByIdWithDate(id, effectiveDate);
    } else {
      api$ = type === 'tasks'
        ? this.TaskApi.getTaskById(id)
        : this.HabitApi.getHabitById(id);
    }

    api$.pipe(
      finalize(() => {
      })
    ).subscribe({
      next: (res) => {
        this.habit = this.normalizeResponse(res, type);
        // Debug: log tags so we can see what the backend returned and what we normalized
        try {
          // eslint-disable-next-line no-console
          console.debug('ActivityDetail loaded tags ->', res?.tags, 'normalized ->', this.habit?.tags);
        } catch (e) {}
        // Ensure view updates immediately after async load
        try { this.cdr.detectChanges(); } catch (e) {}
        this.prepareCoinStats();
        this.prepareMilestoneBadges();

        // Load monthly completion data for the current month
        this.loadMonthlyStatus(this.currentCalendarMonth);

        // Start progress tracking if habit is ongoing
        if (this.habit?.status?.toLowerCase() === 'ongoing') {
          this.percentageCompleted = this.calculateProgressPercentage();
          this.startProgress();
        } else {
          this.percentageCompleted = 0;
        }
      },
      error: (err) => {
        console.error(`Error loading ${type} detail:`, err);
      }
    });
  }

  /** Store selected date in sessionStorage for a given id & type */
  private setStoredSelectedDate(type: string, id: number, dateStr: string) {
    try {
      const key = `activity_detail_selected_date:${type}:${id}`;
      sessionStorage.setItem(key, String(dateStr));
    } catch (e) { /* ignore storage errors */ }
  }

  /** Retrieve stored selected date (yyyy-mm-dd) for a given id & type */
  private getStoredSelectedDate(type: string, id: number): string | null {
    try {
      const key = `activity_detail_selected_date:${type}:${id}`;
      const v = sessionStorage.getItem(key);
      return v && v.length ? v : null;
    } catch (e) { return null; }
  }

  /** Normalize API response to Habit type */
  private normalizeResponse(res: any, type: 'habits' | 'tasks' | 'timetable'): Habit {
    // Calculate timestamps using the shared service
    const timestamps = this.buttonLogic.calculateTimestamps(res);

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
      status: this.buttonLogic.normalizeStatus(res.status) as 'pending' | 'ongoing' | 'completed',
      createdAt: res.createdAt ? new Date(res.createdAt) : new Date(),
      tags: (res.tags || []).map((t: any) => {
        if (!t && t !== 0) return '';
        if (typeof t === 'string') return t;
        if (typeof t === 'object') return (t.value || t.text || t.name || t.key || '').toString();
        return String(t);
      }),
      // Preserve coin/streak fields regardless of backend naming (coinReward, rewardCoins, coin)
      coinReward: (res.coinReward ?? res.rewardCoins ?? res.coin) || 0,
      rewardCoins: (res.rewardCoins ?? res.coinReward ?? res.coin) || 0,
      streak: (res.streak ?? res.streakCount) || 0,
      highestStreak: res.highestStreak || 0,
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

  /** Legacy method for backward compatibility */
  loadHabitDetail(id: number) {
    this.loadDetail(id, 'habits');
  }

  /** Local UI fields */
  public coinStats = {
    userCoins: 0,
    userStreaks: 0,
    userDays: 0,
    userBadges: 0,
    successPercentage: 0,
    totalStreaks: 0
  };

  public badgeList: Array<any> = [];

  /** Prepare coins widget data */
  prepareCoinStats() {
    const h: any = this.habit as any;
    // Normalize numbers safely
    const coins = Number(h?.coinsEarned ?? h?.coinReward ?? 0) || 0;
    const streak = Number(h?.streak ?? 0) || 0; // current streak (use direct API value)
    const highestStreak = Number(h?.highestStreak ?? 0) || 0;
    const totalCompletedDays = Number(h?.totalCompletedDays ?? 0) || 0; // completed days
    const completion = this.getDisplayCompletion(h?.completionPercentage ?? 0);
    const badgesEarned = (h?.milestoneBadges || []).filter((b: any) => !!b.isEarned).length;

    this.coinStats = {
      userCoins: coins,
      // Show the API-provided `streak` value directly in the `streak` slot
      userStreaks: streak,
      // Keep `userDays` as the completed-days/trophy value
      userDays: totalCompletedDays,
      userBadges: badgesEarned,
      successPercentage: completion,
      totalStreaks: highestStreak,
    };
  }

  /** Convert completion value to a 0-100 percentage for display */
  getDisplayCompletion(value: number) {
    if (value === undefined || value === null) return 0;
    const num = Number(value) || 0;
    // If backend uses 0..1 decimal or 0..100, deal with both
    if (num <= 1) return Math.round(num * 100);
    return Math.round(num);
  }

  /** Badge helpers */
  private BADGE_ICON_MAP: Record<string, string> = {
    'Coin Collector': 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
    'Streak Keeper': 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png',
    'Habit Master': 'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
    'Task Terminator': 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png'
  };

  getBadgeIcon(title: string) {
    return this.BADGE_ICON_MAP[title] || ('assets/Icons-Neutral/Icon-Badge-CoinCollector.png');
  }

  private getBadgeColor(completionPercentage: number): string {
    // Keep consistent with BadgeSection's getProgressColor implementation
    if (completionPercentage >= 100) return '#4CAF50'; // Green - completed
    if (completionPercentage >= 50) return '#FF9800';  // Orange - halfway
    if (completionPercentage > 0) return '#2196F3';    // Blue - started
    return '#9E9E9E';                                   // Gray - not started
  }

  prepareMilestoneBadges() {
    const h: any = this.habit as any;
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
        levelText: b?.levelText || '',
        progressColor: this.getBadgeColor(percent),
        iconUrl: this.getBadgeIcon(b.title || b.name || ''),
      };
    });
  }

  /**
   * Return true if the currently loaded habit/task is scheduled for today's date
   */
  isViewingToday(): boolean {
    // If a selected date was provided via navigation (long-press), prefer that
    try {
      // Prefer explicit selected date from navigation state
      let effectiveSelected = this.selectedDateFromState || null;
      // If not present, check persisted sessionStorage for this item
      if (!effectiveSelected && this.habit) {
        const stored = this.getStoredSelectedDate(this.habit.type || 'habits', Number(this.habit.id));
        if (stored) effectiveSelected = stored;
      }

      if (effectiveSelected) {
        const selected = new Date(effectiveSelected);
        if (!isNaN(selected.getTime())) {
          const t = new Date();
          return selected.getFullYear() === t.getFullYear() && selected.getMonth() === t.getMonth() && selected.getDate() === t.getDate();
        }
      }
    } catch (e) {
      // ignore and fall back
    }

    // Fallback: use habit timestamps or startDate
    if (this.habit) {
      const ts = Number((this.habit as any).startTimeStamp || 0);
      if (ts) {
        const d = new Date(ts);
        const t = new Date();
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
      }
      if (this.habit.startDate) {
        const d = new Date(this.habit.startDate);
        if (!isNaN(d.getTime())) {
          const t = new Date();
          return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
        }
      }
    }
    return false;
  }

  /**
   * Load monthly completion status for the habit/task
   */
  loadMonthlyStatus(monthDate: Date): void {
    if (!this.habit) return;

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1; // JavaScript months are 0-indexed
    const id = Number(this.habit.id);

    const api$ = this.habit.type === 'tasks'
      ? this.TaskApi.getTaskMonthlyCompletion(id, year, month)
      : this.HabitApi.getHabitMonthlyCompletion(id, year, month);

    api$.subscribe({
      next: (res) => {
        this.calendarStatusData = {};
        const completionArray = res.monthlyCompletion || [];

        // Convert array to object keyed by date
        completionArray.forEach((item: any) => {
          if (item.date && item.status) {
            this.calendarStatusData[item.date] = item.status;
          }
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading monthly completion status:', err);
        this.calendarStatusData = {};
      }
    });
  }

  /**
   * Handle calendar month navigation
   */
  onCalendarMonthChange(newMonth: Date): void {
    this.currentCalendarMonth = newMonth;
    this.loadMonthlyStatus(newMonth);
  }

  get tagText(): string {
    const tags: any[] = (this.habit?.tags || []) as any[];
    if (!tags || tags.length === 0) return 'Focus';
    const firstTag: any = tags[0];
    if (!firstTag) return 'Focus';
    // Handle both string and object tags
    if (typeof firstTag === 'string') return String(firstTag).trim() || 'Focus';
    if (typeof firstTag === 'object') return (firstTag.value || firstTag.text || firstTag.name || firstTag.key || 'Focus').toString();
    return String(firstTag).trim() || 'Focus';
  }

  get speechMessage(): string {
    const desc = (this.habit as any)?.description ?? (this.habit as any)?.notes ?? '';
    // Return the raw description (no prefixed text), trimmed for display safety
    return desc ? String(desc).trim() : '';
  }

  get shortDaysOfWeek(): string {
    const rawDays = this.habit?.daysOfWeek || [];

    // 1️⃣ If everyday flag true OR 7 days present
    if (this.habit?.everyday || rawDays.length === 7) {
      return 'Everyday';
    }

    // 2️⃣ No special weekend flag — rely on daysOfWeek or everyday

    // 3️⃣ Normalize and format the days in canonical Mon..Sun order
    const canonicalOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const abbrMap: Record<string, string> = {
      MONDAY: 'Mon',
      TUESDAY: 'Tue',
      WEDNESDAY: 'Wed',
      THURSDAY: 'Thu',
      FRIDAY: 'Fri',
      SATURDAY: 'Sat',
      SUNDAY: 'Sun'
    };

    const normalized = rawDays.map((d: string) => String(d).trim().toUpperCase());
    const filtered = canonicalOrder.filter((c) => normalized.includes(c));
    if (filtered.length > 0) {
      return filtered.map((d) => abbrMap[d] || d.substring(0, 3)).join(', ');
    }

    // 4️⃣ Fallback if no data
    return '—';
  }

  onEdit() {
    // Navigate to the activity-input page and pass the current habit/task in navigation state
    if (this.habit) {
      this.router.navigate(['/authed/activity-input'], {
        state: {
          habit: this.habit,
          type: this.habit.type,
          // preserve the selectedDate and navigation origin so returning to detail
          // will be able to call the same date-aware API (getHabitByIdWithDate / getTaskByIdWithDate)
          selectedDate: this.selectedDateFromState || null,
          originType: this.navigationOriginType || null,
          fromDetail: true
        }
      });
    } else {
      this.router.navigate(['/authed/activity-input']);
    }
  }

  //routine handler
  getRoutineIcon(): string {
    try {
      const routineValue = this.habit?.routine;
      // If backend explicitly returned null or an empty value, do not show any icon
      if (routineValue === null || routineValue === undefined || String(routineValue).toLowerCase() === 'null' || String(routineValue).trim() === '') {
        return null as any;
      }

      // Convert to proper case for filename
      const routine = String(routineValue).toLowerCase();
      const capitalizedRoutine = routine.charAt(0).toUpperCase() + routine.slice(1);
      const fileName = `Icon-Routine-${capitalizedRoutine}.png`;

      return `assets/Icons-Neutral/${fileName}`;
    } catch (e) {
      return null as any;
    }
  }


  getRoutineName(): string {
    const routineValue = this.habit?.routine;
    if (routineValue === null || routineValue === undefined || String(routineValue).toLowerCase() === 'null' || String(routineValue).trim() === '') return '';

    const routine = String(routineValue).toLowerCase();
    return routine.charAt(0).toUpperCase() + routine.slice(1);
  }

  /**
   * Return true when the current logged-in user is the creator of the habit/task
   * so they are allowed to edit it.
   */
  canEdit(): boolean {
    try {
      const currentUserId = this.authService?.getUserId?.();
      if (!currentUserId || !this.habit) return false;
      const createdBy = (this.habit as any).createdById ?? (this.habit as any).createdBy ?? (this.habit as any).createdByName;
      if (createdBy == null) return false;
      return String(createdBy) === String(currentUserId);
    } catch (e) {
      return false;
    }
  }

  hasRoutine(): boolean {
    const routineValue = this.habit?.routine;
    return !(routineValue === null || routineValue === undefined || String(routineValue).toLowerCase() === 'null' || String(routineValue).trim() === '');
  }

  // ============================================
  // BUTTON LOGIC - Using shared service
  // ============================================

  /**
   * Called when user taps "Let's Go" - set status to ONGOING
   */
  onStartHabit() {
    if (!this.habit || !this.isLetsGoEnabled()) return;

    const api$ = this.habit.type === 'tasks'
      ? this.TaskApi.letsGoTask(this.habit.id)
      : this.HabitApi.letsGoHabit(this.habit.id);

    api$.subscribe({
      next: () => {
        this.habit = { ...this.habit!, status: 'ongoing' } as Habit;
        this.buttonLogic.saveOngoingState(this.habit);
        this.startProgress();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to start', err)
    });
  }

  /**
   * Called when user taps "Abort" - reset to PENDING
   */
  onAbortHabit() {
    if (!this.habit) return;

    const api$ = this.habit.type === 'tasks'
      ? this.TaskApi.abortTask(this.habit.id)
      : this.HabitApi.abortHabit(this.habit.id);

    api$.subscribe({
      next: () => {
        this.habit = { ...this.habit!, status: 'pending' } as Habit;
        this.buttonLogic.clearOngoingState(this.habit);
        this.resetProgress();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to abort', err)
    });
  }

  /**
   * Called when user taps "Done?" - set status to COMPLETED
   */
  onCompleteHabit() {
    if (!this.habit || !this.isDoneEnabled()) return;

    const api$ = this.habit.type === 'tasks'
      ? this.TaskApi.completeTask(this.habit.id)
      : this.HabitApi.completeHabit(this.habit.id);

    api$.subscribe({
      next: () => {
        this.habit = { ...this.habit!, status: 'completed' } as Habit;
        this.buttonLogic.clearOngoingState(this.habit);
        this.resetProgress();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to complete', err)
    });
  }

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  startProgress(): void {
    this.clearProgress();
    this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.habit);
    this.startProgressUpdater();
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

  calculateProgressPercentage(): number {
    return this.buttonLogic.calculateProgressPercentage(this.habit);
  }

  startProgressUpdater(): void {
    this.clearProgress();
    this.percentageCompleted = this.calculateProgressPercentage();
    // Update every 10 seconds (reduced from 1s to prevent System UI ANR)
    this.progressInterval = setInterval(() => {
      this.percentageCompleted = this.calculateProgressPercentage();
    }, 10000);
  }

  // ============================================
  // BUTTON STATE LOGIC - Using shared service
  // ============================================

  private setupButtonStateChecker(): void {
    // Removed aggressive 1-second polling that was causing System UI ANR
    // Button states are now updated reactively via OnPush change detection
    if (this.buttonStateCheckerInterval) clearInterval(this.buttonStateCheckerInterval);
  }

  isLetsGoEnabled(): boolean {
    if (this.isViewingFutureDate()) return false;
    return this.buttonLogic.isLetsGoEnabled(this.getHabitForButtonLogic(), false);
  }

  isLetsGoVisible(): boolean {
    if (this.isViewingFutureDate()) return false;
    return this.buttonLogic.isLetsGoVisible(this.getHabitForButtonLogic());
  }

  isAbortVisible(): boolean {
    if (this.isViewingFutureDate()) return false;
    return this.buttonLogic.isAbortVisible(this.getHabitForButtonLogic());
  }

  isDoneEnabled(): boolean {
    if (this.isViewingFutureDate()) return false;
    return this.buttonLogic.isDoneEnabled(this.getHabitForButtonLogic(), false);
  }

  /**
   * Return true when the currently selected / viewed date is strictly in the future
   * compared to today. Uses the navigation-provided selected date or a persisted
   * sessionStorage date for the current item.
   */
  private isViewingFutureDate(): boolean {
    try {
      if (!this.habit) return false;
      // Determine effective selected date (navigation state preferred)
      let effectiveDate = this.selectedDateFromState || null;
      if (!effectiveDate) {
        const stored = this.getStoredSelectedDate(this.habit.type || 'habits', Number(this.habit.id));
        if (stored) effectiveDate = stored;
      }
      if (!effectiveDate) return false;

      const d = new Date(effectiveDate);
      if (isNaN(d.getTime())) return false;

      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dateOnly.getTime() > todayOnly.getTime();
    } catch (e) {
      return false;
    }
  }

  /**
   * Provide a habit-like object adjusted for the navigation-selected date (if any)
   * so the shared button-logic service evaluates visibility/enabled state correctly
   */
  private getHabitForButtonLogic(): any {
    if (!this.habit) return null;
    try {
      // Prefer the explicit selected date passed via navigation state
      let effectiveDate = this.selectedDateFromState;
      // If not present, consult persisted sessionStorage value for this item
      if (!effectiveDate) {
        try {
          const stored = this.getStoredSelectedDate(this.habit.type || 'habits', Number(this.habit.id));
          if (stored) effectiveDate = stored;
        } catch (e) { /* ignore */ }
      }

      if (effectiveDate) {
        // Recalculate timestamps using the effective date so the button logic evaluates correctly
        const copy: any = { ...this.habit, startDate: effectiveDate, endDate: effectiveDate };
        try {
          const ts = this.buttonLogic.calculateTimestamps(copy);
          copy.startTimeStamp = ts.startTimeStamp;
          copy.endTimeStamp = ts.endTimeStamp;
        } catch (e) {
          // ignore calculation errors and fall back to shallow copy
        }
        return copy;
      }
    } catch (e) {
      // ignore and fall back
    }
    return this.habit;
  }
}
