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

  onSubmit() {
    console.log('Feedback submitted (stub)');
    this.showThankYouPopup = !this.showThankYouPopup;
  }
}
