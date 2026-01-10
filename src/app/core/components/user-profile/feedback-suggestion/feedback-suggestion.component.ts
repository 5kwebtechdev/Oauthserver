import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';

@Component({
  standalone: true,
  selector: 'feedback-suggestion',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ProfileEditInputComponent, MindfulButtonComponent, MindfulPopupComponent],
  templateUrl: './feedback-suggestion.component.html',
  styleUrls: ['./feedback-suggestion.component.scss']
})
export class FeedbackSuggestionComponent {
  showThankYouPopup: boolean = false;
  selectedMood: string | null = null;

  selectMood(mood: string) {
    this.selectedMood = this.selectedMood === mood ? null : mood;
  }

  details1: string | null = null;
  details2: string | null = null;

  get canSubmit(): boolean {
    const a = !!this.selectedMood;
    const b = !!(this.details1 && this.details1.trim());
    const c = !!(this.details2 && this.details2.trim());
    return a && b && c;
  }

  onSubmit() {
    console.log('Feedback submitted (stub)');
    this.showThankYouPopup = !this.showThankYouPopup;
  }
}
