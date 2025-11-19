import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { HabitCardComponent } from "../../core/components/habit-section/habit-card/habit-card.component";
// ChallengeCardComponent removed from imports because it's not used in the template
import { ContentCardComponent } from "../../core/components/content-card/content-card.component";
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
    ContentCardComponent,
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

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private petMessagesService: PetMessagesService,
    private userService: UserService,
    private moodService: MoodService
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
   * Load user statistics from the vibes/display endpoint
   */
  private loadUserStats(): void {
    this.moodService.getVibesDisplay().subscribe({
      next: (data: VibesDisplayResponse[]) => {
        // The API returns an array, get the first item (current user's data)
        if (data && data.length > 0) {
          const userStats = data[0];
          this.userCoins = userStats.coins || 0;
          this.userStreaks = userStats.streak || 0;
          this.userDays = userStats.trophies || 0; // Map trophies to days
          this.userBadges = userStats.badges || 0;
        }
      },
      error: (error) => {
        console.error('Failed to load user stats:', error);
        // Keep default values (0) on error
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
