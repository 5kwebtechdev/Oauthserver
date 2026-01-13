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
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { ParentImageService } from '../../core/services/parent-image.service';


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
    // Parent avatar style (used when no child selected or when no children)
    public parentAvatarStyle: { [k: string]: string } = {};
    public parentInitial: string = 'U';
    public currentProfile: any = null;
    // Stats
    public completionRate: number = 0;
    public consistencyRate: number = 0;
    public improvementRate: number = 0;
    public appScore: number = 0;
    public Math = Math; // expose Math
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
    // Children list
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
        private authService: AuthService,
        private childSelfImage: ChildSelfImageService,
        private parentImageService: ParentImageService
    ) { }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    // Initialize component
    ngOnInit() {
        // redirect non-parent users
        if (!this.authService.isParentUser()) {
            this.router.navigate(['/authed/user-dashboard'], { replaceUrl: true });
            return;
        }

        // subscribe to profile
        this.userService.getUserProfile$().subscribe(profile => {
            if (profile) {
                this.currentProfile = profile;
                this.userName = profile.name || 'User';
                this.userAvatarUrl = this.userService.getUserAvatarUrl();
                this.parentInitial = (profile.name && profile.name.charAt(0)) || 'U';
                this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, (profile.gender || '').toLowerCase() === 'female', 54);
            }
        });

        // Load cached stats
        const stats = this.userService.getUserStats();
        if (stats) {
            this.userCoins = stats.coins || 0;
            this.userStreaks = stats.streaks || 0;
            this.userDays = stats.days || 0;
            this.userBadges = stats.badges || 0;
        }

        // Fetch fresh stats and update cache
        this.loadUserStats();

        // Refresh when habits/tasks change
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
                            avatarUrl: this.childSelfImage.resolveAvatarForMember(d).url || '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png',
                            relationship: d.relationship || 'Child',
                            raw: d
                        }));
                        try { localStorage.setItem('mb_children', JSON.stringify(this.children)); } catch { }

                        // Restore previously selected child or pick first
                        this.restoreOrSelectFirstChild();
                    } else {
                        this.useParentAsDefault();
                    }
                },
                error: () => this.useParentAsDefault()
            });
        } catch (e) {
            console.warn('[ParentAccount] Failed to load children from API, falling back', e);
            this.useParentAsDefault();
        }
    }

    /** Restore previously selected child from ProfileSelectorService or select first */
    private restoreOrSelectFirstChild(): void {
        const storedId = this.profileSelector.getChildId();
        if (storedId !== null) {
            const found = this.children.find(c => Number(c.id) === storedId);
            if (found) {
                this.selectedChild = found;
                if (found.raw) this.applyChildStats(found.raw);
                return;
            }
        }
        // Fallback to first child
        if (this.children.length) {
            this.selectChild(this.children[0]);
        }
    }

    private loadChildrenFromStorageOrDefaults() {
        try {
            const stored = localStorage.getItem('mb_children');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length) {
                    this.children = parsed.map((c: any) => {
                        if (c.raw) {
                            const resolved = this.childSelfImage.resolveAvatarForMember(c.raw);
                            c.avatarUrl = resolved.url || c.avatarUrl || '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
                        }
                        return c;
                    });
                    this.restoreOrSelectFirstChild();
                    return;
                }
            }
        } catch (e) {
            console.warn('[ParentAccount] Failed to parse children from storage, using defaults', e);
        }

        if (!this.children || this.children.length === 0) {
            // No stored children — fall back to parent view
            this.useParentAsDefault();
        }
        // apply selected child's stats
        if (this.selectedChild && (this.selectedChild as any).raw) {
            this.applyChildStats((this.selectedChild as any).raw);
        }
    }

    // Use parent display when there are no children returned by API
    private useParentAsDefault() {
        try {
            this.children = [];
            this.selectedChild = null;
            const p = this.currentProfile || null;
            this.userName = (p && p.name) || this.userName || 'User';
            this.parentInitial = (p && p.name && p.name.charAt(0)) || (this.userName && this.userName.charAt(0)) || 'U';
            const isFemale = (p && (p.gender || '').toLowerCase() === 'female') || false;
            this.parentAvatarStyle = this.parentImageService.getAvatarStyle(this.parentInitial, isFemale, 54);
            // Clear any child avatar url so template shows the parent style instead
            this.userAvatarUrl = '';
        } catch (e) {
            console.warn('[ParentAccount] useParentAsDefault failed', e);
        }
    }

    // Toggle popup
    toggleSwitchPopup(ev?: Event) {
        if (ev) {
            ev.stopPropagation();
        }
        this.showSwitchPopup = !this.showSwitchPopup;
    }

    closeSwitchPopup() {
        this.showSwitchPopup = false;
    }

    // Select child & switch profile
    selectChild(child: any) {
        // keep selectedChild in sync with list
        this.selectedChild = child;

        // Set the child ID in ProfileSelectorService - interceptor will add to all API requests
        // Use child.id (userId from API) as the primary identifier
        const childId = Number(child.id) || child.raw?.userId || child.raw?.assignedTo;
        this.profileSelector.setChild(childId);

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

        // No need to manually call loadHabits - components subscribe to childChanged$
        // and will automatically reload when the child changes
        this.closeSwitchPopup();
    }

    // Apply stats from child data
    private applyChildStats(d: VibesDisplayResponse | any) {
        if (!d) return;
        this.userName = d.userName || this.userName;
        // Resolve avatar for this child via service
        try {
            const resolved = this.childSelfImage.resolveAvatarForMember(d);
            if (resolved && resolved.url) {
                this.userAvatarUrl = resolved.url;
            }
        } catch (e) {
            // ignore and keep existing avatar
        }
        // set selectedMood from data
        if (d.mood) {
            try {
                const moodUpper = String(d.mood).toUpperCase();
                const assetPath = this.moodAssetMap[moodUpper] || this.moodAssetMap['NEUTRAL'];
                this.selectedMood = 'asset:' + assetPath;
            } catch {
                this.selectedMood = 'asset:' + this.moodAssetMap['NEUTRAL'];
            }
        }
        // vibe fields
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

    // Load user stats
    private loadUserStats(): void {
        const cached = this.userService.getUserStats();
        if (cached) {
            // map cached
            this.userCoins = cached.coins || 0;
            this.userStreaks = cached.streaks || 0;
            this.userDays = cached.days || 0;
            this.userBadges = cached.badges || 0;
        }

        this.moodService.getVibesDisplay().subscribe({
            next: (data: VibesDisplayResponse[]) => {
                if (data && data.length > 0) {
                    const userStats = data[0];
                    // Map coins/streaks
                    this.userCoins = userStats.coins || 0;
                    this.userStreaks = userStats.streak || 0;
                    this.userDays = userStats.trophies || 0;
                    this.userBadges = userStats.badges || 0;

                    // Map ring values
                    this.completionRate = Math.round(userStats.completionRate || 0);
                    this.consistencyRate = Math.round(userStats.consistencyRate || 0);
                    this.improvementRate = Math.round(userStats.improvementRate || 0);
                    this.appScore = Math.round(userStats.appScore || 0);

                    // Save cached stats
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
