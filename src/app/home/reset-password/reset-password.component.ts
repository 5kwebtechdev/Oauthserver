import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CountriesService } from '../../core/services/countries.service';
import { AuthService } from '../../core/services/auth.service';

interface Country {
  name: string;
  code: string;
  flag: string; // Added flag property
  phoneLength: number;
  iso: string;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class ResetPasswordComponent {
  public resetPasswordForm: FormGroup;
  public step: number = 1; // Tracks the current step
  public mode: 'email' | 'phone' = 'email'; // Tracks the mode selected during login

  // Add properties for country code modal and phone validation
  public showCountryCodeModal = false;
  public selectedCountry: Country = { name: 'United States', code: '+1', flag: '', phoneLength: 10, iso: 'US' }; // Default country
  public countries: Country[] = [];

  // Add phone validation properties
  public isPhoneValid = false;
  public currentPhoneLength = 0;

  // Add OTP-related properties
  public otpDigits: string[] = ['', '', '', ''];
  public canResendOtp = false;
  public otpResendTimer = 300; // 5 minutes

  // Flag to detect user input (for OTP fields)
  public isFromUserInput = false;

  // Interval reference for OTP resend timer
  private resendInterval: any;

  // Properties for OTP error handling
  public otpError: string | null = null;
  public otpIncorrect: boolean = false;

  // API error shown under step 1 input
  public step1Error: string | null = null;

  // Password match validation error
  public passwordMismatchError: boolean = false;

  // Password visibility toggles
  public hideNewPassword: boolean = true;
  public hideConfirmPassword: boolean = true;
  public resetError: string | null = null;
  // Persist identifier used to request OTP so it can be reused in later steps
  public requestedIdentifier: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private countriesService: CountriesService // Inject CountriesService
    , private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.email]],
      phone: ['', []],
      otp: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {

    // Restore requested identifier if present (helps when component is recreated during navigation)
    const savedIdentifier = sessionStorage.getItem('requestedIdentifier');
    if (savedIdentifier) {
      this.requestedIdentifier = savedIdentifier;
      }

    // Get mode from query params (passed from login page)
    this.route.queryParams.subscribe((params) => {
      this.mode = params['mode'] || 'email';
      // Apply validators based on mode
      this.applyModeValidators();

      // If step query param is provided, go to that step
      const stepParam = params['step'];
      if (stepParam) {
        this.step = Number(stepParam);

        // If we're starting directly at step 2, initialize OTP timer
        if (this.step === 2) {
          this.startOtpTimer();
        }

        // If we're starting directly at step 3, ensure form controls are set up properly
        if (this.step === 3) {
          this.resetError = null;
          const newPasswordControl = this.resetPasswordForm.get('newPassword');
          const confirmPasswordControl = this.resetPasswordForm.get('confirmPassword');

          if (newPasswordControl && confirmPasswordControl) {
            newPasswordControl.setValue('');
            confirmPasswordControl.setValue('');
            newPasswordControl.markAsPristine();
            confirmPasswordControl.markAsPristine();
          }
        }
      }
    });

    // Load countries for the country code modal
    this.countriesService.getCountries().subscribe((countries) => {
      this.countries = countries;
      this.selectedCountry = this.countriesService.getDefaultCountry(); // Set default country
      this.currentPhoneLength = this.selectedCountry.phoneLength; // Initialize phone length
    });
  }

  private applyModeValidators(): void {
    const emailControl = this.resetPasswordForm.get('email');
    const phoneControl = this.resetPasswordForm.get('phone');

    if (this.mode === 'email') {
      emailControl?.setValidators([Validators.required, Validators.email]);
      phoneControl?.clearValidators();
      phoneControl?.setValue('');
    } else {
      phoneControl?.setValidators([Validators.required]);
      emailControl?.clearValidators();
      emailControl?.setValue('');
    }

    emailControl?.updateValueAndValidity();
    phoneControl?.updateValueAndValidity();
  }

  /**
   * Navigates back to the previous step or login page.
   */
  goBack(): void {
    if (this.step > 1) {
      this.step--;
      // update query params so URL reflects the current step (use absolute path like signup)
      this.router.navigate(['home/reset-password'], { queryParams: { step: this.step, mode: this.mode } });
    } else {
      this.router.navigate(['/home/login']); // Navigate back to login
    }
  }

  /**
   * Proceeds to the next step based on the current form validation.
   */
  proceedToNextStep(): void {
    
    if (this.step === 1 && this.mode === 'email') {
      const emailControl = this.resetPasswordForm.get('email');
      if (emailControl?.valid) {
        // Call API to request OTP with identifier = email
        const identifier = emailControl.value;
        this.step1Error = null;
        this.authService.requestOtp(identifier).subscribe({
          next: () => {
            this.step = 2; // Move to OTP screen
            // persist identifier for later steps
            this.requestedIdentifier = identifier;
            // persist across navigation/reloads
            try { if (this.requestedIdentifier) sessionStorage.setItem('requestedIdentifier', this.requestedIdentifier); } catch (e) { }
            this.startOtpTimer(); // Start OTP timer

            // update URL so route contains current step and mode (use absolute path like signup)
            this.router.navigate(['home/reset-password'], { queryParams: { step: this.step, mode: this.mode } });
          },
          error: (err) => {
            let body = err?.error;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
            this.step1Error = body?.error || body?.message || err?.message || 'Something went wrong. Please try again.';
          }
        });
      } else {
        console.error('Email is invalid');
      }
    } else if (this.step === 1 && this.mode === 'phone') {
      const phoneControl = this.resetPasswordForm.get('phone');
      if (phoneControl?.valid) {
        // Format phone with country code
        // const rawPhone = phoneControl.value;
        const identifier = phoneControl.value;
        this.step1Error = null;
        this.authService.requestOtp(identifier).subscribe({
          next: () => {
            this.step = 2; // Move to OTP screen
            // persist identifier with country code for later steps
            this.requestedIdentifier = identifier;
            try { if (this.requestedIdentifier) sessionStorage.setItem('requestedIdentifier', this.requestedIdentifier); } catch (e) { }
            this.startOtpTimer(); // Start OTP timer
            // update URL so route contains current step and mode (use absolute path like signup)
            this.router.navigate(['home/reset-password'], { queryParams: { step: this.step, mode: this.mode } });
          },
          error: (err) => {
            let body = err?.error;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
            this.step1Error = body?.error || body?.message || err?.message || 'Something went wrong. Please try again.';
          }
        });
      } else {
        console.error('Phone is invalid');
      }
    } else if (this.step === 2) {
      // For step 2, verify the OTP
      this.verifyOtp();
      if (!this.otpIncorrect) {
        this.clearOtpTimer(); // Clear the OTP timer
      } else {
        console.error('OTP is incorrect');
      }
    } else if (this.step === 3) {
      const newPasswordControl = this.resetPasswordForm.get('newPassword');
      const confirmPasswordControl = this.resetPasswordForm.get('confirmPassword');

      if (newPasswordControl?.valid && confirmPasswordControl?.valid) {
        // Check if passwords match
        if (newPasswordControl.value === confirmPasswordControl.value) {
          this.passwordMismatchError = false;
          // Call backend to reset password
          const email = this.requestedIdentifier
            ?? this.resetPasswordForm.get('email')?.value
            ?? '';

          this.authService.resetPassword(email, newPasswordControl.value).subscribe({
            next: (resp) => {
              this.resetError = null;
              // clear persisted identifier
              try { sessionStorage.removeItem('requestedIdentifier'); } catch (e) { }
              this.showPasswordResetSuccess();
            },
            error: (err) => {
              console.error('Password reset failed:', err);
              let body = err?.error;
              if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
              this.resetError = body?.message || body?.error || 'Something went wrong. Please try again.';
            }
          });
        } else {
          this.passwordMismatchError = true;
          console.error('Passwords do not match');
        }
      } else {
        if (!newPasswordControl?.valid) {
          console.error('New password is invalid');
        }
        if (!confirmPasswordControl?.valid) {
          console.error('Confirm password is invalid');
        }
      }
    }
  }

  // Modal logic
  openCountryCodeModal(): void {
    this.showCountryCodeModal = true;
  }

  closeCountryCodeModal(): void {
    this.showCountryCodeModal = false;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.currentPhoneLength = country.phoneLength; // Update phone length dynamically
    this.closeCountryCodeModal();
  }

  // Phone validation logic
  get phone(): string {
    return `${this.selectedCountry.code}${this.resetPasswordForm.get('phone')?.value || ''}`;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const phoneControl = this.resetPasswordForm.get('phone');

    if (phoneControl) {
      const numericValue = input.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
      phoneControl.setValue(numericValue); // Update the form control value

      // Validate length dynamically
      this.isPhoneValid = numericValue.length === this.currentPhoneLength;
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Only allow numbers (0-9)
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  getMaskedEmail(): string {
    const email = this.requestedIdentifier || this.resetPasswordForm.get('email')?.value || '';
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    const visible = local.substring(0, Math.min(3, local.length));
    const masked = '*'.repeat(Math.max(0, local.length - 3));
    return `${visible}${masked}@${domain}`;
  }

  // Get masked phone number for OTP display
  getMaskedPhoneNumber(): string {
    const phoneControl = this.resetPasswordForm.get('phone');
    if (!phoneControl || !phoneControl.value) {
      return '*******059'; // Fallback
    }

    const phone = phoneControl.value;
    if (phone.length < 4) {
      return '*******' + phone;
    }

    // Show first 2 and last 3 digits, mask the rest
    const firstTwo = phone.substring(0, 2);
    const lastThree = phone.substring(phone.length - 3);
    const maskedMiddle = '*'.repeat(Math.max(0, phone.length - 5));

    return firstTwo + maskedMiddle + lastThree;
  }

  // OTP-related methods
  onOtpInput(event: any, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const inputValue = inputElement.value;
    const previousValue = this.otpDigits[index];

    // Only allow numeric input
    const numericValue = inputValue.replace(/[^0-9]/g, '');

    // If input is being cleared (empty or only non-numeric), handle deletion
    if (!numericValue || numericValue.length === 0) {
      this.otpDigits[index] = '';
      inputElement.value = '';
      this.updateOtpFormControl();
      return;
    }

    // Take only the first digit and put it ONLY in current input
    const digit = numericValue.charAt(0);
    this.otpDigits[index] = digit;
    inputElement.value = digit; // Set value only to current input

    // Update the OTP form control after any change to otpDigits
    this.updateOtpFormControl();

    // Auto-advance to next input (move cursor only, don't copy value)
    // Only move if:
    // 1. User manually typed (not auto-fill)
    // 2. Value actually changed
    // 3. Not the last input
    if (this.isFromUserInput &&
      previousValue !== digit &&
      index < this.otpDigits.length - 1) {

      setTimeout(() => {
        const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus(); // Just move cursor, value will be empty
          // Ensure next input is empty
          nextInput.value = this.otpDigits[index + 1] || '';
        }
      }, 10);
    }

    // Reset the flag after processing
    this.isFromUserInput = false;
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    // Set flag for user input detection
    if (event.key >= '0' && event.key <= '9') {
      this.isFromUserInput = true;
    }

    // Handle backspace (like popular apps)
    if (event.key === 'Backspace') {
      event.preventDefault();

      const currentInput = event.target as HTMLInputElement;
      // Check both array value and input element value to handle sync issues
      const arrayValue = this.otpDigits[index];
      const inputValue = currentInput.value.trim();
      const hasValue = arrayValue || inputValue;

      // If current input has value, clear it and immediately move to previous field for continuous deletion
      if (hasValue) {
        this.otpDigits[index] = '';
        currentInput.value = '';
        this.updateOtpFormControl();
        
        // Immediately move to previous field if it exists (enables continuous deletion when holding backspace)
        if (index > 0) {
          const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
          if (prevInput) {
            // Use setTimeout to ensure the value is cleared before focusing
            setTimeout(() => {
              prevInput.focus();
            }, 0);
          }
        }
      } else if (index > 0) {
        // If current input is empty, move to previous input and clear it
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          const prevHasValue = this.otpDigits[index - 1] || prevInput.value.trim();
          if (prevHasValue) {
            this.otpDigits[index - 1] = '';
            prevInput.value = '';
            this.updateOtpFormControl();
            // Use setTimeout to ensure the value is cleared before focusing
            setTimeout(() => {
              prevInput.focus();
            }, 0);
          } else {
            // Previous field is also empty, move focus but don't clear
            setTimeout(() => {
              prevInput.focus();
              }, 0);
          }
        }
      } else {
        console.log(`[OTP Backspace] Already on first field (${index}), nothing to clear`);
      }
    }

    // Handle arrow keys for manual navigation
    if (event.key === 'ArrowRight' && index < this.otpDigits.length - 1) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  onOtpKeyup(event: KeyboardEvent, index: number): void {
    // Reset user input flag after a short delay
    setTimeout(() => {
      this.isFromUserInput = false;
    }, 50);
  }

  onOtpFocus(event: FocusEvent, index: number): void {
    // Select text when focused (like popular apps)
    const input = event.target as HTMLInputElement;
    setTimeout(() => {
      input.select();
    }, 10);
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const numericData = pasteData.replace(/[^0-9]/g, '');

    // Clear all inputs first
    this.otpDigits = ['', '', '', ''];

    // Fill OTP digits with pasted data (like popular apps)
    for (let i = 0; i < Math.min(numericData.length, this.otpDigits.length); i++) {
      this.otpDigits[i] = numericData[i];
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) {
        input.value = numericData[i];
      }
    }

    // Update the OTP form control after pasting
    this.updateOtpFormControl();

    // Focus on the next empty input or the last filled input (like WhatsApp)
    const nextEmptyIndex = this.otpDigits.findIndex(digit => digit === '');
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(numericData.length - 1, this.otpDigits.length - 1);

    if (focusIndex >= 0) {
      const focusInput = document.getElementById(`otp-input-${focusIndex}`) as HTMLInputElement;
      if (focusInput) {
        focusInput.focus();
      }
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(digit => digit !== '');
  }

  verifyOtp(): void {
    if (!this.isOtpComplete()) {
      this.otpError = 'Please enter the complete OTP';
      return;
    }

    const otp = this.otpDigits.join('');

    const email = this.requestedIdentifier
      ?? this.resetPasswordForm.get('email')?.value
      ?? '';

    this.authService.verifyOtp(email, otp).subscribe({
      next: (resp) => {
        this.otpIncorrect = false;
        this.otpError = null;
        this.resetError = null;
        this.step = 3;

        this.router.navigate(['home/reset-password'], { queryParams: { step: this.step, mode: this.mode } });
      },
      error: (err) => {
        console.error('OTP verification failed:', err);
        this.otpIncorrect = true;
        this.canResendOtp = true;
        this.clearOtpTimer();
        // If server returned text message, show it; otherwise fallback
        const serverMsg = err?.error || 'Incorrect OTP';
        this.otpError = typeof serverMsg === 'string' ? serverMsg : 'Incorrect OTP';
      }
    });
  }

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
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Checks if passwords match and updates error state
   */
  checkPasswordsMatch(): void {
    this.resetError = null;
    const newPassword = this.resetPasswordForm.get('newPassword')?.value;
    const confirmPassword = this.resetPasswordForm.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      this.passwordMismatchError = true;
    } else {
      this.passwordMismatchError = false;
    }
  }

  /**
   * Validates if the password form is ready for submission
   */
  isPasswordValid(): boolean {
    const newPasswordControl = this.resetPasswordForm.get('newPassword');
    const confirmPasswordControl = this.resetPasswordForm.get('confirmPassword');

    // Check if both fields are valid and passwords match
    return Boolean(newPasswordControl?.valid &&
      confirmPasswordControl?.valid &&
      newPasswordControl?.value === confirmPasswordControl?.value);
  }

  /**
   * Shows a success message and redirects to login page
   */
  showPasswordResetSuccess(): void {
    // You can implement a toast or modal notification here
   

    // Wait a moment before redirecting
    setTimeout(() => {
      this.router.navigate(['/home/login'], {
        queryParams: { passwordReset: 'success' }
      });
    }, 1500);
  }

  // Update the OTP form control after any change to otpDigits
  private updateOtpFormControl(): void {
    const otpValue = this.otpDigits.join('');
    const otpControl = this.resetPasswordForm.get('otp');
    if (otpControl) {
      otpControl.setValue(otpValue);
    }
  }

  resendOtp(): void {
    const identifier = this.requestedIdentifier
      ?? this.resetPasswordForm.get('email')?.value
      ?? this.resetPasswordForm.get('phone')?.value
      ?? '';

    if (!identifier) return;

    this.otpError = null;
    this.otpIncorrect = false;

    this.authService.requestOtp(identifier).subscribe({
      next: () => {
        // Clear OTP inputs
        this.otpDigits = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
          const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
          if (input) input.value = '';
        }
        setTimeout(() => {
          const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
          if (firstInput) firstInput.focus();
        }, 10);
        this.startOtpTimer();
      },
      error: (err) => {
        let body = err?.error;
        if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
        this.otpError = body?.message || body?.error || 'Failed to resend OTP. Please try again.';
      }
    });
  }
}