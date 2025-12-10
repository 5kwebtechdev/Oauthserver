import { Component, ViewChildren, ViewChild, QueryList, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent, MindfulPopupConfig } from '../../mindful-popup/mindful-popup.component';
import { Challenge, ChallengeQuestion, QuestionOption } from 'src/app/core/models/learning.models';
import { LearningService } from 'src/app/core/services/learning.service';

interface Question {
    id: number;
    text: string;
    options: string[];
    correctAnswer: string;
    image: string;
    hint: string;
    type?: 'mcq' | 'true-false' | 'visual'; // Added type field to differentiate question types
    optionImages?: string[]; // Added for visual options
    contentType?: 'text-only' | 'image-only' | 'text-and-image'; // Added to differentiate question content types
}

@Component({
    selector: 'app-questions',
    standalone: true,
    imports: [CommonModule, IonicModule, HttpClientModule, MindfulNavigatorComponent, MindfulButtonComponent, MindfulPopupComponent],
    providers: [LearningService],
    templateUrl: './questions.component.html',
    styleUrls: ['./questions.component.scss']
})
export class QuestionsComponent implements OnInit, OnDestroy {
    // Heading shown in the navigator
    quizTitle = 'Apple Orchard Math Challenge';

    /** Zero-based index of the current question (used by the progress bar binding) */
    currentQuestionIndex = 0;

    /** Total number of questions in the quiz; default to 5 to match template text */
    totalQuestions = 5;

    // Store references to all answer buttons
    @ViewChildren(MindfulButtonComponent) answerButtons!: QueryList<MindfulButtonComponent>;

    // Reference to ion-content for scrolling
    @ViewChild(IonContent) content!: IonContent;

    // Define the correct answer for the current question (in a real app, this would come from data)
    correctAnswer = '5';

    // Track the selected answer
    selectedAnswer: string | null = null;

    // Track the currently selected option for styling
    selectedOption: string | null = null;

    // Track if answer has been checked
    answerChecked = false;

    // Track if answer is correct
    isAnswerCorrect = false;

    // Popup visibility
    showPopup = false;

    // Popup message
    popupMessage = '';

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
    hintsUsed = 0;
    maxHints = 2;
    coinsPerHint = 3;
    totalCoins = 100; // Default value, should be fetched from user profile

    // Timer expiration popup configuration
    timerExpirationPopupConfig: MindfulPopupConfig = {
        image: 'assets/Images-Transparent/Image-Leaving-Learning.png',
        imageAlt: 'Time\'s Up',
        heading: 'Time\'s Up!',
        subtitle: 'The timer ran out, but don\'t worry! You can try again. Ready for another round?',
        primaryCTA: {
            text: 'Quit',
            buttonStyle: 'bronze-transparent',
            callback: () => this.quitQuiz()
        },
        secondaryCTA: {
            text: 'Try Again',
            buttonStyle: 'green',
            callback: () => this.restartQuiz()
        },
        showCloseButton: false,
        backdrop: true
    };

    // New timer expiration popup configuration for content time exhaust
    contentTimeExhaustPopupConfig: MindfulPopupConfig = {
        image: 'assets/Images-Transparent/Image-Content-TimeExhaust.png',
        imageAlt: 'Time\'s Up',
        heading: 'Time\'s Up!',
        subtitle: 'The timer ran out, but don\'t worry! You can try again. Ready for another round?',
        primaryCTA: {
            text: 'Quit',
            buttonStyle: 'bronze-transparent',
            callback: () => this.quitQuiz()
        },
        secondaryCTA: {
            text: 'Try Again',
            buttonStyle: 'green',
            callback: () => this.restartQuiz()
        },
        showCloseButton: false,
        backdrop: true
    };

    // Timer expiration popup visibility
    showTimerExpirationPopup = false;

    // Content time exhaust popup visibility
    showContentTimeExhaustPopup = false;

    // Challenge data from backend
    challenge: Challenge | null = null;

    // Questions will be loaded from the backend via route state or service
    questions: Question[] = [];

    // Track answers for each question
    questionAnswers: { [key: number]: { selected: string | null, correct: boolean, selectedOptionId: number | null } } = {};

    // Timer properties
    totalTimeSeconds = 300; // Default 5 minutes
    remainingTimeSeconds = 300;
    timerInterval: any;
    timerDisplay = '05:00';

    // Submission state
    isSubmitting = false;

