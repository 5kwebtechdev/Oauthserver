import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { finalize } from 'rxjs/operators';

import { Habit } from '../habit.types';
import { HabitService } from '../habit.service';
import { AuthService } from '../../../services/auth.service';
import { HabitApi } from 'src/app/core/api/habit.api';
import { TaskApi } from 'src/app/core/api/task.api';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { AutoAbortService } from '../auto-abort.service';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeSpeechBubbleComponent } from '../../superme-speech-bubble/superme-speech-bubble.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SupermeCoinsStatsComponent } from '../../superme-coins-stats/superme-coins-stats.component';
import { SupermeCalendarComponent } from '../../superme-inputs/superme-calendar/superme-calendar.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';
import { SupermeBadgeComponent } from '../../superme-badge/superme-badge.component';
import { SupermePopupComponent, SupermePopupConfig, SupermePopupCTA } from '../../superme-popup/superme-popup.component';

type ActivityType = 'habits' | 'tasks' | 'timetable';

@Component({
  standalone: true,
  selector: 'activity-detail',
  templateUrl: './activity-detail.component.html',
  styleUrls: ['./activity-detail.component.scss'],
  imports: [
    CommonModule, IonicModule, SupermeNavigatorComponent, SupermeSpeechBubbleComponent,
    SupermePetComponent, SupermeCoinsStatsComponent, SupermeCalendarComponent,
    SupermeButtonComponent, SupermeInputsModule, SupermeBadgeComponent, SupermePopupComponent
  ]
})
export class ActivityDetailComponent implements OnInit, OnChanges, OnDestroy {
  // Navigation state
  cameFromLongPress = false;
  navigationOriginType = '';
  private selectedDateFromState: string | null = null;

  // User role flags
  isParent = false;
  isChild = false;

  @Input() habit: Habit | null = null;

  // Progress & intervals
  percentageCompleted = 0;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private buttonStateCheckerInterval: ReturnType<typeof setInterval> | null = null;

  // Calendar
  calendarStatusData: Record<string, 'COMPLETED' | 'SKIPPED' | 'PENDING'> = {};
  currentCalendarMonth = new Date();

