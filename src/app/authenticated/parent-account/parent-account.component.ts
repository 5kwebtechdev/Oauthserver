import { Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Platform, ViewWillEnter } from '@ionic/angular';
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from '@angular/router';
import { catchError, delay, firstValueFrom, forkJoin, map, Observable, of, Subject, takeUntil } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { IonicModule } from "@ionic/angular";
import { MoodService } from '../../core/services/mood.service';
import { MoodTransition, VibesDisplayResponse } from '../../core/models/mood.model';
import { FooterComponent } from '../../core/components/footer/footer.component';
import { DashboardWebFooterComponent } from '../../core/components/dashboard-web-footer/dashboard-web-footer.component';
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { ActivityCardComponent } from '../../core/components/activity-section/activity-card/activity-card.component';
import { HabitService } from '../../core/components/activity-section/habit.service';
import { AuthService } from '../../core/services/auth.service';
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { ParentImageService } from '../../core/services/parent-image.service';
import { ProfileStoreService } from '../../core/services/profile-store.service';
import { ChildInfo, mapVibeToChildInfo } from '../../core/models/child-info.model';
import { RefreshService } from '../../core/services/refresh.service';
import { FamilyService } from '../../core/services/family.service';
import { LearningSectionComponent } from '../../core/components/learning-section/learning-section.component';
import { AcademySectionComponent } from '../../core/components/academy-section/academy-section.component';
import { TutorCardComponent } from '../../core/components/tutor-section/tutor-card/tutor-card.component';
import { ParentAnalyticsService, ParentAnalyticsBand, ParentAnalyticsResponseDto } from '../../core/services/parent-analytics.service';
import { CustomToastService } from '../../core/services/custom-toast.service';
import { REGISTRATION_ONBOARDING_STATE_KEY } from '../../core/services/onboarding-state.service';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { environment } from '../../../environments/environment';
import { LearningService } from '../../core/services/learning.service';

type MoodBalanceKey = 'good' | 'okay' | 'tough' | 'hard';

interface MoodBalanceSegment {
    key: MoodBalanceKey;
    label: string;
    value: number;
    color: string;
}

interface ParentMetric {
    label: string;
    value: number;
    displayValue: string;
    color: string;
    status: string;
}

interface FoundationOverviewItem {
    label: string;
    value: number;
    status: string;
    tone: 'habit' | 'task' | 'time' | 'learning';
    icon: string;
}

interface FamilySwitcherParent {
    id: string | number | null;
    name: string;
    avatarUrl: string;
    initial: string;
}


@Component({
    selector: 'app-parent-account',
    templateUrl: './parent-account.component.html',
    styleUrls: ['./parent-account.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        IonicModule,
        AdBannerComponent,
        FooterComponent,
        DashboardWebFooterComponent,
        ActivityCardComponent,
        LearningSectionComponent,
        AcademySectionComponent,
        TutorCardComponent,
    ],
    providers: [RefreshService]
})
export class ParentAccountComponent implements OnInit, OnDestroy, ViewWillEnter {
    private static readonly MANAGED_CHILD_REFRESH_KEY = 'family_children_refresh_pending';
    private static readonly MANAGED_CHILD_SNAPSHOT_KEY = 'managed_child_created_snapshot';
    private readonly destroy$ = new Subject<void>();
    private childrenRequestId = 0;
    private moodBalanceRequestId = 0;
    private performanceRequestId = 0;
    private messageComposerCloseTimer?: ReturnType<typeof setTimeout>;
    private messageComposerTrigger?: HTMLElement;
    private activeMessageTemplate?: 'celebrate' | 'encourage';
    private managedChildRefreshTimers: ReturnType<typeof setTimeout>[] = [];
    private readonly assigningLearningItems = new Set<string>();
    
    public userName: string = 'User';
    public parentName: string = 'Parent';
    public parentCoins: number = 0;
    public familyCode = '';
    public userCoins: number = 0;
    public userStreaks: number = 0;
    public userDays: number = 0;
    public userBadges: number = 0;
    public selectedMood: string | null = null;
    public showFamilyAck = false;
    public familyAckRole = '';
    public showMessageComposer = false;
    public messageComposerClosing = false;
    public isSendingMessage = false;
    public messageDraft = '';
    public readonly messageMaxLength = 100;

    public userAvatarUrl: string = '';
    public parentAvatarStyle: { [k: string]: string } = {};
    public parentInitial: string = 'U';
    public currentProfile: any = null;
    public statsUpdatedAt = new Date();
    public moodBalanceLoading = false;
    public moodBalance: MoodBalanceSegment[] = this.createEmptyMoodBalance();

    /** False when every segment is 0 (no mood check-ins in the last 7 days). */
    get hasMoodBalanceData(): boolean {
        return this.moodBalance.some(segment => segment.value > 0);
    }
    // True while performanceMetrics is being refreshed for the currently
    // selected child — the template shows an animated skeleton instead of
    // the (possibly stale, previous child's) numbers while this is true.
    public performanceLoading = false;
    /** True only when the selected child has activity/statistics to analyse. */
    public hasPerformanceData = false;
    public activeMetricInfo: string | null = null;
    
    // Stats
    public completionRate: number = 0;
    public consistencyRate: number = 0;
    public improvementRate: number = 0;
    public appScore: number = 0;
    public Math = Math;

    // This Week's Performance (GET /analytics/parent-home?childId={id})
    public completionRateColor: ParentAnalyticsBand = 'red';
    public consistencyRateColor: ParentAnalyticsBand = 'red';
    public improvementRateColor: ParentAnalyticsBand = 'red';
    public appScoreColor: ParentAnalyticsBand = 'red';
    public appScoreLabel: string = 'Needs attention';
    public totalCompletedActivities: number = 0;
    public totalScheduledActivities: number = 0;
    public activeDaysThisWeek: number = 0;
    public daysInWeek: number = 7;
    public isFirstWeek: boolean = true;
    private performanceAnalyticsRequestId = 0;

    /** Passed directly to mood-selector so it shows the correct child's vibe without ID matching */
    public selectedChildVibe: VibesDisplayResponse | null = null;

    dismissFamilyAck(): void {
        this.showFamilyAck = false;
    }

    private clampPercentage(value: number): number {
        if (!Number.isFinite(Number(value))) return 0;
        return Math.min(100, Math.max(0, Math.round(Number(value))));
    }

    /** Converts the server's authoritative red/yellow/green band into the hex used for rings/text. */
    bandToHex(band: ParentAnalyticsBand): string {
        if (band === 'green') return '#4CAF50';
        if (band === 'yellow') return '#F0AD4E';
        return '#E74C3C';
    }

    private bandToStatus(band: ParentAnalyticsBand): string {
        if (band === 'green') return 'Great progress !';
        if (band === 'yellow') return 'Attention Needed';
        return 'Needs Improvement';
    }

