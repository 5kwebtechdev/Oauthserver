import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [IonicModule, SupermeNavigatorComponent],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent {}
