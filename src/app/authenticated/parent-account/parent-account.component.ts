import { Component, OnInit } from '@angular/core';
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
    // Switch-user popup state
    public showSwitchPopup: boolean = false;
    public children: Array<{ id: string | number; name: string; avatarUrl: string; relationship?: string }> = [];
    public selectedChild: { id: string | number; name: string; avatarUrl: string; relationship?: string } | null = null;

    constructor(
        private modalCtrl: ModalController,
        private router: Router,
        private userService: UserService,
        private moodService: MoodService,
        private habitService: HabitService
    ) { }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    ngOnInit() {
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

        // Load children from localStorage if present (fallback to demo list)
        try {
            const stored = localStorage.getItem('mb_children');
            if (stored) {
                this.children = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[ParentAccount] Failed to parse children from storage, using defaults', e);
        }

        if (!this.children || this.children.length === 0) {
            // Minimal default children for UI; real app should fetch from API
            this.children = [
                { id: 'c1', name: 'Still Panda', avatarUrl: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png', relationship: 'Child' },
                { id: 'c2', name: 'Child 2', avatarUrl: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png', relationship: 'Child' }
            ];
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
    selectChild(child: { id: string | number; name: string; avatarUrl: string; relationship?: string }) {
        this.selectedChild = child;
        // Update user profile in UserService so rest of app reflects the child
        try {
            this.userService.setUserProfile({ name: child.name, avatarUrl: child.avatarUrl, relationship: 'CHILD' as any });
        } catch (e) {
            console.error('[ParentAccount] Failed to switch child profile', e);
        }
        this.closeSwitchPopup();
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