    private buildMetric(label: string, value: number, displayValue: string, band: ParentAnalyticsBand, statusOverride?: string): ParentMetric {
        const normalizedValue = this.clampPercentage(value);
        return {
            label,
            value: normalizedValue,
            displayValue,
            color: this.bandToHex(band),
            status: statusOverride ?? this.bandToStatus(band)
        };
    }

    private buildFoundation(
        label: string,
        value: number,
        tone: FoundationOverviewItem['tone'],
        icon: string
    ): FoundationOverviewItem {
        const normalizedValue = this.clampPercentage(value);
        return {
            label,
            value: normalizedValue,
            status: normalizedValue >= 80 ? 'Good' : normalizedValue >= 50 ? 'Moderate' : 'Needs Focus',
            tone,
            icon
        };
    }

    private createEmptyMoodBalance(): MoodBalanceSegment[] {
        return [
            { key: 'good', label: 'Growing Well', value: 0, color: '#4CAF50' },
            { key: 'okay', label: 'Needs Support', value: 0, color: '#F2B44C' },
            { key: 'tough', label: 'Difficult Moments', value: 0, color: '#BE1E2D' },
            { key: 'hard', label: 'No Data', value: 0, color: '#AAA7AC' }
        ];
    }

    getMetricInfo(metric: ParentMetric): string {
        const details: Record<string, string> = {
            'Completion Rate': 'The percentage of planned habits and tasks completed this week.',
            'Consistency Rate': 'How regularly your child followed their planned activities this week.',
            'Improvement Rate': 'The change in progress compared with the previous week.',
            'App’s Score': 'A combined score based on completion, consistency, and improvement.'
        };
        return details[metric.label] || 'This metric is updated from your child’s weekly activity.';
    }

    toggleMetricInfo(metric: ParentMetric, event: Event): void {
        event.stopPropagation();
        const message = this.getMetricInfo(metric);
        this.activeMetricInfo = this.activeMetricInfo === message ? null : message;
    }


    // Vibe fields
    public vibeTitle: string = '';
    public vibeDescription: string = '';
    public emptyStateDescription: string = '';
    public completedStateDescription: string = '';
    public totalHabits: number = 0;
    public completedHabits: number = 0;
    public totalTasks: number = 0;
    public completedTasks: number = 0;
    public progressPercentage: number = 0;
    
    // Mood assets
    private readonly moodAssetMap: Record<string, string> = {
        'HAPPY': 'assets/Images-Transparent/Image-Mood-Happy.png',
        'VERY HAPPY': 'assets/Images-Transparent/Image-Mood-Very happy.png',
        'EXCITED': 'assets/Images-Transparent/Image-Mood-Excited.png',
        'SAD': 'assets/Images-Transparent/Image-Mood-Sad.png',
        'VERY SAD': 'assets/Images-Transparent/Image-Mood-Upset.png',
        'UPSET': 'assets/Images-Transparent/Image-Mood-Upset.png',
        'NERVOUS': 'assets/Images-Transparent/Image-Mood-Nervous.png',
        'NEUTRAL': 'assets/Images-Transparent/Mood-emoji-neutral-home.png'
    };
    
    // Popup state
    public showSwitchPopup: boolean = false;
    
    // Children from store
    public children: ChildInfo[] = [];
    public selectedChild: ChildInfo | null = null;
    public childrenLoadState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
    public coParent: FamilySwitcherParent | null = null;
    private static readonly MAX_CHILDREN = 2;

    get selectedChildName(): string {
        return this.selectedChild?.name || 'your child';
    }

    // Child and co-parent limits are independent of each other — reaching
    // one never blocks the other — so each is derived straight from the
    // family members actually loaded (this.children / this.coParent)
    // rather than a server-reported capacity number that could drift out
    // of sync with what's actually shown.
    get emptyChildSlotNumbers(): number[] {
        const remaining = Math.max(0, ParentAccountComponent.MAX_CHILDREN - this.children.length);
        return Array.from({ length: remaining }, (_, index) => index + 1);
    }

    get showInviteCoParentAction(): boolean {
        return !this.coParent;
    }

    get showAddChildAction(): boolean {
        return this.children.length < ParentAccountComponent.MAX_CHILDREN;
    }

    get greetingPeriod(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }

