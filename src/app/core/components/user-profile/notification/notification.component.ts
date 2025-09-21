import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulToggleComponent } from '../../mindful-selectors/mindful-toggle/mindful-toggle.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MindfulNavigatorComponent, MindfulToggleComponent, MindfulInputsModule, MindfulButtonComponent],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent {
  quietStart: string = '';
  quietEnd: string = '';

  saveProfile(): void {
    console.log('saveProfile clicked');
  }
}
