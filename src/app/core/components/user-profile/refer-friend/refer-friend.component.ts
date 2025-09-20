import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'refer-friend',
  imports: [CommonModule, MindfulNavigatorComponent, MindfulButtonComponent, IonicModule],
  templateUrl: './refer-friend.component.html',
  styleUrls: ['./refer-friend.component.scss']
})
export class ReferFriendComponent {
  shareLink: string = 'https://mindfulbuddy.app/referral?code=ABC123';

  copyLink() {
    try {
      navigator.clipboard.writeText(this.shareLink);
      // simple feedback could be added later
    } catch (e) {
      console.warn('Clipboard not available', e);
    }
  }
}
