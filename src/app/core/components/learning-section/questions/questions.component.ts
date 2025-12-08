import { Component, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent, MindfulPopupConfig } from '../../mindful-popup/mindful-popup.component';

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
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, MindfulPopupComponent],
    templateUrl: './questions.component.html',
    styleUrls: ['./questions.component.scss']
})
export class QuestionsComponent {
    // Heading shown in the navigator
    quizTitle = 'Apple Orchard Math Challenge';

    /** Zero-based index of the current question (used by the progress bar binding) */
    currentQuestionIndex = 0;

    /** Total number of questions in the quiz; default to 5 to match template text */
    totalQuestions = 5;

    // Store references to all answer buttons
    @ViewChildren(MindfulButtonComponent) answerButtons!: QueryList<MindfulButtonComponent>;

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

    // Questions will be loaded from the backend via route state or service
    questions: Question[] = [];

    // Track answers for each question
    questionAnswers: { [key: number]: { selected: string | null, correct: boolean } } = {};

    // (No rightActions used — we project the inline SVG timer into the navigator slot)

    constructor(private router: Router) { }

    ngOnInit() {
        // Initialize question answers tracking
        for (let i = 1; i <= this.totalQuestions; i++) {
            this.questionAnswers[i] = { selected: null, correct: false };
        }
        this.loadCurrentQuestion();
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

            // Save the selected answer for this question
            const currentQuestionId = this.questions[this.currentQuestionIndex].id;
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
        }
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
                // Correct answer
                this.popupMessage = 'Correct!';
                this.popupBackgroundColor = '#DBEFDC';
                this.popupTextColor = '#4CAF50';
                this.nextButtonText = 'Next';
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
                // Incorrect answer
                this.popupMessage = 'Incorrect!';
                this.popupBackgroundColor = '#FDCBCC';
                this.popupTextColor = '#BB2124';
                this.nextButtonText = 'Got it, next question';
                this.nextButtonType = 'bronze';

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

                // Mark the selected button as incorrect and correct button as correct (for MCQ)
                const selectedButton = this.answerButtons.find(button => button.text === this.selectedAnswer);
                if (selectedButton) {
                    selectedButton.incorrect = true;
                }

                const correctButton = this.answerButtons.find(button => button.text === this.correctAnswer);
                if (correctButton) {
                    correctButton.correct = true;
                }
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
            // Navigate to result page
            this.router.navigate(['/result-page']);
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
     * Toggle hint visibility
     */
    toggleHint() {
        this.showHint = !this.showHint;
    }

    quitQuiz() {
        // Navigate back to the description screen
        this.router.navigate(['/authed/content/description']);
    }

    restartQuiz() {
        // Reset quiz to start over
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.selectedOption = null;
        this.answerChecked = false;
        this.showHint = false;
        this.showTimerExpirationPopup = false;
        this.showContentTimeExhaustPopup = false;
        this.loadCurrentQuestion();
    }

    /**
     * Show the content time exhaust popup
     */
    showContentTimeExhaustPopupMethod() {
        this.showContentTimeExhaustPopup = true;
    }
}