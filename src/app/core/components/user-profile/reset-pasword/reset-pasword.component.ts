import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'reset-pasword',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ProfileEditInputComponent, MindfulButtonComponent],
  templateUrl: './reset-pasword.component.html',
  styleUrls: ['./reset-pasword.component.scss']
})
export class ResetPaswordComponent {
  saveProfile(): void {
    console.log('ResetPaswordComponent.saveProfile called');
  }
}

