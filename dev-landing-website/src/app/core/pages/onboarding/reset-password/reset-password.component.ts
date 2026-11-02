import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../../services/auth.service';
import { CountriesService, Country } from '../../../services/countries.service';
import { LogoComponent } from '../../../components/logo/logo.component';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';


@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LogoComponent, SupermeNavigatorComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  step: number = 1;
  loginMode: 'email' | 'phone' = 'email';

  resetForm!: FormGroup;
  passwordForm!: FormGroup;

  otpDigits: string[] = ['', '', '', ''];
  otpResendTimer: number = 120;
  canResendOtp: boolean = false;
  timerInterval: any;

  hidePassword: boolean = true;
  hideConfirmPassword: boolean = true;

  countries: Country[] = [];
  selectedCountry: Country = { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' };
  currentPhoneLength: number = 10;
  showCountryCodeModal: boolean = false;

  errorMessage: string = '';
  private subscriptions: Subscription = new Subscription();

  headerText: string = 'Reset Password';
  headerSubtext: string = 'Enter your email or phone number to reset your password';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private countriesService: CountriesService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadCountries();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private initForms(): void {
    this.resetForm = this.fb.group({
      email: ['', [Validators.email]],
      phone: ['']
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  private loadCountries(): void {
    this.countriesService.getCountries().subscribe(countries => {
      this.countries = countries;
      const defaultCountry = this.countries.find(c => c.code === '+91');
      if (defaultCountry) {
        this.selectedCountry = defaultCountry;
        this.currentPhoneLength = defaultCountry.phoneLength;
      }
    });
  }

  get email() { return this.resetForm.get('email'); }
  get phone() { return this.resetForm.get('phone'); }
  get password() { return this.passwordForm.get('password'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }

  switchMode(mode: 'email' | 'phone'): void {
    this.loginMode = mode;
    this.errorMessage = '';
    this.resetForm.reset();
  }

  openCountryCodeModal(): void {
    this.showCountryCodeModal = true;
  }

  closeCountryCodeModal(): void {
    this.showCountryCodeModal = false;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.currentPhoneLength = country.phoneLength;
    this.closeCountryCodeModal();
  }

  isPhoneValid(phone: string | null): boolean {
    if (!phone) return false;
    return phone.length === this.currentPhoneLength;
  }

  getPhoneErrorMessage(): string {
    const phone = this.phone?.value;
    if (!phone) return 'Phone number is required';
    if (phone.length !== this.currentPhoneLength) {
      return `Phone number must be ${this.currentPhoneLength} digits`;
    }
    return '';
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.resetForm.patchValue({ phone: input.value });
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which || event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  isStep1Valid(): boolean {
    if (this.loginMode === 'email') {
      return this.email?.valid || false;
    } else {
      return this.isPhoneValid(this.phone?.value);
    }
  }

  goBack(): void {
    if (this.step === 1) {
      this.router.navigate(['/auth/login']);
    } else if (this.step === 2) {
      this.step = 1;
      this.clearOtp();
      this.updateHeader();
    } else if (this.step === 3) {
      this.step = 2;
      this.updateHeader();
    }
  }

  requestOtp(): void {
    this.errorMessage = '';
    const email = this.email?.value;

    const sub = this.authService.requestOtp(email).subscribe({
      next: () => {
        sessionStorage.setItem('reset_identifier', email);
        this.step = 2;
        this.updateHeader();
        this.startOtpTimer();
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Failed to send OTP. Please try again.';
      }
    });
    this.subscriptions.add(sub);
  }

  startOtpTimer(): void {
    this.otpResendTimer = 120;
    this.canResendOtp = false;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.otpResendTimer--;
      if (this.otpResendTimer <= 0) {
        this.canResendOtp = true;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    
    if (value.length > 0) {
      this.otpDigits[index] = value[0];
      input.value = value[0];
      
      if (index < 3) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    } else {
      this.otpDigits[index] = '';
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        this.otpDigits[index - 1] = '';
        prevInput.value = '';
      }
    }
  }

  onOtpKeyup(event: KeyboardEvent, index: number): void {
    // Handle any additional keyup logic
  }

  onOtpFocus(event: FocusEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 4);
    
    for (let i = 0; i < 4; i++) {
      this.otpDigits[i] = digits[i] || '';
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) {
        input.value = this.otpDigits[i];
      }
    }

    if (digits.length === 4) {
      const lastInput = document.getElementById('otp-input-3') as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(digit => digit.length === 1);
  }

  clearOtp(): void {
    this.otpDigits = ['', '', '', ''];
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    }
  }

  verifyOtp(): void {
    this.errorMessage = '';
    const otp = this.otpDigits.join('');
    const email = sessionStorage.getItem('reset_identifier') || '';

    const sub = this.authService.verifyOtp(email, otp).subscribe({
      next: () => {
        this.step = 3;
        this.updateHeader();
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Invalid OTP. Please try again.';
      }
    });
    this.subscriptions.add(sub);
  }

  resendOtp(): void {
    this.clearOtp();
    const email = sessionStorage.getItem('reset_identifier') || '';

    const sub = this.authService.requestOtp(email).subscribe({
      next: () => {
        this.startOtpTimer();
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Failed to resend OTP.';
      }
    });
    this.subscriptions.add(sub);
  }

  isPasswordValid(): boolean {
    const password = this.password?.value;
    const confirmPassword = this.confirmPassword?.value;
    return password && password.length >= 8 && password === confirmPassword;
  }

  resetPassword(): void {
    this.errorMessage = '';
    
    if (this.password?.value !== this.confirmPassword?.value) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    const email = sessionStorage.getItem('reset_identifier') || '';
    const newPassword = this.password?.value;

    const sub = this.authService.resetPassword(email, newPassword).subscribe({
      next: () => {
        sessionStorage.removeItem('reset_identifier');
        this.router.navigate(['/auth/login'], {
          queryParams: { message: 'Password reset successfully. Please login.' }
        });
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Failed to reset password. Please try again.';
      }
    });
    this.subscriptions.add(sub);
  }

  updateHeader(): void {
    switch (this.step) {
      case 1:
        this.headerText = 'Reset Password';
        this.headerSubtext = 'Enter your email or phone number to reset your password';
        break;
      case 2:
        const mode = sessionStorage.getItem('reset_mode');
        const identifier = sessionStorage.getItem('reset_identifier');
        this.headerText = 'Verify OTP';
        this.headerSubtext = `Enter the 4-digit code sent to ${mode === 'email' ? identifier : 'your phone'}`;
        break;
      case 3:
        this.headerText = 'Create New Password';
        this.headerSubtext = 'Your new password must be at least 8 characters';
        break;
    }
  }
}
