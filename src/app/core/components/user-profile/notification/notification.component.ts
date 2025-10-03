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

  /**
   * Convert a time string like "12:30 AM" or "07:05 PM" to 24-hour "HH:mm".
   * If input is empty or invalid, returns an empty string.
   */
  formatTo24(time: string): string {
    if (!time || typeof time !== 'string') return '';
    const parts = time.trim().split(' ');
    if (parts.length < 2) {
      // maybe already in HH:mm
      return time.length ? time.split(' ')[0] : '';
    }
    const [t, ampm] = parts;
    const [hStr, mStr] = t.split(':');
    if (!hStr || !mStr) return '';
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    if (isNaN(h)) return '';
    const upper = (ampm || '').toUpperCase();
    if (upper === 'AM') {
      if (h === 12) h = 0;
    } else if (upper === 'PM') {
      if (h !== 12) h = h + 12;
    }
    const hh = h.toString().padStart(2, '0');
    return `${hh}:${m}`;
  }
}