  // Popup states
  public showStartPopup: boolean = false;
  public startPopupConfig: SupermePopupConfig = {};
  public showCompletePopup: boolean = false;
  public completePopupConfig: SupermePopupConfig = {};
  public showAbortPopup: boolean = false;
  public abortPopupConfig: SupermePopupConfig = {};

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private buttonLogic: HabitButtonLogicService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private habitService: HabitService,
    private autoAbortService: AutoAbortService
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
    if (changes['habit'] && !changes['habit'].isFirstChange()) {
      this.prepareCoinStats();
      this.prepareMilestoneBadges();
    }
  }

  // === Initialization Helpers ===

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
    this.cameFromLongPress = !!state['fromLongPress'];
    this.selectedDateFromState = state['selectedDate'] || null;

    const stateHabit = state['habit'];
    this.navigationOriginType = String(state['type'] || stateHabit?.type || 'habits');
  }

  private loadActivityFromRoute(): void {
    const state = history.state || {};
    const stateHabit = state['habit'];

    const id = stateHabit?.id || this.route.snapshot.paramMap.get('id');
    const type = (state['type'] || stateHabit?.type ||
      this.route.snapshot.queryParamMap.get('type') || 'habits') as ActivityType;

    if (id) {
      this.loadDetail(+id, type, this.selectedDateFromState || undefined);
    }
  }

  private clearAllIntervals(): void {
    this.clearProgress();
    if (this.buttonStateCheckerInterval) {
      clearInterval(this.buttonStateCheckerInterval);
      this.buttonStateCheckerInterval = null;
    }
  }

  // === Data Loading ===

  loadDetail(id: number, type: ActivityType, date?: string) {
    const effectiveDate = date || this.getStoredSelectedDate(type, id);

    if (date) this.setStoredSelectedDate(type, id, date);

    const api$ = effectiveDate
      ? (type === 'tasks' ? this.taskApi.getTaskByIdWithDate(id, effectiveDate) : this.habitApi.getHabitByIdWithDate(id, effectiveDate))
      : (type === 'tasks' ? this.taskApi.getTaskById(id) : this.habitApi.getHabitById(id));

    api$.pipe(finalize(() => {})).subscribe({
      next: (res) => {
        this.habit = this.normalizeResponse(res, type);
        
        // Update timestamps for selected date
        if (effectiveDate) {
          const copy: any = { ...this.habit, startDate: effectiveDate, endDate: effectiveDate };
          try {
            const ts = this.buttonLogic.calculateTimestamps(copy);
            this.habit.startTimeStamp = ts.startTimeStamp;
            this.habit.endTimeStamp = ts.endTimeStamp;
          } catch { /* Use original timestamps */ }
        }
        
        this.cdr.detectChanges();
        this.prepareCoinStats();
        this.prepareMilestoneBadges();
        this.loadMonthlyStatus(this.currentCalendarMonth);

        if (this.habit?.status?.toLowerCase() === 'ongoing') {
          this.percentageCompleted = this.calculateProgressPercentage();
          this.startProgress();
        } else {
          this.percentageCompleted = 0;
        }
      },
      error: (err) => {
        console.error(`Error loading ${type} detail:`, err);
        // If habit not found (likely deleted), navigate back
        if (err?.status === 404 || err?.status === 400) {
          this.router.navigate(['/authed/activity-page']).catch(() => {});
        }
      }
    });
  }

  /** Legacy method for backward compatibility */
  loadHabitDetail(id: number) {
    this.loadDetail(id, 'habits');
  }

  // === Storage Helpers ===

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

  // === Response Normalization ===

  private normalizeResponse(res: any, type: ActivityType): Habit {
    const timestamps = this.buttonLogic.calculateTimestamps(res);
    const rawTags = Array.isArray(res.tags) && res.tags.length ? res.tags : (res.tag ? [res.tag] : []);
    const tags = rawTags.map((t: any) => this.normalizeTag(t));

    return {
      ...res, type,
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

  // === Coin Stats & Badges ===

  coinStats = {
    userCoins: 0, userStreaks: 0, userDays: 0,
    userBadges: 0, successPercentage: 0, totalStreaks: 0
  };

  badgeList: Array<any> = [];

  private readonly BADGE_ICON_MAP: Record<string, string> = {
    'Coin Collector': 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
    'Streak Keeper': 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png',
    'Habit Master': 'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
    'Task Terminator': 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png'
  };

  prepareCoinStats() {
    const h = this.habit as any;
    const coins = Number(h?.coinsEarned ?? h?.coinReward ?? 0) || 0;
    const currentStreak = this.habit?.type === 'habits' ? Number(h?.currentHabitStreak ?? 0) : Number(h?.currentTaskStreak ?? 0);
    const highestStreak = this.habit?.type === 'habits' ? Number(h?.highestHabitStreak ?? 0) : Number(h?.highestTaskStreak ?? 0);
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

  prepareMilestoneBadges() {
    const h = this.habit as any;
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

  // === Calendar & Date Helpers ===

  isViewingToday(): boolean {
    const effectiveDate = this.getEffectiveSelectedDate();
    if (effectiveDate) {
      const selected = new Date(effectiveDate);
      if (!isNaN(selected.getTime())) return this.isSameDay(selected, new Date());
    }

    if (this.habit) {
      const ts = Number((this.habit as any).startTimeStamp || 0);
      if (ts) return this.isSameDay(new Date(ts), new Date());

      if (this.habit.startDate) {
        const d = new Date(this.habit.startDate);
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
    if (this.habit) {
      return this.getStoredSelectedDate(this.habit.type || 'habits', Number(this.habit.id));
    }
    return null;
  }

  loadMonthlyStatus(monthDate: Date): void {
    if (!this.habit) return;

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    const id = Number(this.habit.id);

    const api$ = this.habit.type === 'tasks'
      ? this.taskApi.getTaskMonthlyCompletion(id, year, month)
      : this.habitApi.getHabitMonthlyCompletion(id, year, month);

    api$.subscribe({
      next: (res) => {
        this.calendarStatusData = {};
        (res.monthlyCompletion || []).forEach((item: any) => {
          if (item.date && item.status) this.calendarStatusData[item.date] = item.status;
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading monthly completion:', err);
        this.calendarStatusData = {};
      }
    });
  }

  onCalendarMonthChange(newMonth: Date): void {
    this.currentCalendarMonth = newMonth;
    this.loadMonthlyStatus(newMonth);
  }

  // === Computed Properties ===

  get tagText(): string {
    const tags = this.habit?.tags || [];
    const first: any = tags[0];
    if (!first) return '';
    if (typeof first === 'string') return first.trim();
    if (typeof first === 'object') return (first.value || first.text || first.name || String(first.key ?? '')).toString().trim();
    return String(first).trim();
  }

  get speechMessage(): string {
    const desc = (this.habit as any)?.description ?? (this.habit as any)?.notes ?? '';
    return desc ? String(desc).trim() : '';
  }

  get shortDaysOfWeek(): string {
    const rawDays = this.habit?.daysOfWeek || [];
    if (this.habit?.everyday || rawDays.length === 7) return 'Everyday';

    const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const abbr: Record<string, string> = {
      MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
      FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun'
    };

    const normalized = rawDays.map((d: string) => String(d).trim().toUpperCase());
    const filtered = order.filter(c => normalized.includes(c));

    return filtered.length ? filtered.map(d => abbr[d]).join(', ') : '—';
  }

  // === Navigation & Editing ===

  onEdit() {
    if (!this.habit) {
      this.router.navigate(['/authed/activity-input'], {
        state: { origin: this.router.url || '/authed/user-dashboard' }
      });
      return;
    }

    this.router.navigate(['/authed/activity-input'], {
      state: {
        habit: this.habit,
        type: this.habit.type,
        currentActive: this.habit.type || 'habits',
        selectedDate: this.selectedDateFromState,
        originType: this.navigationOriginType,
        origin: this.router.url || '/authed/user-dashboard',
        fromDetail: true
      }
    });
  }

  canEdit(): boolean {
    try {
      const currentUserId = this.authService?.getUserId?.();
      if (!currentUserId || !this.habit) return false;

      const createdBy = (this.habit as any).createdById ?? (this.habit as any).createdBy ?? (this.habit as any).createdByName;
      const isCreator = createdBy != null && String(createdBy) === String(currentUserId);

      // Check if end date has passed
      if (this.habit.endDate) {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
        const endDate = new Date(this.habit.endDate);
        endDate.setHours(0, 0, 0, 0); // Set to start of day for comparison
        if (currentDate > endDate) {
          return false; // End date has passed, don't allow editing
        }
      }

      return isCreator;
    } catch { return false; }
  }

  // === Routine Helpers ===

  hasRoutine(): boolean {
    const routine = this.habit?.routine;
    return !!(routine && String(routine).toLowerCase() !== 'null' && String(routine).trim());
  }

  getRoutineIcon(): string {
    if (!this.hasRoutine()) return null as any;

    const routine = String(this.habit!.routine).toLowerCase();
    const capitalized = routine.charAt(0).toUpperCase() + routine.slice(1);
    return `assets/Icons-Neutral/Icon-Routine-${capitalized}.png`;
  }

  getRoutineName(): string {
    if (!this.hasRoutine()) return '';

    const routine = String(this.habit!.routine).toLowerCase();
    return routine.charAt(0).toUpperCase() + routine.slice(1);
  }

  getTimeColor(habit: Habit | null): string {
    if (!habit) return '#BB2124'; // default to pending color

    const status = habit.status?.toLowerCase() || 'pending';
    const type = habit.type;

    if (status === 'completed') {
      return '#4CAF50';
    } else if (status === 'skipped') {
      return '#BB2124';
    } else if (status === 'pending') {
      // Check if end time has passed
      const now = Date.now();
      const endTime = habit.endTimeStamp || 0;
      if (now > endTime) {
        return '#BB2124';
      } else {
        return '#282527';
      }
    }

    // Default colors for ongoing
    return type === 'tasks' ? '#EE6621' : '#6360A2';
  }

  // === Habit Actions ===

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
    this.onStartHabit();
    this.closeStartPopup();
  }

  handlePopupSecondary() {
    this.closeStartPopup();
  }

  onStartHabit() {
    if (!this.habit || !this.isLetsGoEnabled()) return;

    const isTask = this.habit.type === 'tasks';
    const api$ = isTask
      ? this.taskApi.letsGoTask(this.habit.id)
      : this.habitApi.letsGoHabit(this.habit.id);

    api$.subscribe({
      next: () => {
        this.habit = { ...this.habit!, status: 'ongoing' } as Habit;
        this.buttonLogic.saveOngoingState(this.habit);
        this.autoAbortService.scheduleAutoAbort({
          id: this.habit!.id,
          type: this.habit!.type || 'habits',
          endTimeStamp: this.habit!.endTimeStamp
        });
        this.startProgress();
        // Notify that activity was started so dashboard refreshes
        if (isTask) {
          this.habitService.notifyTaskStarted();
        } else {
          this.habitService.notifyHabitStarted();
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to start', err)
    });
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

  onAbortHabit() {
    if (!this.habit) return;

    const isTask = this.habit.type === 'tasks';
    const api$ = isTask
      ? this.taskApi.abortTask(this.habit.id)
      : this.habitApi.abortHabit(this.habit.id);

    api$.subscribe({
      next: () => {
        this.habit = { ...this.habit!, status: 'pending' } as Habit;
        this.buttonLogic.clearOngoingState(this.habit);
        this.autoAbortService.cancelAutoAbort(this.habit!.id, this.habit!.type || 'habits');
        this.resetProgress();
        // Notify that activity was aborted so dashboard refreshes
        if (isTask) {
          this.habitService.notifyTaskUpdated();
        } else {
          this.habitService.notifyHabitStarted(); // Uses same event as updated
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to abort', err)
    });
  }

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

  onCompleteHabit() {
    if (!this.habit || !this.isDoneEnabled()) return;

    const isTask = this.habit.type === 'tasks';
    const api$ = isTask
      ? this.taskApi.completeTask(this.habit.id)
      : this.habitApi.completeHabit(this.habit.id);

    api$.subscribe({
      next: () => {
        this.habit = { ...this.habit!, status: 'completed' } as Habit;
        this.buttonLogic.clearOngoingState(this.habit);
        this.autoAbortService.cancelAutoAbort(this.habit!.id, this.habit!.type || 'habits');
        this.resetProgress();
        // Notify that activity was completed so dashboard refreshes
        if (isTask) {
          this.habitService.notifyTaskCompleted();
        } else {
          this.habitService.notifyHabitCompleted();
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to complete', err)
    });
  }

  // === Progress Tracking ===

  startProgress(): void {
    this.clearProgress();
    this.percentageCompleted = this.buttonLogic.calculateProgressPercentage(this.habit);
    this.progressInterval = setInterval(() => {
      this.percentageCompleted = this.calculateProgressPercentage();
    }, 10000); // Update every 10s to avoid ANR
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

  // === Button State Logic ===

  private setupButtonStateChecker(): void {
    // Reactive updates via OnPush - no polling needed
    if (this.buttonStateCheckerInterval) clearInterval(this.buttonStateCheckerInterval);
  }

  isLetsGoEnabled(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isLetsGoEnabled(this.getHabitForButtonLogic(), false);
  }

  isLetsGoVisible(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isLetsGoVisible(this.getHabitForButtonLogic());
  }

  isAbortVisible(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isAbortVisible(this.getHabitForButtonLogic());
  }

  isDoneEnabled(): boolean {
    return !this.isViewingFutureDate() && this.buttonLogic.isDoneEnabled(this.getHabitForButtonLogic(), false);
  }

  private isViewingFutureDate(): boolean {
    if (!this.habit) return false;

    const effectiveDate = this.getEffectiveSelectedDate();
    if (!effectiveDate) return false;

    const d = new Date(effectiveDate);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dateOnly.getTime() > todayOnly.getTime();
  }

  private getHabitForButtonLogic(): any {
    if (!this.habit) return null;

    const effectiveDate = this.getEffectiveSelectedDate();
    if (!effectiveDate) return this.habit;

    const copy: any = { ...this.habit, startDate: effectiveDate, endDate: effectiveDate };
    try {
      const ts = this.buttonLogic.calculateTimestamps(copy);
      copy.startTimeStamp = ts.startTimeStamp;
      copy.endTimeStamp = ts.endTimeStamp;
    } catch { /* Use shallow copy */ }

    return copy;
  }

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
}
