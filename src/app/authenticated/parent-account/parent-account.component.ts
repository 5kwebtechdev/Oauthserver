import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { UserService } from '../../core/services/user.service';
import { IonicModule } from "@ionic/angular";
import { MindfulInputsModule } from "../../core/components/mindful-inputs/mindful-inputs.module";
import { MoodSelectorComponent } from '../../core/components/mood-selector/mood-selector.component';
import { MoodService } from '../../core/services/mood.service';
import { VibesDisplayResponse } from '../../core/models/mood.model';
import { FooterComponent } from '../../core/components/footer/footer.component';
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { HabitPageContentComponent } from '../../core/components/habit-section/habit-page-content/habit-page-content.component';
import { HabitService } from '../../core/components/habit-section/habit.service';
import { ProfileSelectorService } from "../../core/services/profile-selector-service";
import { AuthService } from '../../core/services/auth.service';


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
        HabitPageContentComponent,

    ]
})
export class ParentAccountComponent implements OnInit {
    public userName: string = 'User';
    public userCoins: number = 0;
    public userStreaks: number = 0;
    public userDays: number = 0;
    public userBadges: number = 0;
    public selectedMood: string | null = 'happy';

    public userAvatarUrl: string = '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
    // Stats from vibes/display API for the mindful-completion rings
    public completionRate: number = 0;
    public consistencyRate: number = 0;
    public improvementRate: number = 0;
    public appScore: number = 0;
    public Math = Math; // Expose Math to template for Math.abs()
    // Vibe display fields (from vibes/display per-child entry)
    public vibeTitle: string = '';
    public vibeDescription: string = '';
    public emptyStateDescription: string = '';
    public completedStateDescription: string = '';
    public totalHabits: number = 0;
    public completedHabits: number = 0;
    public totalTasks: number = 0;
    public completedTasks: number = 0;
    public progressPercentage: number = 0;
    // Mood -> asset mapping (same keys used by MoodSelector)
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
    // Switch-user popup state
    public showSwitchPopup: boolean = false;
    // children list now holds raw API response for each child so we can switch stats per child
    public children: Array<{ id: string | number; name: string; avatarUrl: string; relationship?: string; raw?: any }> = [];
    public selectedChild: { id: string | number; name: string; avatarUrl: string; relationship?: string; raw?: any } | null = null;

    @ViewChild('moodSel') moodSelector?: MoodSelectorComponent;
    @ViewChild(HabitPageContentComponent) habitPageContent?: HabitPageContentComponent;

