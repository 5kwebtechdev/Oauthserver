import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { HabitCardComponent } from "../../core/components/habit-section/habit-card/habit-card.component";
import { LearningSectionComponent } from "../../core/components/learning-section/learning-section.component";
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { TutorCardComponent } from "../../core/components/tutor-section/tutor-card/tutor-card.component";
import { ReelsCardComponent } from "../../core/components/reel-section/reels-card/reels-card.component";
import { ReelsExpandComponent } from "../../core/components/reel-section/reel-expand/reels-expand.component";
import { JournalsComponent } from "../../core/components/journals/journals.component";
import { AcademySectionComponent } from "../../core/components/academy-section/academy-section.component";
import { IonicModule } from "@ionic/angular";
import { MindfulInputsModule } from "../../core/components/mindful-inputs/mindful-inputs.module";
import { MoodSelectorComponent } from "../../core/components/mood-selector/mood-selector.component";
import { MindfulSpeechBubbleComponent } from '../../core/components/mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../core/components/mindful-pet/mindful-pet.component';
import { MindfulCoinsStatsComponent } from '../../core/components/mindful-coins-stats/mindful-coins-stats.component';
import { MindfulCardHeaderComponent } from '../../core/components/mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../core/components/mindful-navigator/view-all/view-all.component';
import { FooterComponent } from '../../core/components/footer/footer.component';
import { PetMessagesService, PetMessage, PetMood } from '../../core/services/pet-messages.service';
import { UserService } from '../../core/services/user.service';
import { MoodService } from '../../core/services/mood.service';
import { VibesDisplayResponse } from '../../core/models/mood.model';
import { HabitService } from '../../core/components/habit-section/habit.service';
import { Habit } from '../../core/components/habit-section/habit.types';
import { TaskApi } from '../../core/api/task.api';
import { HabitApi } from '../../core/api/habit.api';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HabitCardComponent,
    AdBannerComponent,
    LearningSectionComponent,
    ReelsCardComponent,
    ReelsExpandComponent,
    TutorCardComponent,
    JournalsComponent,
    AcademySectionComponent,
    IonicModule,
    MoodSelectorComponent,
    MindfulInputsModule,
    MindfulPetComponent,
    MindfulSpeechBubbleComponent,
    MindfulCoinsStatsComponent,
    MindfulCardHeaderComponent,
    ViewAllComponent,
    FooterComponent,
  ]
})
export class UserDashboardComponent implements OnInit {
  // Minimal properties used by the template
  public userName: string = 'User';
  public userAvatarUrl: string = '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
  public userCoins: number = 0;
  public userStreaks: number = 0;
  public userDays: number = 0;
  public userBadges: number = 0;
  // currently selected mood
  public selectedMood: string | null = 'happy';
  // Pet message and mood
  public currentPetMessage: PetMessage | undefined = undefined;
  public petMood: PetMood | 'anger' = 'happy';

