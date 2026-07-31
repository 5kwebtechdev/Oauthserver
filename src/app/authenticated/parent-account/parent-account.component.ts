import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Platform, ViewWillEnter } from '@ionic/angular';
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of, Subject, takeUntil } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { IonicModule } from "@ionic/angular";
import { MoodService } from '../../core/services/mood.service';
import { MoodTransition, VibesDisplayResponse } from '../../core/models/mood.model';
import { FooterComponent } from '../../core/components/footer/footer.component';
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
        ActivityCardComponent,
        LearningSectionComponent,
        AcademySectionComponent,
        TutorCardComponent,
    ],
    providers: [RefreshService]
})
export class ParentAccountComponent implements OnInit, OnDestroy, ViewWillEnter {
    private readonly destroy$ = new Subject<void>();
    private childrenRequestId = 0;
    private moodBalanceRequestId = 0;
    
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

    public userAvatarUrl: string = '';
    public parentAvatarStyle: { [k: string]: string } = {};
    public parentInitial: string = 'U';
    public currentProfile: any = null;
    public statsUpdatedAt = new Date();
    public moodBalanceLoading = false;
    public moodBalance: MoodBalanceSegment[] = this.createEmptyMoodBalance();
    
    // Stats
    public completionRate: number = 0;
    public consistencyRate: number = 0;
    public improvementRate: number = 0;
    public appScore: number = 0;
    public Math = Math;

    /** Passed directly to mood-selector so it shows the correct child's vibe without ID matching */
    public selectedChildVibe: VibesDisplayResponse | null = null;

    dismissFamilyAck(): void {
        this.showFamilyAck = false;
    }

    private clampPercentage(value: number): number {
        if (!Number.isFinite(Number(value))) return 0;
        return Math.min(100, Math.max(0, Math.round(Number(value))));
    }

    private buildMetric(label: string, value: number, displayValue: string): ParentMetric {
        const normalizedValue = this.clampPercentage(value);
        const isNegativeImprovement = label === 'Improvement Rate' && this.improvementRate < 0;
        return {
            label,
            value: normalizedValue,
            displayValue,
            color: this.getMetricColor(
                isNegativeImprovement ? -1 : normalizedValue
            ),
            status: isNegativeImprovement
                ? 'Needs Improvement'
                : normalizedValue >= 80
                ? 'Great progress !'
                : normalizedValue >= 60
                    ? 'Attention Needed'
                    : 'Needs Improvement'
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
            { key: 'good', label: 'Good', value: 0, color: '#4CAF50' },
            { key: 'okay', label: 'Okay', value: 0, color: '#F0AD4E' },
            { key: 'tough', label: 'Tough', value: 0, color: '#EE6621' },
            { key: 'hard', label: 'Hard', value: 0, color: '#BB2124' }
        ];
    }

    /** PRD color logic: Red 0-59, Yellow 60-79, Green 80-100 */
    getMetricColor(value: number): string {
        if (value >= 80) return '#4CAF50';   // green
        if (value >= 60) return '#F0AD4E';   // yellow
        return '#E74C3C';                     // red
    }

    /** App Score: 0-59 red, 60-79 yellow, 80-100 green */
    get completionRateColor(): string { return this.getMetricColor(this.completionRate); }
    get consistencyRateColor(): string { return this.getMetricColor(this.consistencyRate); }
    get appScoreColor(): string { return this.getMetricColor(this.appScore); }

    /** Improvement Rate: use absolute value for color scale (negative is always red) */
    get improvementRateColor(): string {
        if (this.improvementRate < 0) return '#E74C3C';
        return this.getMetricColor(this.improvementRate);
    }

    /** Badge label for metric value */
    getMetricBadge(value: number): string {
        if (value >= 80) return 'Excellent!';
        if (value >= 60) return 'Doing okay';
        return 'Needs attention';
    }
    get appScoreBadge(): string { return this.getMetricBadge(this.appScore); }
    
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
    public familyCapacity = 4;
    private linkedFamilyMemberCount = 1;

    get selectedChildName(): string {
        return this.selectedChild?.name || 'your child';
    }

    get availableFamilySlots(): number {
        return Math.max(0, this.familyCapacity - this.linkedFamilyMemberCount);
    }

    get showInviteCoParentAction(): boolean {
        return !this.coParent && this.availableFamilySlots > 0;
    }

