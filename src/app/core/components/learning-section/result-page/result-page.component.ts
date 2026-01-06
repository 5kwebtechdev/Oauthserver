import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { LoadingService } from 'src/app/core/services/loading.service';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { ChallengeSubmissionResponse, Challenge } from 'src/app/core/models/learning.models';
import { PetMood } from '../../mindful-pet/mindful-pet.component';

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
export class ResultPageComponent implements OnInit, OnDestroy {
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

  constructor(private router: Router, private loadingService: LoadingService) {
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
    // Ensure any global loaders are cleared when arriving on the results page
    // (covers cases where previous page left a loader token active)
    try { this.loadingService.reset(); } catch (e) { }
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

    // Intercept browser/gesture back (popstate) while on this page and
    // redirect to content so swipe-back / back-gesture behaves like cancel.
    window.addEventListener('popstate', this.handlePopState);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handlePopState = (event: PopStateEvent) => {
    // Ensure we don't try to navigate if already heading to content
    if (this.router.url !== '/authed/content') {
      this.router.navigateByUrl('/authed/content', { replaceUrl: true });
    }
  }


  getScoreColor(): string {
    if (this.scorePercentage >= 80) {
      return '#4CAF50';
    } else if (this.scorePercentage >= 40) {
      return '#F0AD4E';
    } else {
      return '#BB2124';
    }
  }


  getPetMood(): PetMood {
    if (this.scorePercentage >= 80) {
      return 'happy';
    } else if (this.scorePercentage >= 40) {
      return 'playful';
    } else {
      return 'base';
    }
  }


  isExcellentScore(): boolean {
    return this.scorePercentage >= 80;
  }

  onCancel(): void {
    this.router.navigateByUrl('/authed/content', { replaceUrl: true });
  }

  onPetClick(): void {
    console.log('Pet clicked!');
  }

  onContinue(): void {
    this.router.navigateByUrl('/authed/content', { replaceUrl: true });
  }


  getFormattedTime(): string {
    const minutes = Math.floor(this.timeTaken / 60);
    const seconds = this.timeTaken % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}