import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';

@Component({
  selector: 'delete-account',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, SupermeNavigatorComponent, SupermeButtonComponent],
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.scss']
})
export class DeleteAccountComponent {
  consentChecked = false;
  showConfirm = false;
  isDeleting = false;

  constructor(
    private authService: AuthService,
    private coreService: CoreService
  ) { }

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
    if (this.isDeleting) return;

    const userId = this.authService.getUserId();
    if (!userId) {
      this.coreService.triggerToasrt('Unable to find your account. Please log in again.');
      return;
    }

    this.isDeleting = true;
    this.authService.deleteAccountByUserId(userId).subscribe({
      next: async (response) => {
        this.showConfirm = false;
        this.coreService.triggerToasrt(response?.message || 'Account deleted successfully', 'success');
        await this.authService.logout(true);
      },
      error: (error) => {
        const message = this.getDeleteErrorMessage(error);
        this.coreService.triggerToasrt(message);
        this.isDeleting = false;
      }
    });
  }

  private getDeleteErrorMessage(error: any): string {
    const body = error?.error;

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return parsed?.message || body;
      } catch {
        return body;
      }
    }

    return body?.message || error?.message || 'Failed to delete account. Please try again.';
  }
}