  // Recent habits and tasks
  public recentHabits: Habit[] = [];
  public recentTasks: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private petMessagesService: PetMessagesService,
    private userService: UserService,
    private moodService: MoodService,
    private habitService: HabitService,
    private taskApi: TaskApi,
    private habitApi: HabitApi
  ) { }

  async openNotes() {
    // Navigate to the notes home page instead of opening the Notes modal
    this.router.navigate(['/authed/notes']);
  }

  ngOnInit() {
    // Load user profile from service
    this.userService.getUserProfile$().subscribe(profile => {
      if (profile) {
        this.userName = profile.name || 'User';
        this.userAvatarUrl = this.userService.getUserAvatarUrl();
      }
    });

    // Fetch user stats (coins, streaks, badges, etc.) from backend
    this.loadUserStats();

    // Load recent habits and tasks
    this.loadRecentHabitsAndTasks();

    // Subscribe to habit/task changes and reload data
    this.habitService.dataChanged$.subscribe(() => {
      console.log('[UserDashboard] Data changed, reloading...');
      this.loadRecentHabitsAndTasks();
      this.loadUserStats();
    });

    // Initialize pet message for home page
    this.currentPetMessage = this.petMessagesService.getMessage('home', {
      userName: this.userName,
      tasksCount: 5, // This should come from your data service
      habitsCount: 2, // This should come from your data service
      streakDays: this.userStreaks
    });

    // Set pet mood based on the message
    this.petMood = this.currentPetMessage.mood;
  }

  /**
   * Load recent habits and tasks
   */
  private loadRecentHabitsAndTasks(): void {
    // Load today's habits (not all habits)
    this.habitService.loadTodayHabits().subscribe({
      next: (response: any) => {
        // Get habits from the service
        let habitsData = this.habitService.getCurrentHabits();

        // Filter out completed and skipped habits (case-insensitive)
        habitsData = habitsData.filter((habit: Habit) => {
          const status = (habit.status || '').toLowerCase();
          return status !== 'completed' && status !== 'skipped';
        });

        // Since createdAt field is not available in the API response, 
        // we'll sort by id (assuming higher id means more recent)
        // or by completionDate if available
        this.recentHabits = [...habitsData]
          .sort((a: Habit, b: Habit) => {
            // Try to sort by id first (assuming higher id means more recent)
            const aId = parseInt(a.id || '0', 10);
            const bId = parseInt(b.id || '0', 10);

            // If ids are available, sort by id (descending)
            if (aId > 0 && bId > 0) {
              return bId - aId;
            }

            // Fallback to completionDate if available
            if (a.completionDate && b.completionDate) {
              const aDate = new Date(a.completionDate).getTime();
              const bDate = new Date(b.completionDate).getTime();
              return bDate - aDate;
            }

            // Last resort: sort by start date
            if (a.startDate && b.startDate) {
              const aStartDate = new Date(a.startDate).getTime();
              const bStartDate = new Date(b.startDate).getTime();
              return bStartDate - aStartDate;
            }

            // If all else fails, keep original order
            return 0;
          })
          // Take only the first 4 items
          .slice(0, 4);

        // Force change detection
        setTimeout(() => {
          this.recentHabits = [...this.recentHabits];
        }, 0);
      },
      error: (error) => {
        console.error('Failed to load habits:', error);
      }
    });

    // Load today's tasks
    this.taskApi.getTodayTasks().subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data || response)) {
          const tasksData = response.data || response;
          // Filter out completed and skipped tasks and map them (case-insensitive)
          const filteredTasks = tasksData
            .filter((item: any) => {
              const status = (item.status || '').toLowerCase();
              return status !== 'completed' && status !== 'skipped';
            })
            .map((item: any) => {
              return {
                id: item.id || '',
                title: item.title || '',
                notes: item.description || '',
                startDate: item.startDate ? new Date(item.startDate) : new Date(),
                endDate: item.endDate ? new Date(item.endDate) : new Date(),
                startTime: item.startTime || "07:00:00",
                endTime: item.endTime || "08:00:00",
                startTimeStamp: item.startDate ? new Date(item.startDate).getTime() : Date.now(),
                endTimeStamp: item.endDate ? new Date(item.endDate).getTime() : Date.now() + 3600000,
                type: 'tasks',
                isPrivate: !!item.isPrivate,
                selectedRoutine: item.getRoutine,
                routineTags: item.routineTags || [],
                everyday: item.everyday || false,
                selectedDays: item.daysOfWeek || item.selectedDays || [],
                priority: item.priority,
                routine: item.routine,
                status: item.status,
                tags: item.tags || [],
                coinReward: item.coinReward || 0,
                coinsEarned: item.coinsEarned || item.coins || 0,
                streak: item.streak || item.streakCount || 0,
                highestStreak: item.highestStreak || item.topStreak || 0,
                completionPercentage: item.completionPercentage || item.completionRate || 0,
                totalCompletedDays: item.totalCompletedDays || item.completedDays || 0,
                milestoneBadges: item.milestoneBadges || item.badges || [],
                createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                completionDate: item.completionDate ? new Date(item.completionDate) : null,
                assignedToId: item.assignedToId,
                assignedToName: item.assignedToName,
                createdById: item.createdById,
                createdByName: item.createdByName,
                createdBy: item.createdBy || item.createdByName,
                sharedWithParents: item.sharedWithParents || false,
                completed: item.completed || false,
                rewardCoins: item.rewardCoins || 0,
                familyId: item.familyId,
                updatedAt: item.updatedAt
              };
            })
            // Sort by id (assuming higher id means more recent)
            .sort((a: any, b: any) => {
              // Try to sort by id first (assuming higher id means more recent)
              const aId = parseInt(a.id || '0', 10);
              const bId = parseInt(b.id || '0', 10);

              // If ids are available, sort by id (descending)
              if (aId > 0 && bId > 0) {
                return bId - aId;
              }

              // Fallback to completionDate if available
              if (a.completionDate && b.completionDate) {
                const aDate = new Date(a.completionDate).getTime();
                const bDate = new Date(b.completionDate).getTime();
                return bDate - aDate;
              }

              // Last resort: sort by start date
              if (a.startDate && b.startDate) {
                const aStartDate = new Date(a.startDate).getTime();
                const bStartDate = new Date(b.startDate).getTime();
                return bStartDate - aStartDate;
              }

              // If all else fails, keep original order
              return 0;
            })
            // Take only the first 4 items
            .slice(0, 4);

          this.recentTasks = filteredTasks;

          // Force change detection
          setTimeout(() => {
            this.recentTasks = [...this.recentTasks];
          }, 0);
        }
      },
      error: (error) => {
        console.error('Failed to load tasks:', error);
      }
    });
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

      console.log('[UserDashboard] Loaded stats from localStorage:', cachedStats);
    }

    // Always fetch fresh data from API in background and update cache
    this.moodService.getVibesDisplay().subscribe({
      next: (data: VibesDisplayResponse[]) => {
        // The API returns an array, get the first item (current user's data)
        if (data && data.length > 0) {
          const userStats = data[0];
          this.userCoins = userStats.coins || 0;
          this.userStreaks = userStats.streak || 0;
          this.userDays = userStats.trophies || 0; // Map trophies to days
          this.userBadges = userStats.badges || 0;

          // Cache the updated stats
          this.userService.saveUserStats({
            coins: this.userCoins,
            streaks: this.userStreaks,
            days: this.userDays,
            badges: this.userBadges
          });

          console.log('[UserDashboard] Updated stats from API:', {
            coins: this.userCoins,
            streaks: this.userStreaks,
            days: this.userDays,
            badges: this.userBadges
          });
        }
      },
      error: (error) => {
        console.error('Failed to load user stats:', error);
        // Keep cached or default values (0) on error
      }
    });
  }

  get greetingMessage(): string {
    // build the message in TypeScript to avoid template parsing issues with quotes and newlines
    const name = this.userName || 'there';
    return `Hey ${name}, Still Panda! \n\n🌟 You've got 5 tasks, 2 habits, and a challenge waiting for you today. Let’s go!`;
  }

  onMoodChange(mood: string) {
    this.selectedMood = mood;
    console.log('mood changed to', mood);
  }

  openCalendar() {
    // Navigate to the calendar-main component route
    this.router.navigate(['/authed/calendar-main']);
  }

  protected readonly console = console;
}