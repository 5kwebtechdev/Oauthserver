import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Platform, ViewWillEnter } from '@ionic/angular';
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of, Subject, takeUntil } from 'rxjs';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { UserService } from '../../core/services/user.service';
import { IonicModule } from "@ionic/angular";
import { SupermeInputsModule } from "../../core/components/superme-inputs/superme-inputs.module";
import { MoodSelectorComponent } from '../../core/components/mood-selector/mood-selector.component';
import { MoodService } from '../../core/services/mood.service';
import { VibesDisplayResponse } from '../../core/models/mood.model';
import { FooterComponent } from '../../core/components/footer/footer.component';
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { ActivityPageContentComponent } from '../../core/components/activity-section/activity-page-content/activity-page-content.component';
import { HabitService } from '../../core/components/activity-section/habit.service';
import { AuthService } from '../../core/services/auth.service';
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { ParentImageService } from '../../core/services/parent-image.service';
import { ProfileStoreService } from '../../core/services/profile-store.service';
import { ChildInfo, mapVibeToChildInfo } from '../../core/models/child-info.model';
import { RefreshService } from '../../core/services/refresh.service';
import { SupermeButtonComponent } from '../../core/components/superme-button/superme-button.component';
import { FamilyService } from '../../core/services/family.service';
import { PetAgeService } from '../../core/services/pet-age.service';


@Component({
    selector: 'app-parent-account',
    templateUrl: './parent-account.component.html',
    styleUrls: ['./parent-account.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        IonicModule,
        SupermeInputsModule,
        MoodSelectorComponent,
        AdBannerComponent,
        FooterComponent,
        ActivityPageContentComponent,
        SupermeButtonComponent,

    ],
    providers: [RefreshService]
})
export class ParentAccountComponent implements OnInit, OnDestroy, ViewWillEnter {
    private readonly destroy$ = new Subject<void>();
    private childrenRequestId = 0;
    
    public userName: string = 'User';
    public userCoins: number = 0;
    public userStreaks: number = 0;
    public userDays: number = 0;
    public userBadges: number = 0;
    public selectedMood: string | null = 'happy';
    public showFamilyAck = false;
    public familyAckRole = '';

    public userAvatarUrl: string = 'assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
    public parentAvatarStyle: { [k: string]: string } = {};
    public parentInitial: string = 'U';
    public currentProfile: any = null;
    
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

    @ViewChild('moodSel') moodSelector?: MoodSelectorComponent;
    @ViewChild(ActivityPageContentComponent) habitPageContent?: ActivityPageContentComponent;
    constructor(
        private router: Router,
        private userService: UserService,
        private moodService: MoodService,
        private habitService: HabitService,
        private profileStore: ProfileStoreService,
        private authService: AuthService,
        private petAgeService: PetAgeService,
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
                this.userName = profile.name || 'User';
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

        // Subscribe to selected child changes
        this.profileStore.selectedChild$.pipe(takeUntil(this.destroy$)).subscribe(child => {
            this.selectedChild = child;
            if (child) {
                this.applyChildStats(child);
            } else {
                this.useParentAsDefault();
            }
        });

        // Reload stats when habits/tasks change
        this.habitService.dataChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.loadUserStats();
        });

        // Load cached stats first
        const stats = this.userService.getUserStats();
        if (stats) {
            this.userCoins = stats.coins || 0;
            this.userStreaks = stats.streaks || 0;
            this.userDays = stats.days || 0;
            this.userBadges = stats.badges || 0;
        }

    }

    async ionViewWillEnter(): Promise<void> {
        // Fires on initial load AND every time this screen becomes active (return from navigation).
        await this.loadChildren();
        // Refresh habits/tasks in the child component (Ionic hooks don't propagate to child components)
        this.habitPageContent?.refresh();
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
            const explicitlyNoFamily = result.family.data?.hasFamily === false;
            const children = familyChildren.length
                ? this.mergeChildStats(familyChildren, vibeChildren)
                : explicitlyNoFamily
                    ? []
                    : vibeChildren;

            this.profileStore.setChildren(children);
            this.childrenLoadState = 'loaded';
            return;
        }

        if (!result.vibes.failed && vibeChildren.length) {
            this.profileStore.setChildren(vibeChildren);
            this.childrenLoadState = 'loaded';
            return;
        }

        // Preserve any previously loaded children during a temporary network failure.
        this.childrenLoadState = 'error';
    }

    private mapFamilyChildren(status: any): ChildInfo[] {
        const members = Array.isArray(status?.members)
            ? status.members
            : Array.isArray(status?.family?.members)
                ? status.family.members
                : [];

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
        this.userName = this.currentProfile?.name || 'User';
        this.parentInitial = this.userName.charAt(0) || 'U';
        const isFemale = (this.currentProfile?.gender || '').toLowerCase() === 'female';
        this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
        this.userAvatarUrl = '';
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
        // Debug log
        console.log('[ParentAccount] toggleSwitchPopup', {
            selectedChild: this.selectedChild,
            selectedChildId: this.selectedChild?.id,
            children: this.children.map(c => ({ id: c.id, name: c.name }))
        });
    }

    closeSwitchPopup() {
        this.showSwitchPopup = false;
    }

    /** Select child via store (atomic update) */
    selectChild(child: ChildInfo): void {
        console.log('[ParentAccount] selectChild called', { childId: child.id, childName: child.name });
        this.profileStore.select(child);
        this.closeSwitchPopup();
    }

    /** Apply child stats to UI */
    private applyChildStats(c: ChildInfo): void {
        this.userName = c.name || this.userName;
        this.userAvatarUrl = c.avatarUrl || '';
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
    }

    /** Load user stats from API */
    private loadUserStats(): void {
        this.moodService.getVibesDisplay().pipe(takeUntil(this.destroy$)).subscribe({
            next: (data) => {
                if (data?.length) {
                    const d = data[0];
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
                }
            }
        });
    }

    get greetingMessage(): string {
        const name = this.userName || 'there';
        const petName = this.petAgeService.getCurrentPetDisplayName();
        return `Hey ${name}, ${petName} is here! \n\n🌟 You've got 5 tasks, 2 habits, and a challenge waiting for you today. Let’s go!`;
    }

    onMoodChange(mood: string) {
        this.selectedMood = mood;
        console.log('mood changed to', mood);
    }

    openCalendar() {
        this.router.navigateByUrl('/authed/activity-calendar');
    }

    openActivityInput(): void {
        this.router.navigate(['/authed/activity-input']);
    }

    openFamilyConnection(): void {
        this.router.navigate(['/authed/family-connection']);
    }

    /**
     * Called by the global RefreshService when the user pulls to refresh.
     * Session validation is already handled by the authenticated shell.
     */
    private async onGlobalRefresh(): Promise<void> {
        const userData = this.authService.getUserData();
        if (userData) {
            this.userName = userData.name || this.userName;
            this.parentInitial = userData.name?.charAt(0) || this.parentInitial;
            const isFemale = (userData.gender || '').toLowerCase() === 'female';
            this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
        }
        await this.loadChildren();
        this.loadUserStats();
        await this.habitPageContent?.refresh();
    }

    protected readonly console = console;
}
