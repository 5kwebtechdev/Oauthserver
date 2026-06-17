import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController, RefresherCustomEvent } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { ActivityCardComponent } from "../../core/components/activity-section/activity-card/activity-card.component";
import { LearningSectionComponent } from "../../core/components/learning-section/learning-section.component";
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { TutorCardComponent } from "../../core/components/tutor-section/tutor-card/tutor-card.component";

import { JournalsComponent } from "../../core/components/journals/journals.component";
import { AcademySectionComponent } from "../../core/components/academy-section/academy-section.component";
import { IonicModule } from "@ionic/angular";
import { SupermeInputsModule } from "../../core/components/superme-inputs/superme-inputs.module";
import { MoodSelectorComponent } from "../../core/components/mood-selector/mood-selector.component";
import { SupermeSpeechBubbleComponent } from '../../core/components/superme-speech-bubble/superme-speech-bubble.component';
import { SupermePetComponent } from '../../core/components/superme-pet/superme-pet.component';
import { SupermeCoinsStatsComponent } from '../../core/components/superme-coins-stats/superme-coins-stats.component';

import { FooterComponent } from '../../core/components/footer/footer.component';
import { PetMessagesService, PetMessage, PetMood } from '../../core/services/pet-messages.service';
import { UserService } from '../../core/services/user.service';
import { MoodService } from '../../core/services/mood.service';
import { VibesDisplayResponse } from '../../core/models/mood.model';
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
import { Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

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
    JournalsComponent,
    AcademySectionComponent,
    IonicModule,
    MoodSelectorComponent,
    SupermeInputsModule,
    SupermePetComponent,
    SupermeSpeechBubbleComponent,
    SupermeCoinsStatsComponent,
    FooterComponent,
  ]
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  // Minimal properties used by the template
  public userName: string = 'User';
  public userAvatarUrl: string = '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
  public avatarImageName: string | null = null;
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

  // Completion data
  public totalTasks: number = 0;
  public totalTasksCompleted: number = 0;
  public taskCompletionRate: number = 0;
  public totalHabits: number = 0;
  public totalHabitsCompleted: number = 0;
  public habitCompletionRate: number = 0;

  // Observable for shared toast service
  toast$: Observable<Toast | null>;

  // Subject for cleanup
  private destroy$ = new Subject<void>();
  private refreshScheduled$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private petMessagesService: PetMessagesService,
    private userService: UserService,
    private moodService: MoodService,
    private habitService: HabitService,
    private taskApi: TaskApi,
    private habitApi: HabitApi,
    private calendarService: CalendarService,
    private buttonLogic: HabitButtonLogicService,
    private authService: AuthService,
    private childSelfImageService: ChildSelfImageService,
    private toastService: CustomToastService,
    private refreshService: RefreshService
  ) {
    this.toast$ = this.toastService.toast$;
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

    // Subscribe to user data changes from AuthService (primary source of truth)
    // This will update the UI whenever user data is modified (e.g., from edit-profile)
    this.authService.userData$.subscribe(userData => {
      if (userData) {
        console.log('[UserDashboard] User data updated from AuthService:', userData.name);
        this.userName = userData.name || 'User';
        
        // Update avatar from user data
        const resolved = this.childSelfImageService.resolveAvatarFromUser(userData);
        if (resolved.url) this.userAvatarUrl = resolved.url;
        if (resolved.alt) this.avatarImageName = resolved.alt;
      }
    });

    // Load user profile from service (secondary source for additional profile info)
    this.userService.getUserProfile$().subscribe(profile => {
      if (profile) {
        // Only update if not already set from AuthService
        if (!this.userName || this.userName === 'User') {
          this.userName = profile.name || 'User';
        }
        if (!this.userAvatarUrl) {
          this.userAvatarUrl = this.userService.getUserAvatarUrl();
        }
      }
    });

    // Fetch user stats (coins, streaks, badges, etc.) from backend
    this.loadUserStats();

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
              tags: item.tags || [],
              coinReward: item.rewardCoins || item.coinReward || 0,
              // keep routine info so activity-card can render routine icon
              routine: item.routine ?? item.selectedRoutine ?? item.selected_routine ?? null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
            };
          });

          // Filter out completed/skipped and items 5 min past their endTime
          const now = Date.now();
          const fiveMinMs = 5 * 60 * 1000;
          habitsData = habitsData.filter((h: any) => {
            const status = (h.status || '').toLowerCase();
            if (status === 'completed' || status === 'skipped') return false;
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
              tags: item.tags || [],
              coinReward: item.rewardCoins || item.coinReward || 0,
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

        // Set completion data
        this.totalTasks = resp.totalTasks || 0;
        this.totalTasksCompleted = resp.totalTasksCompleted || 0;
        this.taskCompletionRate = resp.taskCompletionRate || 0;
        this.totalHabits = resp.totalHabits || 0;
        this.totalHabitsCompleted = resp.totalHabitsCompleted || 0;
        this.habitCompletionRate = resp.habitCompletionRate || 0;
      },
      error: (err) => {
        console.error('Failed to load calendar data:', err);
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
    // Navigate to the activity-calendar component route
    this.router.navigate(['/authed/activity-calendar']);
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
      this.userName = userData.name || this.userName;

      const resolved = this.childSelfImageService.resolveAvatarFromUser(userData);
      if (resolved.url) this.userAvatarUrl = resolved.url;
      if (resolved.alt) this.avatarImageName = resolved.alt;

      this.userService.updateUserProfile({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        gender: userData.gender,
        relationship: userData.relationship
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

  ngOnDestroy(): void {
    // Unregister from global refresh
    this.refreshService.unregisterRefreshHandler('UserDashboard');
    // Cleanup all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshScheduled$.complete();
  }

}