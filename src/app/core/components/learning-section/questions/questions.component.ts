import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { HttpClientModule } from '@angular/common/http';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePopupComponent, SupermePopupConfig } from '../../superme-popup/superme-popup.component';
import { Challenge, ChallengeQuestion, QuestionOption } from 'src/app/core/models/learning.models';
import { LearningService } from 'src/app/core/services/learning.service';
import { PetAgeService } from 'src/app/core/services/pet-age.service';

interface Question {
    id: number;
    text: string;
    options: string[];
    correctAnswer: string;
    correctOptionId?: number | null;
    image: string;
    hint: string;
    type?: 'mcq' | 'true-false' | 'visual'; // Added type field to differentiate question types
    optionImages?: string[]; // Added for visual options
    visualOptions?: VisualOption[];
    contentType?: 'text-only' | 'image-only' | 'text-and-image'; // Added to differentiate question content types
    positiveFeedback?: string | null;
    negativeFeedback?: string | null;
    negativeFeedbackTryAgain?: string | null;
}

interface VisualOption {
    id: number;
    label: string;
    imageUrl: string;
    answerValue: string;
    altText: string;
}

@Component({
    selector: 'app-questions',
    standalone: true,
    imports: [CommonModule, IonicModule, HttpClientModule, SupermeButtonComponent, SupermePopupComponent],
    providers: [LearningService],
    templateUrl: './questions.component.html',
    styleUrls: ['./questions.component.scss']
})
export class QuestionsComponent implements OnInit, OnDestroy {
    readonly isWebBrowser = !Capacitor.isNativePlatform();

    // Heading shown in the navigator
    quizTitle = 'Apple Orchard Math Challenge';

    /** Zero-based index of the current question (used by the progress bar binding) */
    currentQuestionIndex = 0;

    /** Total number of questions in the quiz; default to 5 to match template text */
    totalQuestions = 5;

    // Reference to ion-content for scrolling
    @ViewChild(IonContent) content!: IonContent;

    // Define the correct answer for the current question (in a real app, this would come from data)
    correctAnswer = '5';

    // Track the selected answer
    selectedAnswer: string | null = null;

    // Track the currently selected option for styling
    selectedOption: string | null = null;

    // Track selected visual option by backend ID so image-only options are selectable
    selectedVisualOptionId: number | null = null;

    // Track if answer has been checked
    answerChecked = false;

    // Track if answer is correct
    isAnswerCorrect = false;

    // Popup visibility
    showPopup = false;

    // Popup message
    popupMessage = '';

    // Popup title
    popupTitle = '';

    // Popup background color
    popupBackgroundColor = '';

    // Popup text color
    popupTextColor = '';

    // Next button text
    nextButtonText = '';

    // Next button type
    nextButtonType = '';

    // Hint visibility
    showHint = false;

    // Hint usage tracking
    hintsUsed = 0;          // hints consumed in this challenge session
    maxHints = 2;           // per-challenge session limit
    coinsPerHint = 3;
    totalCoins = 100; // Default value, should be fetched from user profile
    isHintLoading = false;
    currentHintText = '';
    hintErrorText = '';
    hintLimitReached = false;
    questionHints: { [questionId: number]: string } = {}; // cached hint per question

    // Leave challenge popup configuration
    leaveChallengePopupConfig: SupermePopupConfig = {
        image: 'assets/Images-Transparent/Image-Leaving-Learning.png',
        imageAlt: 'Leaving Learning',
        heading: 'You\'re Making Great Progress!',
        subtitle: 'If you leave now, you\'ll need to restart from the beginning.',
        primaryCTA: {
            text: 'Keep going',
            buttonStyle: 'green',
            callback: () => this.showLeaveChallengePopup = false,
            buttonMedium: true
        },
        secondaryCTA: {
            text: 'Exit',
            buttonStyle: 'bronze-transparent',
            callback: () => this.quitQuiz(),
            buttonMedium: true
        },
        showCloseButton: false,
        backdrop: true
    };

