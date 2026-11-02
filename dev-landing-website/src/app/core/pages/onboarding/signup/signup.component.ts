import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../../services/auth.service';
import { GoogleAuthService } from '../../../services/google-auth.service';
import { CountriesService, Country } from '../../../services/countries.service';
import { UserService } from '../../../services/user.service';
import { CoreService } from '../../../services/core.service';
import { SocialMediaComponent } from '../../../components/social-media';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { SupermeBirthdaypickerComponent } from '../../../components/superme-inputs/superme-birthdaypicker/superme-birthdaypicker.component';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';
import { ParentImageService } from '../../../services/parent-image.service';
import { LogoComponent } from '../../../components/logo/logo.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SocialMediaComponent, SupermeButtonComponent, SupermeBirthdaypickerComponent, SupermeNavigatorComponent, LogoComponent],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class SignupComponent implements OnInit, OnDestroy {
  public requestedIdentifier: string | null = null;
  public signupForm: FormGroup;
  public profileForm: FormGroup;
  public passwordForm: FormGroup;
  public loginMode: 'email' | 'phone' = 'email';
  public whatsappConsent = true;
  public step!: number;
  public hidePassword = true;

  public showCountryCodeModal = false;
  public selectedCountry: Country;
  public countries: Country[] = [];
  private subscription = new Subscription();

  // OTP related
  public otpDigits: string[] = ['', '', '', ''];
  public canResendOtp = false;
  public otpResendTimer = 120;
  private resendInterval: any;
  private isFromUserInput = false;

  public roleSelected!: 'child' | 'parent' | 'self';
  public gender!: 'male' | 'female';
  public avatarSelected: any;
  public errorMessage: string | null = null;
  public showReferral = false;
  public referralCode = '';
  public referralValidationStatus: 'pending' | 'valid' | 'invalid' | null = null;
  public referralErrorMessage: string = '';
  private referralCheckInProgress: boolean = false;

  public openBirthdayPicker = false;
  public showAgeSuggestionModal = false;
  public computedAge: number | null = null;
  public showAccessRestrictedModal = false;

  public stepDescription = [
    'Pick a role to move forward',
    'Tell us about you!',
    'Sign up to begin your journey',
    "They'll grow with you, cheer you on"
  ];

  public avatars = [
    { key: 1, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png' },
    { key: 2, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png' },
    { key: 3, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png' },
    { key: 4, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png' },
    { key: 5, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png' },
    { key: 6, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png' },
    { key: 7, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png' },
    { key: 8, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png' },
    { key: 9, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png' },
    { key: 10, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png' },
    { key: 11, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png' },
    { key: 12, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png' },
  ];

  public pets = [
    { displayName: 'Bubu the Panda', name: 'Panda', image: 'assets/Images-Pet/Panda-Age1-Happy.png', text: ['Loves quiet focus and gentle growth'] },
    { displayName: 'Kiko the Llama', name: 'Llama', image: 'assets/Images-Pet/Llama-Age1-Happy.png', text: ['Loves quiet focus and gentle growth'] },
    { displayName: 'Gradon the dragon', name: 'Dragon', image: 'assets/Images-Pet/Dragon-Age1-Happy.png', text: ['Loves quiet focus and gentle growth'] },
    { displayName: 'Olly the Owl', name: 'Owl', image: 'assets/Images-Pet/Owl-Age1-Happy.png', text: ['Loves quiet focus and gentle growth'] }
  ];

  public currentPetIndex = 0;
  public currentImage = this.pets[0];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private core: CoreService,
    private countriesService: CountriesService,
    private authService: AuthService,
    private userService: UserService,
    public parentImageService: ParentImageService,
    private googleAuthService: GoogleAuthService
  ) {
    this.selectedCountry = { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' };
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', []],
    });
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, (control: any) => {
        const v: string = (control.value || '').trim().toLowerCase();
        return v.startsWith('super') ? { startsWithSuper: true } : null;
      }]],
      dob: [''],
    });
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
    });

    this.route.queryParams.subscribe(params => {
      const stepParam = params['step'];
      const roleParam = params['role'];
      if (roleParam && ['child', 'parent', 'self'].includes(roleParam)) {
        try { sessionStorage.setItem('signup_role', roleParam); } catch (e) { }
        this.roleSelected = roleParam;
      }
      this.step = Number(stepParam) || 1;
      if (stepParam === '0.1') this.step = 0.1;
      else if (stepParam === '0.2') this.step = 0.2;
      else if (stepParam === '0.3') this.step = 0.3;
      this.enforceParentFlowRestrictions();
      this.openBirthdayPicker = false;
      if (this.step === 4) {
        const storedRole = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self' | null;
        if (storedRole) this.roleSelected = storedRole;
        const petFromSession = sessionStorage.getItem('signup_pet');
        if (petFromSession) {
          const idx = this.pets.findIndex(p => p.name === petFromSession);
          this.currentImage = idx >= 0 ? this.pets[idx] : this.pets[0];
          this.currentPetIndex = idx >= 0 ? idx : 0;
        }
      }
    });
  }

  get email() { return this.signupForm.get('email'); }
  get phone() { return this.signupForm.get('phone'); }
  get password() { return this.passwordForm.get('password'); }
  get name() { return this.profileForm.get('name'); }

  get currentRole(): 'child' | 'parent' | 'self' | undefined {
    const stored = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self' | null;
    return stored || this.roleSelected;
  }

  getNameInitial(): string {
    try {
      const fullName: string = (this.profileForm.get('name')?.value || '').trim();
      if (!fullName) return '?';
      return fullName.charAt(0).toUpperCase();
    } catch { return '?'; }
  }

  get headerText(): string {
    if (this.step === 1) return "Who's using the app?";
    if (this.step === 0.1) return 'Add phone number or email address';
    if (this.step === 0.2) return this.loginMode === 'phone' ? 'Check your phone' : 'Check your email';
    if (this.step === 0.3) return 'Create Password';
    return "Let's set you up!";
  }

  get headerSubtext(): string {
    if (this.step === 0.2) return this.loginMode === 'phone' ? this.getMaskedPhoneNumber() : (this.email?.value || '');
    if (this.step === 0.3) return 'It must be six characters or more';
    return '';
  }

  get showHeaderSubtext(): boolean {
    return this.step === 0.2 || this.step === 0.3;
  }

  ngOnInit(): void {
    this.openBirthdayPicker = false;
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
          const defaultCountry = countries.find(c => c.iso === 'IN');
          if (defaultCountry) this.selectedCountry = defaultCountry;
        },
        error: (error) => console.error('Error loading countries:', error)
      })
    );

    const savedIdentifier = sessionStorage.getItem('requestedIdentifier');
    if (savedIdentifier) this.requestedIdentifier = savedIdentifier;
    const savedLoginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone';
    if (savedLoginMode) this.loginMode = savedLoginMode;
    const savedCountryCode = sessionStorage.getItem('countryCode');
    if (savedCountryCode) {
      const foundCountry = this.countries?.find(c => c.code === savedCountryCode);
      if (foundCountry) this.selectedCountry = foundCountry;
    }
    const savedRole = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self';
    if (savedRole) this.roleSelected = savedRole;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.clearOtpTimer();
  }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;
  }

  signupFromLogin() {
    if (this.email?.invalid) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }
    const email = this.email?.value;
    this.authService.checkEmailExists(email).subscribe({
      next: (res: any) => {
        const exists = res?.exists ?? res?.data?.exists ?? false;
        if (exists) {
          this.errorMessage = 'This email is already registered. Please login instead.';
          return;
        }
        this.authService.registerRequestOtp(email).subscribe({
          next: () => {
            this.errorMessage = null;
            this.requestedIdentifier = email;
            try { sessionStorage.setItem('requestedIdentifier', email); } catch (e) { }
            this.startOtpTimer();
            this.router.navigate(['auth/signup'], { queryParams: { step: 0.2 } });
          },
          error: (err) => {
            this.handleApiError(err, 'Failed to send OTP');
          }
        });
      },
      error: (err) => {
        this.handleApiError(err, 'Failed to verify email');
      }
    });
  }

  private handleApiError(err: any, fallbackMsg: string) {
    if (err instanceof ProgressEvent || (err && err.type === 'error' && err.target)) {
      this.errorMessage = 'Network error. Cannot reach server.';
    } else if (err?.error?.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err?.error === 'string') {
      try {
        const parsed = JSON.parse(err.error);
        this.errorMessage = parsed?.message || err.error;
      } catch (e) {
        this.errorMessage = err.error;
      }
    } else {
      this.errorMessage = fallbackMsg + '. Status: ' + (err?.status || 'unknown');
    }
  }

  proceedWithRole() {
    if (!this.roleSelected) {
      this.errorMessage = 'Please select a role';
      return;
    }
    this.errorMessage = null;
    try { sessionStorage.setItem('signup_role', this.roleSelected); } catch (e) { }
    // Ensure navigation and local step state both update. Some router config may not
    // emit queryParams change immediately; set step locally as a fallback.
    console.log('proceedWithRole - selected role:', this.roleSelected);
    this.router.navigate(['auth/signup'], { queryParams: { step: 2 } });
    this.step = 2;
  }

  proceedWithPassword() {
    if (this.passwordForm.valid) {
      this.errorMessage = null;
      try { sessionStorage.setItem('signup_password', this.password?.value || ''); } catch (e) { }
      this.router.navigate(['auth/signup'], { queryParams: { step: 1 } });
    } else {
      this.errorMessage = 'Please enter a valid password (6-12 characters)';
    }
  }

  registerOrProceed() {
    if (this.currentRole !== 'parent' && !this.avatarSelected) {
      this.errorMessage = 'Please select an avatar';
      return;
    }
    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;

    if (age !== null && age < 8) {
      this.showAccessRestrictedModal = true;
      return;
    }
    if (age === null) {
      this.errorMessage = 'Please enter your date of birth';
      return;
    }

    try {
      const profile = {
        name: this.profileForm.get('name')?.value,
        dob: parsedDob ? parsedDob.getTime() : null,
        gender: this.gender,
        avatar: this.currentRole === 'parent' ? this.getNameInitial() : this.avatarSelected
      };
      sessionStorage.setItem('signup_profile', JSON.stringify(profile));
      if (this.referralCode && this.referralCode.length > 0) {
        sessionStorage.setItem('referralCode', this.referralCode);
      }
    } catch (e) { }

    const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;

    if (role === 'child') {
      if (age !== null && age >= 18) {
        this.showAgeSuggestionModal = true;
        return;
      }
      this.router.navigate(['auth/instructions-for-child'], { queryParams: { role: 'child' } });
    } else if (role === 'parent') {
      if (age !== null && age < 24) {
        this.showAgeSuggestionModal = true;
        return;
      }
      this.router.navigate(['auth/instructions-for-parent'], { queryParams: { role: 'parent' } });
    } else if (role === 'self') {
      this.router.navigate(['auth/signup'], { queryParams: { step: 4 } });
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    if (this.step === 0.1) {
      this.router.navigate(['auth/login']);
    } else if (this.step === 0.2) {
      this.clearOtpTimer();
      this.router.navigate(['auth/signup'], { queryParams: { step: 0.1 } });
    } else if (this.step === 0.3) {
      this.router.navigate(['auth/signup'], { queryParams: { step: 0.2 } });
    } else if (this.step === 1) {
      this.router.navigate(['auth/signup'], { queryParams: { step: 0.3 } });
    } else if (this.step > 1) {
      this.router.navigate(['auth/signup'], { queryParams: { step: this.step - 1 } });
    }
  }

  returnSameNumber(num: any) {
    if (num === 1) return 'one';
    if (num === 2) return 'two';
    if (num === 3) return 'three';
    return 'four';
  }

  // OTP Methods
  onOtpInput(event: any, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const inputValue = inputElement.value;
    const previousValue = this.otpDigits[index];
    const numericValue = inputValue.replace(/[^0-9]/g, '');

    if (!numericValue || numericValue.length === 0) {
      this.otpDigits[index] = '';
      inputElement.value = '';
      return;
    }

    const digit = numericValue.charAt(0);
    this.otpDigits[index] = digit;
    inputElement.value = digit;

    if (this.isFromUserInput && previousValue !== digit && index < this.otpDigits.length - 1) {
      setTimeout(() => {
        const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.value = this.otpDigits[index + 1] || '';
        }
      }, 10);
    }
    this.isFromUserInput = false;
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key >= '0' && event.key <= '9') this.isFromUserInput = true;
    if (event.key === 'Backspace') {
      event.preventDefault();
      const currentInput = event.target as HTMLInputElement;
      const hasValue = this.otpDigits[index] || currentInput.value.trim();
      if (hasValue) {
        this.otpDigits[index] = '';
        currentInput.value = '';
        if (index > 0) {
          setTimeout(() => {
            const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
            if (prevInput) prevInput.focus();
          }, 0);
        }
      } else if (index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          this.otpDigits[index - 1] = '';
          prevInput.value = '';
          setTimeout(() => prevInput.focus(), 0);
        }
      }
    }
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
    setTimeout(() => { this.isFromUserInput = false; }, 50);
  }

  onOtpFocus(event: FocusEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    setTimeout(() => input.select(), 10);
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const numericData = pasteData.replace(/[^0-9]/g, '');
    this.otpDigits = ['', '', '', ''];
    for (let i = 0; i < Math.min(numericData.length, this.otpDigits.length); i++) {
      this.otpDigits[i] = numericData[i];
      const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (input) input.value = numericData[i];
    }
    const nextEmptyIndex = this.otpDigits.findIndex(digit => digit === '');
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(numericData.length - 1, this.otpDigits.length - 1);
    if (focusIndex >= 0) {
      const focusInput = document.getElementById(`otp-input-${focusIndex}`) as HTMLInputElement;
      if (focusInput) focusInput.focus();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(digit => digit !== '');
  }

  verifyOtp(): void {
    if (!this.isOtpComplete()) {
      this.errorMessage = 'Please enter the complete OTP';
      return;
    }
    const otp = this.otpDigits.join('');
    const email = this.requestedIdentifier || sessionStorage.getItem('requestedIdentifier') || this.email?.value || '';

    this.authService.registerVerifyOtp(email, otp).subscribe({
      next: () => {
        this.errorMessage = null;
        this.clearOtpTimer();
        this.router.navigate(['auth/signup'], { queryParams: { step: 0.3 } });
      },
      error: (err) => {
        this.handleApiError(err, 'Incorrect OTP. Please try again');
        this.canResendOtp = true;
        this.clearOtpTimer();
      }
    });
  }

  resendOtp(): void {
    const email = this.requestedIdentifier || sessionStorage.getItem('requestedIdentifier') || this.email?.value || '';
    if (!email) {
      this.errorMessage = 'No email available to resend OTP';
      return;
    }

    this.authService.registerRequestOtp(email).subscribe({
      next: () => {
        this.errorMessage = null;
        this.otpDigits = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
          const input = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
          if (input) input.value = '';
        }
        setTimeout(() => {
          const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
          if (firstInput) firstInput.focus();
        }, 50);
        this.startOtpTimer();
      },
      error: (err) => {
        this.handleApiError(err, 'Failed to resend OTP');
      }
    });
  }

  private startOtpTimer(): void {
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

  private clearOtpTimer(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }

  getMaskedPhoneNumber(): string {
    const phoneControl = this.signupForm.get('phone');
    if (!phoneControl || !phoneControl.value) return '*******059';
    const phone = phoneControl.value;
    if (phone.length < 4) return '*******' + phone;
    const firstTwo = phone.substring(0, 2);
    const lastThree = phone.substring(phone.length - 3);
    const maskedMiddle = '*'.repeat(Math.max(0, phone.length - 5));
    return firstTwo + maskedMiddle + lastThree;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Phone & Country
  openCountryCodeModal(): void {
    if (this.loginMode === 'phone') this.showCountryCodeModal = true;
  }
  closeCountryCodeModal(): void { this.showCountryCodeModal = false; }
  get currentPhoneLength(): number { return this.selectedCountry.phoneLength; }

  isPhoneValid(phoneValue: string): boolean {
    if (!phoneValue) return false;
    const cleanPhone = phoneValue.replace(/\D/g, '');
    return cleanPhone.length === this.currentPhoneLength;
  }

  /**
   * Return true when the identifier entered on step 0.1 is valid:
   * - If loginMode is 'phone' -> phone must match required length
   * - If loginMode is 'email' -> email control must be valid
   */
  isIdentifierValid(): boolean {
    if (this.loginMode === 'phone') {
      return this.isPhoneValid(this.phone?.value || '');
    }
    return !!(this.email && this.email.valid && this.email.value && this.email.value.toString().trim().length > 0);
  }

  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.selectedCountry.name}`;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.showCountryCodeModal = false;
    const phoneControl = this.signupForm.get('phone');
    if (phoneControl) {
      phoneControl.markAsUntouched();
      phoneControl.updateValueAndValidity();
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) return false;
    return true;
  }

  onPhoneInput(event: any): void {
    const input = event.target;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    this.signupForm.patchValue({ phone: numericValue });
    setTimeout(() => {
      input.setSelectionRange(numericValue.length, numericValue.length);
    }, 0);
  }

  // Referral
  toggleReferral(): void {
    this.showReferral = !this.showReferral;
    if (!this.showReferral) {
      this.referralCode = '';
      try { sessionStorage.removeItem('referralCode'); } catch (e) { }
    }
  }

  onReferralInput(event: any): void {
    const raw = (event.target.value || '') as string;
    // Allow only alphanumeric, max 8, normalize to UPPERCASE
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    this.referralCode = cleaned;
    try { event.target.value = cleaned; } catch (e) { }
    try { sessionStorage.setItem('referralCode', this.referralCode); } catch (e) { }

    // Trigger validation when exactly 8 chars entered
    if (cleaned.length === 8) {
      this.checkReferralCodeValidity(cleaned);
    } else {
      this.referralValidationStatus = null;
      this.referralErrorMessage = '';
    }
  }

  private checkReferralCodeValidity(referralCode: string): void {
    if (this.referralCheckInProgress) return;

    this.referralCheckInProgress = true;
    this.referralValidationStatus = 'pending';
    this.referralErrorMessage = '';

    this.authService.checkReferralCode(referralCode).subscribe({
      next: (response: any) => {
        this.referralCheckInProgress = false;

        let isValid: boolean | null = null;
        try {
          if (typeof response === 'boolean') {
            isValid = response;
          } else if (response && typeof response === 'object') {
            if ('valid' in response) isValid = !!response.valid;
            else if ('isValid' in response) isValid = !!response.isValid;
            else if ('success' in response) isValid = !!response.success;
            else if ('status' in response && typeof response.status === 'string') {
              isValid = response.status === 'valid' || response.status === 'success';
            }
          }
        } catch (e) {
          isValid = null;
        }

        if (isValid === false) {
          this.referralValidationStatus = 'invalid';
          this.referralErrorMessage = (response && response.message) ? response.message : 'Invalid referral code';
          console.log('Referral code invalid:', response);
        } else {
          this.referralValidationStatus = 'valid';
          this.referralErrorMessage = '';
          console.log('Referral code valid:', response);
        }
      },
      error: (error: any) => {
        this.referralCheckInProgress = false;
        this.referralValidationStatus = 'invalid';
        const errorMsg = error?.error?.message || 'Invalid referral code';
        this.referralErrorMessage = errorMsg;
        console.error('Referral code validation failed:', error);
      }
    });
  }

  // Birthday
  birthdayChanged(date: any) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return;
    this.profileForm.patchValue({ dob: parsedDate.toISOString().slice(0, 10) });
    this.computedAge = this.calculateAge(parsedDate);
    this.openBirthdayPicker = false;
  }

  /**
   * Return true when profile fields required for saving are present:
   * - name (valid)
   * - dob (value present)
   * - gender selected
   * - for non-parents: avatar selected
   */
  isProfileComplete(): boolean {
    const nameControl = this.profileForm.get('name');
    const dobVal = this.profileForm.get('dob')?.value;
    const hasName = !!(nameControl && nameControl.value && nameControl.value.toString().trim().length > 0 && nameControl.valid);
    const hasDob = !!dobVal;
    const hasGender = !!this.gender;
    if (!hasName || !hasDob || !hasGender) return false;
    if ((this.currentRole as any) !== 'parent') {
      return !!this.avatarSelected;
    }
    return true;
  }

  private calculateAge(dob: Date): number | null {
    try {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age;
    } catch (e) { return null; }
  }

  // Modals
  closeAgeSuggestionModal(): void { this.showAgeSuggestionModal = false; }
  closeAccessRestrictedModal(): void { this.showAccessRestrictedModal = false; }

  selectSelfRole(): void {
    this.roleSelected = 'self';
    this.showAgeSuggestionModal = false;
    try { sessionStorage.setItem('signup_role', 'self'); } catch (e) { }
    this.router.navigate(['auth/signup'], { queryParams: { step: 1 } });
  }

  selectParentRole(): void {
    this.roleSelected = 'parent';
    this.showAgeSuggestionModal = false;
    try { sessionStorage.setItem('signup_role', 'parent'); } catch (e) { }
    this.router.navigate(['auth/signup'], { queryParams: { step: 1 } });
  }

  // Pet selection
  selectPet(index: number) {
    this.currentPetIndex = index;
    this.currentImage = this.pets[index];
    sessionStorage.setItem('signup_pet', this.pets[index].name);
  }

  proceedWithPet() {
    const petName = this.currentImage?.name || this.pets[0].name;
    sessionStorage.setItem('signup_pet', petName);
    const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
    if (role === 'child' || role === 'self') {
      this.registerChildOrSelfFromSession(role);
    }
  }

  private registerChildOrSelfFromSession(role: 'child' | 'self') {
    this.errorMessage = null;
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password') || this.password?.value;
    const identifier = this.requestedIdentifier || this.email?.value || this.phone?.value;
    const familyCode = sessionStorage.getItem('familyCode');

    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) { profile = {}; }

    const avatarKey = profile.avatar ?? this.avatarSelected ?? null;
    const avatarNameValue = avatarKey ? `avatar${avatarKey}` : undefined;
    const avatarImageNameValue = avatarKey ? `Avatar ${Number(avatarKey)}` : undefined;

    const referralCode = sessionStorage.getItem('referralCode');

    const payload: any = {
      name: profile.name || this.profileForm.get('name')?.value,
      gender: (profile.gender || this.gender || '').toUpperCase(),
      relationship: (role || '').toUpperCase(),
      password: password || undefined,
      avatarName: avatarNameValue,
      avatarImageName: avatarImageNameValue,
      familyCode: familyCode || '',
      referralCode: referralCode || null
    };

    if (this.loginMode === 'email' || (identifier && identifier.includes && identifier.includes('@'))) {
      payload.email = identifier;
    } else {
      const contactNumber = sessionStorage.getItem('countryCode') || this.selectedCountry.code;
      payload.phone = contactNumber + identifier;
    }

    const dobValue = profile.dob || this.profileForm.get('dob')?.value;
    if (dobValue) {
      const dobDate = new Date(dobValue);
      payload.dateOfBirth = dobDate.toISOString().split('T')[0];
    }

    try {
      let petName = sessionStorage.getItem('signup_pet') || this.currentImage?.name;
      if (!petName && this.pets.length > 0) petName = this.pets[0].name;
      if (petName) payload.petName = petName;
    } catch (e) { }

    const googleData = this.googleAuthService.getStoredData();
    if (googleData) {
      // Google signup — call oauth2-login with full profile
      const oauth2Payload = {
        provider: googleData.provider,
        providerId: googleData.providerId,
        email: googleData.email,
        name: payload.name || googleData.name,
        avatarUrl: googleData.avatarUrl,
        gender: (payload.gender || '').toLowerCase() || undefined,
        dob: payload.dateOfBirth || undefined,
        avatarImageName: payload.avatarImageName || undefined,
        petName: payload.petName || undefined,
      };
      this.authService.oauth2Login(oauth2Payload).subscribe({
        next: () => {
          this.googleAuthService.clearStoredData();
          this.clearSessionData();
          try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) { }
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.handleApiError(err, 'Google signup failed');
        }
      });
    } else {
      this.authService.register(payload).subscribe({
        next: () => {
          const passwordForLogin = password || sessionStorage.getItem('signup_password') || this.password?.value || '';
          try {
            if (payload.email) sessionStorage.setItem('login_email', payload.email);
            if (payload.phone) sessionStorage.setItem('login_phone', payload.phone);
            sessionStorage.setItem('login_password', passwordForLogin);
          } catch (e) { }

          try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) { }
          this.clearSessionData();
          this.router.navigate(['auth/signup'], { queryParams: { step: 5 } });
        },
        error: (err) => {
          this.handleApiError(err, 'Registration failed');
        }
      });
    }
  }

  onBegin() {
    const email = sessionStorage.getItem('login_email');
    const phone = sessionStorage.getItem('login_phone');
    const password = sessionStorage.getItem('login_password');
    const credentials: any = { password };
    if (email) credentials.email = email;
    else if (phone) credentials.phone = phone;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: () => {
        this.router.navigate(['auth/login']);
      }
    });
  }

  private clearSessionData() {
    try {
      sessionStorage.removeItem('signup_profile');
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('signup_role');
      sessionStorage.removeItem('signup_avatar');
      sessionStorage.removeItem('requestedIdentifier');
      sessionStorage.removeItem('familyCode');
      sessionStorage.removeItem('referralCode');
      sessionStorage.removeItem('familyName');
      sessionStorage.removeItem('familyCreator');
    } catch (e) { }
  }

  navigateToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  navigateToTermsOfUse(): void {
    this.router.navigate(['/terms']);
  }

  private enforceParentFlowRestrictions(): void {
    if (this.currentRole !== 'parent') return;
    const stepValue = Number(this.step);
    if (stepValue === 4 || stepValue === 5) {
      this.step = 2;
      this.router.navigate(['auth/signup'], { queryParams: { step: 2 }, replaceUrl: true });
    }
  }
}