    constructor(
        private modalCtrl: ModalController,
        private router: Router,
        private userService: UserService,
        private moodService: MoodService,
        private habitService: HabitService,
        private profileSelector: ProfileSelectorService,
        private authService: AuthService
    ) { }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    ngOnInit() {
        // Check if the current user is not a parent and redirect if needed
        if (!this.authService.isParentUser()) {
            this.router.navigate(['/authed/user-dashboard'], { replaceUrl: true });
            return;
        }

        // subscribe to user profile to get name and avatar immediately
        this.userService.getUserProfile$().subscribe(profile => {
            if (profile) {
                this.userName = profile.name || 'User';
                this.userAvatarUrl = this.userService.getUserAvatarUrl();
            }
        });

        // Load rings data immediately from cache if available
        const stats = this.userService.getUserStats();
        if (stats) {
            this.userCoins = stats.coins || 0;
            this.userStreaks = stats.streaks || 0;
            this.userDays = stats.days || 0;
            this.userBadges = stats.badges || 0;
        }

        // Fetch fresh stats from API in background and update cache (same behavior as dashboard)
        this.loadUserStats();

        // Subscribe to habit/task changes and reload stats
        this.habitService.dataChanged$.subscribe(() => {
            console.log('[ParentAccount] Data changed, reloading stats...');
            this.loadUserStats();
        });

        // Try to load children from vibes/display API. Fall back to localStorage or defaults.
        try {
            this.moodService.getVibesDisplay().subscribe({
                next: (data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        this.children = data.map(d => ({
                            id: d.userId,
                            name: d.userName,
                            avatarUrl: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png',
                            relationship: d.relationship || 'Child',
                            raw: d
                        }));
                        // persist lightweight children list
                        try { localStorage.setItem('mb_children', JSON.stringify(this.children)); } catch { }

                        // If no selection yet, pick the first child
                        if (!this.selectedChild && this.children.length) {
                            this.selectChild(this.children[0]);
                        }
                    } else {
                        this.loadChildrenFromStorageOrDefaults();
                    }
                },
                error: () => this.loadChildrenFromStorageOrDefaults()
            });
        } catch (e) {
            console.warn('[ParentAccount] Failed to load children from API, falling back', e);
            this.loadChildrenFromStorageOrDefaults();
        }
    }

    private loadChildrenFromStorageOrDefaults() {
        try {
            const stored = localStorage.getItem('mb_children');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length) {
                    this.children = parsed;
                    if (!this.selectedChild) this.selectedChild = this.children[0];
                }
            }
        } catch (e) {
            console.warn('[ParentAccount] Failed to parse children from storage, using defaults', e);
        }

        if (!this.children || this.children.length === 0) {
            this.children = [
                { id: 'c1', name: 'Still Panda', avatarUrl: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png', relationship: 'Child' },
                { id: 'c2', name: 'Child 2', avatarUrl: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png', relationship: 'Child' }
            ];
            if (!this.selectedChild) this.selectedChild = this.children[0];
        }
        // Apply stats for currently selected child if available
        if (this.selectedChild && (this.selectedChild as any).raw) {
            this.applyChildStats((this.selectedChild as any).raw);
        }
    }

    /** Toggle the switch-user popup. Stop event propagation from click. */
    toggleSwitchPopup(ev?: Event) {
        if (ev) {
            ev.stopPropagation();
        }
        this.showSwitchPopup = !this.showSwitchPopup;
    }

    closeSwitchPopup() {
        this.showSwitchPopup = false;
    }

    /** Select a child and switch profile context to that child.
     *  This updates the UserService profile locally and closes the popup.
     */
    selectChild(child: any) {
        this.selectedChild = child.raw.assignedTo;
        this.profileSelector.setChild(child.raw.assignedTo);
        // If API raw data exists on the child, apply its stats
        if ((child as any).raw) {
            const d = (child as any).raw;
            this.applyChildStats(d);
            // Override the mood cache so MoodSelector shows this child's vibe first
            try {
                this.moodService.setVibesDisplayOverride([d]);
                // Ask the child mood-selector to refresh its displayed vibe
                if (this.moodSelector && typeof this.moodSelector.getTodayVibe === 'function') {
                    this.moodSelector.getTodayVibe();
                }
            } catch (e) { /* ignore */ }
        }
        // Update user profile in UserService so rest of app reflects the child
        try {
            // Include `userId` so other services/APIs can request data for the selected child
            this.userService.setUserProfile({ userId: Number(child.id as any), name: child.name, avatarUrl: child.avatarUrl, relationship: (child.relationship || 'CHILD') as any });
        } catch (e) {
            console.error('[ParentAccount] Failed to switch child profile', e);
        }
        // Reload habits for today so UI reflects selected child immediately
        try {
            this.habitService.loadHabitsForDate(this.habitService.formatDateToYYYYMMDD(new Date()), true).subscribe({
                next: () => {
                    // Also call the child component directly if available to ensure UI refresh
                    try { this.habitPageContent?.loadHabits(true); this.habitPageContent?.loadTasksForSelectedDate(new Date()); } catch (e) { /* ignore */ }
                }, error: () => { }
            });
        } catch (e) { /* ignore */ }
        this.closeSwitchPopup();
    }

    private applyChildStats(d: VibesDisplayResponse | any) {
        if (!d) return;
        this.userName = d.userName || this.userName;
        // mood -> selectedMood (if provided). Set as an asset reference so MoodSelector
        // displays the proper image when parent switches child.
        if (d.mood) {
            try {
                const moodUpper = String(d.mood).toUpperCase();
                const assetPath = this.moodAssetMap[moodUpper] || this.moodAssetMap['NEUTRAL'];
                this.selectedMood = 'asset:' + assetPath;
            } catch {
                this.selectedMood = 'asset:' + this.moodAssetMap['NEUTRAL'];
            }
        }
        // vibe display fields
        this.vibeTitle = d.title || this.vibeTitle || '';
        this.vibeDescription = d.description || this.vibeDescription || '';
        this.emptyStateDescription = d.emptyStateDescription || this.emptyStateDescription || '';
        this.completedStateDescription = d.completedStateDescription || this.completedStateDescription || '';
        this.totalHabits = Number(d.totalHabits ?? this.totalHabits ?? 0) || 0;
        this.completedHabits = Number(d.completedHabits ?? this.completedHabits ?? 0) || 0;
        this.totalTasks = Number(d.totalTasks ?? this.totalTasks ?? 0) || 0;
        this.completedTasks = Number(d.completedTasks ?? this.completedTasks ?? 0) || 0;
        this.progressPercentage = Number((d.progressPercentage ?? this.progressPercentage) || 0) || 0;
        // map coins/stats
        this.userCoins = d.coins ?? this.userCoins;
        this.userStreaks = d.streak ?? this.userStreaks;
        this.userDays = d.trophies ?? this.userDays;
        this.userBadges = d.badges ?? this.userBadges;
        this.completionRate = Math.round((d.completionRate ?? this.completionRate) || 0);
        this.consistencyRate = Math.round((d.consistencyRate ?? this.consistencyRate) || 0);
        this.improvementRate = Math.round((d.improvementRate ?? this.improvementRate) || 0);
        this.appScore = Math.round((d.appScore ?? this.appScore) || 0);
    }

    /**
     * Load user statistics from the vibes/display endpoint and update cache
     */
    private loadUserStats(): void {
        const cached = this.userService.getUserStats();
        if (cached) {
            // map cached to UI values (also used above)
            this.userCoins = cached.coins || 0;
            this.userStreaks = cached.streaks || 0;
            this.userDays = cached.days || 0;
            this.userBadges = cached.badges || 0;
        }

        this.moodService.getVibesDisplay().subscribe({
            next: (data: VibesDisplayResponse[]) => {
                if (data && data.length > 0) {
                    const userStats = data[0];
                    // Map coins/streaks/trophies/badges
                    this.userCoins = userStats.coins || 0;
                    this.userStreaks = userStats.streak || 0;
                    this.userDays = userStats.trophies || 0;
                    this.userBadges = userStats.badges || 0;

                    // Map ring values directly from API
                    this.completionRate = Math.round(userStats.completionRate || 0);
                    this.consistencyRate = Math.round(userStats.consistencyRate || 0);
                    this.improvementRate = Math.round(userStats.improvementRate || 0);
                    this.appScore = Math.round(userStats.appScore || 0);

                    // Update cached stats
                    this.userService.saveUserStats({
                        coins: this.userCoins,
                        streaks: this.userStreaks,
                        days: this.userDays,
                        badges: this.userBadges
                    });

                    console.log('[ParentAccount] Loaded vibes display:', {
                        completionRate: this.completionRate,
                        consistencyRate: this.consistencyRate,
                        improvementRate: this.improvementRate,
                        appScore: this.appScore
                    });
                }
            },
            error: (error) => {
                console.error('[ParentAccount] Failed to load user stats:', error);
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
        this.router.navigateByUrl('/calendar-main');
    }

    protected readonly console = console;
}
