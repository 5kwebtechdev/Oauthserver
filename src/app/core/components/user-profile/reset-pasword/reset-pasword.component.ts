import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { CustomToastService } from '../../../services/custom-toast.service';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'reset-pasword',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, ReactiveFormsModule, HttpClientModule],
  templateUrl: './reset-pasword.component.html',
  styleUrls: ['./reset-pasword.component.scss']
})
export class ResetPaswordComponent implements OnDestroy {
  form: FormGroup;
  loading = false;

  currentPassword = '';
  newPassword = '';
  retypeNewPassword = '';

  // Error messages
  currentPasswordError = '';
  newPasswordError = '';
  retypePasswordError = '';

  // Eye toggle state
  showCurrent = false;
  showNew = false;
  showRetype = false;

  // Password strength
  get passwordStrength(): number {
    const pw = this.newPassword;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)  score += 25;
    if (pw.length >= 12) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;
    return score;
  }

  get strengthLabel(): string {
    const s = this.passwordStrength;
    if (s <= 25) return 'Weak';
    if (s <= 50) return 'Fair';
    if (s <= 75) return 'Good';
    return 'Strong';
  }

  get strengthClass(): string {
    const s = this.passwordStrength;
    if (s <= 25) return 'weak';
    if (s <= 50) return 'fair';
    if (s <= 75) return 'good';
    return 'strong';
  }

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastService: CustomToastService
  ) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      // Match the account-creation policy: 6 to 12 characters.
      // Do not limit the current password, because existing users may have
      // passwords created under an older policy.
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(12),
        this.noCommonPasswordValidator()
      ]],
      retypeNewPassword: ['', [Validators.required]]
    }, { validators: [this.passwordsMatchValidator(), this.passwordsDifferentValidator()] });
  }

  onCurrentPasswordChange(value: string | null): void {
    this.currentPassword = value || '';
    this.form.patchValue({ currentPassword: value });
    this.validateCurrentPassword();
    // The new password's cross-field rule must react when either field changes.
    this.validateNewPassword();
  }

  onNewPasswordChange(value: string | null): void {
    this.newPassword = value || '';
    this.form.patchValue({ newPassword: value });
    this.validateNewPassword();
    this.validateRetypePassword();
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
        this.newPasswordError = 'Password should be 6 characters or more.';
      } else if (control.hasError('maxlength')) {
        this.newPasswordError = 'Password cannot be more than 12 characters.';
      } else if (control.hasError('commonPassword')) {
        this.newPasswordError = 'This password is too common. Please choose a stronger one.';
      } else if (this.form.hasError('sameAsCurrentPassword') && value.length > 0) {
        this.newPasswordError = 'New password must be different from current password';
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
      } else if (this.form.hasError('passwordMismatch') && value.length > 0) {
        this.retypePasswordError = 'Passwords do not match.';
      } else {
        this.retypePasswordError = '';
      }
    } else {
      this.retypePasswordError = '';
    }
  }

  /** Keep this policy identical to the Create a Password onboarding step. */
  private noCommonPasswordValidator(): ValidatorFn {
    const common = ['123456', '1234567', '12345678', '123456789', '1234567890', 'password', 'abcdef', 'qwerty', '111111', '000000', 'abc123'];
    return (control: AbstractControl) => {
      const value = String(control.value || '').toLowerCase();
      return common.includes(value) ? { commonPassword: true } : null;
    };
  }

  private passwordsMatchValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const password = control.get('newPassword')?.value;
      const confirmation = control.get('retypeNewPassword')?.value;
      return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
    };
  }

  private passwordsDifferentValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const current = String(control.get('currentPassword')?.value || '');
      const next = String(control.get('newPassword')?.value || '');
      return current && next && current === next ? { sameAsCurrentPassword: true } : null;
    };
  }

  private showToast(message: string, type: 'success' | 'error' = 'error', duration = 3000): void {
    this.toastService.show(message, type, duration);
  }

  ngOnDestroy(): void {
    // Signal teardown for any subscriptions
    try { this.destroy$.next(); this.destroy$.complete(); } catch {}

    // Ensure toast hidden when component is destroyed
    this.toastService.hide();
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
      this.retypePasswordError = 'Passwords do not match.';
      this.showToast('New passwords do not match', 'error', 3000);
      return;
    }

    if (this.form.hasError('sameAsCurrentPassword')) {
      // This is also validated live on the new-password field. Keep the guard
      // here for programmatic submissions, but avoid a second toast.
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
    this.http.put(url, body, { responseType: 'text' })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: async (_response: any) => {
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
          const serverMessage = this.parseServerMessage(error) || 'Failed to update password. Please try again.';

          // If server indicates current password is incorrect, show it as a field error too
          if (serverMessage && /current password/i.test(serverMessage)) {
            this.currentPasswordError = serverMessage;
          }

          this.showToast(String(serverMessage), 'error', 3000);
          console.error('Password change error:', error);
        }
      });
  }

  /**
   * Parse server error payload to extract a friendly message
   */
  private parseServerMessage(error: HttpErrorResponse): string | null {
    try {
      const errBody = error?.error;
      let serverMessage = null;

      if (typeof errBody === 'string') {
        try {
          const parsed = JSON.parse(errBody);
          if (parsed && parsed.message) serverMessage = parsed.message;
          else if (typeof parsed === 'string') serverMessage = parsed;
          else serverMessage = errBody;
        } catch (e) {
          serverMessage = errBody || error?.message || null;
        }
      } else if (errBody && typeof errBody === 'object') {
        serverMessage = errBody.message || JSON.stringify(errBody) || error?.message || null;
      } else {
        serverMessage = error?.message || null;
      }

      return serverMessage;
    } catch (e) {
      return error?.message || null;
    }
  }

}
