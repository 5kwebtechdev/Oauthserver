import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupermeButtonComponent } from '../../../../components/superme-button/superme-button.component';
import { LearningService } from '../../learning.service';
import { MoodService } from '../../../../services/mood.service';
import {
  Challenge,
  ChallengeQuestion,
  Question,
  QuestionAnswer,
  ChallengeSubmissionRequest
} from '../../learning.models';

@Component({
  selector: 'sm-questions-page',
  standalone: true,
  imports: [CommonModule, RouterModule, SupermeButtonComponent],
  templateUrl: './questions-page.component.html',
  styleUrls: ['./questions-page.component.scss']
})
export class QuestionsPageComponent implements OnInit, OnDestroy {
  // Challenge data
  challenge: Challenge | null = null;
  questions: Question[] = [];

  // Quiz state
  currentIndex = 0;
  selectedOption: string | null = null;
  selectedOptionIndex: number | null = null;
  showResult = false;
  isCorrect = false;
  showHint = false;
  hintText = '';

  // Tracking
  correctAnswers = 0;
  questionAnswers: { [key: string]: QuestionAnswer } = {};
  skippedQuestions: string[] = [];
  startTime: number = 0;

  // Timer
  timeLeft = 0; // seconds
  private timerId: any = null;

  // Hint system
  hintsRemaining = 2;
  hintCost = 3;