    // (No rightActions used — we project the inline SVG timer into the navigator slot)

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private learningService: LearningService
    ) { }

    ngOnInit() {
        // Get challenge from router state or fetch from API
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras?.state as { challenge?: Challenge };

        if (state?.challenge) {
            this.challenge = state.challenge;
            this.initializeQuiz();
        } else {
            // If no state, fetch from API using challengeId from route params
            const challengeId = this.route.snapshot.paramMap.get('id');
            if (challengeId) {
                this.learningService.fetchChallengeById(Number(challengeId)).subscribe({
                    next: (challenge) => {
                        this.challenge = challenge;
                        this.initializeQuiz();
                    },
                    error: (error) => {
                        console.error('Error loading challenge:', error);
                        this.router.navigate(['/authed/content']);
                    }
                });
            } else {
                console.error('No challenge data or ID available');
                this.router.navigate(['/authed/content']);
            }
        }
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

        // Parse and set timer from timeDuration (e.g., "5 Minutes")
        this.parseTimeDuration(this.challenge.timeDuration);

        // Load first question
        this.loadCurrentQuestion();

        // Start the timer
        this.startTimer();
    }

    transformQuestions(backendQuestions: ChallengeQuestion[]): Question[] {
        return backendQuestions.map(q => {
            // Determine question type
            let type: 'mcq' | 'true-false' | 'visual' = 'mcq';
            if (q.trueFalse) type = 'true-false';
            else if (q.visual) type = 'visual';

            // Determine content type based on what's available
            let contentType: 'text-only' | 'image-only' | 'text-and-image' = 'text-only';
            if (q.questionText && q.questionImageUrl) contentType = 'text-and-image';
            else if (q.questionImageUrl) contentType = 'image-only';

            // Extract options and find correct answer
            const options = q.options.map(opt => opt.optionText);
            const correctOption = q.options.find(opt => opt.isCorrect);
            const correctAnswer = correctOption?.optionText || options[0];

            // Extract option images for visual questions
            const optionImages = q.options.map(opt => opt.optionImageUrl || '');

            return {
                id: q.questionId,
                text: q.questionText,
                options: options,
                correctAnswer: correctAnswer,
                image: q.questionImageUrl || '',
                hint: q.hint || '',
                type: type,
                optionImages: optionImages,
                contentType: contentType
            };
        });
    }

    parseTimeDuration(duration: string) {
        // Parse duration string like "5 Minutes" or "10 Minutes"
        const match = duration.match(/(\d+)\s*min/i);
        if (match) {
            const minutes = parseInt(match[1]);
            this.totalTimeSeconds = minutes * 60;
            this.remainingTimeSeconds = this.totalTimeSeconds;
            this.updateTimerDisplay();
        }
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
        // Reset answer checked state for new question
        this.answerChecked = false;
        this.showHint = false;
        this.selectedOption = null;

        // Reset all buttons when loading a new question
        setTimeout(() => {
            this.answerButtons.forEach(button => {
                button.correct = false;
                button.incorrect = false;
            });
        }, 0);
    }

    onCancel() {
        // Show the timer expiration popup instead of navigating directly
        this.showTimerExpirationPopup = true;
    }

    onRightAction(event?: { index: number, action: any }) {
        // Placeholder for right-action behavior (open help/info etc.)
        console.log('Navigator right action clicked', event ?? 'clicked');
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
    selectAnswer(selectedAnswer: string) {
        // Only allow selection if answer hasn't been checked yet
        if (!this.answerChecked) {
            // Deselect any previously selected option
            this.selectedOption = null;

            // Set the selected answer and option
            this.selectedAnswer = selectedAnswer;
            this.selectedOption = selectedAnswer;

            // Get the current question from backend data to find option ID
            const currentQuestion = this.questions[this.currentQuestionIndex];
            const currentQuestionId = currentQuestion.id;

            // Find the corresponding backend question to get the option ID
            if (this.challenge?.questions) {
                const backendQuestion = this.challenge.questions.find(q => q.questionId === currentQuestionId);
                if (backendQuestion) {
                    const selectedOption = backendQuestion.options.find(opt => opt.optionText === selectedAnswer);
                    if (selectedOption) {
                        this.questionAnswers[currentQuestionId].selectedOptionId = selectedOption.optionId;
                    }
                }
            }

            // Save the selected answer for this question
            this.questionAnswers[currentQuestionId].selected = selectedAnswer;

            // For True/False questions, we need to visually update the buttons
            if (this.questions[this.currentQuestionIndex].type === 'true-false') {
                // The visual update is handled by the [class.selected] binding in the template
                return;
            }

            // For Visual questions, we need to visually update the options
            if (this.questions[this.currentQuestionIndex].type === 'visual') {
                // The visual update is handled by the [class.selected] binding in the template
                return;
            }

            // Update button states - only change the selected button to green (for MCQ)
            // First, reset all buttons to unselected state
            this.answerButtons.forEach(button => {
                button.correct = false;
                button.incorrect = false;
            });

            // Then, mark the selected button as correct temporarily to show green color
            const selectedButton = this.answerButtons.find(button => button.text === selectedAnswer);
            if (selectedButton) {
                selectedButton.correct = true;
                selectedButton.incorrect = false;
            }

            // Scroll to bottom to show the Check button
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
        if (this.selectedAnswer !== null) {
            this.answerChecked = true;

            this.isAnswerCorrect = this.selectedAnswer === this.correctAnswer;
            const currentQuestionId = this.questions[this.currentQuestionIndex].id;
            this.questionAnswers[currentQuestionId].correct = this.isAnswerCorrect;

            this.answerButtons.forEach(button => {
                button.correct = false;
                button.incorrect = false;
            });

            this.showPopup = true;

            if (this.isAnswerCorrect) {
                // Correct answer - use positiveFeedback from backend or fallback
                this.popupMessage = this.challenge?.positiveFeedback || 'Correct!';
                this.popupBackgroundColor = '#DBEFDC';
                this.popupTextColor = '#4CAF50';
                // Check if this is the last question
                if (this.currentQuestionIndex >= this.totalQuestions - 1) {
                    this.nextButtonText = 'See Result';
                } else {
                    this.nextButtonText = 'Next';
                }
                this.nextButtonType = 'green';

                // For True/False questions, update the visual state using class binding
                if (this.questions[this.currentQuestionIndex].type === 'true-false') {
                    // The visual update is handled by the template bindings
                    return;
                }

                // For Visual questions, update the visual state using class binding
                if (this.questions[this.currentQuestionIndex].type === 'visual') {
                    // The visual update is handled by the template bindings
                    return;
                }

                // Mark the selected button as correct (for MCQ)
                const selectedButton = this.answerButtons.find(button => button.text === this.selectedAnswer);
                if (selectedButton) {
                    selectedButton.correct = true;
                }
            } else {
                // Incorrect answer - use negativeFeedback from backend or fallback
                this.popupMessage = this.challenge?.negativeFeedback || 'Incorrect!';
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
        this.answerChecked = false;
        this.isAnswerCorrect = false;

        // Reset all buttons
        this.answerButtons.forEach(button => {
            button.correct = false;
            button.incorrect = false;
        });
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
        const skippedQuestions: string[] = [];

        // Convert our internal tracking to the expected format
        this.questions.forEach(question => {
            const answer = this.questionAnswers[question.id];
            if (answer.selected) {
                questionAnswers[question.id.toString()] = answer.selected;
            } else {
                // Track unanswered questions as skipped
                skippedQuestions.push(question.id.toString());
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
        this.learningService.submitChallengeNewFormat(this.challenge.challengeId, payload).subscribe({
            next: (response) => {
                console.log('Submission successful:', response);
                // Navigate to result page with response data
                this.router.navigate(['/authed/content/result'], {
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
     * Toggle hint visibility and deduct coins
     */
    toggleHint() {
        // Check if max hints reached
        if (this.hintsUsed >= this.maxHints) {
            console.log('Maximum hints reached');
            return;
        }

        // Check if user has enough coins
        if (this.totalCoins < this.coinsPerHint) {
            console.log('Not enough coins');
            return;
        }

        // Show hint
        this.showHint = true;

        // Deduct coins and increment hints used
        this.totalCoins -= this.coinsPerHint;
        this.hintsUsed++;

        console.log(`Hint used. Remaining coins: ${this.totalCoins}, Hints used: ${this.hintsUsed}/${this.maxHints}`);
    }

    quitQuiz() {
        this.stopTimer();
        // Navigate back to the description screen
        if (this.challenge) {
            this.router.navigate(['/authed/content/description', this.challenge.challengeId]);
        } else {
            this.router.navigate(['/authed/content']);
        }
    }

    restartQuiz() {
        // Reset quiz to start over
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.selectedOption = null;
        this.answerChecked = false;
        this.showHint = false;
        this.hintsUsed = 0;
        this.showTimerExpirationPopup = false;
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