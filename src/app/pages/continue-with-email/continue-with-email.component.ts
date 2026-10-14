import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ContinueWithEmailService } from '../../core/continue-with-email.service';
import { TurnstileWidgetComponent } from '../../shared/turnstile-widget.component';

type Step = 'email' | 'verify';

/**
 * Passwordless login for an existing SuperMeApp account, gated by a real, randomly-generated,
 * single-use code emailed to the address just typed in, which is what actually proves the caller
 * owns it (see BE's OtpService/EmailService).
 *
 * It no longer registers anyone: accounts live in SuperMeBE's user table, whose required fields
 * (name, gender, date of birth, relationship) only its own onboarding collects. An address with no
 * account behind it gets told to register in the app, and no code is sent at all.
 */
@Component({
  selector: 'app-continue-with-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TurnstileWidgetComponent],
  template: `
    <div class="page">
      <h1>Continue with email</h1>

      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="info" class="info">{{ info }}</p>

      <form *ngIf="step === 'email'" (ngSubmit)="submitEmail()">
        <label>
          Email
          <input [(ngModel)]="email" name="email" type="email" required autocomplete="email" />
        </label>
        <app-turnstile-widget (tokenReceived)="captchaToken = $event"></app-turnstile-widget>
        <button type="submit" [disabled]="checking">{{ checking ? 'Checking...' : 'Continue' }}</button>
      </form>

      <form *ngIf="step === 'verify'" (ngSubmit)="submitVerify()">
        <p class="hint">Check your email for the code - it expires in 2 minutes.</p>
        <label>
          Code
          <input [(ngModel)]="otp" name="otp" required />
        </label>
        <button type="submit" [disabled]="verifying">
          {{ verifying ? 'Please wait...' : 'Log in' }}
        </button>
      </form>

      <p *ngIf="noAccount">
        <a routerLink="/register">Create an account with this email</a>
      </p>
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
export class ContinueWithEmailComponent {
  step: Step = 'email';
  email = '';
  otp = '';

  noAccount = false;
  checking = false;
  verifying = false;
  error: string | null = null;
  info: string | null = null;
  captchaToken = '';

  constructor(
    private readonly continueWithEmail: ContinueWithEmailService,
    private readonly auth: AuthService
  ) {}

  submitEmail(): void {
    this.error = null;
    if (!this.email.trim()) {
      return;
    }
    this.checking = true;
    this.continueWithEmail.requestAccount(this.email.trim(), this.captchaToken).subscribe({
      next: (res) => {
        this.info = res.message;
        // Only move on to the code step when there is an account to log into - no code was
        // sent otherwise, so asking for one would just waste the caller's time. An unknown
        // address is offered registration instead.
        this.step = res.exists ? 'verify' : 'email';
        this.noAccount = !res.exists;
        this.checking = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Could not check that email. Try again.';
        this.checking = false;
      },
    });
  }

  submitVerify(): void {
    this.error = null;
    this.verifying = true;
    this.continueWithEmail
      .verify(this.email.trim(), this.otp)
      .subscribe({
        next: () => {
          this.verifying = false;
          this.auth.login();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'Could not verify that code.';
          this.verifying = false;
        },
      });
  }
}
