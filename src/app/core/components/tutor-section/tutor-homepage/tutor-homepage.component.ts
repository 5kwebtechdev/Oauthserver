import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { TutorListComponent, Tutor } from '../tutor-list/tutor-list.component';

@Component({
  selector: 'tutor-homepage',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent, TutorListComponent],
  templateUrl: './tutor-homepage.component.html',
  styleUrls: ['./tutor-homepage.component.scss']
})
export class TutorHomepageComponent {
  @Input() tutors: Tutor[] = [];

  /** Emitted when a tutor profile is requested */
  @Output() viewProfile = new EventEmitter<Tutor>();

  onViewProfile(tutor: Tutor) {
    this.viewProfile.emit(tutor);
  }
}
