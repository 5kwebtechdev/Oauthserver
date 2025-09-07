import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CountriesService } from '../../core/services/countries.service';

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

  // Password match validation error
  public passwordMismatchError: boolean = false;
  
  // Password visibility toggles
  public hideNewPassword: boolean = true;
  public hideConfirmPassword: boolean = true;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private countriesService: CountriesService // Inject CountriesService
  ) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required ]],
      otp: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    console.log('Initial Form State:', this.resetPasswordForm);
    console.log('Initial Form Validity:', this.resetPasswordForm.valid);

    // Get mode from query params (passed from login page)
    this.route.queryParams.subscribe((params) => {
      this.mode = params['mode'] || 'email';
      
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
          // Make sure password fields are properly initialized
          const newPasswordControl = this.resetPasswordForm.get('newPassword');
          const confirmPasswordControl = this.resetPasswordForm.get('confirmPassword');
          
          if (newPasswordControl && confirmPasswordControl) {
            // Reset values in case there are any cached values
            newPasswordControl.setValue('');
            confirmPasswordControl.setValue('');
            
            // Mark as pristine/untouched to prevent validation errors on initial load
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

  /**
   * Navigates back to the previous step or login page.
   */
  goBack(): void {
    if (this.step > 1) {
      this.step--;
    } else {
      this.router.navigate(['/home/login']); // Navigate back to login
    }
  }

  /**
   * Proceeds to the next step based on the current form validation.
   */
  proceedToNextStep(): void {
    console.log('Form Validity:', this.resetPasswordForm.valid);

    if (this.step === 1 && this.mode === 'email') {
      const emailControl = this.resetPasswordForm.get('email');
      if (emailControl?.valid) {
        this.step = 2; // Move to OTP screen
        this.startOtpTimer(); // Start OTP timer
      } else {
        console.error('Email is invalid');
      }
    } else if (this.step === 1 && this.mode === 'phone') {
      const phoneControl = this.resetPasswordForm.get('phone');
      if (phoneControl?.valid) {
        this.step = 2; // Move to OTP screen
        this.startOtpTimer(); // Start OTP timer
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
          
          // Reset password successful - here you would normally make an API call
          console.log('Password reset successful');
          
          // Show success message before redirecting
          this.showPasswordResetSuccess();
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

    // Clear the input immediately to prevent interference
    inputElement.value = '';

    if (numericValue.length > 0) {
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
    } else {
      // Handle deletion
      this.otpDigits[index] = '';
      inputElement.value = '';
      
      // Update the OTP form control
      this.updateOtpFormControl();
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

      // If current input has value, clear it
      if (this.otpDigits[index]) {
        this.otpDigits[index] = '';
        (event.target as HTMLInputElement).value = '';
      } else if (index > 0) {
        // If current input is empty, move to previous input and clear it
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          this.otpDigits[index - 1] = '';
          prevInput.value = '';
          prevInput.focus();
        }
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
    console.log('Verifying OTP:', otp);

    // Simulate OTP verification (replace with actual API call)
    // Here we're simulating an OTP verification
    const correctOtp = '1234'; // This would come from your backend in a real app
    
    if (otp !== correctOtp) {
      this.otpIncorrect = true;
      this.canResendOtp = true;
      this.clearOtpTimer();
      this.otpError = 'Incorrect OTP';
      return;
    }
    
    // If OTP is correct
    this.otpIncorrect = false;
    this.otpError = null;
    this.step = 3; // Move to new password screen
  }

  startOtpTimer(): void {
    this.canResendOtp = false;
    this.otpResendTimer = 300; // 5 minutes

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
    console.log('Password reset successful!');
    
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
      console.log('OTP form control updated:', otpValue);
    }
  }

  resendOtp(): void {
    // Clear any previous errors
    this.otpError = null;
    this.otpIncorrect = false;
    
    // Clear OTP inputs
    this.otpDigits = ['', '', '', ''];
    
    // Clear all input values
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    }
    
    // Focus first input
    setTimeout(() => {
      const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 10);
    
    // Restart timer
    this.startOtpTimer();
    
    // Simulate sending a new OTP (replace with actual API call)
    console.log('Resending OTP to:', this.getMaskedPhoneNumber());
  }
}