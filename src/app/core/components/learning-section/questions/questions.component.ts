import { Component } from '@angular/core';
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
}