    get statsUpdatedLabel(): string {
        return this.statsUpdatedAt.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    get performanceMetrics(): ParentMetric[] {
        return [
            this.buildMetric('Completion Rate', this.completionRate, `${this.clampPercentage(this.completionRate)}%`, this.completionRateColor),
            this.buildMetric('Consistency Rate', this.consistencyRate, `${this.clampPercentage(this.consistencyRate)}%`, this.consistencyRateColor),
            this.buildMetric(
                'Improvement Rate',
                Math.abs(this.improvementRate),
                `${this.improvementRate > 0 ? '+' : ''}${Math.round(this.improvementRate)}%`,
                this.improvementRateColor
            ),
            this.buildMetric('App’s Score', this.appScore, `${Math.round(this.appScore)}`, this.appScoreColor, this.appScoreLabel)
        ];
    }

    get aiInsight(): string {
        const name = this.selectedChildName;
        if (this.appScoreColor === 'green') {
            return `${name} is showing strong and consistent progress this week.`;
        }
        if (this.appScoreColor === 'yellow') {
            return `${name} is doing reasonably well, though there’s room to tighten one or two areas.`;
        }
        return `${name} may benefit from a little extra support and a simpler daily plan this week.`;
    }

    get foundationalOverview(): FoundationOverviewItem[] {
        const taskRate = this.totalTasks > 0
            ? Math.round((this.completedTasks / this.totalTasks) * 100)
            : 0;

        return [
            this.buildFoundation(
                'HABIT FORMATION',
                this.completionRate,
                'habit',
                'assets/figma/parent-home/foundation-habit.webp'
            ),
            this.buildFoundation(
                'TASK MANAGEMENT',
                taskRate,
                'task',
                'assets/figma/parent-home/foundation-task.webp'
            ),
            this.buildFoundation(
                'TIME MANAGEMENT',
                this.consistencyRate,
                'time',
                'assets/figma/parent-home/foundation-time.webp'
            ),
            this.buildFoundation(
                'LEARNING',
                this.appScore,
                'learning',
                'assets/figma/parent-home/foundation-learning.webp'
            )
        ];
    }

    get hasLinkedChildren(): boolean {
        return this.children.length > 0;
    }

    get showNoChildHome(): boolean {
        return this.childrenLoadState === 'loaded' && !this.hasLinkedChildren;
    }

    get showChildrenLoading(): boolean {
        return this.childrenLoadState === 'loading' && !this.hasLinkedChildren;
    }

    get showChildrenLoadError(): boolean {
        return this.childrenLoadState === 'error' && !this.hasLinkedChildren;
    }

    @ViewChild(ActivityCardComponent) activityCard?: ActivityCardComponent;
    @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>;
    constructor(
        private router: Router,
        private userService: UserService,
        private moodService: MoodService,
        private habitService: HabitService,
        private profileStore: ProfileStoreService,
        private authService: AuthService,
        private childSelfImage: ChildSelfImageService,
        private parentImageService: ParentImageService,
        private refreshService: RefreshService,
        private familyService: FamilyService,
        private platform: Platform,
        private parentAnalyticsService: ParentAnalyticsService,
        private toastService: CustomToastService,
        private learningService: LearningService
    ) { }

    assignLearningReward(event: { item?: any; coins?: number } | null): void {
        const childId = Number(this.selectedChild?.id);
        if (!Number.isFinite(childId) || childId <= 0) {
            this.toastService.error('No child found. Add or select a child before assigning content.');
            return;
        }
        const childName = String(this.selectedChild?.name || 'your child').trim();

        const item = event?.item;
        const raw = item?.rawData ?? item;
        const alreadyAssigned = raw?.alreadyAssignedToThisUser === true
            || raw?.alreadyAssignedToThisUser === 1
            || String(raw?.alreadyAssignedToThisUser).trim().toLowerCase() === 'true';
        if (alreadyAssigned) return;
        const type = String(item?.type || raw?.category || '').trim().toLowerCase();
        const isArticle = type === 'article';
        const contentId = Number(
            isArticle
                ? (item?.id ?? raw?.articleId ?? raw?.id)
                : (item?.id ?? raw?.challengeId ?? raw?.id)
        );

        if (!item || !Number.isFinite(contentId) || contentId <= 0) {
            this.toastService.error('Unable to identify this learning content. Please try again.');
            return;
        }

        const extraCoinsByParent = Math.max(0, Math.round(Number(event?.coins) || 20));
        const assignmentKey = `${isArticle ? 'article' : 'challenge'}:${contentId}:${childId}`;
        if (this.assigningLearningItems.has(assignmentKey)) return;

        this.assigningLearningItems.add(assignmentKey);
        const request$: Observable<any> = isArticle
            ? this.learningService.assignArticle(contentId, [childId], extraCoinsByParent)
            : this.learningService.assignChallenge(contentId, [childId], extraCoinsByParent);

        request$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    const assignment = response as any;
                    item.rawData = {
                        ...(raw && typeof raw === 'object' ? raw : {}),
                        alreadyAssignedToThisUser: true,
                        assignedToChild: true,
                        assignedAt: assignment?.assignedAt,
                        extraCoinsByParent: assignment?.extraCoinsByParent ?? extraCoinsByParent
                    };

                    const contentName = String(
                        assignment?.challengeName
                        || assignment?.articleTitle
                        || item?.title
                        || 'Learning content'
                    ).trim();
                    this.toastService.success(`${contentName} assigned to ${childName}.`);
                },
                error: (error: any) => {
                    const message = String(
                        error?.error?.message
                        || error?.message
                        || 'Unable to assign this content. Please try again.'
                    );
                    this.toastService.error(message);
                }
            })
            .add(() => this.assigningLearningItems.delete(assignmentKey));
    }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    ngOnDestroy(): void {
        if (this.messageComposerCloseTimer) clearTimeout(this.messageComposerCloseTimer);
        this.managedChildRefreshTimers.forEach(timer => clearTimeout(timer));
        this.managedChildRefreshTimers = [];
        document.body.style.overflow = '';
        document.body.classList.remove('dashboard-web-view');
        this.refreshService.unregisterRefreshHandler('ParentAccount');
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnInit(): void {
        // global.scss caps every ion-page/ion-router-outlet to a readable content
        // width by default — this page's web layout builds its own wide
        // container internally (bp.web-container, see dashboard-web-footer and
        // .parent-web-content below), so it opts out of that generic cap for as
        // long as it's active. Same pattern as UserDashboardComponent.
        document.body.classList.add('dashboard-web-view');

        // Register with global pull-to-refresh service
        this.refreshService.registerRefreshHandler('ParentAccount', () => this.onGlobalRefresh());
        this.platform.resume.pipe(takeUntil(this.destroy$)).subscribe(() => {
            void this.loadChildren();
        });
        // Redirect non-parent users
        if (!this.authService.isParentUser()) {
            this.router.navigate(['/authed/user-dashboard'], { replaceUrl: true });
            return;
        }

        const authenticatedSession = this.authService.getUserData();
        this.applyAuthenticatedParent(authenticatedSession);
        this.authService.userData$
            .pipe(takeUntil(this.destroy$))
            .subscribe(session => this.applyAuthenticatedParent(session));
        this.applyFamilySwitcherMetadata(authenticatedSession);

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

        // Subscribe to parent profile
        this.userService.getUserProfile$().pipe(takeUntil(this.destroy$)).subscribe(profile => {
            if (profile) {
                this.currentProfile = profile;
                this.parentName = profile.name || 'Parent';
                this.userName = this.parentName;
                // Parent Home is role-specific. Force the Parent audience here
                // so older cached profiles that do not contain `relationship`
                // cannot fall back to the general Self/Child avatar artwork.
                this.userAvatarUrl = this.childSelfImage.resolveAvatarFromUser({
                    ...profile,
                    relationship: 'PARENT'
                }).url || '';
                this.parentInitial = profile.name?.charAt(0) || 'U';
                this.parentAvatarStyle = this.parentImageService.getAvatarStyle(
                    this.parentInitial,
                    (profile.gender || '').toLowerCase() === 'female',
                    54
                );
            }
        });

        // Subscribe to store children list
        this.profileStore.children$.pipe(takeUntil(this.destroy$)).subscribe(list => {
            this.children = list;
        });

        // Keep the cached Parent Home in sync with a confirmed removal from
        // My Family, even before the family read model finishes refreshing.
        this.authService.familyMemberRemoved$.pipe(takeUntil(this.destroy$)).subscribe(memberId => {
            const remainingChildren = this.authService.excludeRemovedFamilyMembers(
                this.profileStore.getChildrenSync()
            );
            this.profileStore.setChildren(remainingChildren);
            this.clearPendingManagedChildIfMatches(memberId);
        });

        // This component is often cached while the parent completes the
        // Add Child wizard. Update its store immediately from the confirmed
        // registration snapshot rather than waiting for a route refresh.
        this.authService.familyChildCreated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            const createdChild = this.getPendingManagedChild();
            if (!createdChild) return;
            const currentChildren = this.profileStore.getChildrenSync();
            if (currentChildren.some(child => String(child.id) === String(createdChild.id))) return;
            this.profileStore.setChildren([...currentChildren, createdChild]);
            this.childrenLoadState = 'loaded';
            this.statsUpdatedAt = new Date();
        });

        // Subscribe to selected child changes. selectionChanged$ (not
        // selectedChild$) skips duplicate emissions, so re-tapping the
        // already-selected child never re-triggers mood/activity API calls.
        this.profileStore.selectionChanged$.pipe(takeUntil(this.destroy$)).subscribe(child => {
            this.selectedChild = child;
            if (child) {
                // Apply the cached snapshot immediately so the screen isn't
                // blank, then refresh from the API — the template shows a
                // loading skeleton on the performance metrics for the
                // duration so those (possibly stale) cached numbers are
                // never mistaken for confirmed, up-to-date ones.
                this.applyChildStats(child);
                this.loadMoodBalance();
                this.loadUserStats();
            } else {
                // Invalidate any child-scoped responses still in flight so
                // they cannot repaint the parent/no-child state later.
                ++this.moodBalanceRequestId;
                ++this.performanceRequestId;
                this.moodBalanceLoading = false;
                this.performanceLoading = false;
                this.useParentAsDefault();
                this.moodBalance = this.createEmptyMoodBalance();
            }
            setTimeout(() => this.activityCard?.refresh());
        });

        // Reload stats when habits/tasks change
        this.habitService.dataChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.loadUserStats();
        });

        // Load cached stats first
        const stats = this.userService.getUserStats();
        if (stats) {
            this.userStreaks = stats.streaks || 0;
            this.userDays = stats.days || 0;
            this.userBadges = stats.badges || 0;
        }

    }

    async ionViewWillEnter(): Promise<void> {
        // Fires on initial load AND every time this screen becomes active (return from navigation).
        await Promise.all([
            this.loadChildren(),
            firstValueFrom(
                this.authService.refreshUserData().pipe(catchError(() => of(false)))
            )
        ]);
        this.refreshChildrenAfterManagedChildCreation();
        this.activityCard?.refresh();
    }

    /**
     * A managed child is linked immediately after its account is registered,
     * but the family-members read model can take a moment to include it.  On
     * the one return journey from that flow, retry the lightweight child-list
     * request a few times instead of making the parent manually refresh.
     */
    private refreshChildrenAfterManagedChildCreation(): void {
        let pending = false;
        try {
            pending = sessionStorage.getItem(ParentAccountComponent.MANAGED_CHILD_REFRESH_KEY) === 'true';
            if (pending) sessionStorage.removeItem(ParentAccountComponent.MANAGED_CHILD_REFRESH_KEY);
        } catch (error) {
            console.warn('[ParentAccount] Unable to read managed child refresh state', error);
            return;
        }

        if (!pending) return;

        this.managedChildRefreshTimers.forEach(timer => clearTimeout(timer));
        this.managedChildRefreshTimers = [700, 1800, 3500].map(delay => setTimeout(() => {
            void this.loadChildren();
        }, delay));
    }

    private applyAuthenticatedParent(session: any): void {
        if (!session) return;

        const parent = session?.user ?? session?.data?.user ?? session?.data ?? session;
        this.parentName = parent?.name || this.parentName;
        this.userName = this.parentName;

        const coinCandidates = [
            parent?.coins,
            parent?.totalCoins,
            parent?.coinBalance,
            parent?.availableCoins,
            parent?.wallet?.coins,
            parent?.wallet?.balance,
            session?.coins,
            session?.totalCoins
        ];
        const resolvedCoins = coinCandidates
            .map(value => value === null || value === undefined || value === '' ? NaN : Number(value))
            .find(value => Number.isFinite(value));
        if (resolvedCoins !== undefined) {
            this.parentCoins = Math.max(0, resolvedCoins);
        }

        this.parentInitial = this.parentName.charAt(0) || 'P';
        this.parentAvatarStyle = this.parentImageService.getAvatarStyle(
            this.parentInitial,
            String(parent?.gender || '').toLowerCase() === 'female',
            54
        );
        this.userAvatarUrl = this.childSelfImage.resolveAvatarFromUser({
            ...parent,
            relationship: 'PARENT'
        }).url
            || this.userService.getUserAvatarUrl()
            || '';
    }

    /**
     * Load linked children from family status, then enrich them with vibe/stats data.
     * The family endpoint is the source of truth for whether a child is linked.
     */
    public async loadChildren(): Promise<void> {
        const requestId = ++this.childrenRequestId;
        this.childrenLoadState = 'loading';

        const result = await firstValueFrom(forkJoin({
            family: this.familyService.getMyStatus().pipe(
                map(data => ({ data, failed: false })),
                catchError(error => of({ data: null, failed: true, error }))
            ),
            vibes: this.moodService.getVibesDisplay().pipe(
                map(data => ({ data, failed: false })),
                catchError(error => of({ data: [] as VibesDisplayResponse[], failed: true, error }))
            )
        }));

        // Ignore an older response if a pull-to-refresh or route re-entry started a newer request.
        if (requestId !== this.childrenRequestId) return;

        const familyChildren = result.family.failed
            ? []
            : this.mapFamilyChildren(result.family.data);
        const vibeChildren = result.vibes.failed
            ? []
            : this.mapVibeChildren(result.vibes.data);

        if (!result.family.failed) {
            this.familyCode = this.extractFamilyCode(result.family.data);
            this.applyFamilySwitcherMetadata(result.family.data);
            const explicitlyNoFamily = result.family.data?.hasFamily === false;
            let children = familyChildren.length
                ? this.mergeChildStats(familyChildren, vibeChildren)
                : explicitlyNoFamily
                    ? []
                    : vibeChildren;

            children = this.includePendingManagedChild(children);

            this.profileStore.setChildren(children);
            this.childrenLoadState = 'loaded';
            this.statsUpdatedAt = new Date();
            return;
        }

        if (!result.vibes.failed && vibeChildren.length) {
            this.profileStore.setChildren(this.includePendingManagedChild(vibeChildren));
            this.childrenLoadState = 'loaded';
            this.statsUpdatedAt = new Date();
            return;
        }

        const pendingChild = this.getPendingManagedChild();
        if (pendingChild) {
            this.profileStore.setChildren(this.includePendingManagedChild([]));
            this.childrenLoadState = 'loaded';
            this.statsUpdatedAt = new Date();
            return;
        }

        // Preserve any previously loaded children during a temporary network failure.
        this.childrenLoadState = 'error';
    }

    /** Use the just-created child response until the eventually-consistent family list catches up. */
    private includePendingManagedChild(children: ChildInfo[]): ChildInfo[] {
        const pendingChild = this.getPendingManagedChild();
        if (!pendingChild) return children;

        const isTemporaryPendingChild = String(pendingChild.id).startsWith('pending:');
        const pendingName = String(pendingChild.name || '').trim().toLowerCase();
        const alreadyReturned = children.some(child =>
            String(child.id) === String(pendingChild.id)
            // The create response may not yet include an id. When the family
            // endpoint later returns the real record, replace the temporary
            // entry by matching its confirmed display name.
            || (isTemporaryPendingChild
                && !!pendingName
                && String(child.name || '').trim().toLowerCase() === pendingName)
        );
        if (alreadyReturned) {
            try { sessionStorage.removeItem(ParentAccountComponent.MANAGED_CHILD_SNAPSHOT_KEY); } catch {}
            return children;
        }

        return [...children, pendingChild];
    }

    private getPendingManagedChild(): ChildInfo | null {
        try {
            const raw = sessionStorage.getItem(ParentAccountComponent.MANAGED_CHILD_SNAPSHOT_KEY);
            if (!raw) return null;
            const member = JSON.parse(raw);
            const id = member?.id ?? member?.userId ?? member?.memberId;
            if (id === null || id === undefined || !String(id).trim()) return null;
            const snapshotParentId = member?.parentUserId;
            const activeParentId = this.authService.getUserId();
            if (
                snapshotParentId !== null && snapshotParentId !== undefined
                && activeParentId !== null && activeParentId !== undefined
                && String(snapshotParentId) !== String(activeParentId)
            ) {
                sessionStorage.removeItem(ParentAccountComponent.MANAGED_CHILD_SNAPSHOT_KEY);
                return null;
            }
            const normalized = {
                ...member,
                userId: id,
                userName: member?.userName || member?.name || 'Child',
                relationship: 'CHILD'
            };
            const avatarUrl = this.childSelfImage.resolveAvatarForMember(normalized).url || '';
            return mapVibeToChildInfo(normalized, avatarUrl);
        } catch (error) {
            console.warn('[ParentAccount] Unable to read created child snapshot', error);
            return null;
        }
    }

    private clearPendingManagedChildIfMatches(memberId: string | number): void {
        try {
            const raw = sessionStorage.getItem(ParentAccountComponent.MANAGED_CHILD_SNAPSHOT_KEY);
            if (!raw) return;
            const snapshot = JSON.parse(raw);
            const snapshotId = snapshot?.id ?? snapshot?.userId ?? snapshot?.memberId;
            if (String(snapshotId) === String(memberId)) {
                sessionStorage.removeItem(ParentAccountComponent.MANAGED_CHILD_SNAPSHOT_KEY);
            }
        } catch {
            // A missing or malformed temporary snapshot must not block removal.
        }
    }

    private mapFamilyChildren(status: any): ChildInfo[] {
        const members = this.extractFamilyMembers(status);

        return members
            .filter((member: any) => this.isChildMember(member))
            .map((member: any) => {
                const normalized = {
                    ...member,
                    userName: member?.userName || member?.name || 'Child'
                };
                const avatarUrl = this.childSelfImage.resolveAvatarForMember(normalized).url || '';
                return mapVibeToChildInfo(normalized, avatarUrl);
            });
    }

    private applyFamilySwitcherMetadata(status: any): void {
        if (!status) return;

        const members = this.extractFamilyMembers(status);
        const currentUser = this.authService.getUserData()?.user ?? this.authService.getUserData();
        const otherParent = members.find(member =>
            this.isParentMember(member) && !this.isCurrentFamilyMember(member, status, currentUser)
        );

        this.coParent = otherParent
            ? {
                id: otherParent?.userId ?? otherParent?.id ?? otherParent?.memberId ?? null,
                name: String(otherParent?.name || otherParent?.userName || 'Co-parent').trim(),
                avatarUrl: String(
                    otherParent?.avatarUrl
                    || otherParent?.avatar?.url
                    || otherParent?.profileImage
                    || ''
                ).trim(),
                initial: String(otherParent?.name || otherParent?.userName || 'P')
                    .trim()
                    .charAt(0)
                    .toUpperCase() || 'P'
            }
            : null;
    }

    private extractFamilyMembers(status: any): any[] {
        if (!status) return [];

        const collections = [
            status?.members,
            status?.family?.members,
            status?.familyMembers,
            status?.children,
            status?.data?.members,
            status?.data?.familyMembers,
            status?.data?.children,
            status?.data?.family?.members
        ].filter(Array.isArray) as any[][];
        const creators = [
            status?.creator,
            status?.family?.creator,
            status?.data?.creator,
            status?.data?.family?.creator
        ].filter(value => value && typeof value === 'object');

        const collectionMembers = collections.reduce(
            (all: any[], collection: any[]) => all.concat(collection),
            []
        );
        const unique = new Map<string, any>();
        [...collectionMembers, ...creators].forEach((member: any, index: number) => {
            if (!member || typeof member !== 'object') return;
            const identity = this.familyMemberIdentity(member) || `member-${index}`;
            if (!unique.has(identity)) unique.set(identity, member);
        });
        return Array.from(unique.values());
    }

    private familyMemberIdentity(member: any): string {
        const id = member?.userId ?? member?.id ?? member?.memberId;
        if (id !== null && id !== undefined && String(id).trim()) {
            return `id:${String(id).trim()}`;
        }

        const email = String(member?.email || '').trim().toLowerCase();
        if (email) return `email:${email}`;

        const relationship = String(
            member?.relationship || member?.familyRole || member?.memberRole || member?.role || ''
        ).trim().toUpperCase();
        const name = String(member?.name || member?.userName || '').trim().toLowerCase();
        return relationship || name ? `${relationship}:${name}` : '';
    }

    private isParentMember(member: any): boolean {
        const relationship = String(
            member?.relationship || member?.familyRole || member?.memberRole || member?.role || ''
        ).trim().toUpperCase().replace(/[\s-]+/g, '_');
        return ['PARENT', 'CO_PARENT', 'COPARENT', 'CREATOR'].includes(relationship);
    }

    private isCurrentFamilyMember(member: any, status: any, currentUser: any): boolean {
        if (member?.you === true || member?.isCurrentUser === true || member?.currentUser === true) {
            return true;
        }

        const memberId = member?.userId ?? member?.id ?? member?.memberId;
        const currentIds = [
            currentUser?.id,
            currentUser?.userId,
            status?.userId,
            status?.currentUserId,
            status?.data?.userId,
            status?.data?.currentUserId
        ]
            .filter(value => value !== null && value !== undefined && String(value).trim())
            .map(value => String(value));
        if (memberId !== null && memberId !== undefined && currentIds.includes(String(memberId))) {
            return true;
        }

        const memberEmail = String(member?.email || '').trim().toLowerCase();
        const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
        return !!memberEmail && !!currentEmail && memberEmail === currentEmail;
    }

    private extractFamilyCode(status: any): string {
        return String(
            status?.familyCode
            ?? status?.code
            ?? status?.family?.familyCode
            ?? status?.family?.code
            ?? status?.data?.familyCode
            ?? status?.data?.family?.familyCode
            ?? ''
        ).trim().toUpperCase();
    }

    private mapVibeChildren(data: VibesDisplayResponse[] | null | undefined): ChildInfo[] {
        if (!Array.isArray(data)) return [];

        return data
            .filter(item => this.isChildMember(item, true))
            .map(item => {
                const avatarUrl = this.childSelfImage.resolveAvatarForMember(item).url || '';
                return mapVibeToChildInfo(item, avatarUrl);
            });
    }

    private isChildMember(member: any, allowMissingRelationship = false): boolean {
        const relationship = String(member?.relationship || member?.role || '').trim().toUpperCase();
        return relationship === 'CHILD' || (allowMissingRelationship && !relationship);
    }

    private mergeChildStats(familyChildren: ChildInfo[], vibeChildren: ChildInfo[]): ChildInfo[] {
        return familyChildren.map(child => {
            const stats = vibeChildren.find(item => String(item.id) === String(child.id));
            return stats
                ? {
                    ...child,
                    ...stats,
                    // The family endpoint is authoritative for identity data.
                    // Vibe snapshots frequently omit age/DOB and must not erase
                    // them, otherwise Learning can accidentally use parent age.
                    age: child.age ?? stats.age,
                    dateOfBirth: child.dateOfBirth || stats.dateOfBirth,
                    name: stats.name || child.name,
                    avatarUrl: stats.avatarUrl || child.avatarUrl
                }
                : child;
        });
    }

    get selectedChildAge(): number | null {
        const rawAge = this.selectedChild?.age;
        const directAge = rawAge === null || rawAge === undefined || String(rawAge).trim() === ''
            ? Number.NaN
            : Number(rawAge);
        if (Number.isFinite(directAge) && directAge >= 0) return Math.floor(directAge);

        const dateOfBirth = String(this.selectedChild?.dateOfBirth || '').trim();
        if (!dateOfBirth) return null;
        const birthDate = new Date(dateOfBirth);
        if (Number.isNaN(birthDate.getTime())) return null;

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
        return age >= 0 ? age : null;
    }

    /** Use parent display when no children */
    private useParentAsDefault(): void {
        this.parentName = this.currentProfile?.name || this.parentName || 'Parent';
        this.userName = this.parentName;
        this.parentInitial = this.parentName.charAt(0) || 'P';
        const isFemale = (this.currentProfile?.gender || '').toLowerCase() === 'female';
        this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
        this.userAvatarUrl = this.childSelfImage.resolveAvatarFromUser({
            ...(this.currentProfile || {}),
            relationship: 'PARENT'
        }).url || '';
    }

    // Toggle popup
    toggleSwitchPopup(ev?: Event) {
        if (ev) {
            ev.stopPropagation();
        }
        if (!this.hasLinkedChildren) {
            return;
        }
        this.showSwitchPopup = !this.showSwitchPopup;
    }

    closeSwitchPopup() {
        this.showSwitchPopup = false;
    }

    /** Select child via store (atomic update) */
    selectChild(child: ChildInfo): void {
        this.profileStore.select(child);
        this.closeSwitchPopup();
    }

    isSelectedChild(child: ChildInfo): boolean {
        return String(child.id) === String(this.selectedChild?.id);
    }

    onSwitcherChildClick(child: ChildInfo, event: Event): void {
        if (this.isSelectedChild(child)) {
            this.toggleSwitchPopup(event);
            return;
        }
        this.selectChild(child);
    }

    /** Apply child stats to UI */
    private applyChildStats(c: ChildInfo): void {
        // Mood — always reflect the newly selected child; default to
        // neutral instead of leaving the previous child's mood on screen
        // when this child has none recorded yet.
        const moodUpper = String(c.mood || 'NEUTRAL').toUpperCase();
        const assetPath = this.moodAssetMap[moodUpper] || this.moodAssetMap['NEUTRAL'];
        this.selectedMood = 'asset:' + assetPath;

        // Stats — default to 0 rather than falling back to `this.XXX` (the
        // previously selected child's number). Falling back to the old
        // value here was the bug: if this child's cached summary is
        // missing a field, the screen would silently keep showing the
        // last child's stat mislabeled as this child's. loadUserStats()
        // fills in the authoritative values right after this runs.
        this.userCoins = c.coins ?? 0;
        this.userStreaks = c.streak ?? 0;
        this.userDays = c.trophies ?? 0;
        this.userBadges = c.badges ?? 0;
        this.completionRate = c.completionRate ?? 0;
        this.consistencyRate = c.consistencyRate ?? 0;
        this.improvementRate = c.improvementRate ?? 0;
        this.appScore = c.appScore ?? 0;
        this.hasPerformanceData = this.hasWeeklyPerformanceData(c);
        this.activeMetricInfo = null;
        this.userService.saveUserStats({
            coins: this.userCoins,
            streaks: this.userStreaks,
            days: this.userDays,
            badges: this.userBadges
        });
        // Progress
        this.totalHabits = c.totalHabits ?? 0;
        this.completedHabits = c.completedHabits ?? 0;
        this.totalTasks = c.totalTasks ?? 0;
        this.completedTasks = c.completedTasks ?? 0;
        this.progressPercentage = c.progressPercentage ?? 0;
        // Vibe fields
        this.vibeTitle = c.vibeTitle ?? '';
        this.vibeDescription = c.vibeDescription ?? '';
        this.emptyStateDescription = c.emptyStateDescription ?? '';
        this.completedStateDescription = c.completedStateDescription ?? '';
        // Build a complete vibe object from child data and pass directly to
        // mood-selector so it never has to guess which child to pick from the array
        this.selectedChildVibe = {
            userId: Number(c.id) || 0,
            userName: c.name || '',
            relationship: c.relationship || 'Child',
            mood: c.mood || 'NEUTRAL',
            audience: 'PARENT',
            title: c.vibeTitle || '',
            description: c.vibeDescription || '',
            emptyStateDescription: c.emptyStateDescription || '',
            completedStateDescription: c.completedStateDescription || '',
            totalHabits: c.totalHabits ?? 0,
            completedHabits: c.completedHabits ?? 0,
            totalTasks: c.totalTasks ?? 0,
            completedTasks: c.completedTasks ?? 0,
            progressPercentage: c.progressPercentage ?? 0,
            coins: c.coins ?? 0,
            trophies: c.trophies ?? 0,
            streak: c.streak ?? 0,
            badges: c.badges ?? 0,
            completionRate: c.completionRate ?? 0,
            consistencyRate: c.consistencyRate ?? 0,
            improvementRate: c.improvementRate ?? 0,
            appScore: c.appScore ?? 0,
        };
        this.statsUpdatedAt = new Date();
    }

    private loadMoodBalance(): void {
        const requestId = ++this.moodBalanceRequestId;
        const selectedChildId = this.selectedChild?.id;
        if (selectedChildId === null || selectedChildId === undefined) {
            this.moodBalanceLoading = false;
            this.moodBalance = this.createEmptyMoodBalance();
            return;
        }

        this.moodBalanceLoading = true;
        const now = new Date();
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        forkJoin([
            this.moodService.getMoodTransitionsMonthly(
                now.getFullYear(),
                now.getMonth() + 1,
                selectedChildId
            )
                .pipe(catchError(() => of([] as MoodTransition[]))),
            this.moodService.getMoodTransitionsMonthly(
                previousMonth.getFullYear(),
                previousMonth.getMonth() + 1,
                selectedChildId
            ).pipe(catchError(() => of([] as MoodTransition[])))
        ])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([current, previous]) => {
                if (requestId !== this.moodBalanceRequestId) return;
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setHours(0, 0, 0, 0);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

                const transitions = [...previous, ...current].filter(item => {
                    // Some backend versions return all family members even
                    // when forUserId is supplied. Keep only the requested
                    // child's records in that case.
                    if (item.userId !== null && item.userId !== undefined
                        && String(item.userId) !== String(selectedChildId)) {
                        return false;
                    }
                    const date = new Date(`${item.date}T00:00:00`);
                    return Number.isFinite(date.getTime()) && date >= sevenDaysAgo && date <= now;
                });

                this.moodBalance = this.calculateMoodBalance(transitions);
                this.moodBalanceLoading = false;
            });
    }

    private calculateMoodBalance(transitions: MoodTransition[]): MoodBalanceSegment[] {
        const counts: Record<MoodBalanceKey, number> = {
            good: 0,
            okay: 0,
            tough: 0,
            hard: 0
        };

        transitions.forEach(item => {
            counts[this.mapMoodBalanceKey(item.toMood || item.fromMood)] += 1;
        });

        let total = Object.values(counts).reduce((sum, value) => sum + value, 0);
        if (total === 0 && this.selectedChild?.mood) {
            counts[this.mapMoodBalanceKey(this.selectedChild.mood)] = 1;
            total = 1;
        }

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

    /** Load user stats from API */
    private loadUserStats(): void {
        const selectedChildId = this.selectedChild?.id;
        const requestId = ++this.performanceRequestId;
        if (selectedChildId === null || selectedChildId === undefined) {
            this.performanceLoading = false;
            return;
        }

        // Coins/streak/trophies/badges still come from the vibes-display endpoint.
        this.moodService.getVibesDisplay(selectedChildId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (data) => {
                // A slower response for the previously selected child must
                // never overwrite the analytics for the current child.
                if (requestId !== this.performanceRequestId
                    || String(this.selectedChild?.id) !== String(selectedChildId)) {
                    return;
                }

                const d = data?.find(item => String(item.userId) === String(selectedChildId));
                if (d) {
                    this.userCoins = d.coins || 0;
                    this.userStreaks = d.streak || 0;
                    this.userDays = d.trophies || 0;
                    this.userBadges = d.badges || 0;
                    this.userService.saveUserStats({
                        coins: this.userCoins,
                        streaks: this.userStreaks,
                        days: this.userDays,
                        badges: this.userBadges
                    });
                }
            },
            error: () => { /* header stats keep their last known values on failure */ }
        });

        this.loadParentHomeAnalytics(selectedChildId, requestId);
    }

    /** "This Week's Performance" card — GET /analytics/parent-home?childId={id} */
    private loadParentHomeAnalytics(selectedChildId: string | number, requestId: number): void {
        this.performanceLoading = true;
        this.parentAnalyticsService.getParentHomeAnalytics(selectedChildId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (data: ParentAnalyticsResponseDto) => {
                if (requestId !== this.performanceRequestId
                    || String(this.selectedChild?.id) !== String(selectedChildId)) {
                    return;
                }

                this.completionRate = Math.round(data.completionRate || 0);
                this.consistencyRate = Math.round(data.consistencyRate || 0);
                this.improvementRate = Math.round(data.improvementRate || 0);
                this.appScore = Math.round(data.appScore || 0);
                this.completionRateColor = data.completionRateColor || 'red';
                this.consistencyRateColor = data.consistencyRateColor || 'red';
                this.improvementRateColor = data.improvementRateColor || 'red';
                this.appScoreColor = data.appScoreColor || 'red';
                this.appScoreLabel = data.appScoreLabel || 'Needs attention';
                this.totalCompletedActivities = data.totalCompletedActivities || 0;
                this.totalScheduledActivities = data.totalScheduledActivities || 0;
                this.activeDaysThisWeek = data.activeDaysThisWeek || 0;
                this.daysInWeek = data.daysInWeek || 7;
                this.isFirstWeek = !!data.isFirstWeek;
                this.hasPerformanceData = !this.isFirstWeek;
                this.statsUpdatedAt = new Date();
                this.performanceLoading = false;
            },
            error: () => {
                if (requestId !== this.performanceRequestId) return;
                this.hasPerformanceData = false;
                this.performanceLoading = false;
            }
        });
    }

    private hasWeeklyPerformanceData(stats: Partial<VibesDisplayResponse | ChildInfo>): boolean {
        const numericFields = [
            stats.totalHabits,
            stats.completedHabits,
            stats.totalTasks,
            stats.completedTasks,
            stats.completionRate,
            stats.consistencyRate,
            stats.improvementRate,
            stats.appScore
        ];
        return numericFields.some(value => Number(value || 0) !== 0);
    }

    openActivityInput(): void {
        this.router.navigate(['/authed/activity-input']);
    }

    openFamilyConnection(): void {
        this.router.navigate(['/authed/family-connection']);
    }

    openNotifications(): void {
        this.router.navigate(['/authed/notifications']);
    }

    openCoinPage(): void {
        this.router.navigate(['/authed/coin']);
    }

    /**
     * Opens the native iOS/Android share sheet with the current family's
     * invitation details. Web keeps a graceful share/copy fallback.
     */
    async shareFamilyCodeWithCoParent(): Promise<void> {
        const session = this.authService.getUserData();
        const familyCode = (
            this.familyCode
            || this.extractFamilyCode(session?.user)
            || this.extractFamilyCode(session)
        ).trim().toUpperCase();

        if (!familyCode) {
            this.toastService.error('Family code is not available yet. Please try again.');
            return;
        }

        this.familyCode = familyCode;
        const publicWebUrl = String(environment.publicWebUrl || 'https://supermeapp.com').replace(/\/+$/, '');
        const inviteParams = new URLSearchParams({
            role: 'parent',
            mode: 'join',
            scannedCode: familyCode
        });
        const inviteLink = `${publicWebUrl}/join-family2?${inviteParams.toString()}`;
        const configuredStoreUrl = this.platform.is('ios')
            ? environment.firebase.remoteConfig.defaults.ios_store_url
            : environment.firebase.remoteConfig.defaults.android_store_url;
        const downloadLink = String(configuredStoreUrl || publicWebUrl).trim();
        const text = [
            'Hi! 👋',
            '',
            "Join our SuperMe Family so we can work together to support our child's growth, learning, habits and daily achievements.",
            '',
            `Family Invite Code: ${familyCode}`,
            `Join here: ${inviteLink}`,
            '',
            "Once you join, you'll be able to:",
            '✨ Track progress and milestones',
            '🏆 Celebrate streaks and achievements',
            '📚 Assign learning activities and quizzes',
            '💜 Stay connected and support our child together',
            '',
            `Download Link: ${downloadLink}`
        ].join('\n');

        try {
            const canShare = await Share.canShare();
            if (canShare.value) {
                await Share.share({
                    title: 'Join our SuperMe Family',
                    text,
                    dialogTitle: 'Share family code with co-parent'
                });
                return;
            }
        } catch (error) {
            if (this.isShareCancellation(error)) return;
            console.warn('[ParentAccount] Native family share unavailable:', error);
        }

        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: 'Join our SuperMe Family', text });
                return;
            } catch (error) {
                if (this.isShareCancellation(error)) return;
            }
        }

        try {
            await Clipboard.write({ string: text });
            this.toastService.success('Family invite copied. You can share it with your co-parent.');
        } catch (error) {
            console.warn('[ParentAccount] Unable to copy family invitation:', error);
            this.toastService.error('Unable to share the family invite. Please try again.');
        }
    }

    private isShareCancellation(error: unknown): boolean {
        const message = String((error as any)?.message || error || '').toLowerCase();
        return message.includes('cancel') || message.includes('dismiss') || message.includes('abort');
    }

    openInsights(): void {
        this.router.navigate(['/authed/analytics']);
    }

    openAddChild(): void {
        if (!this.familyCode) {
            this.openFamilyConnection();
            return;
        }

        // The child must begin with an empty registration form. A Parent's
        // previous onboarding draft can include their email, name, avatar and
        // other personal data; SignupComponent restores that draft on init
        // unless we clear it before entering the managed-child flow.
        this.clearParentSignupDraftForChild();

        try {
            // Add Child from Parent Home returns directly to this screen; only
            // the initial onboarding CTA defers the Parent welcome screen.
            sessionStorage.removeItem('managed_child_parent_welcome_pending');
            sessionStorage.setItem('managed_child_signup', 'true');
            sessionStorage.setItem('managed_child_family_code', this.familyCode);
            sessionStorage.setItem('signup_role', 'child');
            sessionStorage.setItem('familyCode', this.familyCode);
        } catch (error) {
            console.warn('[ParentAccount] Unable to prepare the child signup flow', error);
        }

        this.router.navigate(['/home/sign-up'], {
            queryParams: { step: 0.1, role: 'child', managedChild: true }
        });
    }

    private clearParentSignupDraftForChild(): void {
        try {
            localStorage.removeItem(REGISTRATION_ONBOARDING_STATE_KEY);
            [
                'signup_profile',
                'signup_role',
                'signup_avatar',
                'signup_pet',
                'requestedIdentifier',
                'loginMode',
                'countryCode',
                'referralCode',
                'referralCodeLocked',
                'signup_via_oauth',
                'signup_via_google',
                'oauth_signup_provider',
                'google_signup_email',
                'google_signup_name',
                'google_signup_avatar',
                'google_signup_provider_id'
            ].forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            console.warn('[ParentAccount] Unable to clear Parent signup draft before adding a child', error);
        }
    }

    openMessageComposer(template?: 'celebrate' | 'encourage'): void {
        if (this.messageComposerCloseTimer) clearTimeout(this.messageComposerCloseTimer);

        this.messageComposerTrigger = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : undefined;
        this.activeMessageTemplate = template;
        this.messageDraft = this.getMessageTemplate(template).slice(0, this.messageMaxLength);
        this.messageComposerClosing = false;
        this.showMessageComposer = true;
        document.body.style.overflow = 'hidden';

        setTimeout(() => this.messageInput?.nativeElement.focus(), 280);
    }

    onMessageInput(event: Event): void {
        const value = (event.target as HTMLTextAreaElement).value || '';
        this.messageDraft = value.slice(0, this.messageMaxLength);
    }

    closeMessageComposer(): void {
        this.dismissMessageComposer();
    }

    sendMessageNow(): void {
        const message = this.messageDraft.trim();
        if (!message) {
            this.messageInput?.nativeElement.focus();
            return;
        }

        // Guard against duplicate taps while a send is already in flight.
        if (this.isSendingMessage) return;

        this.isSendingMessage = true;
        this.sendMessageToChild(this.selectedChild?.id ?? null, message).subscribe({
            next: () => {
                this.isSendingMessage = false;
                this.toastService.success('Message sent successfully.');
                // The modal lives on the home screen itself, so closing it
                // naturally leaves the user right where they were.
                this.dismissMessageComposer();
            },
            error: () => {
                this.isSendingMessage = false;
                this.toastService.error('Unable to send message. Please try again.');
            }
        });
    }

    /**
     * TODO: no backend endpoint for "send a message to my child" exists yet.
     * This is a placeholder so the toast/duplicate-tap UX can be built and
     * verified now — swap the body for the real HTTP call once the API is
     * available, keeping the same success/error contract.
     */
    private sendMessageToChild(childId: string | number | null, message: string): Observable<{ success: boolean }> {
        return of({ success: true }).pipe(delay(400));
    }

    @HostListener('document:keydown.escape')
    onMessageComposerEscape(): void {
        if (this.showMessageComposer) this.closeMessageComposer();
    }

    private dismissMessageComposer(afterClose?: () => void): void {
        if (!this.showMessageComposer || this.messageComposerClosing) return;

        this.messageComposerClosing = true;
        this.messageComposerCloseTimer = setTimeout(() => {
            this.showMessageComposer = false;
            this.messageComposerClosing = false;
            this.messageDraft = '';
            this.activeMessageTemplate = undefined;
            document.body.style.overflow = '';

            if (afterClose) {
                afterClose();
            } else {
                this.messageComposerTrigger?.focus();
            }
            this.messageComposerTrigger = undefined;
        }, 220);
    }

    private getMessageTemplate(template?: 'celebrate' | 'encourage'): string {
        if (template === 'celebrate') {
            return `I'm proud of your progress today, ${this.selectedChildName}!`;
        }
        if (template === 'encourage') {
            return `Keep going, ${this.selectedChildName}. You've got this!`;
        }
        return '';
    }

    /**
     * Called by the global RefreshService when the user pulls to refresh.
     * Session validation is already handled by the authenticated shell.
     */
    private async onGlobalRefresh(): Promise<void> {
        await Promise.all([
            this.loadChildren(),
            firstValueFrom(
                this.authService.refreshUserData().pipe(catchError(() => of(false)))
            )
        ]);
        this.applyAuthenticatedParent(this.authService.getUserData());
        this.loadUserStats();
        this.activityCard?.refresh();
    }

    protected readonly console = console;
}
