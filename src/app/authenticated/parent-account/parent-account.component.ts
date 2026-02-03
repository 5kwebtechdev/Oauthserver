import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController, RefresherCustomEvent } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { UserService } from '../../core/services/user.service';
import { IonicModule } from "@ionic/angular";
import { MindfulInputsModule } from "../../core/components/mindful-inputs/mindful-inputs.module";
import { MoodSelectorComponent } from '../../core/components/mood-selector/mood-selector.component';
import { MoodService } from '../../core/services/mood.service';
import { FooterComponent } from '../../core/components/footer/footer.component';
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { ActivityPageContentComponent } from '../../core/components/activity-section/activity-page-content/activity-page-content.component';
import { HabitService } from '../../core/components/activity-section/habit.service';
import { AuthService } from '../../core/services/auth.service';
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { ParentImageService } from '../../core/services/parent-image.service';
import { ProfileStoreService } from '../../core/services/profile-store.service';
import { ChildInfo, mapVibeToChildInfo } from '../../core/models/child-info.model';


@Component({
    selector: 'app-parent-account',
    templateUrl: './parent-account.component.html',
    styleUrls: ['./parent-account.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        IonicModule,
        MindfulInputsModule,
        MoodSelectorComponent,
        AdBannerComponent,
        FooterComponent,
        ActivityPageContentComponent,

    ]
})
export class ParentAccountComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    
    public userName: string = 'User';
    public userCoins: number = 0;
    public userStreaks: number = 0;
    public userDays: number = 0;
    public userBadges: number = 0;
    public selectedMood: string | null = 'happy';

    public userAvatarUrl: string = '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
    public parentAvatarStyle: { [k: string]: string } = {};
    public parentInitial: string = 'U';
    public currentProfile: any = null;
    
    // Stats
    public completionRate: number = 0;
    public consistencyRate: number = 0;
    public improvementRate: number = 0;
    public appScore: number = 0;
    public Math = Math;
    
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
        'HAPPY': '/assets/Images-Transparent/Image-Mood-Happy.png',
        'VERY HAPPY': '/assets/Images-Transparent/Image-Mood-Very happy.png',
        'EXCITED': '/assets/Images-Transparent/Image-Mood-Excited.png',
        'SAD': '/assets/Images-Transparent/Image-Mood-Sad.png',
        'VERY SAD': '/assets/Images-Transparent/Image-Mood-Upset.png',
        'UPSET': '/assets/Images-Transparent/Image-Mood-Upset.png',
        'NERVOUS': '/assets/Images-Transparent/Image-Mood-Nervous.png',
        'NEUTRAL': '/assets/Images-Transparent/Mood-emoji-neutral-home.png'
    };
    
    // Popup state
    public showSwitchPopup: boolean = false;
    
    // Children from store
    public children: ChildInfo[] = [];
    public selectedChild: ChildInfo | null = null;

    @ViewChild('moodSel') moodSelector?: MoodSelectorComponent;
    @ViewChild(ActivityPageContentComponent) habitPageContent?: ActivityPageContentComponent;

    constructor(
        private modalCtrl: ModalController,
        private router: Router,
        private userService: UserService,
        private moodService: MoodService,
        private habitService: HabitService,
        private profileStore: ProfileStoreService,
        private authService: AuthService,
        private childSelfImage: ChildSelfImageService,
        private parentImageService: ParentImageService
    ) { }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnInit(): void {
        // Redirect non-parent users
        if (!this.authService.isParentUser()) {
            this.router.navigate(['/authed/user-dashboard'], { replaceUrl: true });
            return;
        }

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

        // Fetch children from API and populate store
        this.loadChildren();
    }

    /** Load children from API and set into store */
    private loadChildren(): void {
        this.moodService.getVibesDisplay().pipe(takeUntil(this.destroy$)).subscribe({
            next: (data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const children: ChildInfo[] = data.map(d => {
                        const avatarUrl = this.childSelfImage.resolveAvatarForMember(d).url || '';
                        return mapVibeToChildInfo(d, avatarUrl);
                    });
                    this.profileStore.setChildren(children);
                } else {
                    this.profileStore.setChildren([]);
                }
            },
            error: () => this.profileStore.setChildren([])
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
        // Refresh mood selector
        this.moodSelector?.getTodayVibe?.();
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
        return `Hey ${name}, Still Panda! \n\n🌟 You've got 5 tasks, 2 habits, and a challenge waiting for you today. Let’s go!`;
    }

    onMoodChange(mood: string) {
        this.selectedMood = mood;
        console.log('mood changed to', mood);
    }

    openCalendar() {
        this.router.navigateByUrl('/authed/activity-calendar');
    }

    /**
     * Handle pull-to-refresh event
     */
    async handleRefresh(event: RefresherCustomEvent): Promise<void> {
        try {
            const isValid = await firstValueFrom(this.authService.refreshUserData());
            if (isValid) {
                const userData = this.authService.getUserData();
                if (userData) {
                    this.userName = userData.name || this.userName;
                    this.parentInitial = userData.name?.charAt(0) || this.parentInitial;
                    const isFemale = (userData.gender || '').toLowerCase() === 'female';
                    this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
                }
            }
            this.loadChildren();
            this.loadUserStats();
            await this.habitPageContent?.refresh();
            await new Promise(r => setTimeout(r, 500));
        } finally {
            event.target.complete();
        }
    }

    protected readonly console = console;
}