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
    // Basic stats used by the mindful-completion rings. Initialized to safe defaults.
    public totalHabits: number = 0;
    public totalHabitsCompleted: number = 0;
    public totalTasks: number = 0;
    public totalTasksCompleted: number = 0;
    public habitCompletionRate: number = 0;
    public taskCompletionRate: number = 0;

    constructor(
        private modalCtrl: ModalController,
        private router: Router,
        private userService: UserService,
        private moodService: MoodService
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

        // Try to load cached stats if they exist so the rings render immediately.
        const stats = this.userService.getUserStats();
        if (stats) {
            // Map cached stats to reasonable defaults for the ring UI.
            // These mappings are intentionally simple; refine as needed.
            this.totalHabits = stats.days || 0;
            this.totalHabitsCompleted = Math.min(this.totalHabits, Math.floor(stats.streaks || 0));
            this.totalTasks = Math.max(0, (this.totalHabits * 2));
            this.totalTasksCompleted = Math.min(this.totalTasks, Math.floor(stats.badges || 0));
            this.habitCompletionRate = this.totalHabits > 0 ? Math.round((this.totalHabitsCompleted / this.totalHabits) * 100) : 0;
            this.taskCompletionRate = this.totalTasks > 0 ? Math.round((this.totalTasksCompleted / this.totalTasks) * 100) : 0;
        }

        // Fetch fresh stats from API in background and update cache (same behavior as dashboard)
        this.loadUserStats();
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
                    this.userCoins = userStats.coins || 0;
                    this.userStreaks = userStats.streak || 0;
                    this.userDays = userStats.trophies || 0;
                    this.userBadges = userStats.badges || 0;

                    // Update cached stats
                    this.userService.saveUserStats({
                        coins: this.userCoins,
                        streaks: this.userStreaks,
                        days: this.userDays,
                        badges: this.userBadges
                    });

                    // Also update the rings mapping values so they reflect the fresh data
                    this.totalHabits = this.userDays || 0;
                    this.totalHabitsCompleted = Math.min(this.totalHabits, Math.floor(this.userStreaks || 0));
                    this.totalTasks = Math.max(0, (this.totalHabits * 2));
                    this.totalTasksCompleted = Math.min(this.totalTasks, Math.floor(this.userBadges || 0));
                    this.habitCompletionRate = this.totalHabits > 0 ? Math.round((this.totalHabitsCompleted / this.totalHabits) * 100) : 0;
                    this.taskCompletionRate = this.totalTasks > 0 ? Math.round((this.totalTasksCompleted / this.totalTasks) * 100) : 0;
                }
            },
            error: (error) => {
                console.error('Failed to load user stats:', error);
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