  // Loading state
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningService: LearningService,
    private moodService: MoodService
  ) { }

  ngOnInit(): void {
    this.startTime = Date.now();

    // Try to get challenge from navigation state first
    const navigationState = history.state;
    if (navigationState?.challenge) {
      this.initializeChallenge(navigationState.challenge);
    } else {
      // Load challenge from API
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.loadChallenge(Number(id));
      } else {
        console.error('[QuestionsPage] No challenge ID provided');
        this.isLoading = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  /**
   * Load challenge from API
   */
  private loadChallenge(challengeId: number): void {
    this.learningService.fetchChallengeById(challengeId).subscribe({
      next: (challenge: Challenge | null) => {
        if (challenge) {
          this.initializeChallenge(challenge);
        } else {
          console.error('[QuestionsPage] Challenge not found');
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        console.error('[QuestionsPage] Error loading challenge:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Initialize challenge data and start quiz
   */
  private initializeChallenge(challenge: Challenge): void {
    console.log('[QuestionsPage] Initializing challenge:', challenge.name);
    this.challenge = challenge;

    // Transform questions for UI
    this.questions = this.learningService.transformQuestions(challenge);
    console.log('[QuestionsPage] Questions loaded:', this.questions.length);

    // Initialize answer tracking
    this.questions.forEach(q => {
      this.questionAnswers[q.id] = {
        selected: null,
        correct: false,
        selectedOptionId: null
      };
    });

    // Start timer
    const minutes = this.learningService.parseTimeDuration(challenge.timeDuration);
    this.timeLeft = minutes * 60;
    this.startTimer();

    this.isLoading = false;
  }

  /**
   * Get current question
   */
  get currentQuestion(): Question | null {
    return this.questions[this.currentIndex] || null;
  }

  /**
   * Get question type for rendering
   */
  get questionType(): string {
    return this.currentQuestion?.type || 'mcq';
  }

  /**
   * Check if question has image
   */
  get hasQuestionImage(): boolean {
    return !!this.currentQuestion?.image && this.currentQuestion.image.length > 0;
  }

  /**
   * Check if options have images (visual question)
   */
  get hasOptionImages(): boolean {
    return this.questionType === 'visual' &&
      !!this.currentQuestion?.optionImages?.some((img: string) => img && img.length > 0);
  }

  // ==================== TIMER ====================

  startTimer(): void {
    this.stopTimer();
    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft -= 1;
      } else {
        this.stopTimer();
        this.onTimeUp();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  get timerText(): string {
    return this.learningService.formatTime(this.timeLeft);
  }

  /**
   * Handle time running out
   */
  private onTimeUp(): void {
    console.log('[QuestionsPage] Time is up!');
    // Auto-submit the quiz
    this.submitQuiz();
  }

  // ==================== ANSWER SELECTION ====================

  /**
   * Select an option
   */
  selectOption(optionText: string, index: number): void {
    if (this.showResult) return; // Lock after checking
    this.selectedOption = optionText;
    this.selectedOptionIndex = index;
  }

  /**
   * Check if option is selected
   */
  isSelected(optionText: string): boolean {
    return this.selectedOption === optionText;
  }

  /**
   * Check if option is correct (after showing result)
   */
  isOptionCorrect(optionText: string): boolean {
    return this.showResult && optionText === this.currentQuestion?.correctAnswer;
  }

  /**
   * Check if option is incorrectly selected
   */
  isIncorrect(optionText: string): boolean {
    return this.showResult &&
      this.selectedOption === optionText &&
      optionText !== this.currentQuestion?.correctAnswer;
  }

  // ==================== CHECK & NAVIGATION ====================

  /**
   * Check the current answer
   */
  check(): void {
    if (!this.selectedOption || !this.currentQuestion) return;

    this.isCorrect = this.selectedOption === this.currentQuestion.correctAnswer;

    // Track answer
    this.questionAnswers[this.currentQuestion.id] = {
      selected: this.selectedOption,
      correct: this.isCorrect,
      selectedOptionId: this.selectedOptionIndex
    };

    if (this.isCorrect) {
      this.correctAnswers++;
    }

    this.showResult = true;
  }

  /**
   * Go to next question or finish
   */
  next(): void {
    this.selectedOption = null;
    this.selectedOptionIndex = null;
    this.showResult = false;
    this.isCorrect = false;
    this.showHint = false;
    this.hintText = '';

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    } else {
      this.submitQuiz();
    }
  }

  /**
   * Skip current question
   */
  skip(): void {
    if (this.currentQuestion) {
      this.skippedQuestions.push(String(this.currentQuestion.id));
    }
    this.next();
  }

  /**
   * Check if on last question
   */
  get isLast(): boolean {
    return this.currentIndex === this.questions.length - 1;
  }

  /**
   * Close and go back
   */
  close(): void {
    // Could show confirmation dialog
    this.router.navigate(['/home/learning']);
  }

  // ==================== HINT SYSTEM ====================

  /**
   * Reveal hint
   */
  revealHint(): void {
    if (this.hintsRemaining <= 0 || !this.currentQuestion) return;

    if (this.currentQuestion.hint) {
      this.hintText = this.currentQuestion.hint;
      this.showHint = true;
      this.hintsRemaining--;
    } else {
      // Generate a generic hint
      this.hintText = this.generateHint();
      this.showHint = true;
      this.hintsRemaining--;
    }

    // Optionally call API to track hint usage
    if (this.challenge) {
      this.learningService.useHint(this.challenge.challengeId).subscribe({
        next: (response) => {
          console.log('[QuestionsPage] Hint used:', response);
        },
        error: (error) => {
          console.error('[QuestionsPage] Error using hint:', error);
        }
      });
    }
  }

  /**
   * Generate a generic hint
   */
  private generateHint(): string {
    if (!this.currentQuestion) return 'Think carefully about the question.';

    // Extract numbers from question text
    const text = this.currentQuestion.text || '';
    const nums = Array.from(text.matchAll(/(\d+)/g), (m: RegExpMatchArray) => Number(m[0]));

    if (nums.length >= 2) {
      return `Try adding ${nums[0]} and ${nums[1]} together.`;
    }

    return 'Think carefully about each option before selecting.';
  }

  // ==================== RESULT MESSAGE ====================

  get resultMessage(): string {
    if (!this.currentQuestion) return '';

    if (this.isCorrect) {
      return this.challenge?.positiveFeedback ||
        `Awesome! You got it right! Your skills are growing stronger every day!`;
    } else {
      return this.challenge?.negativeFeedback ||
        `That's not quite right. The correct answer was: ${this.currentQuestion.correctAnswer}. Keep trying!`;
    }
  }

  // ==================== QUIZ SUBMISSION ====================

  /**
   * Submit the quiz and navigate to results
   */
  private submitQuiz(): void {
    this.stopTimer();

    const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);

    // Build submission payload
    const questionAnswersPayload: { [key: string]: string } = {};
    Object.keys(this.questionAnswers).forEach(qId => {
      const answer = this.questionAnswers[qId];
      if (answer.selected) {
        questionAnswersPayload[qId] = answer.selected;
      }
    });

    const payload: ChallengeSubmissionRequest = {
      questionAnswers: questionAnswersPayload,
      timeTaken: timeTaken,
      skippedQuestions: this.skippedQuestions
    };

    console.log('[QuestionsPage] Submitting quiz:', payload);

    if (this.challenge) {
      this.learningService.submitChallenge(this.challenge.challengeId, payload).subscribe({
        next: (response) => {
          console.log('[QuestionsPage] Submission response:', response);
          this.moodService.refreshRewardStats();
          this.navigateToResults(response);
        },
        error: (error) => {
          console.error('[QuestionsPage] Submission error:', error);
          // Navigate to results with local data as fallback
          this.navigateToResults(null);
        }
      });
    } else {
      this.navigateToResults(null);
    }
  }

  /**
   * Navigate to results page
   */
  private navigateToResults(serverResponse: any): void {
    const challengeId = this.challenge?.challengeId || this.route.snapshot.paramMap.get('id');

    this.router.navigate(['/home/learning/result', challengeId], {
      state: {
        challenge: this.challenge,
        serverResponse: serverResponse,
        localResults: {
          correctCount: this.correctAnswers,
          totalQuestions: this.questions.length,
          timeTaken: Math.floor((Date.now() - this.startTime) / 1000),
          skippedCount: this.skippedQuestions.length
        }
      }
    });
  }

  // ==================== PROGRESS ====================

  get progressPercent(): number {
    if (this.questions.length === 0) return 0;
    return ((this.currentIndex + 1) / this.questions.length) * 100;
  }

  get questionCountText(): string {
    return `${this.currentIndex + 1} / ${this.questions.length}`;
  }
}
