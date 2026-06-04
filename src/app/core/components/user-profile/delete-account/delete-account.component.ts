import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
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
  showConfirm = false;

  constructor(private authService: AuthService) { }

  isParentUser(): boolean {
    try {
      return this.authService.isParentUser();
    } catch {
      return false;
    }
  }

  onDelete() {
    this.showConfirm = true;
  }

  cancelDelete() {
    this.showConfirm = false;
  }

  deleteAccount() {
    this.showConfirm = false;
    console.log('Account deletion requested');
  }
}