    // New timer expiration popup configuration for content time exhaust
    contentTimeExhaustPopupConfig: SupermePopupConfig = {
        image: 'assets/Images-Transparent/Image-Content-TimeExhaust.png',
        imageAlt: 'Time\'s Up',
        heading: 'Time\'s Up!',
        subtitle: 'The timer ran out, but don\'t worry! You can try again. Ready for another round?',
        primaryCTA: {
            text: 'Try Again',
            buttonStyle: 'green',
            callback: () => this.restartQuiz(),
            buttonMedium: true
        },
        secondaryCTA: {

            text: 'Quit',
            buttonStyle: 'bronze-transparent',
            callback: () => this.quitQuiz(),
            buttonMedium: true
        },
        showCloseButton: false,
        backdrop: true
    };

    // Leave challenge popup visibility
    showLeaveChallengePopup = false;

    // Content time exhaust popup visibility
    showContentTimeExhaustPopup = false;

    // Challenge data from backend
    challenge: Challenge | null = null;

    // Questions will be loaded from the backend via route state or service
    questions: Question[] = [];

    readonly trueFalseOptions = ['True', 'False'];

    // Track answers for each question
    questionAnswers: { [key: number]: { selected: string | null, correct: boolean, selectedOptionId: number | null } } = {};

    // Timer properties
    totalTimeSeconds = 300; // Default 5 minutes
    remainingTimeSeconds = 300;
    timerInterval: any;
    timerDisplay = '05:00';

