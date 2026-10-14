import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PasswordResetService } from '../../core/password-reset.service';
import { TurnstileWidgetComponent } from '../../shared/turnstile-widget.component';

type Step = 'request' | 'reset' | 'done';

/**
 * Reached from the "Forgot password?" link on the auth-server's login page. The reset
 * code is a real, randomly-generated, single-use, 10-minute-lived code emailed to the
 * account's address on file (see BE's OtpService/EmailService) - there's nothing to send
 * for an account with no email (the seeded admin/demo users), so the request step always
 * shows the same message either way regardless of whether a code actually went out.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TurnstileWidgetComponent],
  template: `
    <div class="page">
      <h1>Reset your password</h1>

      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="info" class="info">{{ info }}</p>

      <form *ngIf="step === 'request'" (ngSubmit)="requestCode()">
        <label>
          Username
          <input [(ngModel)]="username" name="username" required autocomplete="username" />
        </label>
        <app-turnstile-widget (tokenReceived)="captchaToken = $event"></app-turnstile-widget>
        <button type="submit">Send reset code</button>
      </form>

      <form *ngIf="step === 'reset'" (ngSubmit)="resetPassword()">
        <p class="hint">Check your email for the reset code - it expires in 2 minutes.</p>
        <label>
          Reset code
          <input [(ngModel)]="otp" name="otp" required />
        </label>
        <label>
          New password
          <input [(ngModel)]="newPassword" name="newPassword" type="password" required minlength="8" />
        </label>
        <label>
          Confirm new password
          <input [(ngModel)]="confirmPassword" name="confirmPassword" type="password" required minlength="8" />
        </label>
        <button type="submit">Reset password</button>
      </form>

      <div *ngIf="step === 'done'">
        <p>Your password has been updated. You can log in with it now.</p>
      </div>

      <p><a routerLink="/login">Back to login</a></p>
    </div>
  `,
  styles: [`
    .page { max-width: 420px; margin: 4rem auto; font-family: sans-serif; }
    form { display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
    input { padding: 0.5rem; font-size: 1rem; }
    button { padding: 0.6rem; font-size: 1rem; cursor: pointer; }
    .error { color: #b00020; }
    .info { color: #1e7e34; }
    .hint { font-size: 0.85rem; color: #555; }
  `],
})
export class ForgotPasswordComponent {
  step: Step = 'request';
  username = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  error: string | null = null;
  info: string | null = null;
  captchaToken = '';

  constructor(private readonly passwordReset: PasswordResetService) {}

  requestCode(): void {
    this.error = null;
    if (!this.username.trim()) {
      return;
    }
    this.passwordReset.requestReset(this.username, this.captchaToken).subscribe({
      next: (res) => {
        this.info = res.message;
        this.step = 'reset';
      },
      error: (err) => (this.error = err?.error?.message ?? 'Could not request a reset code. Try again.'),
    });
  }

  resetPassword(): void {
    this.error = null;
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.passwordReset.resetPassword(this.username, this.otp, this.newPassword).subscribe({
      next: () => {
        this.info = null;
        this.step = 'done';
      },
      error: (err) => (this.error = err?.error?.message ?? 'Could not reset password.'),
    });
  }
}
