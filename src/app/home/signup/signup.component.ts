import { Component, OnInit, Renderer2, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { CoreService } from "../../core/services/core.service";
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CountriesService, Country } from "../../core/services/countries.service";
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';


@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in',
          style({ transform: 'translateX(-100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class SignupComponent implements AfterViewInit, OnInit, OnDestroy {
  // Persist identifier used to request OTP so it can be reused in later steps
  public requestedIdentifier: string | null = null;
  public signupForm: FormGroup;
  public profileForm: FormGroup;
  public passwordForm: FormGroup; // Add password form
  public loginMode: 'email' | 'phone' = 'phone';
  public whatsappConsent = true;
  public step !: number;

  public showCountryCodeModal = false;
  public selectedCountry: Country;
  public countries: Country[] = [];
  private subscription = new Subscription();

  // OTP related properties
  public otpDigits: string[] = ['', '', '', ''];
  public canResendOtp = false;
  public otpResendTimer = 120; // 2 minutes
  private resendInterval: any;
  private isFromUserInput = false; // Track if input is from user typing vs auto-fill

  public roleSelected !: 'child' | 'parent' | 'self';
  public gender !: 'male' | 'female';
  public avatarSelected: any;

  public errorMessage: string | null = null;
  // Referral code UI and value
  public showReferral: boolean = false;
  public referralCode: string = '';

  // Use an accessor so we can defensively guard and log unexpected changes
  private _openBirthdayPicker = false;
  public get openBirthdayPicker(): boolean {
    return this._openBirthdayPicker;
  }
  public set openBirthdayPicker(val: boolean) {
    // small debug log to catch unexpected auto-opens; safe to remove later
    if (val && !this._openBirthdayPicker) {
      console.debug('[Signup] openBirthdayPicker => true');
    } else if (!val && this._openBirthdayPicker) {
      console.debug('[Signup] openBirthdayPicker => false');
    }
    this._openBirthdayPicker = val;
  }
  public showAgeSuggestionModal = false;
  public computedAge: number | null = null;


  public stepDesciption = [
    'Pick a role to move forward',      // Step 1 - Role Selection
    'Tell us about you!',          // Step 2 - Profile Information (Name, DOB, Gender, Avatar)  
    'Sign up to begin your journey',         // Step 3 - Account Creation (Phone/Email)
    "They'll grow with you, cheer you on"   // Step 4 - Pet Selection
  ]

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
  ]

  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef;
  @ViewChild('swiperEl', { static: false }) swiperRef!: ElementRef;

  images = [
    'https://picsum.photos/id/1011/600/400',
    'https://picsum.photos/id/1015/600/400',
    'https://picsum.photos/id/1019/600/400',
    'https://picsum.photos/id/1025/600/400',
  ];

  pets: any[] = [{
    displayName: 'Bubu the Panda',
    name: 'Panda',
    image: 'assets/Images-Pet/Panda-Age1-Happy.png',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }, {
    displayName: 'Kiko the Llama',
    name: 'Llama',
    image: 'assets/Images-Pet/Llama-Age1-Happy.png',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }, {
    displayName: 'Gradon the dragon',
    name: 'Dragon',
    image: 'assets/Images-Pet/Dragon-Age1-Happy.png',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }, {
    displayName: 'Olly the Owl',
    name: 'Owl',
    image: 'assets/Images-Pet/Owl-Age1-Happy.png',
    text: ['Loves quiet focus and gentle growth', 'Loves quiet focus and gentle growth']
  }]

  public currentImage: any = this.pets[0];

  ngAfterViewInit(): void {
    if (!this.swiperRef?.nativeElement) {
      return;
    }
    const swiperEl = this.swiperRef.nativeElement;

    // Wait until Swiper instance is ready
    swiperEl.addEventListener('swiperinit', () => {
      const swiperInstance = swiperEl.swiper;
      // Initialize with first pet
      this.currentImage = this.pets[0];
      // Store the selected pet name
      try {
        sessionStorage.setItem('signup_pet', this.pets[0].name);
      } catch (e) { }
    });

    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      const realIndex = swiperInstance.realIndex;
      this.currentImage = this.pets[realIndex];
      // Store the selected pet name whenever it changes
      try {
        sessionStorage.setItem('signup_pet', this.pets[realIndex].name);
      } catch (e) { }
    });
  }

  ngOnInit(): void {
    // Defensive: ensure picker does not open automatically on init
    this.openBirthdayPicker = false;

    // Load countries from service
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
        },
        error: (error) => {
          console.error('Error loading countries:', error);
          // Fallback to default country if loading fails
          this.countries = [this.countriesService.getDefaultCountry()];
        }
      })
    );

    // Debug: check if flag is properly loaded

    // Restore requested identifier if present (helps when component is recreated during navigation)
    const savedIdentifier = sessionStorage.getItem('requestedIdentifier');
    if (savedIdentifier) {
      this.requestedIdentifier = savedIdentifier;
    }
  }

  attachSlideChangeListener(swiperEl: HTMLElement) {

  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private renderer: Renderer2,
    private router: Router,
    private core: CoreService,
    private countriesService: CountriesService,
    private authService: AuthService,
    private userService: UserService
  ) {
    // Initialize with default country
    this.selectedCountry = this.countriesService.getDefaultCountry();
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', []],
    });

    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      dob: [''],
    })

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
    })
    this.route.queryParams.subscribe(params => {
      const stepParam = params['step'];
      const roleParam = params['role'];

      // If role was provided via query (e.g. from scanner), persist it
      if (roleParam && ['child', 'parent', 'self'].includes(roleParam)) {
        try { sessionStorage.setItem('signup_role', roleParam); } catch (e) { }
        this.roleSelected = roleParam;
      }

      this.step = Number(stepParam) || 1;
      // Handle special step cases
      if (stepParam === '0.1') {
        this.step = 0.1;
      } else if (stepParam === '0.2') {
        this.step = 0.2;
      } else if (stepParam === '0.3') {
        this.step = 0.3;
      }
      this.enforceParentFlowRestrictions();
      this.renderer.setStyle(document.documentElement, '--step', this.step);
      // Ensure birthday picker doesn't open automatically when navigating to step 3
      this.openBirthdayPicker = false;
      // If we've navigated directly to pet selection, ensure a pet is selected and carousel shows
      try {
        if (this.step === 4) {
          // ensure roleSelected is set from session if available
          const storedRole = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self' | null;
          if (storedRole) this.roleSelected = storedRole;

          const petFromSession = sessionStorage.getItem('signup_pet');
          if (petFromSession) {
            const idx = this.pets.findIndex(p => p.name === petFromSession);
            this.currentImage = idx >= 0 ? this.pets[idx] : this.pets[0];
          } else {
            this.currentImage = this.pets[0];
            sessionStorage.setItem('signup_pet', this.pets[0].name);
          }

          // If swiper instance exists, move it to the stored pet index
          setTimeout(() => {
            try {
              const swiperInstance = this.swiperRef?.nativeElement?.swiper;
              if (swiperInstance) {
                const targetIndex = this.pets.findIndex(p => p.name === (petFromSession || this.pets[0].name));
                if (targetIndex >= 0) swiperInstance.slideTo(targetIndex);
              }
            } catch (e) { /* ignore */ }
          }, 200);
        }
      } catch (e) { /* ignore */ }
    })
  }

  get email() {
    return this.signupForm.get('email');
  }

  get phone() {
    return this.signupForm.get('phone');
  }

  get password() {
    return this.passwordForm.get('password');
  }

  get name() {
    return this.profileForm.get('name');
  }

  // Determine current role from session or selection
  get currentRole(): 'child' | 'parent' | 'self' | undefined {
    const stored = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self' | null;
    return stored || this.roleSelected;
  }

  // Generate initial from name for parent avatar placeholder
  getNameInitial(): string {
    try {
      const fullName: string = (this.profileForm.get('name')?.value || '').trim();
      if (!fullName) return '?';
      return fullName.charAt(0).toUpperCase();
    } catch {
      return '?';
    }
  }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;
  }

  signup() {
    // persist entered identifier in session for later registration
    try {
      const identifier = this.loginMode === 'email' ? this.email?.value : this.phone?.value;
      if (identifier) sessionStorage.setItem('requestedIdentifier', identifier);
    } catch (e) { }

    // Decide next step based on selected role:
    // - If user is a parent (last screen), perform registration now.
    // - If user is self/child, navigate to pet selection (step 4) and register from there.
    const savedRole = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
    if (savedRole === 'parent') {
      // Parent: register immediately
      this.registerFromSession();
    } else {
      // Self/Child: go to pet selection screen before registering
      this.router.navigate(['home/sign-up'], { queryParams: { step: 4 } });
    }
  }

  signupFromLogin() {
    // Validate form first
    if (this.loginMode === 'phone') {
      if (!this.isPhoneValid(this.phone?.value)) {
        this.core.triggerToasrt('Please enter a valid phone number');
        return;
      }
      const identifier = this.phone?.value;
      const countryCode = this.selectedCountry.code;
      this.authService.registerRequestOtp(identifier, false, countryCode).subscribe({
        next: (resp) => {
          this.errorMessage = null; // Clear any previous errors
          this.requestedIdentifier = identifier;
          try {
            if (this.requestedIdentifier) {
              sessionStorage.setItem('requestedIdentifier', this.requestedIdentifier);

              sessionStorage.setItem('loginMode', this.loginMode);
              sessionStorage.setItem('countryCode', countryCode);
            }
          } catch (e) { }

          this.startOtpTimer();
          this.router.navigate(['home/sign-up'], { queryParams: { step: 0.2 } });

          setTimeout(() => {
            const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 100);
        },
        error: (err) => {
          console.error('Failed to request OTP (phone):', err);
          console.error('Error type:', err?.constructor?.name);
          console.error('Error status:', err?.status);
          console.error('Error url:', err?.url);
          // Handle ProgressEvent errors (network failures on Android)
          if (err instanceof ProgressEvent || (err && err.type === 'error' && err.target)) {
            this.errorMessage = 'Network error. Cannot reach server. Please check your connection.';
            this.core.triggerToasrt('Network error. Cannot reach server at ' + (err?.url || 'API'));
          } else if (err?.error?.message) {
            this.errorMessage = err.error.message;
            this.core.triggerToasrt(err.error.message);
          } else if (typeof err?.error === 'string') {
            this.errorMessage = err.error;
            this.core.triggerToasrt(err.error);
          } else {
            this.errorMessage = 'Failed to send OTP. Status: ' + (err?.status || 'unknown');
            this.core.triggerToasrt(this.errorMessage);
          }
        }
      });
    } else {
      if (this.email?.invalid) {
        this.errorMessage = 'Please enter a valid email address';
        return;
      }
      const identifier = this.email?.value;
      this.authService.registerRequestOtp(identifier, true).subscribe({
        next: (resp) => {
          this.errorMessage = null; // Clear any previous errors
          this.requestedIdentifier = identifier;
          try {
            if (this.requestedIdentifier) {
              sessionStorage.setItem('requestedIdentifier', this.requestedIdentifier);

              sessionStorage.setItem('loginMode', this.loginMode);
            }
          } catch (e) { }

          this.startOtpTimer();
          this.router.navigate(['home/sign-up'], { queryParams: { step: 0.2 } });

          setTimeout(() => {
            const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 100);
        },
        error: (err) => {
          console.error('Failed to request OTP (email):', err);
          console.error('Error type:', err?.constructor?.name);
          console.error('Error status:', err?.status);
          console.error('Error url:', err?.url);
          let msg: string;
          // Handle ProgressEvent errors (network failures on Android)
          if (err instanceof ProgressEvent || (err && err.type === 'error' && err.target)) {
            msg = 'Network error. Cannot reach server at ' + (err?.url || 'API');
          } else if (err?.error?.message) {
            msg = err.error.message;
          } else if (typeof err?.error === 'string') {
            msg = err.error;
          } else {
            msg = 'Failed to send OTP. Status: ' + (err?.status || 'unknown');
          }
          this.errorMessage = msg;
          try { this.core.triggerToasrt(msg); } catch (e) { /* swallow */ }
        }
      });
    }
  }

  dob() {
    return this.profileForm.get('dob');
  }

  proceedWithRole() {
    if (!this.roleSelected) {
      this.core.triggerToasrt('Please select a role');
      return;
    }
    this.errorMessage = null; // Clear any previous errors
    // persist role selection
    try { sessionStorage.setItem('signup_role', this.roleSelected); } catch (e) { }

    // proceed to next step without age validation
    this.router.navigate(['home/sign-up'], { queryParams: { step: 2 } });
  }

  proceedWithAvatar() {
    // Only validate avatar selection if not on pet selection AND role is not parent
    if (this.step !== 4 && this.currentRole !== 'parent' && !this.avatarSelected) {
      this.core.triggerToasrt('Please select an avatar');
      return;
    }

    // persist avatar or initial when applicable
    try {
      const avatarValue = this.currentRole === 'parent' ? this.getNameInitial() : (this.avatarSelected ?? '');
      if (avatarValue) sessionStorage.setItem('signup_avatar', String(avatarValue));
    } catch (e) { }

    // If we're currently on the pet selection step (step 4), persist selected pet and navigate to welcome step
    if (this.step === 4) {
      const swiperInstance = this.swiperRef?.nativeElement?.swiper;

      let selectedPetName;
      if (swiperInstance) {
        const currentIndex = swiperInstance.realIndex;
        selectedPetName = this.pets[currentIndex]?.name;
      } else {
        selectedPetName = this.currentImage?.name;
      }

      // If still no pet name, check session storage
      if (!selectedPetName) {
        selectedPetName = sessionStorage.getItem('signup_pet');
      }

      // Last resort: use first pet
      if (!selectedPetName && this.pets.length > 0) {
        selectedPetName = this.pets[0].name;
      }

      if (selectedPetName) {
        sessionStorage.setItem('signup_pet', selectedPetName);
      }

      // If role is child or self, register account now and then show welcome step
      const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
      if (role === 'child' || role === 'self') {
        this.registerChildOrSelfFromSession(role as 'child' | 'self');
        return;
      }

      // Navigate to welcome step (step 5) for other flows
      this.router.navigate(['home/sign-up'], { queryParams: { step: 5 } });
      return;
    }

    // If role is 'self', go to pet selection (step 4)
    if (this.roleSelected === 'self') {
      this.router.navigate(['home/sign-up'], { queryParams: { step: 4 } });
      return;
    }

    // For child/parent: validate age and route accordingly
    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;

    if (age !== null) {
      // Child role: age < 24 is valid, age >= 24 shows popup
      if (this.roleSelected === 'child') {
        if (age < 18) {
          console.warn('Child age is below 18, which may not be allowed depending on regulations.');
          // Valid age for child role - go to child instructions
          this.router.navigate(['home/instructions-for-child'], { queryParams: { role: 'child' } });
          return;
        } else {
          console
          // Age >= 24 - show suggestion popup
          this.showAgeSuggestionModal = true;
          return;
        }
      }

      // Parent role: age >= 24 is valid, age < 24 shows popup
      if (this.roleSelected === 'parent') {
        if (age >= 24) {
          console
          // Valid age for parent role - go to parent instructions
          this.router.navigate(['home/instructions-for-parent'], { queryParams: { role: 'parent' } });
          return;
        } else {
          console.warn('Parent age is below 24, which may not be allowed depending on regulations.');
          // Age < 24 - show suggestion popup repeatedly until correct age
          this.showAgeSuggestionModal = true;
          return;
        }
      }
    }

    // If no age provided, require age input
    if (age === null) {
      this.core.triggerToasrt('Please enter your date of birth');
      return;
    }

    // persist profile details in session (name, dob, gender, avatar/initial)
    try {
      const profile = {
        name: this.profileForm.get('name')?.value,
        dob: parsedDob ? parsedDob.getTime() : null,
        gender: this.gender,
        avatar: this.currentRole === 'parent' ? this.getNameInitial() : this.avatarSelected
      };
      sessionStorage.setItem('signup_profile', JSON.stringify(profile));
    } catch (e) { }

    // Fallback: continue to step 3 (phone/email)
    this.router.navigate(['home/sign-up'], { queryParams: { step: 3 } });
  }

  /**
   * Called from profile Save & Continue when user should be registered immediately
   */
  registerOrProceed(): void {
    // Skip avatar requirement for parent; require for others
    if (this.currentRole !== 'parent' && !this.avatarSelected) {
      this.core.triggerToasrt('Please select an avatar');
      return;
    }

    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;

    if (age === null) {
      this.core.triggerToasrt('Please enter your date of birth');
      return;
    }

    // persist profile details (store initial as avatar for parent)
    try {
      const profile = {
        name: this.profileForm.get('name')?.value,
        dob: parsedDob ? parsedDob.getTime() : null,
        gender: this.gender,
        avatar: this.currentRole === 'parent' ? this.getNameInitial() : this.avatarSelected
      };
      sessionStorage.setItem('signup_profile', JSON.stringify(profile));
      // Persist referral code (if provided) using existing familyCode key expected elsewhere
      if (this.referralCode && this.referralCode.length > 0) {
        try { sessionStorage.setItem('familyCode', this.referralCode); } catch (e) { }
      }
    } catch (e) { }

    // Get the role from session storage or current selection
    const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;

    // Apply age-based routing rules
    if (role === 'child') {
      // For child: if age >= 18, show suggestion modal, else go to instructions
      if (age !== null && age >= 18) {
        this.showAgeSuggestionModal = true;
        return;
      } else {
        this.router.navigate(['home/instructions-for-child'], { queryParams: { role: 'child' } });
        return;
      }
    } else if (role === 'parent') {
      // For parent: if age < 24, show suggestion modal, else go to instructions
      if (age !== null && age < 24) {
        this.showAgeSuggestionModal = true;
        return;
      } else {
        this.router.navigate(['home/instructions-for-parent'], { queryParams: { role: 'parent' } });
        return;
      }
    } else if (role === 'self') {
      this.router.navigate(['home/sign-up'], { queryParams: { step: 4 } });
      return;
    }
  }

  goBack() {
    if (this.step === 0.1) {
      // From step 0.1, go back to login
      this.router.navigate(['home/login']);
    } else if (this.step === 0.2) {
      // From step 0.2, go back to step 0.1
      this.clearOtpTimer();
      this.router.navigate(['home/sign-up'], { queryParams: { step: 0.1 } });
    } else if (this.step === 0.3) {
      // From step 0.3 (password creation), go back to step 0.2 (OTP verification)
      this.router.navigate(['home/sign-up'], { queryParams: { step: 0.2 } });
    } else if (this.step === 1) {
      // From step 1 (role selection), go back to step 0.3 (password creation)
      this.router.navigate(['home/sign-up'], { queryParams: { step: 0.3 } });
    } else if (this.step > 1) {
      this.router.navigate(['home/sign-up'], { queryParams: { step: this.step - 1 } });
    }
  }

  onCancel() {
    this.router.navigate(['home']);
  }

  returnSameNumber(num: any) {
    if (num === 1) {
      return 'one';
    } else if (num === 2) {
      return 'two';
    } else if (num === 3) {
      return 'three';
    } else {
      return 'four';
    }
  }

  onSubmit() {
    if (this.signupForm.valid) {
    }
  }

  onSlideChange() {
    if (!this.swiperRef?.nativeElement) {
      return;
    }

    const swiperInstance = this.swiperRef.nativeElement.swiper;
    if (swiperInstance) {
      const currentIndex = swiperInstance.realIndex;

      this.currentImage = this.pets[currentIndex];

      // Store the selected pet name
      if (this.pets[currentIndex]) {
        const petName = this.pets[currentIndex].name;
        sessionStorage.setItem('signup_pet', petName);
      }
    } else {
    }
  } openBirthdayPickerNow() {
    // explicitly open the birthday picker only when user clicks the input
    this.openBirthdayPicker = true;
  }

  birthdayChanged(date: any) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return;
    }

    this.profileForm.patchValue({
      dob: parsedDate.toISOString().slice(0, 10)
    })

    this.computedAge = this.calculateAge(parsedDate);
    // close the picker after choosing a date
    this.openBirthdayPicker = false;

    // Don't show popup automatically when birthday changes
    // Only show popup when user clicks Save & Continue with invalid age
  }

  private calculateAge(dob: Date): number | null {
    try {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return null;
    }
  }

  closeAgeSuggestionModal(): void {
    this.showAgeSuggestionModal = false;
  }

  selectSelfRole(): void {
    this.roleSelected = 'self';
    this.showAgeSuggestionModal = false;
    // Update role in session storage
    try { sessionStorage.setItem('signup_role', 'self'); } catch (e) { }
    // Navigate back to step 1 (role selection)
    this.router.navigate(['home/sign-up'], { queryParams: { step: 1 } });
  }

  selectParentRole(): void {
    this.roleSelected = 'parent';
    this.showAgeSuggestionModal = false;
    // Update role in session storage
    try { sessionStorage.setItem('signup_role', 'parent'); } catch (e) { }
    // Navigate back to step 1 (role selection)
    this.router.navigate(['home/sign-up'], { queryParams: { step: 1 } });
  }

  openCountryCodeModal(): void {
    if (this.loginMode === 'phone') {
      this.showCountryCodeModal = true;
    }
  }

  closeCountryCodeModal(): void {
    this.showCountryCodeModal = false;
  }

  // Get current phone number length requirement
  get currentPhoneLength(): number {
    return this.selectedCountry.phoneLength;
  }

  // Validate phone number based on selected country
  isPhoneValid(phoneValue: string): boolean {
    if (!phoneValue) return false;
    const cleanPhone = phoneValue.replace(/\D/g, ''); // Remove non-digits
    return cleanPhone.length === this.currentPhoneLength;
  }

  // Format phone validation error message
  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.selectedCountry.name}`;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.showCountryCodeModal = false;

    // Clear phone validation when country changes
    const phoneControl = this.signupForm.get('phone');
    if (phoneControl) {
      phoneControl.markAsUntouched();
      phoneControl.updateValueAndValidity();
    }
  }

  // Only allow numeric input
  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Only allow numbers (0-9)
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  // Toggle the referral code input visibility
  toggleReferral(): void {
    this.showReferral = !this.showReferral;
    // If hiding the input, clear stored code
    if (!this.showReferral) {
      this.referralCode = '';
      try { sessionStorage.removeItem('familyCode'); } catch (e) { }
    }
    // If showing, focus the input after a short delay
    if (this.showReferral) {
      setTimeout(() => {
        const input = document.querySelector('.referral-input-wrapper input') as HTMLInputElement;
        if (input) input.focus();
      }, 50);
    }
  }

  // Handle referral input: allow only alphanumeric and max length 8
  onReferralInput(event: any): void {
    const raw = (event.target.value || '') as string;
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    this.referralCode = cleaned;
    // Update input value to cleaned value (prevents caret jump)
    try { event.target.value = cleaned; } catch (e) { }
    try { sessionStorage.setItem('familyCode', this.referralCode); } catch (e) { }
  }

  // Handle phone input to ensure only numbers
  onPhoneInput(event: any): void {
    const input = event.target;
    const value = input.value;
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');

    // Update the form control with clean numeric value
    this.signupForm.patchValue({
      phone: numericValue
    });

    // Set cursor position to end
    setTimeout(() => {
      input.setSelectionRange(numericValue.length, numericValue.length);
    }, 0);
  }

  // OTP related methods
  getOtpDestination(): string {
    if (this.loginMode === 'phone') {
      const phoneValue = this.phone?.value || '';
      const maskedPhone = phoneValue.length > 4
        ? phoneValue.slice(0, 2) + '*'.repeat(phoneValue.length - 4) + phoneValue.slice(-2)
        : phoneValue;
      return `${this.selectedCountry.code} ${maskedPhone}`;
    } else {
      const emailValue = this.email?.value || '';
      const [username, domain] = emailValue.split('@');
      if (username && domain) {
        const maskedUsername = username.length > 2
          ? username.slice(0, 2) + '*'.repeat(Math.max(0, username.length - 4)) + username.slice(-2)
          : username;
        return `${maskedUsername}@${domain}`;
      }
      return emailValue;
    }
  }

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
      return;
    }

    // Take only the first digit and put it ONLY in current input
    const digit = numericValue.charAt(0);
    this.otpDigits[index] = digit;
    inputElement.value = digit; // Set value only to current input

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
      this.core.triggerToasrt('Please enter the complete OTP');
      return;
    }

    const otp = this.otpDigits.join('');

    // Get saved values from session storage if available
    const savedLoginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone' || this.loginMode;
    const identifier = this.requestedIdentifier || (savedLoginMode === 'phone' ? this.phone?.value : this.email?.value);
    const isEmail = savedLoginMode === 'email';
    const countryCode = savedLoginMode === 'phone' ? (sessionStorage.getItem('countryCode') || this.selectedCountry.code) : undefined;

    this.authService.registerVerifyOtp(identifier || '', otp, isEmail, countryCode).subscribe({
      next: (resp) => {
        this.errorMessage = null; // Clear any previous errors
        this.clearOtpTimer();
        // Proceed to password creation
        this.router.navigate(['home/sign-up'], { queryParams: { step: 0.3 } });
      },
      error: (err) => {
        console.error('OTP verification failed:', err);
        // Handle ProgressEvent errors (network failures on Android)
        if (err instanceof ProgressEvent || (err && err.type === 'error' && err.target)) {
          this.errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else if (typeof err?.error === 'string') {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = 'Incorrect OTP. Please try again.';
        }
        this.canResendOtp = true;
        this.clearOtpTimer();
      }
    });
  }

  resendOtp(): void {
    const savedLoginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone' || this.loginMode;
    const identifier = this.requestedIdentifier || (savedLoginMode === 'phone' ? this.phone?.value : this.email?.value);
    const isEmail = savedLoginMode === 'email';
    const countryCode = savedLoginMode === 'phone' ? (sessionStorage.getItem('countryCode') || this.selectedCountry.code) : undefined;

    if (!identifier) {
      this.errorMessage = 'No identifier available to resend OTP';
      return;
    }

    this.authService.registerRequestOtp(identifier, isEmail, countryCode).subscribe({
      next: () => {
        this.errorMessage = null; // Clear any previous errors
        this.core.triggerToasrt('OTP resent successfully');

        // Reset OTP inputs
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
        }, 50);

        // Persist identifier and related information
        this.requestedIdentifier = identifier;
        try {
          if (this.requestedIdentifier) {
            sessionStorage.setItem('requestedIdentifier', this.requestedIdentifier);

            sessionStorage.setItem('loginMode', isEmail ? 'email' : 'phone');
            if (countryCode) {
              sessionStorage.setItem('countryCode', countryCode);
            }
          }
        } catch (e) { }

        // Restart timer
        this.startOtpTimer();
      },
      error: (err) => {
        console.error('Failed to resend OTP:', err);
        // Handle ProgressEvent errors (network failures on Android)
        let msg: string;
        if (err instanceof ProgressEvent || (err && err.type === 'error' && err.target)) {
          msg = 'Network error. Please check your internet connection and try again.';
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (typeof err?.error === 'string') {
          msg = err.error;
        } else {
          msg = 'Failed to resend OTP. Please try again.';
        }
        this.core.triggerToasrt(msg);
      }
    });
  }

  private startOtpTimer(): void {
    this.canResendOtp = false;
    this.otpResendTimer = 120; // 2 minutes

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

  // Get masked phone number for OTP display
  getMaskedPhoneNumber(): string {
    const phoneControl = this.signupForm.get('phone');
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

  // Format timer display as MM:SS
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.clearOtpTimer();
  }

  protected readonly top = top;

  proceedWithPassword(): void {
    if (this.passwordForm.valid) {
      this.errorMessage = null; // Clear any previous errors
      // persist password in session
      try { sessionStorage.setItem('signup_password', this.password?.value || ''); } catch (e) { }

      // Navigate to step 1 (role selection) after password creation
      this.router.navigate(['home/sign-up'], { queryParams: { step: 1 } });
    } else {
      this.core.triggerToasrt('Please enter a valid password (6-12 characters)');
    }
  }

  /**
   * Assemble registration payload from session and current form values and call register API
   */
  registerFromSession(): void {
    this.errorMessage = null;

    // Collect values from session and forms
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password') || this.password?.value;
    const role = sessionStorage.getItem('signup_role') || this.roleSelected;
    const identifier = this.requestedIdentifier || this.email?.value || this.phone?.value;
    const familyCode = sessionStorage.getItem('familyCode');
    const familyName = sessionStorage.getItem('familyName');

    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) { profile = {}; }

    const payload: any = {
      name: profile.name || this.profileForm.get('name')?.value,
      gender: (profile.gender || this.gender || '').toUpperCase(),
      relationship: (role || '').toUpperCase(),
      password: password || undefined,
      avatarName: `avatar${profile.avatar || this.avatarSelected}`,
      familyCode: familyCode || '',
      familyName: familyName || ''
    };

    // include email or phone depending on loginMode or identifier content
    if (this.loginMode === 'email' || (identifier && identifier.includes('@'))) {
      payload.email = identifier;
    } else {
      const contactNumber = sessionStorage.getItem('countryCode') || this.selectedCountry.code;
      payload.phone = contactNumber + identifier;
    }

    // Change from milliseconds to YYYY-MM-DD format
    const dobValue = profile.dob || this.profileForm.get('dob')?.value;
    if (dobValue) {
      const dobDate = new Date(dobValue);
      payload.dateOfBirth = dobDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    // Include selected pet name if available (from session or current selection)
    try {

      // Try to get current swiper selection first
      let petName;
      const swiperInstance = this.swiperRef?.nativeElement?.swiper;
      if (swiperInstance) {
        const currentIndex = swiperInstance.realIndex;
        petName = this.pets[currentIndex]?.name;
      }

      // If no pet from swiper, try session storage
      if (!petName) {
        petName = sessionStorage.getItem('signup_pet');
      }

      // If still no pet, try current image
      if (!petName && this.currentImage) {
        petName = this.currentImage.name;
      }

      // Last resort: use first pet
      if (!petName && this.pets.length > 0) {
        petName = this.pets[0].name;
      }

      if (petName) {
        payload.petName = petName;
      }

    } catch (e) {
      console.error('Error setting pet name:', e);
      // If all else fails, don't set a pet name
    }    // Call register API
    this.authService.register(payload).subscribe({
      next: (resp) => {
        this.errorMessage = null; // Clear any previous errors

        // Save user profile to UserService (best-effort)
        this.userService.setUserProfile({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          gender: payload.gender?.toLowerCase() as 'male' | 'female',
          dob: payload.dateOfBirth,
          avatarName: payload.avatarName,
          avatarUrl: this.getAvatarUrlFromSelection(profile.avatar || this.avatarSelected, payload.gender?.toLowerCase()),
          relationship: payload.relationship as 'CHILD' | 'PARENT' | 'SELF',
          pet: payload.petName
        });

        // Clear signup session data
        try {
          sessionStorage.removeItem('signup_profile');
          sessionStorage.removeItem('signup_password');
          sessionStorage.removeItem('signup_role');
          sessionStorage.removeItem('signup_avatar');
          sessionStorage.removeItem('requestedIdentifier');
          sessionStorage.removeItem('familyCode');
          sessionStorage.removeItem('familyName');
        } catch (e) { }

        // Mark onboarding completed so onboarding routes are blocked later
        try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) { }

        // Attempt automatic login after registration (useful on mobile)
        const passwordForLogin = password || sessionStorage.getItem('signup_password') || this.password?.value || '';
        const credentials: any = { password: passwordForLogin };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        // If we have credentials, try to login and route based on user relationship
        if (credentials.password && (credentials.email || credentials.phone)) {
          this.authService.login(credentials).subscribe({
            next: (loginResp) => {
              // After login, user session is set by AuthService
              // Navigate to appropriate dashboard
              const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
              this.router.navigate([route]);
            },
            error: (loginErr) => {
              // If auto-login fails, fall back to login page
              console.error('Auto-login failed after registration', loginErr);
              this.core.triggerToasrt('Account created. Please login to continue.');
              this.router.navigate(['/home/login']);
            }
          });
        } else {
          // No credentials available - redirect to login
          this.router.navigate(['/home/login']);
        }
      },
      error: (err) => {
        const serverMsg = err?.error?.message || err?.error || 'Registration failed';
        // If registration failed because user already exists, try to login automatically
        const passwordForLogin = password || sessionStorage.getItem('signup_password') || this.password?.value || '';
        const credentials: any = { password: passwordForLogin };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        if (credentials.password && (credentials.email || credentials.phone)) {
          this.authService.login(credentials).subscribe({
            next: () => {
              const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
              this.router.navigate([route]);
            },
            error: (loginErr) => {
              // If auto-login fails, show original registration error
              this.errorMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
              try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
            }
          });
        } else {
          this.errorMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
          try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
        }
      }
    });
  }

  // Password visibility toggle
  public hidePassword: boolean = true;

  /**
   * Register a child/self account using session data and then navigate to welcome (step 5).
   */
  private registerChildOrSelfFromSession(role: 'child' | 'self') {
    this.errorMessage = null;

    // Collect values from session and forms (reuse registerFromSession logic)
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password') || this.password?.value;
    const identifier = this.requestedIdentifier || this.email?.value || this.phone?.value;
    const familyCode = sessionStorage.getItem('familyCode');

    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) { profile = {}; }

    const payload: any = {
      name: profile.name || this.profileForm.get('name')?.value,
      gender: (profile.gender || this.gender || '').toUpperCase(),
      relationship: (role || '').toUpperCase(),
      password: password || undefined,
      avatarName: `avatar${profile.avatar || this.avatarSelected}`,
      familyCode: familyCode || ''
    };

    // include email or phone depending on loginMode or identifier content
    if (this.loginMode === 'email' || (identifier && identifier.includes && identifier.includes('@'))) {
      payload.email = identifier;
    } else {
      const contactNumber = sessionStorage.getItem('countryCode') || this.selectedCountry.code;
      payload.phone = contactNumber + identifier;
    }

    // dateOfBirth
    const dobValue = profile.dob || this.profileForm.get('dob')?.value;
    if (dobValue) {
      const dobDate = new Date(dobValue);
      payload.dateOfBirth = dobDate.toISOString().split('T')[0];
    }

    // petName
    try {
      let petName = sessionStorage.getItem('signup_pet') || this.currentImage?.name;
      if (!petName && this.pets.length > 0) petName = this.pets[0].name;
      if (petName) payload.petName = petName;
    } catch (e) { }

    this.authService.register(payload).subscribe({
      next: (resp) => {
        // Mark onboarding complete and persist minimal user info
        try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) { }

        // Clear transient signup session data (keep login flow separate)
        try {
          sessionStorage.removeItem('signup_profile');
          sessionStorage.removeItem('signup_password');
          sessionStorage.removeItem('signup_role');
          sessionStorage.removeItem('signup_avatar');
          sessionStorage.removeItem('requestedIdentifier');
          sessionStorage.removeItem('familyCode');
          sessionStorage.removeItem('familyName');
        } catch (e) { }

        // Navigate to welcome step
        this.router.navigate(['home/sign-up'], { queryParams: { step: 5 } });
      },
      error: (err) => {
        const serverMsg = err?.error?.message || err?.error || 'Registration failed';
        this.errorMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
        try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
      }
    });
  }

  // Navigate to authenticated area after welcome step and complete registration
  onBegin() {
    // Complete the registration with all session data; navigation will occur after register finishes
    this.registerFromSession();
  }

  /**
   * Get avatar URL from avatar selection number
   */
  private getAvatarUrlFromSelection(avatarNumber: number, gender?: string): string {
    const genderPrefix = gender === 'male' ? 'Male' : 'Female';
    return `/assets/Images-Transparent/Image-Onboarding-Avatar-${genderPrefix}${avatarNumber}.png`;
  }

  /**
   * Navigate to Privacy Policy page (no login required)
   */
  navigateToPrivacyPolicy(): void {
    this.router.navigate(['/our-policies'], { queryParams: { tab: 'privacy' } });
  }

  /**
   * Navigate to Terms of Use page (no login required)
   */
  navigateToTermsOfUse(): void {
    this.router.navigate(['/our-policies'], { queryParams: { tab: 'terms' } });
  }

  /**
   * Parent role should not see self-only onboarding steps (pet selection, begin journey)
   */
  private enforceParentFlowRestrictions(): void {
    if (this.currentRole !== 'parent') {
      return;
    }

    const stepValue = Number(this.step);

    if (stepValue === 4 || stepValue === 5) {
      const fallbackStep = 2;
      this.step = fallbackStep;
      this.router.navigate(['home/sign-up'], {
        queryParams: { step: fallbackStep },
        replaceUrl: true
      });
    }
  }
}