    // Submission state
    isSubmitting = false;
    private returnUrl = '/authed/content';
    private profileUserId: string | number | null = null;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private learningService: LearningService,
        private petAgeService: PetAgeService
    ) { }

    ngOnInit() {
        // getCurrentNavigation() is null by the time ngOnInit runs (navigation already complete).
        // Read the passed challenge from history.state, which persists after navigation.
        const nav = this.router.getCurrentNavigation();
        const stateChallenge: Challenge | undefined =
            nav?.extras?.state?.['challenge'] ?? (history as any)?.state?.['challenge'];
        const source = nav?.extras?.state?.['source'] ?? (history as any)?.state?.['source'];
        const ownProfile = nav?.extras?.state?.['ownProfile'] ?? (history as any)?.state?.['ownProfile'];
        const stateUserId = nav?.extras?.state?.['forUserId'] ?? (history as any)?.state?.['forUserId'];
        this.profileUserId = ownProfile === true && stateUserId != null ? stateUserId : null;
        if (typeof source === 'string' && source.startsWith('/authed/')) {
            this.returnUrl = source;
        }

        const challengeId: number = stateChallenge?.challengeId
            ?? Number(this.route.snapshot.paramMap.get('id'));

        if (!challengeId) {
            console.error('No challenge ID available');
            this.router.navigate(['/authed/content']);
            return;
        }

        // If the description page already fetched the challenge and passed it via
        // router state, use it immediately so the quiz renders on the first tap
        // without waiting for another network round-trip.
        if (stateChallenge?.questions?.length) {
            this.challenge = stateChallenge;
            this.initializeQuiz();
            return;
        }

        // Fallback: fetch from API (e.g. direct URL navigation or missing state)
        this.learningService.fetchChallengeById(challengeId, this.profileUserId).subscribe({
            next: (challenge) => {
                if (!challenge) {
                    this.router.navigate(['/authed/content']);
                    return;
                }
                this.challenge = challenge;
                this.initializeQuiz();
            },
            error: (error) => {
                console.error('Error loading challenge:', error);
                if (stateChallenge) {
                    this.challenge = stateChallenge;
                    this.initializeQuiz();
                } else {
                    this.router.navigate(['/authed/content']);
                }
            }
        });
    }

    initializeQuiz() {
        if (!this.challenge) return;

        // Set quiz title
        this.quizTitle = this.challenge.name;

        // Transform backend questions to UI Question format
        this.questions = this.transformQuestions(this.challenge.questions);
        this.totalQuestions = this.questions.length;

        // Initialize question answers tracking
        for (let i = 0; i < this.totalQuestions; i++) {
            this.questionAnswers[this.questions[i].id] = { selected: null, correct: false, selectedOptionId: null };
        }

        // Reset hint state for this challenge session
        this.hintsUsed = 0;
        this.hintLimitReached = false;
        this.questionHints = {};
        this.showHint = false;
        this.currentHintText = '';
        this.hintErrorText = '';

        // Prefer the duration supplied by the API. Different challenge endpoints
        // expose it as timeDuration, durationMinutes, or estimatedTimeMinutes.
        const challengeWithDuration = this.challenge as Challenge & {
            durationMinutes?: unknown;
            duration?: unknown;
            timeLimitMinutes?: unknown;
        };
        [
            challengeWithDuration.timeDuration,
            challengeWithDuration.durationMinutes,
            challengeWithDuration.estimatedTimeMinutes,
            challengeWithDuration.duration,
            challengeWithDuration.timeLimitMinutes
        ].some((duration) => this.parseTimeDuration(duration));

        // Load first question
        this.loadCurrentQuestion();

        // Start the timer
        this.startTimer();
    }

    transformQuestions(backendQuestions: ChallengeQuestion[]): Question[] {
        return backendQuestions.map(q => {
            // Determine question type — check both boolean flags and answerType string
            let type: 'mcq' | 'true-false' | 'visual' = 'mcq';
            if (q.trueFalse || q.answerType === 'TRUE_FALSE') type = 'true-false';
            else if (q.visual || q.answerType === 'VISUALS') type = 'visual';

            // Determine content type based on what's available
            let contentType: 'text-only' | 'image-only' | 'text-and-image' = 'text-only';
            if (q.questionText && q.questionImageUrl) contentType = 'text-and-image';
            else if (q.questionImageUrl) contentType = 'image-only';

            // Extract options and find correct answer
            const options = q.options.map((opt, index) => this.getOptionDisplayText(opt, index));
            const correctOption = q.options.find(opt => opt.isCorrect);
            const correctOptionIndex = correctOption ? q.options.indexOf(correctOption) : 0;
            const correctAnswer = correctOption
                ? this.getOptionAnswerValue(correctOption, correctOptionIndex)
                : this.getOptionAnswerValue(q.options[0], 0);

            // Extract option images for visual questions
            const optionImages = q.options.map(opt => opt.optionImageUrl || '');
            const visualOptions = q.options.map((opt, index) => {
                const label = (opt.optionText || '').trim();
                const fallbackLabel = `Option ${index + 1}`;
                return {
                    id: opt.optionId,
                    label,
                    imageUrl: opt.optionImageUrl || '',
                    answerValue: this.getOptionAnswerValue(opt, index),
                    altText: label || fallbackLabel
                };
            });

            return {
                id: q.questionId,
                text: q.questionText,
                options: options,
                correctAnswer: correctAnswer,
                correctOptionId: correctOption?.optionId ?? null,
                image: q.questionImageUrl || '',
                hint: q.hint || '',
                type: type,
                optionImages: optionImages,
                visualOptions,
                contentType: contentType,
                positiveFeedback: q.positiveFeedback,
                negativeFeedback: q.negativeFeedback,
                negativeFeedbackTryAgain: q.negativeFeedbackTryAgain
            };
        });
    }

    private getOptionDisplayText(option: QuestionOption, index: number): string {
        return (option?.optionText || '').trim() || `Option ${index + 1}`;
    }

    private getOptionAnswerValue(option: QuestionOption | undefined, index: number): string {
        if (!option) return `Option ${index + 1}`;
        return (option.optionText || '').trim() || String(option.optionId);
    }

    get currentQuestion(): Question | null {
        return this.questions[this.currentQuestionIndex] ?? null;
    }

    get questionPositionLabel(): string {
        return `${this.currentQuestionIndex + 1}/${this.totalQuestions}`;
    }

    get questionImageAlt(): string {
        return `${this.quizTitle} question ${this.currentQuestionIndex + 1} illustration`;
    }

    getOptionLabel(index: number): string {
        return String.fromCharCode(65 + index);
    }

    isVisualOptionCorrect(option: VisualOption): boolean {
        const currentQuestion = this.currentQuestion;
        if (!currentQuestion) return false;

        return currentQuestion.correctOptionId !== null && currentQuestion.correctOptionId !== undefined
            ? option.id === currentQuestion.correctOptionId
            : option.answerValue === currentQuestion.correctAnswer;
    }

    parseTimeDuration(duration: unknown): boolean {
        const value = String(duration ?? '').trim();
        if (!value) return false;

        const namedDurations: Record<string, number> = {
            SHORT: 3,
            MEDIUM: 5,
            LONG: 10
        };
        const numericDuration = typeof duration === 'number' ? duration : Number(value);
        const durationMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:min|minute)/i);
        const minutes = Number.isFinite(numericDuration) && numericDuration > 0
            ? numericDuration
            : durationMatch
                ? Number(durationMatch[1])
                : namedDurations[value.toUpperCase()];

        if (!Number.isFinite(minutes) || minutes <= 0) return false;

        this.totalTimeSeconds = Math.round(minutes * 60);
        this.remainingTimeSeconds = this.totalTimeSeconds;
        this.updateTimerDisplay();
        return true;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.remainingTimeSeconds--;
            this.updateTimerDisplay();

            if (this.remainingTimeSeconds <= 0) {
                this.stopTimer();
                this.onTimerExpire();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.remainingTimeSeconds / 60);
        const seconds = this.remainingTimeSeconds % 60;
        this.timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    ngOnDestroy() {
        this.stopTimer();
    }

    loadCurrentQuestion() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        this.correctAnswer = currentQuestion.correctAnswer;
        this.selectedAnswer = this.questionAnswers[currentQuestion.id].selected;
        this.selectedVisualOptionId = this.questionAnswers[currentQuestion.id].selectedOptionId;
        // Reset answer checked state for new question
        this.answerChecked = false;
        this.selectedOption = null;

        // Restore hint state for this question (already fetched hints stay visible)
        const cached = this.questionHints[currentQuestion.id];
        this.currentHintText = cached || '';
        this.showHint = !!cached;
        this.hintErrorText = '';

    }

    onCancel() {
        // Show the leave challenge popup instead of navigating directly
        this.showLeaveChallengePopup = true;
    }

    /**
     * Handle timer expiration - shows the content time exhaust popup
     */
    onTimerExpire() {
        // Show the content time exhaust popup
        this.showContentTimeExhaustPopup = true;
    }

    /**
     * Handle answer selection
     * @param selectedAnswer The text of the selected answer
     */
    selectAnswer(selectedAnswer: string, selectedOptionId?: number) {
        // Only allow selection if answer hasn't been checked yet
        if (!this.answerChecked) {
            const normalizedAnswer = (selectedAnswer || '').trim()
                || (selectedOptionId !== undefined && selectedOptionId !== null ? String(selectedOptionId) : '');

            if (!normalizedAnswer) return;

            // Deselect any previously selected option
            this.selectedOption = null;
            this.selectedVisualOptionId = null;

            // Set the selected answer and option
            this.selectedAnswer = normalizedAnswer;
            this.selectedOption = normalizedAnswer;
            this.selectedVisualOptionId = selectedOptionId ?? null;

            // Get the current question from backend data to find option ID
            const currentQuestion = this.questions[this.currentQuestionIndex];
            const currentQuestionId = currentQuestion.id;

            // Find the corresponding backend question to get the option ID
            if (this.challenge?.questions) {
                const backendQuestion = this.challenge.questions.find(q => q.questionId === currentQuestionId);
                if (backendQuestion) {
                    const selectedOption = selectedOptionId !== undefined && selectedOptionId !== null
                        ? backendQuestion.options.find(opt => opt.optionId === selectedOptionId)
                        : backendQuestion.options.find((opt, index) => this.getOptionAnswerValue(opt, index) === normalizedAnswer);
                    if (selectedOption) {
                        this.questionAnswers[currentQuestionId].selectedOptionId = selectedOption.optionId;
                    }
                }
            }

            // Save the selected answer for this question
            this.questionAnswers[currentQuestionId].selected = normalizedAnswer;

            // Scroll to the newly enabled Check button when it sits below the fold.
            this.scrollToBottom();
        }
    }

    /**
     * Scroll to bottom of the page
     */
    private scrollToBottom() {
        setTimeout(() => {
            if (this.content) {
                this.content.scrollToBottom(300);
            }
        }, 100);
    }

    onCheck() {
        if (this.selectedAnswer !== null && !this.answerChecked) {
            this.answerChecked = true;

            const currentQuestionId = this.questions[this.currentQuestionIndex].id;
            const currentQuestion = this.questions[this.currentQuestionIndex];
            const currentAnswer = this.questionAnswers[currentQuestionId];
            this.isAnswerCorrect = currentQuestion.type === 'visual' && currentQuestion.correctOptionId !== null && currentQuestion.correctOptionId !== undefined
                ? currentAnswer.selectedOptionId === currentQuestion.correctOptionId
                : this.selectedAnswer === this.correctAnswer;
            this.questionAnswers[currentQuestionId].correct = this.isAnswerCorrect;

            this.showPopup = true;

            if (this.isAnswerCorrect) {
                // Correct answer - use current question positiveFeedback from backend or fallback
                this.setFeedbackPopupContent(
                    this.getQuestionFeedback(currentQuestion, true),
                    'Correct!'
                );
                this.popupBackgroundColor = '#DBEFDC';
                this.popupTextColor = '#4CAF50';
                // Check if this is the last question
                if (this.currentQuestionIndex >= this.totalQuestions - 1) {
                    this.nextButtonText = 'See Result';
                } else {
                    this.nextButtonText = 'Next Question';
                }
                this.nextButtonType = 'green';

            } else {
                // Incorrect answer - use current question negativeFeedback from backend or fallback
                this.setFeedbackPopupContent(
                    this.getQuestionFeedback(currentQuestion, false),
                    'Incorrect!'
                );
                this.popupBackgroundColor = '#FDCBCC';
                this.popupTextColor = '#BB2124';
                // Check if this is the last question
                if (this.currentQuestionIndex >= this.totalQuestions - 1) {
                    this.nextButtonText = 'See Result';
                } else {
                    this.nextButtonText = 'Got it, next question';
                }
                this.nextButtonType = 'bronze';
            }
        }
    }

    private getQuestionFeedback(question: Question, isCorrect: boolean): string {
        if (isCorrect) {
            return (
                question.positiveFeedback ||
                this.challenge?.positiveFeedback ||
                'Correct!'
            );
        }

        return (
            question.negativeFeedback ||
            question.negativeFeedbackTryAgain ||
            this.challenge?.negativeFeedback ||
            this.challenge?.negativeFeedbackTryAgain ||
            'Incorrect!'
        );
    }

    private setFeedbackPopupContent(feedback: string, fallbackTitle: string): void {
        const cleanFeedback = (feedback || '').trim();

        if (!cleanFeedback) {
            this.popupTitle = fallbackTitle;
            this.popupMessage = '';
            return;
        }

        const feedbackParts = cleanFeedback.match(/^(.+?[.!?])\s+(.+)$/);

        if (feedbackParts) {
            this.popupTitle = feedbackParts[1].trim();
            this.popupMessage = feedbackParts[2].trim();
            return;
        }

        this.popupTitle = cleanFeedback;
        this.popupMessage = '';
    }

    /**
     * Handle next button click
     */
    onNext() {
        // Hide the popup
        this.showPopup = false;

        // Check if this was the last question
        if (this.currentQuestionIndex >= this.totalQuestions - 1) {
            // Submit all answers to backend
            this.submitChallengeAnswers();
            return;
        }

        // Move to next question
        this.currentQuestionIndex++;
        this.loadCurrentQuestion();

        // Reset for next question (in a real app, you would load the next question)
        this.selectedAnswer = null;
        this.selectedOption = null;
        this.selectedVisualOptionId = null;
        this.answerChecked = false;
        this.isAnswerCorrect = false;

    }

    /**
     * Submit challenge answers to backend
     */
    submitChallengeAnswers() {
        if (!this.challenge || this.isSubmitting) {
            return;
        }

        this.isSubmitting = true;
        this.stopTimer();

        // Prepare answers payload in the format expected by the backend
        const questionAnswers: { [key: string]: string } = {};
        const skippedQuestions: number[] = [];

        // Convert our internal tracking to the expected format
        this.questions.forEach(question => {
            const answer = this.questionAnswers[question.id];
            if (answer.selected !== null && answer.selected !== undefined && answer.selected !== '') {
                let answerValue = answer.selected;

                if (question.type === 'true-false') {
                    // API requires lowercase "true" / "false"
                    answerValue = answerValue.toLowerCase();
                } else if (question.type === 'visual') {
                    // Decision rule: optionText != null → send optionText, else → send optionId as string
                    const backendQ = this.challenge?.questions.find(q => q.questionId === question.id);
                    if (backendQ && answer.selectedOptionId !== null && answer.selectedOptionId !== undefined) {
                        const selectedOpt = backendQ.options.find(o => o.optionId === answer.selectedOptionId);
                        if (selectedOpt) {
                            answerValue = (selectedOpt.optionText || '').trim() || String(selectedOpt.optionId);
                        }
                    }
                }

                questionAnswers[String(question.id)] = answerValue;
            } else {
                // API expects number[] for skippedQuestions
                skippedQuestions.push(question.id);
            }
        });

        // If there are skipped questions, confirm submission
        if (skippedQuestions.length > 0) {
            const confirmSubmit = confirm(`You have ${skippedQuestions.length} unanswered question(s). Do you want to submit anyway?`);
            if (!confirmSubmit) {
                this.isSubmitting = false;
                return;
            }
        }

        // Create payload that matches the expected format
        const payload = {
            questionAnswers: questionAnswers,
            timeTaken: this.totalTimeSeconds - this.remainingTimeSeconds,
            skippedQuestions: skippedQuestions
        };

        console.log('Submitting challenge:', this.challenge.challengeId);
        console.log('Full payload:', payload);
        console.log('JSON payload:', JSON.stringify(payload, null, 2));

        // Use the learning service to submit with the new format
        this.learningService.submitChallengeNewFormat(this.challenge.challengeId, payload, this.profileUserId).subscribe({
            next: (response) => {
                console.log('Submission successful:', response);
                this.petAgeService.recordActivity(this.challenge?.category === 'QUIZ' ? 'quizzes' : 'puzzles');
                // Navigate to result page with response data
                this.router.navigate(['/authed/content/result'], {
                    replaceUrl: true,
                    state: {
                        submissionResult: response,
                        challenge: this.challenge,
                        timeTaken: this.totalTimeSeconds - this.remainingTimeSeconds
                    }
                });
                this.isSubmitting = false;
            },
            error: (error) => {
                console.error('Submission failed:', error);
                this.isSubmitting = false;

                // More detailed error handling
                let errorMessage = 'Failed to submit answers. Please try again.';

                if (error.status === 400) {
                    // Handle bad request - could be validation error or already completed challenge
                    if (error.error && typeof error.error === 'object') {
                        if (error.error.message) {
                            errorMessage = error.error.message;
                        } else if (error.error.celebrationText) {
                            // This looks like a successful response despite the 400 status
                            // Navigate to result page with the error response data
                            this.router.navigate(['/authed/content/result'], {
                                replaceUrl: true,
                                state: {
                                    submissionResult: error.error,
                                    challenge: this.challenge,
                                    timeTaken: this.totalTimeSeconds - this.remainingTimeSeconds
                                }
                            });
                            return;
                        }
                    } else {
                        errorMessage = 'Invalid submission data. Please check your answers and try again.';
                    }
                } else if (error.status === 409) {
                    // Handle the case where challenge is already completed
                    if (error.error && error.error.celebrationText) {
                        // Navigate to result page with the error response data
                        this.router.navigate(['/authed/content/result'], {
                            replaceUrl: true,
                            state: {
                                submissionResult: error.error,
                                challenge: this.challenge,
                                timeTaken: this.totalTimeSeconds - this.remainingTimeSeconds
                            }
                        });
                        return;
                    }
                    errorMessage = 'Challenge already completed!';
                } else if (error.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                // Show error popup or navigate anyway with local data
                alert(errorMessage);
            }
        });
    }

    /**
     * Toggle hint for the current question.
     * - Each challenge session allows maxHints (2) total hint fetches.
     * - Once a hint is fetched for a question it is cached; re-toggling
     *   the same question's hint never consumes another slot.
     * - Restarting the challenge resets hintsUsed and the cache.
     */
    toggleHint() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        if (!currentQuestion?.id) return;

        // If this question's hint is already cached, just toggle visibility
        if (this.questionHints[currentQuestion.id]) {
            this.currentHintText = this.questionHints[currentQuestion.id];
            this.showHint = !this.showHint;
            return;
        }

        if (this.isHintLoading) return;

        if (this.hintsUsed >= this.maxHints) {
            this.hintLimitReached = true;
            return;
        }

        if (this.totalCoins < this.coinsPerHint) return;

        this.isHintLoading = true;

        this.learningService.useHint(currentQuestion.id, this.profileUserId).subscribe({
            next: (response) => {
                this.isHintLoading = false;
                this.hintErrorText = '';

                const hintText = response.hint || '';
                this.questionHints[currentQuestion.id] = hintText;
                this.currentHintText = hintText;
                this.showHint = true;

                this.hintsUsed++;
                this.totalCoins -= this.coinsPerHint;

                if (this.hintsUsed >= this.maxHints) {
                    this.hintLimitReached = true;
                }
            },
            error: (error) => {
                this.isHintLoading = false;

                if (error.error?.message === 'Hint limit reached') {
                    this.hintLimitReached = true;
                    return;
                }

                // Show API error message (e.g. "Insufficient coins.") in the hint area
                this.hintErrorText = error.error?.message || 'Unable to use hint. Please try again.';
            }
        });
    }

    quitQuiz() {
        this.stopTimer();
        // The challenge now opens directly from its listing, so leaving should
        // return there instead of reopening the retired detail/start screen.
        this.router.navigateByUrl(this.returnUrl);
    }

    restartQuiz() {
        // Try to refresh the challenge from backend if we have an id so the quiz
        // truly restarts (useful when questions are randomized server-side).
        const challengeId = this.challenge?.challengeId;
        if (challengeId) {
            this.learningService.fetchChallengeById(challengeId, this.profileUserId).subscribe({
                next: (challenge) => {
                    this.challenge = challenge;
                    // Reinitialize quiz state from fresh challenge data
                    this.initializeQuiz();
                    // Ensure any popups are closed
                    this.showLeaveChallengePopup = false;
                    this.showContentTimeExhaustPopup = false;
                },
                error: (err) => {
                    console.error('Failed to refresh challenge on restart:', err);
                    // fallback to local restart behavior
                    this.performLocalRestart();
                }
            });
            return;
        }

        // fallback when no challenge id available
        this.performLocalRestart();
    }

    /** Perform a local restart without refetching from the server */
    private performLocalRestart() {
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.selectedOption = null;
        this.selectedVisualOptionId = null;
        this.answerChecked = false;
        this.showHint = false;
        this.hintsUsed = 0;
        this.showLeaveChallengePopup = false;
        this.showContentTimeExhaustPopup = false;

        // Reset timer
        this.stopTimer();
        this.remainingTimeSeconds = this.totalTimeSeconds;
        this.updateTimerDisplay();
        this.startTimer();

        this.loadCurrentQuestion();
    }

    /**
     * Show the content time exhaust popup
     */
    showContentTimeExhaustPopupMethod() {
        this.showContentTimeExhaustPopup = true;
    }
}
