import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { ChallengeSubmissionResponse, Challenge } from 'src/app/core/models/learning.models';

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    MindfulNavigatorComponent,
    MindfulPetComponent,
    MindfulButtonComponent,
    MindfulInputsModule
  ],
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.scss']
})
export class ResultPageComponent implements OnInit {
  quizAceBadge: any = {
    name: 'Quiz Ace',
    description: 'You answered 5 quizzes correctly in a row!',
    iconUrl: 'assets/Icons-Neutral/Icon-Badge-QuizAce.png'
  };

  puzzleMasterBadge: any = {
    name: 'Puzzle Master',
    description: 'You solved 10 puzzles correctly!',
    iconUrl: 'assets/Icons-Neutral/Icon-Badge-PuzzleMaster.png'
  };

  // Results from submission
  submissionResult: ChallengeSubmissionResponse | null = null;
  challenge: Challenge | null = null;
  timeTaken = 0;

  // Computed properties for display
  totalQuestions = 0;
  correctAnswers = 0;
  scorePercentage = 0;
  coinsEarned = 0;
  trophiesEarned = 0;
  totalCoins = 0;
  totalTrophies = 0;
  celebrationText = '';
  overallFeedback = '';
  firstCompletion = false;
  earnedNewBadge = false;
  newlyEarnedBadges: any[] = [];
  badgeCelebrationMessage = '';

  constructor(private router: Router) {
    // Get data from router state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      submissionResult?: ChallengeSubmissionResponse;
      challenge?: Challenge;
      timeTaken?: number;
    };

    if (state?.submissionResult) {
      this.submissionResult = state.submissionResult;
      this.challenge = state.challenge || null;
      this.timeTaken = state.timeTaken || 0;
    }
  }

  ngOnInit() {
    if (this.submissionResult) {
      // Map submission result to display properties
      this.totalQuestions = this.submissionResult.totalQuestions;
      this.correctAnswers = this.submissionResult.correctCount;
      this.scorePercentage = this.submissionResult.percentageScore;
      this.coinsEarned = this.submissionResult.coinsEarned;
      this.trophiesEarned = this.submissionResult.trophiesEarned;
      this.totalCoins = this.submissionResult.totalCoins;
      this.totalTrophies = this.submissionResult.totalTrophies;
      this.celebrationText = this.submissionResult.celebrationText;
      this.overallFeedback = this.submissionResult.overallFeedback;
      this.firstCompletion = this.submissionResult.firstCompletion;
      this.earnedNewBadge = this.submissionResult.earnedNewBadge;
      this.newlyEarnedBadges = this.submissionResult.newlyEarnedBadges || [];
      this.badgeCelebrationMessage = this.submissionResult.badgeCelebrationMessage || '';
    } else {
      console.warn('No submission result found in router state');
    }
  }

  onCancel(): void {
    // Navigate back to learning page
    this.router.navigate(['/authed/content']);
  }

  onPetClick(): void {
    // Handle pet click event
    console.log('Pet clicked!');
  }

  onContinue(): void {
    // Navigate back to learning page
    this.router.navigate(['/authed/content']);
  }

  /**
   * Format time taken in MM:SS format
   */
  getFormattedTime(): string {
    const minutes = Math.floor(this.timeTaken / 60);
    const seconds = this.timeTaken % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}