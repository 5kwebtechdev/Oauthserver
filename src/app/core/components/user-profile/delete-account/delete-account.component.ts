import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'delete-account',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.scss']
})
export class DeleteAccountComponent {
  consentChecked = false;

  constructor(private alertCtrl: AlertController, private authService: AuthService) { }

  isParentUser(): boolean {
    try {
      return this.authService.isParentUser();
    } catch {
      return false;
    }
  }

  async confirmDelete() {
    const alert = await this.alertCtrl.create({
      header: 'Delete account',
      message: 'Are you sure you want to permanently delete your account? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteAccount() }
      ]
    });

    await alert.present();
  }

  deleteAccount() {
    console.log('Account deletion requested');
  }

  // called from template button
  onDelete() {
    this.confirmDelete();
  }
}
