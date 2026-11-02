import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupermeButtonComponent } from '../../../../components/superme-button/superme-button.component';
import { LearningService } from '../../learning.service';
import { Challenge, ChallengeSubmissionResponse } from '../../learning.models';

@Component({
  selector: 'sm-result-page',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.scss']
})
export class ResultPageComponent implements OnInit {
  // Challenge data
  challenge: Challenge | null = null;

  // Results
  serverResponse: ChallengeSubmissionResponse | null = null;
  localResults: {
    correctCount: number;
    totalQuestions: number;
    timeTaken: number;
    skippedCount: number;
  } | null = null;

  // Computed values
  score = 0;
  totalQuestions = 0;
  scorePercent = 0;
  coinsEarned = 0;
  trophiesEarned = 0;
  petMood: { mood: string; message: string } = { mood: 'neutral', message: '' };
  celebrationText = '';
  feedbackText = '';

  // Badges
  badges: any[] = [];
  earnedNewBadge = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningService: LearningService
  ) { }

  ngOnInit(): void {
    // Get data from navigation state
    const navigationState = history.state;

    if (navigationState?.challenge) {
      this.challenge = navigationState.challenge;
    }

    if (navigationState?.serverResponse) {
      this.serverResponse = navigationState.serverResponse;
      this.processServerResponse();
    } else if (navigationState?.localResults) {
      this.localResults = navigationState.localResults;
      this.processLocalResults();
    } else {
      // Fallback - try to get from query params
      const scoreParam = this.route.snapshot.queryParamMap.get('score');
      const totalParam = this.route.snapshot.queryParamMap.get('total');

      this.score = scoreParam ? Number(scoreParam) : 0;
      this.totalQuestions = totalParam ? Number(totalParam) : 0;
      this.calculateResults();
    }
  }

  /**
   * Process server response data
   */
  private processServerResponse(): void {
    if (!this.serverResponse) return;

    this.score = this.serverResponse.correctCount;
    this.totalQuestions = this.serverResponse.totalQuestions;
    this.scorePercent = this.serverResponse.percentageScore;
    this.coinsEarned = this.serverResponse.coinsEarned;
    this.trophiesEarned = this.serverResponse.trophiesEarned;
    this.celebrationText = this.serverResponse.celebrationText || this.getCelebrationText();
    this.feedbackText = this.serverResponse.overallFeedback || this.getFeedbackText();
    this.earnedNewBadge = this.serverResponse.earnedNewBadge;
    this.badges = this.serverResponse.newlyEarnedBadges || [];

    this.petMood = this.learningService.calculatePetMood(this.score, this.totalQuestions);
  }

  /**
   * Process local results data
   */
  private processLocalResults(): void {
    if (!this.localResults) return;

    this.score = this.localResults.correctCount;
    this.totalQuestions = this.localResults.totalQuestions;
    this.calculateResults();
  }

  /**
   * Calculate results from local data
   */
  private calculateResults(): void {
    if (this.totalQuestions === 0) {
      this.scorePercent = 0;
    } else {
      this.scorePercent = Math.round((this.score / this.totalQuestions) * 100);
    }

    // Estimate coins (coins per correct answer)
    const coinsPerCorrect = this.challenge?.coinsForCorrectAnswer || 5;
    this.coinsEarned = this.score * coinsPerCorrect;

    // Estimate trophies
    if (this.scorePercent >= 80) {
      this.trophiesEarned = this.challenge?.trophies || 1;
    } else {
      this.trophiesEarned = 0;
    }

    this.celebrationText = this.getCelebrationText();
    this.feedbackText = this.getFeedbackText();
    this.petMood = this.learningService.calculatePetMood(this.score, this.totalQuestions);
  }

  /**
   * Get celebration text based on score
   */
  private getCelebrationText(): string {
    if (this.scorePercent >= 80) {
      return "🎉 Amazing! You're a superstar!";
    } else if (this.scorePercent >= 60) {
      return "👏 Great job! Keep it up!";
    } else if (this.scorePercent >= 40) {
      return "💪 Good effort! Practice makes perfect!";
    } else {
      return "🌟 Keep trying! You'll get better!";
    }
  }

  /**
   * Get feedback text based on score
   */
  private getFeedbackText(): string {
    if (this.scorePercent >= 80) {
      return this.challenge?.positiveFeedback ||
        "Excellent work! You really understood the material. Your skills are growing stronger every day!";
    } else if (this.scorePercent >= 60) {
      return "Good performance! Review the questions you missed and try again for an even better score.";
    } else {
      return this.challenge?.negativeFeedback ||
        "Don't give up! Learning takes practice. Review the material and try again - you've got this!";
    }
  }

  get scorePercentage(): number {
    return this.scorePercent;
  }

  get titleMessage(): string {
    return this.celebrationText || this.getCelebrationText();
  }

  get mascotImage(): string {
    switch (this.petMood.mood) {
      case 'happy':
        return '/assets/Images-Pet/Panda-Age1-Happy.png';
      case 'sad':
        return '/assets/Images-Pet/Panda-Age1-Curious.png';
      default:
        return '/assets/Images-Pet/Panda-Age1-Base.png';
    }
  }

  /**
   * Get score color class
   */
  get scoreColorClass(): string {
    if (this.scorePercent >= 80) return 'score-excellent';
    if (this.scorePercent >= 60) return 'score-good';
    if (this.scorePercent >= 40) return 'score-average';
    return 'score-needs-work';
  }

  /**
   * Try the challenge again
   */
  tryAgain(): void {
    if (this.challenge) {
      this.router.navigate(['/home/learning/questions', this.challenge.challengeId], {
        state: { challenge: this.challenge }
      });
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.router.navigate(['/home/learning/questions', id]);
      }
    }
  }

  /**
   * Go back to learning page
   */
  close(): void {
    this.router.navigate(['/home/learning']);
  }

  /**
   * Share results (placeholder)
   */
  shareResults(): void {
    console.log('Share results');
  }
}
