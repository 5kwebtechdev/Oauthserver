import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CountriesService } from '../../core/services/countries.service';
import { AuthService } from '../../core/services/auth.service';
import { NavController } from '@ionic/angular';
import { SocialMediaComponent } from '../../core/components/social-media/social-media.component';
import { AuthBackButtonComponent } from '../../core/components/auth-back-button/auth-back-button.component';

interface Country {
  name: string;
  code: string;
  flag: string;
  phoneLength: number;
  iso: string;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SocialMediaComponent, AuthBackButtonComponent],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  public resetPasswordForm: FormGroup;
  public step = 1;
  public mode: 'email' | 'phone' = 'email';
  public loading = false;
  public resendOtpInProgress = false;

  // Country / phone
  public showCountryCodeModal = false;
  public selectedCountry: Country = { name: 'United States', code: '+1', flag: '🇺🇸', phoneLength: 10, iso: 'US' };
  public countries: Country[] = [];
  public isPhoneValid = false;
  public currentPhoneLength = 10;

  // OTP
  public otpDigits: string[] = ['', '', '', ''];
  public canResendOtp = false;
  public otpResendTimer = 120;
  public isFromUserInput = false;
  public otpError: string | null = null;
  public otpIncorrect = false;
  private resendInterval: any;

  // Step 1 error
  public step1Error: string | null = null;

  // Step 3
  public passwordMismatchError = false;
  public hideNewPassword = true;
  public hideConfirmPassword = true;
  public resetError: string | null = null;
  public requestedIdentifier: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private countriesService: CountriesService,
    private authService: AuthService,
    private navCtrl: NavController
  ) {
    this.resetPasswordForm = this.fb.group({
      email:           ['', [Validators.email]],
      phone:           ['', []],
      otp:             ['', [Validators.required, Validators.minLength(4)]],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    const savedIdentifier = sessionStorage.getItem('requestedIdentifier');
    if (savedIdentifier) this.requestedIdentifier = savedIdentifier;

    this.route.queryParams.subscribe((params) => {
      this.mode = params['mode'] || 'email';
      this.applyModeValidators();

      const stepParam = params['step'];
      if (stepParam) {
        this.step = Number(stepParam);
        if (this.step === 2) this.startOtpTimer();
        if (this.step === 3) {
          this.resetError = null;
          this.resetPasswordForm.get('newPassword')?.setValue('');
          this.resetPasswordForm.get('confirmPassword')?.setValue('');
          this.resetPasswordForm.get('newPassword')?.markAsPristine();
          this.resetPasswordForm.get('confirmPassword')?.markAsPristine();
        }
      }
    });

    this.countriesService.getCountries().subscribe((countries) => {
      this.countries = countries;
      this.selectedCountry = this.countriesService.getDefaultCountry();
      this.currentPhoneLength = this.selectedCountry.phoneLength;
    });
  }

  ngOnDestroy(): void {
    this.clearOtpTimer();
  }

  // ── Computed getters ────────────────────────────────────────────────────────

  get otpAllFilled(): boolean {
    return this.otpDigits.every(d => d !== '');
  }

  get passwordStrengthPercent(): number {
    const pw = this.resetPasswordForm.get('newPassword')?.value || '';
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)  score += 25;
    if (pw.length >= 12) score += 25;
    if (/[A-Z]/.test(pw))          score += 25;
    if (/[^A-Za-z0-9]/.test(pw))   score += 25;
    return score;
  }

  get passwordStrengthLabel(): string {
    const p = this.passwordStrengthPercent;
    if (p <= 25) return 'Weak';
    if (p <= 50) return 'Fair';
    if (p <= 75) return 'Good';
    return 'Strong';
  }

  get passwordStrengthClass(): string {
    const p = this.passwordStrengthPercent;
    if (p <= 25) return 'weak';
    if (p <= 50) return 'fair';
    if (p <= 75) return 'good';
    return 'strong';
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  goBack(): void {
    if (this.step > 1) {
      this.step--;
      this.navCtrl.navigateBack(['/home/reset-password'], { queryParams: { step: this.step, mode: this.mode } });
    } else {
      this.navCtrl.navigateBack(['/home/login']);
    }
  }

  goToLogin(): void {
    this.navCtrl.navigateRoot(['/home/login']);
  }

  // ── Form flow ───────────────────────────────────────────────────────────────

  proceedToNextStep(): void {
    if (this.loading || this.resendOtpInProgress) return;

    if (this.step === 1) {
      this.sendOtpRequest();
    } else if (this.step === 2) {
      this.verifyOtp();
    } else if (this.step === 3) {
      this.submitPasswordReset();
    }
  }

  private sendOtpRequest(): void {
    const emailControl = this.resetPasswordForm.get('email');
    const phoneControl = this.resetPasswordForm.get('phone');

    if (this.mode === 'email' && !emailControl?.valid) return;
    if (this.mode === 'phone' && !this.isPhoneValid) return;

    const identifier = this.mode === 'email'
      ? (emailControl?.value || '')
      : (phoneControl?.value || '');

    this.step1Error = null;
    this.loading = true;

    this.authService.requestOtp(identifier).subscribe({
      next: () => {
        this.loading = false;
        this.requestedIdentifier = identifier;
        try { sessionStorage.setItem('requestedIdentifier', identifier); } catch { }
        this.step = 2;
        this.startOtpTimer();
        this.navCtrl.navigateForward(['/home/reset-password'], { queryParams: { step: 2, mode: this.mode } });
      },
      error: (err) => {
        this.loading = false;
        let body = err?.error;
        if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
        this.step1Error = body?.error || body?.message || err?.message || 'Something went wrong. Please try again.';
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpAllFilled) {
      this.otpError = 'Please enter the complete 4-digit code.';
      return;
    }

    const otp = this.otpDigits.join('');
    const email = this.requestedIdentifier ?? this.resetPasswordForm.get('email')?.value ?? '';

    this.loading = true;
    this.otpError = null;
    this.otpIncorrect = false;

    this.authService.verifyOtp(email, otp).subscribe({
      next: () => {
        this.loading = false;
        this.clearOtpTimer();
        this.step = 3;
        this.navCtrl.navigateForward(['/home/reset-password'], { queryParams: { step: 3, mode: this.mode } });
      },
      error: (err) => {
        this.loading = false;
        this.otpIncorrect = true;
        this.canResendOtp = true;
        this.clearOtpTimer();
        this.otpError = this.getFriendlyOtpErrorMessage(err);
      }
    });
  }

  private submitPasswordReset(): void {
    const newPw = this.resetPasswordForm.get('newPassword');
    const confirmPw = this.resetPasswordForm.get('confirmPassword');

    if (!newPw?.valid || !confirmPw?.valid || newPw.value !== confirmPw.value) {
      this.passwordMismatchError = (newPw?.value !== confirmPw?.value);
      return;
    }

    const email = this.requestedIdentifier ?? this.resetPasswordForm.get('email')?.value ?? '';
    this.loading = true;
    this.resetError = null;

    this.authService.resetPassword(email, newPw.value).subscribe({
      next: () => {
        this.loading = false;
        try { sessionStorage.removeItem('requestedIdentifier'); } catch { }
        this.step = 4;
      },
      error: (err) => {
        this.loading = false;
        let body = err?.error;
        if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
        this.resetError = body?.message || body?.error || 'Something went wrong. Please try again.';
      }
    });
  }

  // ── Country modal ───────────────────────────────────────────────────────────

  openCountryCodeModal(): void { this.showCountryCodeModal = true; }
  closeCountryCodeModal(): void { this.showCountryCodeModal = false; }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.currentPhoneLength = country.phoneLength;
    this.closeCountryCodeModal();
  }

  // ── Phone input ─────────────────────────────────────────────────────────────

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numeric = input.value.replace(/[^0-9]/g, '');
    this.resetPasswordForm.get('phone')?.setValue(numeric);
    this.isPhoneValid = numeric.length === this.currentPhoneLength;
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which || event.keyCode;
    return !(charCode > 31 && (charCode < 48 || charCode > 57));
  }

  // ── Masking helpers ─────────────────────────────────────────────────────────

  getMaskedEmail(): string {
    const email = this.requestedIdentifier || this.resetPasswordForm.get('email')?.value || '';
    if (!email.includes('@')) return email;
    const [local, domain] = email.split('@');
    const visible = local.substring(0, Math.min(3, local.length));
    return `${visible}${'*'.repeat(Math.max(0, local.length - 3))}@${domain}`;
  }

  getMaskedPhoneNumber(): string {
    const phone = this.resetPasswordForm.get('phone')?.value || '';
    if (phone.length < 4) return '*'.repeat(7) + phone;
    return phone.substring(0, 2) + '*'.repeat(Math.max(0, phone.length - 5)) + phone.substring(phone.length - 3);
  }

  // ── OTP handlers ────────────────────────────────────────────────────────────

  onOtpInput(event: any, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const numericValue = inputElement.value.replace(/[^0-9]/g, '');
    const previousValue = this.otpDigits[index];

    if (!numericValue) {
      this.otpDigits[index] = '';
      inputElement.value = '';
      this.updateOtpFormControl();
      return;
    }

    const digit = numericValue.charAt(0);
    this.otpDigits[index] = digit;
    inputElement.value = digit;
    this.updateOtpFormControl();

    // Clear error on new input
    if (this.otpIncorrect) {
      this.otpIncorrect = false;
      this.otpError = null;
    }

    // Advance focus
    if (this.isFromUserInput && previousValue !== digit && index < this.otpDigits.length - 1) {
      setTimeout(() => {
        const next = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        if (next) { next.focus(); next.value = this.otpDigits[index + 1] || ''; }
      }, 10);
    }
    this.isFromUserInput = false;

    // Auto-submit when all 4 filled
    if (this.otpAllFilled) {
      setTimeout(() => this.proceedToNextStep(), 300);
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key >= '0' && event.key <= '9') this.isFromUserInput = true;

    if (event.key === 'Backspace') {
      event.preventDefault();
      const current = event.target as HTMLInputElement;
      const hasValue = this.otpDigits[index] || current.value.trim();

      if (hasValue) {
        this.otpDigits[index] = '';
        current.value = '';
        this.updateOtpFormControl();
        if (index > 0) {
          setTimeout(() => {
            (document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement)?.focus();
          }, 0);
        }
      } else if (index > 0) {
        const prev = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prev) {
          this.otpDigits[index - 1] = '';
          prev.value = '';
          this.updateOtpFormControl();
          setTimeout(() => prev.focus(), 0);
        }
      }
    }

    if (event.key === 'ArrowRight' && index < this.otpDigits.length - 1) {
      (document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement)?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      (document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement)?.focus();
    }
  }

  onOtpKeyup(_event: KeyboardEvent, _index: number): void {
    setTimeout(() => { this.isFromUserInput = false; }, 50);
  }

  onOtpFocus(event: FocusEvent, _index: number): void {
    const input = event.target as HTMLInputElement;
    setTimeout(() => input.select(), 10);
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const numeric = (event.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '');
    this.otpDigits = ['', '', '', ''];
    for (let i = 0; i < Math.min(numeric.length, 4); i++) {
      this.otpDigits[i] = numeric[i];
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) input.value = numeric[i];
    }
    this.updateOtpFormControl();

    const nextEmpty = this.otpDigits.findIndex(d => d === '');
    const focusIndex = nextEmpty !== -1 ? nextEmpty : Math.min(numeric.length - 1, 3);
    (document.getElementById(`otp-input-${focusIndex}`) as HTMLInputElement)?.focus();

    if (this.otpAllFilled) setTimeout(() => this.proceedToNextStep(), 300);
  }

  // ── OTP timer ────────────────────────────────────────────────────────────────

  startOtpTimer(): void {
    this.clearOtpTimer();
    this.canResendOtp = false;
    this.otpResendTimer = 120;
    this.resendInterval = setInterval(() => {
      this.otpResendTimer--;
      if (this.otpResendTimer <= 0) {
        this.canResendOtp = true;
        this.clearOtpTimer();
      }
    }, 1000);
  }

  clearOtpTimer(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  resendOtp(): void {
    if (this.loading || this.resendOtpInProgress) {
      return;
    }

    const identifier = this.requestedIdentifier
      ?? this.resetPasswordForm.get('email')?.value
      ?? this.resetPasswordForm.get('phone')?.value
      ?? '';
    if (!identifier) return;

    this.otpError = null;
    this.otpIncorrect = false;
    this.resendOtpInProgress = true;

    this.authService.requestOtp(identifier).subscribe({
      next: () => {
        this.resendOtpInProgress = false;
        this.otpDigits = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
          const el = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
          if (el) el.value = '';
        }
        setTimeout(() => {
          (document.getElementById('otp-input-0') as HTMLInputElement)?.focus();
        }, 10);
        this.startOtpTimer();
      },
      error: (err) => {
        this.resendOtpInProgress = false;
        this.otpError = this.getFriendlyResendOtpErrorMessage(err);
      }
    });
  }

  private getFriendlyOtpErrorMessage(error: any): string {
    const message = this.extractErrorText(error).toLowerCase();

    if (message.includes('expired')) {
      return 'This code has expired. Please resend the code and try again.';
    }

    if (message.includes('invalid') || message.includes('incorrect') || message.includes('wrong')) {
      return 'Invalid code. Please check the 4-digit code and try again.';
    }

    return 'We could not verify this code. Please try again.';
  }

  private getFriendlyResendOtpErrorMessage(error: any): string {
    const message = this.extractErrorText(error).toLowerCase();

    if (message.includes('too many') || message.includes('limit')) {
      return 'Too many attempts. Please wait a little before requesting a new code.';
    }

    return 'We could not resend the code. Please try again.';
  }

  private extractErrorText(error: any): string {
    let body = error?.error;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return body;
      }
    }

    if (body?.message) return String(body.message);
    if (body?.error) return String(body.error);
    if (error?.message) return String(error.message);
    return '';
  }

  // ── Password validation ──────────────────────────────────────────────────────

  checkPasswordsMatch(): void {
    this.resetError = null;
    const newPw = this.resetPasswordForm.get('newPassword')?.value;
    const confirmPw = this.resetPasswordForm.get('confirmPassword')?.value;
    this.passwordMismatchError = !!(newPw && confirmPw && newPw !== confirmPw);
  }

  isPasswordValid(): boolean {
    const newPw = this.resetPasswordForm.get('newPassword');
    const confirmPw = this.resetPasswordForm.get('confirmPassword');
    return !!(newPw?.valid && confirmPw?.valid && newPw.value === confirmPw.value);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private applyModeValidators(): void {
    const emailCtrl = this.resetPasswordForm.get('email');
    const phoneCtrl = this.resetPasswordForm.get('phone');
    if (this.mode === 'email') {
      emailCtrl?.setValidators([Validators.required, Validators.email]);
      phoneCtrl?.clearValidators();
      phoneCtrl?.setValue('');
    } else {
      phoneCtrl?.setValidators([Validators.required]);
      emailCtrl?.clearValidators();
      emailCtrl?.setValue('');
    }
    emailCtrl?.updateValueAndValidity();
    phoneCtrl?.updateValueAndValidity();
  }

  private updateOtpFormControl(): void {
    const otpCtrl = this.resetPasswordForm.get('otp');
    if (otpCtrl) otpCtrl.setValue(this.otpDigits.join(''));
  }
}
