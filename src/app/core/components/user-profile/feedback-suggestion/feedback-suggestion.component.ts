import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  standalone: true,
  selector: 'feedback-suggestion',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ProfileEditInputComponent, MindfulButtonComponent],
  templateUrl: './feedback-suggestion.component.html',
  styleUrls: ['./feedback-suggestion.component.scss']
})
export class FeedbackSuggestionComponent {
  // blank component scaffold for user profile feedback/suggestion UI
  showThankYouPopup: boolean = false;

  onSubmit() {
    // TODO: collect form data and send to API or persistence layer
    console.log('Feedback submitted (stub)');
    // Show thank-you popup after submit. If already shown (user clicked "Share another idea"), hide it.
    this.showThankYouPopup = !this.showThankYouPopup;
  }
}
