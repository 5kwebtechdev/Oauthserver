import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LoginResponse,
  RegisteredUser,
  SupermeApiService,
} from '../../core/superme-api.service';

type Step = 'email' | 'otp' | 'details' | 'done';

/**
 * Email registration driven entirely by the SuperMeBE-compatible API (ARCHITECTURE.md section 20),
 * in the same order the real SuperMeApp frontend uses it:
 *
 *   1. POST /v1/api/auth/send-otp
 *   2. POST /v1/api/auth/verify-otp
 *   3. GET  /v1/auth/check/alreadyRegistered   (username availability, as you type)
 *   4. POST /v1/auth/register                  -> 201
 *   5. POST /v1/auth/login                     -> 200, token
 *
 * It exists to be a working reference for building a replica of that frontend against this server,
 * so every call is made explicitly and the raw responses are shown rather than hidden.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <h1>Create your SuperMe account</h1>
      <p class="trail">
        Step {{ stepNumber() }} of 4 &mdash; calling <code>{{ lastCall || 'nothing yet' }}</code>
      </p>

      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="info" class="info">{{ info }}</p>

      <!-- 1. send-otp -->
      <form *ngIf="step === 'email'" (ngSubmit)="sendOtp()">
        <label>
          Email
          <input [(ngModel)]="email" name="email" type="email" required autocomplete="email" />
        </label>
        <button type="submit" [disabled]="busy">{{ busy ? 'Sending...' : 'Send code' }}</button>
      </form>

      <!-- 2. verify-otp -->
      <form *ngIf="step === 'otp'" (ngSubmit)="verifyOtp()">
        <p class="hint">We emailed a 4-digit code to {{ email }}. It expires in 2 minutes.</p>
        <label>
          Code
          <input [(ngModel)]="otp" name="otp" inputmode="numeric" maxlength="4" required />
        </label>
        <button type="submit" [disabled]="busy">{{ busy ? 'Checking...' : 'Verify' }}</button>
        <button type="button" class="link" (click)="step = 'email'">Use a different email</button>
      </form>

      <!-- 3 + 4. check/alreadyRegistered while typing, then register -->
      <form *ngIf="step === 'details'" (ngSubmit)="register()">
        <label>
          Full name
          <input [(ngModel)]="name" name="name" required />
        </label>

        <label>
          Username
          <input [(ngModel)]="username" name="username" (blur)="checkUsername()" />
        </label>
        <p *ngIf="usernameState" class="availability" [class.taken]="usernameState === 'taken'">
          {{ usernameState === 'taken' ? 'That username is already registered.' : 'Username is available.' }}
        </p>

        <label>
          Password
          <input [(ngModel)]="password" name="password" type="password" required autocomplete="new-password" />
        </label>

        <label>
          Phone <span class="muted">(optional, e.g. +918078567854)</span>
          <input [(ngModel)]="phone" name="phone" (blur)="checkPhone()" />
        </label>
        <p *ngIf="phoneState" class="availability" [class.taken]="phoneState === 'taken'">
          {{ phoneState === 'taken' ? 'That phone number is already registered.' : 'Phone number is available.' }}
        </p>

        <label>
          Gender
          <select [(ngModel)]="gender" name="gender">
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>

        <label>
          Date of birth
          <input [(ngModel)]="dateOfBirth" name="dateOfBirth" type="date" required />
        </label>

        <label>
          Registering as
          <select [(ngModel)]="relationship" name="relationship">
            <option value="SELF">Myself</option>
            <option value="PARENT">A parent</option>
            <option value="CHILD">A child</option>
          </select>
        </label>

        <label *ngIf="relationship === 'PARENT'">
          Family name <span class="muted">(creates a new family)</span>
          <input [(ngModel)]="familyName" name="familyName" />
        </label>

        <label *ngIf="relationship !== 'SELF'">
          Family code <span class="muted">{{ relationship === 'CHILD' ? '(required)' : '(to join an existing family)' }}</span>
          <input [(ngModel)]="familyCode" name="familyCode" maxlength="8" />
        </label>

        <label>
          Avatar image <span class="muted">(optional)</span>
          <input [(ngModel)]="avatarImageName" name="avatarImageName" placeholder="18-plus-male-5.webp" />
        </label>

        <label>
          Pet name <span class="muted">(optional)</span>
          <input [(ngModel)]="petName" name="petName" />
        </label>

        <label>
          Referral code <span class="muted">(optional)</span>
          <input [(ngModel)]="referralCode" name="referralCode" />
        </label>

        <button type="submit" [disabled]="busy">{{ busy ? 'Creating...' : 'Create account' }}</button>
      </form>

      <!-- 5. logged in -->
      <div *ngIf="step === 'done'">
        <h2>Account created</h2>
        <p>
          Registered as <strong>{{ registered?.name }}</strong> (id {{ registered?.id }}),
          avatar <code>{{ registered?.avatarName }}</code>, {{ registered?.coins }} coins,
          onboarding step {{ registered?.onboardingStep }}.
        </p>
        <p *ngIf="loggedIn">
          Logged in. Access token (first 40 chars):
          <code>{{ loggedIn.token.slice(0, 40) }}...</code>
        </p>
        <details *ngIf="registered">
          <summary>Raw /v1/auth/register response</summary>
          <pre>{{ registered | json }}</pre>
        </details>
        <details *ngIf="loggedIn">
          <summary>Raw /v1/auth/login response</summary>
          <pre>{{ loggedIn | json }}</pre>
        </details>
      </div>

      <p><a routerLink="/login">Back to sign in</a></p>
    </div>
  `,
  styles: [`
    .page { max-width: 520px; margin: 3rem auto; font-family: sans-serif; }
    form { display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
    input, select { padding: 0.5rem; font-size: 1rem; }
    button { padding: 0.6rem; font-size: 1rem; cursor: pointer; }
    button.link { background: none; border: none; color: #0b5ed7; text-decoration: underline; padding: 0; }
    .error { color: #b00020; }
    .info { color: #1e7e34; }
    .hint, .muted, .trail { font-size: 0.85rem; color: #555; }
    .availability { font-size: 0.8rem; color: #1e7e34; margin: -0.5rem 0 0; }
    .availability.taken { color: #b00020; }
    pre { background: #f5f5f5; padding: 0.75rem; overflow-x: auto; font-size: 0.75rem; }
  `],
})
export class RegisterComponent {
  step: Step = 'email';
  busy = false;
  error: string | null = null;
  info: string | null = null;
  lastCall = '';

  email = '';
  otp = '';
  name = '';
  username = '';
  password = '';
  phone = '';
  gender: 'male' | 'female' | 'prefer_not_to_say' = 'prefer_not_to_say';
  dateOfBirth = '';
  relationship: 'SELF' | 'PARENT' | 'CHILD' = 'SELF';
  familyCode = '';
  familyName = '';
  avatarImageName = '';
  petName = '';
  referralCode = '';

  usernameState: 'free' | 'taken' | null = null;
  phoneState: 'free' | 'taken' | null = null;
  registered: RegisteredUser | null = null;
  loggedIn: LoginResponse | null = null;

  constructor(private readonly api: SupermeApiService) {}

  stepNumber(): number {
    return { email: 1, otp: 2, details: 3, done: 4 }[this.step];
  }

  sendOtp(): void {
    this.reset('POST /v1/api/auth/send-otp');
    this.api.sendOtp(this.email.trim()).subscribe({
      next: (res) => {
        this.busy = false;
        this.info = res.message;
        this.step = 'otp';
      },
      // 400 here means an account already uses this address - the server refuses to email a code.
      error: (err) => this.fail(err, 'Could not send the code.'),
    });
  }

  verifyOtp(): void {
    this.reset('POST /v1/api/auth/verify-otp');
    this.api.verifyOtp(this.email.trim(), this.otp.trim()).subscribe({
      next: (res) => {
        this.busy = false;
        this.info = res.message;
        this.step = 'details';
      },
      error: (err) => this.fail(err, 'Could not verify that code.'),
    });
  }

  /** Their frontend checks availability against the same endpoint, one identifier at a time. */
  checkUsername(): void {
    const value = this.username.trim();
    if (!value) {
      this.usernameState = null;
      return;
    }
    this.lastCall = 'GET /v1/auth/check/alreadyRegistered';
    this.api.checkAlreadyRegistered(value).subscribe({
      next: (res) => (this.usernameState = res.status ? 'taken' : 'free'),
      error: () => (this.usernameState = null),
    });
  }

  checkPhone(): void {
    const value = this.phone.trim();
    if (!value) {
      this.phoneState = null;
      return;
    }
    this.lastCall = 'GET /v1/auth/check/alreadyRegistered';
    this.api.checkAlreadyRegistered(value).subscribe({
      next: (res) => (this.phoneState = res.status ? 'taken' : 'free'),
      error: () => (this.phoneState = null),
    });
  }

  register(): void {
    this.reset('POST /v1/auth/register');
    this.api
      .register({
        name: this.name.trim(),
        username: this.trimmedOrNull(this.username),
        gender: this.gender,
        relationship: this.relationship,
        dateOfBirth: this.dateOfBirth,
        password: this.trimmedOrNull(this.password),
        email: this.email.trim(),
        phone: this.trimmedOrNull(this.phone),
        avatarImageName: this.trimmedOrNull(this.avatarImageName),
        petName: this.trimmedOrNull(this.petName),
        familyCode: this.trimmedOrNull(this.familyCode),
        familyName: this.trimmedOrNull(this.familyName),
        referralCode: this.trimmedOrNull(this.referralCode),
        unlockPotential: false,
      })
      .subscribe({
        next: (user) => {
          this.registered = user;
          this.logIn();
        },
        error: (err) => this.fail(err, 'Could not create the account.'),
      });
  }

  /** Their frontend logs in straight after registering rather than reusing anything from step 4. */
  private logIn(): void {
    this.lastCall = 'POST /v1/auth/login';
    this.api.login({ email: this.email.trim() }, this.password).subscribe({
      next: (res) => {
        this.busy = false;
        this.loggedIn = res;
        this.info = null;
        this.step = 'done';
      },
      error: (err) => {
        // The account exists either way - only the follow-up sign-in failed.
        this.busy = false;
        this.step = 'done';
        this.error = this.messageOf(err, 'Account created, but signing in afterwards failed.');
      },
    });
  }

  private reset(call: string): void {
    this.error = null;
    this.info = null;
    this.busy = true;
    this.lastCall = call;
  }

  private fail(err: unknown, fallback: string): void {
    this.busy = false;
    this.error = this.messageOf(err, fallback);
  }

  private messageOf(err: unknown, fallback: string): string {
    const body = (err as { error?: { message?: string } })?.error;
    return body?.message ?? fallback;
  }

  private trimmedOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