    get showAddChildAction(): boolean {
        if (this.availableFamilySlots <= 0) return false;

        // With one slot left, reserve it for a missing co-parent. When a
        // co-parent already exists, that slot can be used for another child.
        return !!this.coParent || this.availableFamilySlots >= 2;
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
        const name = this.selectedChildName;
        if (this.appScore >= 80) {
            return `${name} is showing strong and consistent progress this week.`;
        }
        if (this.appScore >= 60) {
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
                'assets/figma/parent-home/foundation-habit.png'
            ),
            this.buildFoundation(
                'TASK MANAGEMENT',
                taskRate,
                'task',
                'assets/figma/parent-home/foundation-task.png'
            ),
            this.buildFoundation(
                'TIME MANAGEMENT',
                this.consistencyRate,
                'time',
                'assets/figma/parent-home/foundation-time.png'
            ),
            this.buildFoundation(
                'LEARNING',
                this.appScore,
                'learning',
                'assets/figma/parent-home/foundation-learning.png'
            )
        ];
    }

    get hasLinkedChildren(): boolean {
        return this.children.length > 0;
    }

    get showLinkChildPrompt(): boolean {
        return this.childrenLoadState === 'loaded' && !this.hasLinkedChildren;
    }

    get showChildrenLoading(): boolean {
        return this.childrenLoadState === 'loading' && !this.hasLinkedChildren;
    }

    get showChildrenLoadError(): boolean {
        return this.childrenLoadState === 'error' && !this.hasLinkedChildren;
    }

    @ViewChild(ActivityCardComponent) activityCard?: ActivityCardComponent;
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
        private platform: Platform
    ) { }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    ngOnDestroy(): void {
        this.refreshService.unregisterRefreshHandler('ParentAccount');
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnInit(): void {
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
        const authenticatedParent = authenticatedSession?.user ?? authenticatedSession;
        if (authenticatedParent) {
            this.parentName = authenticatedParent.name || this.parentName;
            this.userName = this.parentName;
            this.parentCoins = Number(
                authenticatedParent.coins
                ?? authenticatedParent.totalCoins
                ?? authenticatedParent.wallet?.coins
                ?? 0
            ) || 0;
            this.parentInitial = this.parentName.charAt(0) || 'P';
            this.parentAvatarStyle = this.parentImageService.getAvatarStyle(
                this.parentInitial,
                String(authenticatedParent.gender || '').toLowerCase() === 'female',
                54
            );
            this.userAvatarUrl = authenticatedParent.avatarUrl
                || authenticatedParent.avatar?.url
                || this.userService.getUserAvatarUrl()
                || '';
        }
        this.applyFamilySwitcherMetadata(authenticatedSession);

        // Check for family connected acknowledgment
        try {
            const ack = sessionStorage.getItem('family_connected_ack');
            if (ack) {
                sessionStorage.removeItem('family_connected_ack');
                this.familyAckRole = ack;
                this.showFamilyAck = true;
            }
        } catch {}

        // Subscribe to parent profile
        this.userService.getUserProfile$().pipe(takeUntil(this.destroy$)).subscribe(profile => {
            if (profile) {
                this.currentProfile = profile;
                this.parentName = profile.name || 'Parent';
                this.userName = this.parentName;
                const profileWithStats = profile as any;
                this.parentCoins = Number(
                    profileWithStats.coins ?? profileWithStats.totalCoins ?? this.parentCoins
                ) || 0;
                this.userAvatarUrl = this.userService.getUserAvatarUrl();
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

        // Subscribe to selected child changes. selectionChanged$ (not
        // selectedChild$) skips duplicate emissions, so re-tapping the
        // already-selected child never re-triggers mood/activity API calls.
        this.profileStore.selectionChanged$.pipe(takeUntil(this.destroy$)).subscribe(child => {
            this.selectedChild = child;
            if (child) {
                this.applyChildStats(child);
                this.loadMoodBalance();
            } else {
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
        await this.loadChildren();
        this.activityCard?.refresh();
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
            const children = familyChildren.length
                ? this.mergeChildStats(familyChildren, vibeChildren)
                : explicitlyNoFamily
                    ? []
                    : vibeChildren;

            this.profileStore.setChildren(children);
            this.childrenLoadState = 'loaded';
            this.statsUpdatedAt = new Date();
            return;
        }

        if (!result.vibes.failed && vibeChildren.length) {
            this.profileStore.setChildren(vibeChildren);
            this.childrenLoadState = 'loaded';
            this.statsUpdatedAt = new Date();
            return;
        }

        // Preserve any previously loaded children during a temporary network failure.
        this.childrenLoadState = 'error';
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

        const capacityCandidates = [
            status?.maxMembers,
            status?.maxFamilyMembers,
            status?.memberLimit,
            status?.family?.maxMembers,
            status?.family?.maxFamilyMembers,
            status?.family?.memberLimit,
            status?.data?.maxMembers,
            status?.data?.family?.maxMembers
        ];
        const reportedCapacity = capacityCandidates
            .map(value => Number(value))
            .find(value => Number.isFinite(value) && value > 0);
        this.familyCapacity = reportedCapacity || 4;

        const childCount = members.filter(member => this.isChildMember(member)).length;
        const inferredCount = Math.max(members.length, childCount + 1 + (this.coParent ? 1 : 0));
        const countCandidates = [
            status?.memberCount,
            status?.totalMembers,
            status?.family?.memberCount,
            status?.family?.totalMembers,
            status?.data?.memberCount,
            status?.data?.family?.memberCount
        ];
        const reportedCount = countCandidates
            .map(value => Number(value))
            .find(value => Number.isFinite(value) && value > 0);
        this.linkedFamilyMemberCount = Math.max(1, inferredCount, reportedCount || 0);
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
                ? { ...child, ...stats, name: stats.name || child.name, avatarUrl: stats.avatarUrl || child.avatarUrl }
                : child;
        });
    }

    /** Use parent display when no children */
    private useParentAsDefault(): void {
        this.parentName = this.currentProfile?.name || this.parentName || 'Parent';
        this.userName = this.parentName;
        this.parentInitial = this.parentName.charAt(0) || 'P';
        const isFemale = (this.currentProfile?.gender || '').toLowerCase() === 'female';
        this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
        this.userAvatarUrl = this.userService.getUserAvatarUrl() || '';
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
        // Mood
        if (c.mood) {
            const moodUpper = String(c.mood).toUpperCase();
            const assetPath = this.moodAssetMap[moodUpper] || this.moodAssetMap['NEUTRAL'];
            this.selectedMood = 'asset:' + assetPath;
        }
        // Stats
        this.userCoins = c.coins ?? this.userCoins;
        this.userStreaks = c.streak ?? this.userStreaks;
        this.userDays = c.trophies ?? this.userDays;
        this.userBadges = c.badges ?? this.userBadges;
        this.completionRate = c.completionRate ?? this.completionRate;
        this.consistencyRate = c.consistencyRate ?? this.consistencyRate;
        this.improvementRate = c.improvementRate ?? this.improvementRate;
        this.appScore = c.appScore ?? this.appScore;
        this.userService.saveUserStats({
            coins: this.userCoins,
            streaks: this.userStreaks,
            days: this.userDays,
            badges: this.userBadges
        });
        // Progress
        this.totalHabits = c.totalHabits ?? this.totalHabits;
        this.completedHabits = c.completedHabits ?? this.completedHabits;
        this.totalTasks = c.totalTasks ?? this.totalTasks;
        this.completedTasks = c.completedTasks ?? this.completedTasks;
        this.progressPercentage = c.progressPercentage ?? this.progressPercentage;
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
            this.moodBalance = this.createEmptyMoodBalance();
            return;
        }

        this.moodBalanceLoading = true;
        const now = new Date();
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        forkJoin([
            this.moodService.getMoodTransitionsMonthly(now.getFullYear(), now.getMonth() + 1)
                .pipe(catchError(() => of([] as MoodTransition[]))),
            this.moodService.getMoodTransitionsMonthly(
                previousMonth.getFullYear(),
                previousMonth.getMonth() + 1
            ).pipe(catchError(() => of([] as MoodTransition[])))
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
        this.moodService.getVibesDisplay().pipe(takeUntil(this.destroy$)).subscribe({
            next: (data) => {
                if (data?.length) {
                    const selectedId = this.selectedChild?.id;
                    const d = data.find(item => String(item.userId) === String(selectedId)) || data[0];
                    this.userCoins = d.coins || 0;
                    this.userStreaks = d.streak || 0;
                    this.userDays = d.trophies || 0;
                    this.userBadges = d.badges || 0;
                    this.completionRate = Math.round(d.completionRate || 0);
                    this.consistencyRate = Math.round(d.consistencyRate || 0);
                    this.improvementRate = Math.round(d.improvementRate || 0);
                    this.appScore = Math.round(d.appScore || 0);
                    this.userService.saveUserStats({
                        coins: this.userCoins,
                        streaks: this.userStreaks,
                        days: this.userDays,
                        badges: this.userBadges
                    });
                    this.statsUpdatedAt = new Date();
                }
            }
        });
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

    openInsights(): void {
        this.router.navigate(['/authed/analytics']);
    }

    openAddChild(): void {
        if (!this.familyCode) {
            this.openFamilyConnection();
            return;
        }

        try {
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

    inviteCoParent(): void {
        this.router.navigate(['/authed/family-connection'], {
            queryParams: { invite: 'parent' }
        });
    }

    openMessageComposer(template?: 'celebrate' | 'encourage'): void {
        this.router.navigate(['/authed/notes/new'], {
            queryParams: {
                childId: this.selectedChild?.id ?? '',
                childName: this.selectedChildName,
                ...(template ? { template } : {})
            }
        });
    }

    /**
     * Called by the global RefreshService when the user pulls to refresh.
     * Session validation is already handled by the authenticated shell.
     */
    private async onGlobalRefresh(): Promise<void> {
        const userData = this.authService.getUserData();
        if (userData) {
            this.parentName = userData.name || this.parentName;
            this.userName = this.parentName;
            this.parentInitial = userData.name?.charAt(0) || this.parentInitial;
            const isFemale = (userData.gender || '').toLowerCase() === 'female';
            this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
        }
        await this.loadChildren();
        this.loadUserStats();
        this.activityCard?.refresh();
    }

    protected readonly console = console;
}
