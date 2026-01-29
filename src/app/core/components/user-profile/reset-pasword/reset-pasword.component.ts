import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'reset-pasword',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ProfileEditInputComponent, MindfulButtonComponent, ReactiveFormsModule, HttpClientModule],
  templateUrl: './reset-pasword.component.html',
  styleUrls: ['./reset-pasword.component.scss']
})
export class ResetPaswordComponent {
  form: FormGroup;
  loading = false;

  currentPassword = '';
  newPassword = '';
  retypeNewPassword = '';

  // Inline toast state
  toastVisible = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Error messages
  currentPasswordError = '';
  newPasswordError = '';
  retypePasswordError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private navCtrl: NavController
  ) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      retypeNewPassword: ['', [Validators.required]]
    });
  }

  onCurrentPasswordChange(value: string | null): void {
    this.currentPassword = value || '';
    this.form.patchValue({ currentPassword: value });
    this.validateCurrentPassword();
  }

  onNewPasswordChange(value: string | null): void {
    this.newPassword = value || '';
    this.form.patchValue({ newPassword: value });
    this.validateNewPassword();
  }

  onRetypePasswordChange(value: string | null): void {
    this.retypeNewPassword = value || '';
    this.form.patchValue({ retypeNewPassword: value });
    this.validateRetypePassword();
  }

  validateCurrentPassword(): void {
    const control = this.form.get('currentPassword');
    if (!control) {
      this.currentPasswordError = '';
      return;
    }

    const value = control.value || '';

    // Show errors only when field was touched or when user has typed something
    if (control.touched || value.length > 0) {
      if (control.hasError('required') && control.touched) {
        this.currentPasswordError = 'Current password is required';
      } else if (control.hasError('minlength') && value.length > 0) {
        this.currentPasswordError = 'Minimum 8 characters required';
      } else {
        this.currentPasswordError = '';
      }
    } else {
      this.currentPasswordError = '';
    }
  }

  validateNewPassword(): void {
    const control = this.form.get('newPassword');
    if (!control) {
      this.newPasswordError = '';
      return;
    }

    const value = control.value || '';
    if (control.touched || value.length > 0) {
      if (control.hasError('required') && control.touched) {
        this.newPasswordError = 'New password is required';
      } else if (control.hasError('minlength') && value.length > 0) {
        this.newPasswordError = 'Minimum 8 characters required';
      } else {
        this.newPasswordError = '';
      }
    } else {
      this.newPasswordError = '';
    }
  }

  validateRetypePassword(): void {
    const control = this.form.get('retypeNewPassword');
    if (!control) {
      this.retypePasswordError = '';
      return;
    }

    const value = control.value || '';
    if (control.touched || value.length > 0) {
      if (control.hasError('required') && control.touched) {
        this.retypePasswordError = 'Please retype your new password';
      } else if (this.newPassword && value.length > 0 && this.newPassword !== value) {
        this.retypePasswordError = 'Mismatch of password';
      } else {
        this.retypePasswordError = '';
      }
    } else {
      this.retypePasswordError = '';
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'error', duration = 3000): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;

    // Auto-hide after duration
    setTimeout(() => {
      this.toastVisible = false;
    }, duration);
  }

  async saveProfile(): Promise<void> {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    this.validateCurrentPassword();
    this.validateNewPassword();
    this.validateRetypePassword();

    if (this.form.invalid) {
      return;
    }

    if (this.newPassword !== this.retypeNewPassword) {
      this.retypePasswordError = 'Mismatch of password';
      this.showToast('New passwords do not match', 'error', 3000);
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.showToast('New password must be different from current password', 'error', 3000);
      return;
    }

    this.loading = true;

    const url = `${environment.apiUrl}/auth/change-password`;
    const body = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      retypeNewPassword: this.retypeNewPassword
    };

    // AuthInterceptor will automatically add the token from localStorage
    // Use responseType 'text' because server returns no/ plain-text body which
    // would otherwise cause HttpClient to try parsing JSON and throw a parse error.
    this.http.put(url, body, { responseType: 'text' }).subscribe({
      next: async (_response: any) => {
        this.loading = false;
        // Show inline success toast, then clear and navigate back
        this.showToast('Password updated successfully', 'success', 3000);

        setTimeout(() => {
          // Clear form
          this.currentPassword = '';
          this.newPassword = '';
          this.retypeNewPassword = '';
          this.form.reset();

          // Clear errors
          this.currentPasswordError = '';
          this.newPasswordError = '';
          this.retypePasswordError = '';

          // Navigate back to previous page (entry)
          this.navCtrl.back();
        }, 3200);
      },
      error: async (error: HttpErrorResponse) => {
        this.loading = false;
        let serverMessage = 'Failed to update password. Please try again.';
        try {
          const errBody = error?.error;
          if (typeof errBody === 'string') {
            try {
              const parsed = JSON.parse(errBody);
              if (parsed && parsed.message) {
                serverMessage = parsed.message;
              } else if (typeof parsed === 'string') {
                serverMessage = parsed;
              } else {
                serverMessage = errBody;
              }
            } catch (e) {
              serverMessage = errBody || error?.message || serverMessage;
            }
          } else if (errBody && typeof errBody === 'object') {
            serverMessage = errBody.message || JSON.stringify(errBody) || error?.message || serverMessage;
          } else {
            serverMessage = error?.message || serverMessage;
          }
        } catch (e) {
          serverMessage = error?.message || serverMessage;
        }

        // If server indicates current password is incorrect, show it as a field error too
        if (serverMessage && /current password/i.test(serverMessage)) {
          this.currentPasswordError = serverMessage;
        }

        this.showToast(String(serverMessage), 'error', 3000);
        console.error('Password change error:', error);
      }
    });
  }
}

