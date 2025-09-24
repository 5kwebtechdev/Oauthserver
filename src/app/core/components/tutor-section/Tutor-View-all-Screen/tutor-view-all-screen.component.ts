import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TutorListComponent } from '../tutor-list/tutor-list.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'tutor-view-all-screen',
  standalone: true,
  imports: [CommonModule, TutorListComponent],
  templateUrl: './tutor-view-all-screen.component.html',
  styleUrls: ['./tutor-view-all-screen.component.scss']
})
export class TutorViewAllScreenComponent {
  @Input() tutors: any[] = [];
  @Output() viewProfile = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();
  constructor(private modalCtrl: ModalController) {}

  onViewProfile(tutor: any) {
    this.viewProfile.emit(tutor);
  }

  onBack() {
    // emit for consumers (in case used inline) then close modal if present
    this.back.emit();
    try {
      this.modalCtrl.dismiss();
    } catch (e) {
      // ignore if not opened as a modal
    }
  }
}
