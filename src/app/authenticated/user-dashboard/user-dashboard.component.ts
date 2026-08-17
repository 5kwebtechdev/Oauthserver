import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController, RefresherCustomEvent } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { StreakRestoreApi, StreakStatus } from '../../core/api/streak-restore.api';
import { StreakRestoreModalComponent } from '../../core/components/streak-restore/streak-restore-modal.component';
import { ActivityCardComponent } from "../../core/components/activity-section/activity-card/activity-card.component";
import { LearningSectionComponent } from "../../core/components/learning-section/learning-section.component";
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { TutorCardComponent } from "../../core/components/tutor-section/tutor-card/tutor-card.component";

import { AcademySectionComponent } from "../../core/components/academy-section/academy-section.component";
import { IonicModule } from "@ionic/angular";
import { SupermeInputsModule } from "../../core/components/superme-inputs/superme-inputs.module";
import { MoodSelectorComponent } from "../../core/components/mood-selector/mood-selector.component";
import { DayStreak, WeekStreakSectionComponent } from "../../core/components/week-streak-section/week-streak-section.component";
import { ReelPreviewSectionComponent } from "../../core/components/reel-section/reel-preview/reel-preview.component";
import { QuickAccessSectionComponent } from "../../core/components/quick-access-section/quick-access-section.component";
import { SupermePetComponent } from '../../core/components/superme-pet/superme-pet.component';

import { FooterComponent } from '../../core/components/footer/footer.component';
import { DashboardWebFooterComponent } from '../../core/components/dashboard-web-footer/dashboard-web-footer.component';
import { SkeletonImageComponent } from '../../core/components/skeleton-image/skeleton-image.component';
import { PetMessagesService, PetMessage, PetMood } from '../../core/services/pet-messages.service';
import { PetMessageApiService, ApiOverlayType } from '../../core/services/pet-message-api.service';
import { UserService } from '../../core/services/user.service';
import { HabitService } from '../../core/components/activity-section/habit.service';
import { Habit } from '../../core/components/activity-section/habit.types';
import { TaskApi } from '../../core/api/task.api';
import { HabitApi } from '../../core/api/habit.api';
import { CalendarService } from '../../core/services/calendar.service';
import { HabitButtonLogicService } from '../../core/components/activity-section/habit-button-logic.service';
import { AuthService } from '../../core/services/auth.service';
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { CustomToastService, Toast } from '../../core/services/custom-toast.service';
import { RefreshService } from '../../core/services/refresh.service';
import { Observable, Subject, catchError, forkJoin, of } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { MoodService } from '../../core/services/mood.service';
import { MoodTransition } from '../../core/models/mood.model';
import { PetAgeService } from '../../core/services/pet-age.service';
import { Capacitor } from '@capacitor/core';

type MoodBalanceKey = 'good' | 'okay' | 'tough' | 'hard';

interface MoodBalanceSegment {
  key: MoodBalanceKey;
  label: string;
  value: number;
  color: string;
}

interface SelfMetric {
  label: string;
  value: number;
  displayValue: string;
  color: string;
  status: string;
}

