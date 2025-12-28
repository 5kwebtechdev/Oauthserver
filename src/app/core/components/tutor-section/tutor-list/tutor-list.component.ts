import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import {
  TutorListItem,
  formatAvailability,
  formatTime,
  formatLevels
} from '../../../models/tutor.model';

@Component({
  selector: 'tutor-list',
  standalone: true,
  imports: [CommonModule, MindfulButtonComponent],
  templateUrl: './tutor-list.component.html',
  styleUrls: ['./tutor-list.component.scss']
})
export class TutorListComponent {
  @Input() tutors: TutorListItem[] = [];

  /** Emitted when user clicks View Profile. Payload: tutor object. */
  @Output() viewProfile = new EventEmitter<TutorListItem>();

  onViewProfile(tutor: TutorListItem) {
    this.viewProfile.emit(tutor);
  }

  /**
   * Format availability days for display
   */
  formatDays(availability: string[]): string {
    return formatAvailability(availability as any);
  }

  /**
   * Format time for display
   */
  formatTimeDisplay(isoTime: string): string {
    return formatTime(isoTime);
  }

  /**
   * Format levels/classes for display
   */
  formatLevelsDisplay(levels: string[]): string {
    return formatLevels(levels);
  }

  /**
   * Get timing string
   */
  getTimingString(tutor: TutorListItem): string {
    const days = this.formatDays(tutor.availability);
    const startTime = this.formatTimeDisplay(tutor.startTime);
    const endTime = this.formatTimeDisplay(tutor.endTime);
    
    if (days && startTime && endTime) {
      return `${days} - ${startTime}-${endTime}`;
    }
    return days || 'Schedule not available';
  }
}
