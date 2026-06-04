import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

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
  errorMessage: string | null = null;
  isSubmitting: boolean = false;

  selectMood(mood: string) {
    this.selectedMood = this.selectedMood === mood ? null : mood;
  }

  details1: string | null = null;
  details2: string | null = null;

  // Mapping of mood strings to rating numbers
  private readonly moodToRatingMap: Record<string, number> = {
    'very-happy': 1,
    'happy': 2,
    'upset': 3,
    'sad': 4
  };

  constructor(private httpClient: HttpClient) { }

  get canSubmit(): boolean {
    const hasMood = !!this.selectedMood;
    const hasAppExperience = !!(this.details1 && this.details1.trim());
    const hasFeatureRequest = !!(this.details2 && this.details2.trim());
    return hasMood && hasAppExperience && hasFeatureRequest && !this.isSubmitting;
  }

  private getMoodRating(mood: string | null): number {
    if (!mood) throw new Error('No mood selected');
    return this.moodToRatingMap[mood] || 0;
  }

  private buildFeedbackPayload() {
    return {
      rating: this.getMoodRating(this.selectedMood),
      appExperience: this.details1?.trim() || '',
      featureRequest: this.details2?.trim() || ''
    };
  }

  private resetForm(): void {
    this.selectedMood = null;
    this.details1 = null;
    this.details2 = null;
    this.errorMessage = null;
  }

  async onSubmit(): Promise<void> {
    // If popup is visible and user clicks "Share another idea", reset the form
    if (this.showThankYouPopup) {
      this.showThankYouPopup = false;
      this.resetForm();
      return;
    }

    if (!this.canSubmit) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const payload = this.buildFeedbackPayload();
      const apiUrl = `${environment.apiUrl}/auth/submit-feedback`;

      const response = await firstValueFrom(
        this.httpClient.post(apiUrl, payload)
      );

      console.log('Feedback submitted successfully:', response);
      this.showThankYouPopup = true;
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private handleSubmitError(error: any): void {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          this.errorMessage = 'Invalid feedback data. Please check your inputs.';
          break;
        case 401:
          this.errorMessage = 'You are not authenticated. Please log in again.';
          break;
        case 403:
          this.errorMessage = 'You do not have permission to submit feedback.';
          break;
        case 500:
          this.errorMessage = 'Server error. Please try again later.';
          break;
        default:
          this.errorMessage = error.error?.message || 'Failed to submit feedback. Please try again.';
      }
    } else {
      this.errorMessage = 'Network error. Please check your connection and try again.';
    }

    console.error('Error submitting feedback:', error);
  }
}
