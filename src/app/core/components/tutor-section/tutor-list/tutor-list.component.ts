import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

export interface Tutor {
  name?: string;
  avatar?: string;
  description?: string;
  rating?: number;
  experience?: string;
}

@Component({
  selector: 'tutor-list',
  standalone: true,
  imports: [CommonModule, MindfulButtonComponent],
  templateUrl: './tutor-list.component.html',
  styleUrls: ['./tutor-list.component.scss']
})
export class TutorListComponent {
  @Input() tutors: Tutor[] = [];

  /** Emitted when user clicks View Profile. Payload: tutor object. */
  @Output() viewProfile = new EventEmitter<Tutor>();

  onViewProfile(tutor: Tutor) {
    this.viewProfile.emit(tutor);
  }
}
