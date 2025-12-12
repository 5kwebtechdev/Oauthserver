import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
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

  // Error messages
  currentPasswordError = '';
  newPasswordError = '';
  retypePasswordError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toastCtrl: ToastController
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
    if (control?.touched || this.currentPassword) {
      if (control?.hasError('required')) {
        this.currentPasswordError = 'Current password is required';
      } else if (control?.hasError('minlength')) {
        this.currentPasswordError = 'Minimum 8 characters required';
      } else {
        this.currentPasswordError = '';
      }
    }
  }

  validateNewPassword(): void {
    const control = this.form.get('newPassword');
    if (control?.touched || this.newPassword) {
      if (control?.hasError('required')) {
        this.newPasswordError = 'New password is required';
      } else if (control?.hasError('minlength')) {
        this.newPasswordError = 'Minimum 8 characters required';
      } else {
        this.newPasswordError = '';
      }
    }
  }

  validateRetypePassword(): void {
    const control = this.form.get('retypeNewPassword');
    if (control?.touched || this.retypeNewPassword) {
      if (control?.hasError('required')) {
        this.retypePasswordError = 'Please retype your new password';
      } else if (this.newPassword && this.retypeNewPassword && this.newPassword !== this.retypeNewPassword) {
        this.retypePasswordError = 'Mismatch of password';
      } else {
        this.retypePasswordError = '';
      }
    }
  }

  async presentToast(message: string, color: string = 'dark', duration = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom'
    });
    await toast.present();
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
      this.presentToast('Please fill all fields correctly', 'warning');
      return;
    }

    if (this.newPassword !== this.retypeNewPassword) {
      this.retypePasswordError = 'Mismatch of password';
      this.presentToast('New passwords do not match', 'warning');
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.presentToast('New password must be different from current password', 'warning');
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
    this.http.put(url, body).subscribe({
      next: async (response: any) => {
        this.loading = false;
        await this.presentToast('Password updated successfully', 'success');

        // Clear form
        this.currentPassword = '';
        this.newPassword = '';
        this.retypeNewPassword = '';
        this.form.reset();

        // Clear errors
        this.currentPasswordError = '';
        this.newPasswordError = '';
        this.retypePasswordError = '';
      },
      error: async (error: HttpErrorResponse) => {
        this.loading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to update password. Please try again.';
        await this.presentToast(errorMessage, 'danger', 4000);
        console.error('Password change error:', error);
      }
    });
  }
}

