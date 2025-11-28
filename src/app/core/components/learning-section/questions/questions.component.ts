import { Component, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
    selector: 'app-questions',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
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

    // (No rightActions used — we project the inline SVG timer into the navigator slot)

    constructor(private router: Router) { }

    onCancel() {
        // Navigate back to the description screen for now
        this.router.navigate(['/authed/content/description']);
    }

    onRightAction(event?: { index: number, action: any }) {
        // Placeholder for right-action behavior (open help/info etc.)
        console.log('Navigator right action clicked', event ?? 'clicked');
    }

    /**
     * Handle answer selection
     * @param selectedAnswer The text of the selected answer
     */
    selectAnswer(selectedAnswer: string) {
        // Only allow selection if answer hasn't been checked yet
        if (!this.answerChecked) {
            // Reset all buttons to default state
            this.answerButtons.forEach(button => {
                button.correct = false;
                button.incorrect = false;
            });

            // Set the selected answer
            this.selectedAnswer = selectedAnswer;

            // Highlight the selected button
            const selectedButton = this.answerButtons.find(button => button.text === selectedAnswer);
            if (selectedButton) {
                // Just highlight the selected button visually (without correct/incorrect indication)
                // This will be handled when the user clicks "Check"
            }
        }
    }

    /**
     * Handle check button click
     */
    onCheck() {
        // Only proceed if an answer has been selected
        if (this.selectedAnswer !== null) {
            // Mark that the answer has been checked
            this.answerChecked = true;

            // Determine if the answer is correct
            this.isAnswerCorrect = this.selectedAnswer === this.correctAnswer;

            // Show the appropriate popup
            this.showPopup = true;

            if (this.isAnswerCorrect) {
                // Correct answer
                this.popupMessage = 'Correct!';
                this.popupBackgroundColor = '#DBEFDC';
                this.popupTextColor = '#4CAF50';
                this.nextButtonText = 'Next';
                this.nextButtonType = 'green';
            } else {
                // Incorrect answer
                this.popupMessage = 'Incorrect!';
                this.popupBackgroundColor = '#FDCBCC';
                this.popupTextColor = '#BB2124';
                this.nextButtonText = 'Got it, next question';
                this.nextButtonType = 'bronze';
                
                // Mark the selected button as incorrect and correct button as correct
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
        
        // Reset for next question (in a real app, you would load the next question)
        this.selectedAnswer = null;
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
}