type HomeTimePeriod = 'morning' | 'evening' | 'night';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ActivityCardComponent,
    AdBannerComponent,
    LearningSectionComponent,
    TutorCardComponent,
    AcademySectionComponent,
    IonicModule,
    MoodSelectorComponent,
    WeekStreakSectionComponent,
    ReelPreviewSectionComponent,
    QuickAccessSectionComponent,
    SupermeInputsModule,
    SupermePetComponent,
    FooterComponent,
    DashboardWebFooterComponent,
    SkeletonImageComponent,
  ]
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  // Reels are temporarily unavailable on iOS while that experience is revised.
  public readonly showReelPreview = Capacitor.getPlatform() !== 'ios';

  // Minimal properties used by the template
  public userName = '';
  public userAvatarUrl: string | null = null;
  public avatarImageName: string | null = null;
  public userCoins: number = 0;
  public userStreaks: number = 0;
  public userDays: number = 0;
  public userBadges: number = 0;
  public homeTimePeriod: HomeTimePeriod = 'morning';
  // currently selected mood
  public selectedMood: string | null = null;
  // Pet message and mood
  public currentPetMessage: PetMessage | undefined = undefined;
  public petMood: PetMood | 'anger' = 'happy';

  // ── Home-screen overlays (PRD: bonus coins, daily login, mood prompt, streak milestone) ──
  activeOverlay: 'bonus-coins' | 'mood-prompt' | 'daily-login' | 'streak-milestone' | null = null;
  overlayMessage = '';
  overlayPetMood: PetMood = 'happy';
  private overlayQueue: Array<'bonus-coins' | 'mood-prompt' | 'daily-login' | 'streak-milestone'> = [];
  private overlayQueueBuilt = false;

  // Figma daily streak popup. It is shown only after fresh/cached API stats
  // confirm an active streak and after the existing home overlay flow finishes.
  public showDailyStreakPopup = false;
  public currentStreakDayIndex = new Date().getDay();
  public readonly streakWeekdayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  private dailyStreakEligible = false;
  private streakStatusResolved = false;
  private streakContinuityConfirmed = false;
  private homeOverlayFlowComplete = false;
  private dailyStreakShownDateThisSession: string | null = null;

  // Recent habits and tasks
  public recentHabits: Habit[] = [];
  public recentTasks: any[] = [];
  public recentTimetables: any[] = [];

  // Completion data
  public totalTasks: number = 0;
  public totalTasksCompleted: number = 0;
  public taskCompletionRate: number = 0;
  public totalHabits: number = 0;
  public totalHabitsCompleted: number = 0;
  public habitCompletionRate: number = 0;
  public totalTimetables: number = 0;
  public awaitingTasks: number = 0;
  public awaitingHabits: number = 0;
  public weekStreakDays: DayStreak[] = [];

  // Insights — "This Week's Performance" + Mood Balance, same widget the
  // Parent Home Screen shows about a selected child, scoped here to the
  // logged-in user's own data (no forUserId passed to the API calls).
  public completionRate: number = 0;
  public consistencyRate: number = 0;
  public improvementRate: number = 0;
  public appScore: number = 0;
  public performanceLoading = false;
  public moodBalanceLoading = false;
  public moodBalance: MoodBalanceSegment[] = this.createEmptyMoodBalance();
  public statsUpdatedAt = new Date();
  private moodBalanceRequestId = 0;

  // Family connected acknowledgment popup
  showFamilyAck = false;
  familyAckRole = '';

  // Streak restore banner
  canRestoreStreak = false;
  restoreToStreak: number | null = null;
  restoreCost = 5;
  private streakPopupShown = false;

  // Observable for shared toast service
  toast$: Observable<Toast | null>;

  // Subject for cleanup
  private destroy$ = new Subject<void>();
  private refreshScheduled$ = new Subject<void>();
  private homeTimeChangeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly homePeriodBackgrounds = [
    '/assets/Images-Thumbnails/HeaderV2.png',
    '/assets/Images-Thumbnails/HeaderV2-evening.png',
    '/assets/Images-Thumbnails/HeaderV2-night.png'
  ];
  private readonly handleHomeVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.syncHomeTimePeriod();
      this.refreshWeekStreakDays();
      this.maybeShowDailyStreakPopup();
    }
  };
  private readonly handleHomeWindowFocus = (): void => {
    this.syncHomeTimePeriod();
    this.refreshWeekStreakDays();
    this.maybeShowDailyStreakPopup();
  };

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private petMessagesService: PetMessagesService,
    private userService: UserService,
    private habitService: HabitService,
    private taskApi: TaskApi,
    private habitApi: HabitApi,
    private calendarService: CalendarService,
    private buttonLogic: HabitButtonLogicService,
    private authService: AuthService,
    private childSelfImageService: ChildSelfImageService,
    private toastService: CustomToastService,
    private refreshService: RefreshService,
    private streakRestoreApi: StreakRestoreApi,
    private petMessageApi: PetMessageApiService,
    private moodService: MoodService,
    private petAgeService: PetAgeService
  ) {
    this.toast$ = this.toastService.toast$;
  }

  /** Panda alone uses the larger, bottom-attached Figma placement on Home. */
  get isHomePanda(): boolean {
    return this.petAgeService.getCurrentPetType() === 'panda';
  }

  get performanceMetrics(): SelfMetric[] {
    return [
      this.buildMetric('Completion Rate', this.completionRate, `${this.clampPercentage(this.completionRate)}%`),
      this.buildMetric('Consistency Rate', this.consistencyRate, `${this.clampPercentage(this.consistencyRate)}%`),
      this.buildMetric(
        'Improvement Rate',
        Math.abs(this.improvementRate),
        `${this.improvementRate > 0 ? '+' : ''}${Math.round(this.improvementRate)}%`
      ),
      this.buildMetric('App’s Score', this.appScore, `${Math.round(this.appScore)}`)
    ];
  }

  get aiInsight(): string {
    if (this.appScore >= 80) {
      return 'You’re showing strong and consistent progress this week.';
    }
    if (this.appScore >= 60) {
      return 'You’re doing reasonably well, though there’s room to tighten one or two areas.';
    }
    return 'You may benefit from a little extra support and a simpler daily plan this week.';
  }

  get statsUpdatedLabel(): string {
    return this.statsUpdatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  private clampPercentage(value: number): number {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.min(100, Math.max(0, Math.round(Number(value))));
  }

  /** PRD color logic: Red 0-59, Yellow 60-79, Green 80-100 */
  private getMetricColor(value: number): string {
    if (value >= 80) return '#4CAF50';
    if (value >= 60) return '#F0AD4E';
    return '#E74C3C';
  }

  private buildMetric(label: string, value: number, displayValue: string): SelfMetric {
    const normalizedValue = this.clampPercentage(value);
    const isNegativeImprovement = label === 'Improvement Rate' && this.improvementRate < 0;
    return {
      label,
      value: normalizedValue,
      displayValue,
      color: this.getMetricColor(isNegativeImprovement ? -1 : normalizedValue),
      status: isNegativeImprovement
        ? 'Needs Improvement'
        : normalizedValue >= 80
        ? 'Great progress !'
        : normalizedValue >= 60
          ? 'Attention Needed'
          : 'Needs Improvement'
    };
  }

  private createEmptyMoodBalance(): MoodBalanceSegment[] {
    return [
      { key: 'good', label: 'Good', value: 0, color: '#4CAF50' },
      { key: 'okay', label: 'Okay', value: 0, color: '#F0AD4E' },
      { key: 'tough', label: 'Tough', value: 0, color: '#EE6621' },
      { key: 'hard', label: 'Hard', value: 0, color: '#BB2124' }
    ];
  }

  private calculateMoodBalance(transitions: MoodTransition[]): MoodBalanceSegment[] {
    const counts: Record<MoodBalanceKey, number> = { good: 0, okay: 0, tough: 0, hard: 0 };

    transitions.forEach(item => {
      counts[this.mapMoodBalanceKey(item.toMood || item.fromMood)] += 1;
    });

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const base = this.createEmptyMoodBalance();
    if (total === 0) return base;

    let assigned = 0;
    return base.map((segment, index) => {
      const isLast = index === base.length - 1;
      const value = isLast
        ? Math.max(0, 100 - assigned)
        : Math.round((counts[segment.key] / total) * 100);
      assigned += value;
      return { ...segment, value };
    });
  }

  private mapMoodBalanceKey(mood: string): MoodBalanceKey {
    const normalized = String(mood || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (/(angry|upset|frustrated|very sad|terrible|hard)/.test(normalized)) return 'hard';
    if (/(sad|nervous|anxious|worried|tough)/.test(normalized)) return 'tough';
    if (/(neutral|okay|calm|fine)/.test(normalized)) return 'okay';
    return 'good';
  }

  /** Load this user's own performance stats (no forUserId — self-scoped by the auth token). */
  private loadInsightStats(): void {
    this.performanceLoading = true;
    this.moodService.getVibesDisplay()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const d = Array.isArray(data) && data.length ? data[0] : null;
          if (d) {
            this.completionRate = Math.round(d.completionRate || 0);
            this.consistencyRate = Math.round(d.consistencyRate || 0);
            this.improvementRate = Math.round(d.improvementRate || 0);
            this.appScore = Math.round(d.appScore || 0);
            this.statsUpdatedAt = new Date();
          }
          this.performanceLoading = false;
        },
        error: () => {
          this.performanceLoading = false;
        }
      });
  }

  /** Load this user's own mood balance for the last 7 days (self-scoped). */
  private loadInsightMoodBalance(): void {
    const requestId = ++this.moodBalanceRequestId;
    this.moodBalanceLoading = true;
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    forkJoin([
      this.moodService.getMoodTransitionsMonthly(now.getFullYear(), now.getMonth() + 1)
        .pipe(catchError(() => of([] as MoodTransition[]))),
      this.moodService.getMoodTransitionsMonthly(previousMonth.getFullYear(), previousMonth.getMonth() + 1)
        .pipe(catchError(() => of([] as MoodTransition[])))
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([current, previous]) => {
        if (requestId !== this.moodBalanceRequestId) return;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const transitions = [...previous, ...current].filter(item => {
          const date = new Date(`${item.date}T00:00:00`);
          return Number.isFinite(date.getTime()) && date >= sevenDaysAgo && date <= now;
        });

        this.moodBalance = this.calculateMoodBalance(transitions);
        this.moodBalanceLoading = false;
      });
  }

  openInsights(): void {
    this.router.navigate(['/authed/analytics']);
  }

  dismissFamilyAck(): void {
    this.showFamilyAck = false;
    this.maybeShowDailyStreakPopup();
  }

  async openNotes() {
    // Navigate to the notes home page instead of opening the Notes modal
    this.router.navigate(['/authed/notes']);
  }

  ngOnInit() {
    // Check if the current user is a parent and redirect if needed
    if (this.authService.isParentUser()) {
      this.router.navigate(['/authed/parent-account'], { replaceUrl: true });
      return;
    }

    // global.scss caps every ion-page/ion-router-outlet to a readable content
    // width (see body.onboarding-active for the same pattern) — this page's
    // web layout builds its own wider container internally (bp.web-container),
    // so it opts out of that generic cap for as long as it's active.
    document.body.classList.add('dashboard-web-view');

    this.startHomeTimeSync();

    // Check for family connected acknowledgment
    try {
      const rawAck = sessionStorage.getItem('family_connected_ack');
      if (rawAck) {
        sessionStorage.removeItem('family_connected_ack');
        const ack = JSON.parse(rawAck) as { source?: string; role?: string };
        if (ack.source === 'self-role-switch' && (ack.role === 'Parent' || ack.role === 'Child')) {
          this.familyAckRole = ack.role;
          this.showFamilyAck = true;
        }
      }
    } catch {}

    // Subscribe to user data changes from AuthService (primary source of truth)
    // This will update the UI whenever user data is modified (e.g., from edit-profile)
    this.authService.userData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userData => {
        if (userData) {
          console.log('[UserDashboard] User data updated from AuthService:', userData.name);
          this.userName = this.resolveGreetingUsername(userData);

          // The avatar is resolved only from the logged-in user's API/stored profile.
          const resolved = this.childSelfImageService.resolveAvatarFromUser(userData);
          this.userAvatarUrl = resolved.url || null;
          this.avatarImageName = resolved.alt || null;

          // A profile refresh can supply createdDateTime after the dashboard
          // initially renders. Rebuild the week so dates before account
          // creation are immediately shown as neutral instead of missed.
          this.refreshWeekStreakDays();
        }
      });

    // Keep the Home coin header in sync with purchases/unlocks completed on
    // other screens. UserService publishes the shared stats cache immediately.
    this.userService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        if (!stats) return;
        this.userCoins = stats.coins;
        this.userStreaks = stats.streaks;
        this.userDays = stats.days;
        this.userBadges = stats.badges;
      });

    // Load user profile from service (secondary source for additional profile info)
    this.userService.getUserProfile$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        if (profile) {
          if (!this.userName) {
            this.userName = this.resolveGreetingUsername(profile);
          }
          if (!this.userAvatarUrl && profile.avatarUrl) {
            this.userAvatarUrl = profile.avatarUrl;
          }
        }
      });

    this.refreshWeekStreakDays();

    // Fetch user stats (coins, streaks, badges, etc.) from backend
    this.loadUserStats();

    // Insights — "This Week's Performance" + Mood Balance, self-scoped

    // Fallback: show overlays even if stats API is slow (buildOverlayQueue guards against double-run)
    setTimeout(() => this.buildOverlayQueue(), 2000);

    // Check if streak restore is available
    this.checkStreakRestore();

    // Load recent habits and tasks
    this.loadRecentHabitsAndTasks();

    // Subscribe to habit/task changes and reload data with debounce to prevent multiple rapid calls
    this.refreshScheduled$
      .pipe(
        debounceTime(300), // Wait 300ms after last change before refreshing
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('[UserDashboard] Data changed, reloading (debounced)...');
        // Clear calendar cache to ensure fresh data
        const today = new Date();
        const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        this.calendarService.clearCache(formatted, 'day');
        this.loadRecentHabitsAndTasks(true); // Force reload from API
        this.loadUserStats();
      });

    // Trigger the debounced refresh when data changes
    this.habitService.dataChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshScheduled$.next();
      });

    // Register with global pull-to-refresh service
    this.refreshService.registerRefreshHandler('UserDashboard', () => this.onGlobalRefresh());

    // Initialize pet message (will update with real counts after API loads)
    this.currentPetMessage = this.petMessagesService.getMessage('home', {
      userName: this.userName,
      tasksCount: this.awaitingTasks,
      habitsCount: this.awaitingHabits,
      streakDays: this.userStreaks
    });
    this.petMood = this.currentPetMessage.mood;
  }

  ionViewWillEnter(): void {
    this.syncHomeTimePeriod();
    this.refreshWeekStreakDays();
    this.maybeShowDailyStreakPopup();
  }

  private startHomeTimeSync(): void {
    this.preloadHomePeriodBackgrounds();
    this.syncHomeTimePeriod();
    document.addEventListener('visibilitychange', this.handleHomeVisibilityChange);
    window.addEventListener('focus', this.handleHomeWindowFocus);
  }

  private preloadHomePeriodBackgrounds(): void {
    this.homePeriodBackgrounds.forEach(src => {
      const image = new Image();
      image.src = src;
    });
  }

  private syncHomeTimePeriod(): void {
    const now = new Date();
    this.homeTimePeriod = this.resolveHomeTimePeriod(now);
    this.scheduleNextHomeTimeChange(now);
  }

  private resolveHomeTimePeriod(date: Date): HomeTimePeriod {
    const hour = date.getHours();

    if (hour >= 4 && hour < 16) {
      return 'morning';
    }

    if (hour >= 16 && hour < 20) {
      return 'evening';
    }

    return 'night';
  }

  private scheduleNextHomeTimeChange(now: Date): void {
    if (this.homeTimeChangeTimer) {
      clearTimeout(this.homeTimeChangeTimer);
    }

    const nextChange = new Date(now);
    const hour = now.getHours();

    if (hour < 4) {
      nextChange.setHours(4, 0, 0, 0);
    } else if (hour < 16) {
      nextChange.setHours(16, 0, 0, 0);
    } else if (hour < 20) {
      nextChange.setHours(20, 0, 0, 0);
    } else {
      nextChange.setDate(nextChange.getDate() + 1);
      nextChange.setHours(4, 0, 0, 0);
    }

    const delay = Math.max(1000, nextChange.getTime() - now.getTime() + 1000);
    this.homeTimeChangeTimer = setTimeout(() => this.syncHomeTimePeriod(), delay);
  }

  /**
   * Load recent habits and tasks
   */
  private loadRecentHabitsAndTasks(forceReload: boolean = false): void {
    // Use a single calendar API to fetch both habits and tasks for today
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    this.calendarService.getUserCalendar(formatted, 'day', forceReload).subscribe({
      next: (resp: any) => {
        if (!resp) return;

        // Process habits
        if (Array.isArray(resp.habits)) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          let habitsData = resp.habits.map((item: any) => {
            // For recurring items, use today's date to calculate correct timestamps
            const isRecurring = item.daysOfWeek?.length || item.everyday || item.everyWeekend;
            const itemForTimestamp = isRecurring ? { ...item, startDate: todayStr, endDate: todayStr } : item;
            const start = this.buttonLogic.calculateTimestamps(itemForTimestamp);
            return {
              id: item.id || '',
              title: item.title || '',
              notes: item.description || '',
              startDate: item.startDate ? new Date(item.startDate) : new Date(),
              endDate: item.endDate ? new Date(item.endDate) : new Date(),
              startTime: item.startTime || '07:00:00',
              endTime: item.endTime || '08:00:00',
              startTimeStamp: start.startTimeStamp,
              endTimeStamp: start.endTimeStamp,
              type: 'habits',
              status: item.status,
              tags: (() => {
                const raw = Array.isArray(item.tags) && item.tags.length ? item.tags : (item.tag ? [item.tag] : []);
                return raw.map((t: any) => {
                  if (!t) return '';
                  if (typeof t === 'string') return t;
                  if (typeof t === 'object') return (t.value || t.name || t.text || t.title || '').toString().trim();
                  return '';
                }).filter(Boolean);
              })(),
              coinReward: Number(item.coinReward ?? item.rewardCoins ?? item.reward_coins ?? item.rewardsCoins ?? (item.rewards?.coins ?? item.rewards?.rewardCoins) ?? item.coins ?? 0),
              // keep routine info so activity-card can render routine icon
              routine: item.routine ?? item.selectedRoutine ?? item.selected_routine ?? null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
            };
          });

          // Completed habits disappear from Home. Keep skipped habits visible so
          // a backend-marked missed habit is not presented as an empty day.
          const now = Date.now();
          const fiveMinMs = 5 * 60 * 1000;
          habitsData = habitsData.filter((h: any) => {
            const status = (h.status || '').toLowerCase();
            if (status === 'completed') return false;
            if (status === 'skipped') return true;
            // Hide card if current time > endTime + 5 minutes
            const endTs = Number(h.endTimeStamp || 0);
            if (endTs > 0 && now > endTs + fiveMinMs) return false;
            return true;
          })
          .sort((a: any, b: any) => this.sortByUpcoming(a, b))
          .slice(0,4);

          this.recentHabits = habitsData;
          setTimeout(() => this.recentHabits = [...this.recentHabits], 0);
        }

        // Process tasks
        if (Array.isArray(resp.tasks)) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          let tasksData = resp.tasks.map((item: any) => {
            // For recurring items, use today's date to calculate correct timestamps
            const isRecurring = item.daysOfWeek?.length || item.everyday || item.everyWeekend;
            const itemForTimestamp = isRecurring ? { ...item, startDate: todayStr, endDate: todayStr } : item;
            const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);
            return {
              id: item.id || '',
              title: item.title || '',
              notes: item.description || '',
              startDate: item.startDate ? new Date(item.startDate) : new Date(),
              endDate: item.endDate ? new Date(item.endDate) : new Date(),
              startTime: item.startTime || '07:00:00',
              endTime: item.endTime || '08:00:00',
              startTimeStamp: timestamps.startTimeStamp,
              endTimeStamp: timestamps.endTimeStamp,
              type: 'tasks',
              status: item.status,
              tags: (() => {
                const raw = Array.isArray(item.tags) && item.tags.length ? item.tags : (item.tag ? [item.tag] : []);
                return raw.map((t: any) => {
                  if (!t) return '';
                  if (typeof t === 'string') return t;
                  if (typeof t === 'object') return (t.value || t.name || t.text || t.title || '').toString().trim();
                  return '';
                }).filter(Boolean);
              })(),
              coinReward: Number(item.coinReward ?? item.rewardCoins ?? item.reward_coins ?? item.rewardsCoins ?? (item.rewards?.coins ?? item.rewards?.rewardCoins) ?? item.coins ?? 0),
              // preserve routine info when present
              routine: item.routine ?? item.selectedRoutine ?? item.selected_routine ?? null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
            };
          });

          // Filter out completed/skipped and items 5 min past their endTime
          const nowMs = Date.now();
          const fiveMin = 5 * 60 * 1000;
          tasksData = tasksData.filter((t: any) => {
            const status = (t.status || '').toLowerCase();
            if (status === 'completed' || status === 'skipped') return false;
            // Hide card if current time > endTime + 5 minutes
            const endTs = Number(t.endTimeStamp || 0);
            if (endTs > 0 && nowMs > endTs + fiveMin) return false;
            return true;
          })
          .sort((a: any, b: any) => this.sortByUpcoming(a, b))
          .slice(0,4);

          this.recentTasks = tasksData;
          setTimeout(() => this.recentTasks = [...this.recentTasks], 0);
        }

        // Process timetable entries (calendar events — no completion tracking/rewards, just scheduled blocks)
        if (Array.isArray(resp.events)) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          let timetableData = resp.events.map((item: any) => {
            const isRecurring = item.daysOfWeek?.length || item.everyday || item.everyWeekend;
            const itemForTimestamp = isRecurring ? { ...item, startDate: todayStr, endDate: todayStr } : item;
            const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);
            return {
              id: item.id || '',
              title: item.title || '',
              notes: item.description || '',
              startDate: item.startDate ? new Date(item.startDate) : new Date(),
              endDate: item.endDate ? new Date(item.endDate) : new Date(),
              startTime: item.startTime || '07:00:00',
              endTime: item.endTime || '08:00:00',
              startTimeStamp: timestamps.startTimeStamp,
              endTimeStamp: timestamps.endTimeStamp,
              type: 'timetable',
              status: item.completed ? 'completed' : 'pending',
              tags: (() => {
                const raw = Array.isArray(item.tags) ? item.tags : [];
                return raw.map((t: any) => {
                  if (!t) return '';
                  if (typeof t === 'string') return t;
                  if (typeof t === 'object') return (t.value || t.name || t.text || t.title || '').toString().trim();
                  return '';
                }).filter(Boolean);
              })(),
              coinReward: 0,
              routine: null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
            };
          });

          // Filter out completed and items 5 min past their endTime
          const nowTt = Date.now();
          const fiveMinTt = 5 * 60 * 1000;
          timetableData = timetableData.filter((e: any) => {
            if (e.status === 'completed') return false;
            const endTs = Number(e.endTimeStamp || 0);
            if (endTs > 0 && nowTt > endTs + fiveMinTt) return false;
            return true;
          })
          .sort((a: any, b: any) => this.sortByUpcoming(a, b))
          .slice(0, 4);

          this.recentTimetables = timetableData;
          this.totalTimetables = resp.events.length;
          setTimeout(() => this.recentTimetables = [...this.recentTimetables], 0);
        }

        // Set completion data
        this.totalTasks = resp.totalTasks || 0;
        this.totalTasksCompleted = resp.totalTasksCompleted || 0;
        this.taskCompletionRate = resp.taskCompletionRate || 0;
        this.totalHabits = resp.totalHabits || 0;
        this.totalHabitsCompleted = resp.totalHabitsCompleted || 0;
        this.habitCompletionRate = resp.habitCompletionRate || 0;
        this.awaitingTasks = Math.max(0, Number(resp.awaitingTasks ?? (this.totalTasks - this.totalTasksCompleted)) || 0);
        this.awaitingHabits = Math.max(0, Number(resp.awaitingHabits ?? (this.totalHabits - this.totalHabitsCompleted)) || 0);

        this.updatePetMessageWithCounts();
      },
      error: (err) => {
        console.error('Failed to load calendar data:', err);
      }
    });
  }

  private updatePetMessageWithCounts(): void {
    // Prefer API response; fall back to local computed message
    this.petMessageApi.getHomeHeader().subscribe({
      next: (resp) => {
        if (resp.message) {
          this.currentPetMessage = {
            message: resp.message,
            mood: resp.petMood ? this.petMessageApi.normaliseMood(resp.petMood) : 'happy',
            displayType: 'header',
          };
        } else {
          this.currentPetMessage = this.petMessagesService.getMessage('home', {
            userName: this.userName,
            tasksCount: this.awaitingTasks,
            habitsCount: this.awaitingHabits,
            streakDays: this.userStreaks
          });
        }
        this.petMood = this.currentPetMessage?.mood ?? 'happy';
      },
      error: () => {
        this.currentPetMessage = this.petMessagesService.getMessage('home', {
          userName: this.userName,
          tasksCount: this.awaitingTasks,
          habitsCount: this.awaitingHabits,
          streakDays: this.userStreaks
        });
        this.petMood = this.currentPetMessage.mood;
      }
    });
  }

  // Sort comparator to order items by upcoming time relative to now.
  // Items with startTimeStamp >= now come first (ascending), then past items (closest past first).
  private sortByUpcoming(a: any, b: any): number {
    const now = Date.now();
    const aTs = Number(a?.startTimeStamp || 0);
    const bTs = Number(b?.startTimeStamp || 0);

    const aFuture = aTs >= now;
    const bFuture = bTs >= now;

    if (aFuture && bFuture) return aTs - bTs; // both future - nearest first
    if (aFuture && !bFuture) return -1; // future comes before past
    if (!aFuture && bFuture) return 1;
    // both past - show closest past first
    return bTs - aTs;
  }

  /**
   * Load user statistics from the vibes/display endpoint
   */
  private loadUserStats(): void {
    // Try to load from localStorage first
    const cachedStats = this.userService.getUserStats();

    if (cachedStats) {
      // Use cached stats
      this.userCoins = cachedStats.coins;
      this.userStreaks = cachedStats.streaks;
      this.userDays = cachedStats.days;
      this.userBadges = cachedStats.badges;
      this.refreshWeekStreakDays();

      console.log('[UserDashboard] Loaded stats from localStorage:', cachedStats);
    }

    // Always fetch fresh data from API in background and update cache.
    // Routed through UserService.refreshStats() (shared/deduped) instead of
    // calling moodService directly, so the persistent website shell nav can
    // subscribe to the same stats$ stream without duplicating this request.
    this.userService.refreshStats().subscribe({
      next: (stats) => {
        if (stats) {
          this.userCoins = stats.coins;
          this.userStreaks = stats.streaks;
          this.userDays = stats.days;
          this.userBadges = stats.badges;
          this.refreshWeekStreakDays();
          this.dailyStreakEligible = this.dailyStreakEligible || this.userStreaks > 0;

          console.log('[UserDashboard] Updated stats from API:', stats);

          // Build overlay queue now that we have real streak/coins data
          this.buildOverlayQueue();
          this.maybeShowDailyStreakPopup();
        } else {
          // Preserve the cached streak when the endpoint temporarily returns
          // no rows, while still respecting the once-per-day guard.
          this.dailyStreakEligible = this.dailyStreakEligible || this.userStreaks > 0;
          this.buildOverlayQueue();
          this.maybeShowDailyStreakPopup();
        }
      },
      error: (error) => {
        console.error('Failed to load user stats:', error);
        // Keep cached or default values (0) on error
        this.dailyStreakEligible = this.dailyStreakEligible || this.userStreaks > 0;
        this.maybeShowDailyStreakPopup();
      }
    });
  }

  get userInitial(): string {
    return (this.userName || '').trim().charAt(0).toUpperCase();
  }

  /**
   * Build the visible week from the API-backed current streak count.
   * Future days remain pending instead of displaying invented completion data.
   */
  private refreshWeekStreakDays(streakLength: number = this.userStreaks): void {
    const labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    const today = new Date();
    const todayIndex = today.getDay();
    this.currentStreakDayIndex = todayIndex;
    const safeStreak = Math.max(0, Number(streakLength) || 0);
    const completedFrom = Math.max(0, todayIndex - safeStreak + 1);
    const accountCreatedAt = this.getAccountCreatedAt();

    this.weekStreakDays = labels.map((label, index) => {
      let status: DayStreak['status'];
      const dayDate = new Date(today);
      dayDate.setHours(0, 0, 0, 0);
      dayDate.setDate(today.getDate() - (todayIndex - index));

      if (accountCreatedAt && dayDate < accountCreatedAt) {
        status = 'neutral';
      } else if (index > todayIndex) {
        status = 'pending';
      } else if (safeStreak > 0 && index >= completedFrom) {
        status = 'completed';
      } else if (index === todayIndex) {
        status = 'pending';
      } else {
        status = 'missed';
      }
      return { label, status };
    });
  }

  private getAccountCreatedAt(): Date | null {
    const user = this.authService.getUserData();
    const profile = user?.user ?? user?.data ?? user;
    const rawDate = profile?.createdDateTime
      ?? profile?.createdAt
      ?? profile?.createdDate
      ?? profile?.createdOn
      ?? profile?.registrationDate
      ?? null;
    if (!rawDate) return null;

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  getStreakDayAriaLabel(day: DayStreak, index: number): string {
    const dayName = this.streakWeekdayNames[index] || day.label;
    if (index === this.currentStreakDayIndex) {
      return `${dayName}, current streak day`;
    }
    return `${dayName}, ${day.status}`;
  }

  dismissDailyStreakPopup(): void {
    this.showDailyStreakPopup = false;
  }

  private maybeShowDailyStreakPopup(): void {
    if (!this.dailyStreakEligible
      || !this.streakStatusResolved
      || !this.streakContinuityConfirmed
      || !this.homeOverlayFlowComplete
      || this.activeOverlay
      || this.showFamilyAck
      || this.showDailyStreakPopup) {
      return;
    }

    const today = this.getLocalDateKey(new Date());
    if (this.dailyStreakShownDateThisSession === today) return;

    const storageKey = this.getDailyStreakStorageKey();
    try {
      if (storageKey && localStorage.getItem(storageKey) === today) return;
    } catch {
      // Storage can be unavailable in strict privacy modes; the in-memory
      // date still prevents repeats for the current app session.
    }

    this.dailyStreakShownDateThisSession = today;
    try {
      if (storageKey) localStorage.setItem(storageKey, today);
    } catch {}
    this.showDailyStreakPopup = true;
  }

  private getDailyStreakStorageKey(): string | null {
    const session = this.authService.getUserData();
    const user = session?.user && typeof session.user === 'object' ? session.user : session;
    let identity = user?.id ?? user?.userId ?? user?.email ?? null;

    if (identity == null) {
      try {
        identity = localStorage.getItem('user_id');
      } catch {}
    }

    return identity == null || String(identity).trim() === ''
      ? null
      : `superme_daily_streak_seen_${String(identity)}`;
  }

  private getLocalDateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  onMoodChange(mood: string) {
    this.selectedMood = mood;
    console.log('mood changed to', mood);
  }

  openNotifications() {
    this.router.navigate(['/authed/notifications']);
  }

  openCoinPage() {
    this.router.navigateByUrl('/authed/coin', { state: { coins: this.userCoins } } as any);
  }

  protected readonly console = console;
  /**
   * Resolve avatar URL from an avatarImageName like "Avatar 3" and optional gender
   */
  // helper moved to ChildSelfImageService

  /**
   * Pull-to-refresh handler wired to ion-refresher in the template.
   */
  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    try {
      await this.authService.refreshUserData().toPromise();
      await this.refreshService.triggerRefresh();
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (error) {
      console.error('[UserDashboard] Refresh error:', error);
    } finally {
      event.target.complete();
    }
  }

  /**
   * Called by the global RefreshService when the user pulls to refresh.
   * Session validation is already handled by the authenticated shell.
   */
  private async onGlobalRefresh(): Promise<void> {
    console.log('[UserDashboard] Global refresh triggered');

    // Update local user data from refreshed storage
    const userData = this.authService.getUserData();
    if (userData) {
      this.userName = this.resolveGreetingUsername(userData) || this.userName;

      const resolved = this.childSelfImageService.resolveAvatarFromUser(userData);
      this.userAvatarUrl = resolved.url || null;
      this.avatarImageName = resolved.alt || null;

      this.userService.updateUserProfile({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        gender: userData.gender,
        relationship: userData.relationship,
        dob: userData.dateOfBirth || userData.dob,
        avatarName: userData.avatarName || userData.avatar?.avatarName,
        avatarImageName: userData.avatarImageName || userData.avatar?.avatarImageName
      });
    }

    // Reload user stats from vibes API
    this.loadUserStats();

    // Reload habits and tasks
    this.loadRecentHabitsAndTasks(true);

    // Update pet message
    this.currentPetMessage = this.petMessagesService.getMessage('home', {
      userName: this.userName,
      tasksCount: this.recentTasks.length,
      habitsCount: this.recentHabits.length,
      streakDays: this.userStreaks
    });
    this.petMood = this.currentPetMessage.mood;
  }

  /**
   * The home greeting is the user's in-app identity, not their legal/full
   * name. Older sessions may not have a username yet, so retain name as a
   * fallback until the profile is refreshed.
   */
  private resolveGreetingUsername(user: any): string {
    const username = user?.username ?? user?.userName;
    return String(username || user?.name || '').trim();
  }

  private checkStreakRestore(): void {
    this.streakRestoreApi.getStreakStatus().subscribe({
      next: (status: StreakStatus) => {
        this.refreshWeekStreakDays(status.currentStreak);
        this.canRestoreStreak = status.canRestoreStreak;
        this.dailyStreakEligible = Number(status.currentStreak) > 0;
        this.streakStatusResolved = true;
        this.streakContinuityConfirmed = Number(status.currentStreak) > 0 && !status.canRestoreStreak;
        this.restoreToStreak = status.restoreToStreak;
        this.restoreCost = status.restoreCost ?? 5;
        if (status.canRestoreStreak && !this.streakPopupShown) {
          this.streakPopupShown = true;
          setTimeout(() => this.openStreakRestoreModal(), 800);
        }
        this.maybeShowDailyStreakPopup();
      },
      error: () => {
        this.canRestoreStreak = false;
        this.streakStatusResolved = true;
        // The general stats endpoint remains a safe fallback when the
        // dedicated streak-status endpoint is temporarily unavailable.
        this.streakContinuityConfirmed = true;
        this.maybeShowDailyStreakPopup();
      }
    });
  }

  async openStreakRestoreModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: StreakRestoreModalComponent,
      componentProps: {
        restoreToStreak: this.restoreToStreak ?? 0,
        restoreCost: this.restoreCost,
        userCoins: this.userCoins
      },
      cssClass: 'streak-restore-modal'
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.success) {
      this.userCoins = data.userCoins ?? this.userCoins;
      this.canRestoreStreak = false;
      this.toastService.success('Streak restored! 🔥');
      // Refresh streak count
      this.checkStreakRestore();
      this.loadUserStats();
    }
  }

  // ── Overlay logic ────────────────────────────────────────────────────────────

  /** API-driven overlay flow — replaces the old localStorage-queue approach */
  buildOverlayQueue(): void {
    if (this.overlayQueueBuilt) return;
    this.overlayQueueBuilt = true;
    this.pollHomeOverlay();
  }

  /** Call GET /overlay, apply result. Re-called after every dismiss/mood-save. */
  private pollHomeOverlay(): void {
    this.homeOverlayFlowComplete = false;
    this.petMessageApi.getHomeOverlay().subscribe({
      next: (resp) => {
        if (resp.hasOverlay && resp.overlayType && resp.overlayType !== 'NONE') {
          // Map API overlay type → internal activeOverlay key
          const typeMap: Record<ApiOverlayType, typeof this.activeOverlay> = {
            BONUS_COINS:      'bonus-coins',
            MOOD_PROMPT:      'mood-prompt',
            DAILY_LOGIN:      'daily-login',
            STREAK_MILESTONE: 'streak-milestone',
            NONE:             null,
          };
          const nextOverlay = typeMap[resp.overlayType] ?? null;

          this.activeOverlay = nextOverlay;

          if (resp.message) {
            this.overlayMessage = resp.message;
          } else {
            // Fallback to local message if API returns empty text
            const locMap: Record<string, any> = {
              'bonus-coins':     'bonus-coins-first-time',
              'mood-prompt':     'set-mood-prompt',
              'daily-login':     'daily-login-coins',
              'streak-milestone':'streak-coins',
            };
            const fallback = this.petMessagesService.getMessage(locMap[this.activeOverlay!] || 'home', { userName: this.userName });
            this.overlayMessage = fallback.message;
          }

          this.overlayPetMood = resp.petMood
            ? this.petMessageApi.normaliseMood(resp.petMood)
            : 'happy';
        } else {
          // No more overlays — show normal home screen
          this.activeOverlay = null;
          this.homeOverlayFlowComplete = true;
          this.loadHomeHeader();
          this.maybeShowDailyStreakPopup();
        }
      },
      error: () => {
        // If API fails entirely, skip overlays and show home
        this.activeOverlay = null;
        this.homeOverlayFlowComplete = true;
        this.loadHomeHeader();
        this.maybeShowDailyStreakPopup();
      }
    });
  }

  /** Fetch pet message for home header from API */
  private loadHomeHeader(): void {
    this.petMessageApi.getHomeHeader().subscribe({
      next: (resp) => {
        if (resp.message) {
          this.currentPetMessage = {
            message: resp.message,
            mood: resp.petMood ? this.petMessageApi.normaliseMood(resp.petMood) : 'happy',
            displayType: 'header',
          };
          this.petMood = this.currentPetMessage.mood;
        }
      },
      error: () => { /* keep existing local pet message on failure */ }
    });
  }

  /** User tapped overlay — MOOD_PROMPT is blocking, all others dismiss */
  onOverlayTap(): void {
    if (this.activeOverlay === 'mood-prompt') return;
    this.dismissCurrentOverlay();
  }

  dismissCurrentOverlay(): void {
    if (!this.activeOverlay) return;

    const apiTypeMap: Record<string, ApiOverlayType> = {
      'bonus-coins':     'BONUS_COINS',
      'daily-login':     'DAILY_LOGIN',
      'streak-milestone':'STREAK_MILESTONE',
    };
    const apiType = apiTypeMap[this.activeOverlay];

    if (apiType) {
      this.petMessageApi.dismissHomeOverlay(apiType).subscribe({
        next:  () => this.pollHomeOverlay(),
        error: () => this.pollHomeOverlay(),
      });
    } else {
      this.pollHomeOverlay();
    }
  }


  onOverlayMoodSelected(mood: string): void {
    this.selectedMood = mood;
    this.pollHomeOverlay();
  }

  // ─────────────────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    document.body.classList.remove('dashboard-web-view');
    // Unregister from global refresh
    this.refreshService.unregisterRefreshHandler('UserDashboard');
    if (this.homeTimeChangeTimer) {
      clearTimeout(this.homeTimeChangeTimer);
      this.homeTimeChangeTimer = null;
    }
    document.removeEventListener('visibilitychange', this.handleHomeVisibilityChange);
    window.removeEventListener('focus', this.handleHomeWindowFocus);
    // Cleanup all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshScheduled$.complete();
  }

}
