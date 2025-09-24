import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

export interface TutorProfile {
  name?: string;
  avatar?: string;
  description?: string;
  rating?: number;
  experience?: string;
  subjects?: string[];
}

@Component({
  selector: 'tutor-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulButtonComponent],
  templateUrl: './tutor-profile.component.html',
  styleUrls: ['./tutor-profile.component.scss']
})
export class TutorProfileComponent {
  @Input() tutor: TutorProfile | undefined;

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss();
  }
  
  onFavorite(){
    // placeholder for favorite action
    console.log('favorite clicked', this.tutor?.name);
  }
}
