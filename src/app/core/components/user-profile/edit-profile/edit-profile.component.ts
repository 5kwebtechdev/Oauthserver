import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulInputComponent } from '../../mindful-inputs/mindful-input.component';

@Component({
  selector: 'edit-profile',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulInputsModule, MindfulInputComponent],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent {}
