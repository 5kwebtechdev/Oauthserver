import { Component, OnInit, Renderer2, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Router, ActivatedRoute } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { CoreService } from "../../core/services/core.service";
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CountriesService, Country } from "../../core/services/countries.service";
import { LoadingService } from '../../core/services/loading.service';
import { ParentImageService } from '../../core/services/parent-image.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CredentialSaverService } from '../../core/services/credential-saver.service';

type SignupRole = 'child' | 'parent' | 'self';

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
  public loginMode: 'email' | 'phone' = 'email';
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

  public roleSelected !: SignupRole;
  public gender !: 'male' | 'female';
  public avatarSelected: any;

  public errorMessage: string | null = null;
  // Referral code UI and value
  public showReferral: boolean = false;
  public referralCode: string = '';
  public referralValidationStatus: 'pending' | 'valid' | 'invalid' | null = null;
  public referralErrorMessage: string = '';
  private referralCheckInProgress: boolean = false;

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
  public ageSuggestionTarget: SignupRole | null = null;
  public ageSuggestionRoles: SignupRole[] = [];
  public computedAge: number | null = null;
  public showAccessRestrictedModal = false;


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
  @ViewChild('content', { static: false }) ionContent?: IonContent;

  // track active slide index so UI can react (e.g. enable button only on first slide)
  public currentSlideIndex: number = 0;

  images = [
    'https://picsum.photos/id/1011/600/400',
    'https://picsum.photos/id/1015/600/400',
    'https://picsum.photos/id/1019/600/400',
    'https://picsum.photos/id/1025/600/400',
  ];

  pets: any[] = [{
    displayName: 'Bao the superme Panda',
    name: 'Panda',
    apiName: 'Panda-Age1-Happy.png',
    image: 'assets/Images-Pet/Panda-Age1-Happy.png',
    text: ['Your gentle guide to inner peace', 'Celebrates small acts of kindness']
  }, {
    displayName: 'Koda the Chill Llama',
    name: 'Llama',
    apiName: 'Llama-Age1-Happy.png',
    image: 'assets/Images-Pet/Llama-Age1-Happy.png',
    text: ['Master of staying cool under pressure', 'Loves colorful, quirky adventures']
  }, {
    displayName: 'Zuki the Fierce Dragon',
    name: 'Dragon',
    apiName: 'Dragon-Age1-Happy.png',
    image: 'assets/Images-Pet/Dragon-Age1-Happy.png',
    text: ['Loves big ideas and bold moves', 'Celebrates when you go on streaks']
  }, {
    displayName: 'Luna the Wise Owl',
    name: 'Owl',
    apiName: 'Owl-Age1-Happy.png',
    image: 'assets/Images-Pet/Owl-Age1-Happy.png',
    text: ['Your midnight study buddy', 'Celebrates "aha!" moments']
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
      this.currentSlideIndex = 0;
      // Store the selected pet name
      try {
        sessionStorage.setItem('signup_pet', this.pets[0].name);
      } catch (e) { }
    });

    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      const realIndex = swiperInstance.realIndex;
      this.currentImage = this.pets[realIndex];
      this.currentSlideIndex = realIndex;
      // Store the selected pet name whenever it changes
      try {
        sessionStorage.setItem('signup_pet', this.pets[realIndex].name);
      } catch (e) { }
    });
  }

  ngOnInit(): void {
    // Safety: ensure any stuck loaders from navigation are cleared immediately
    this.loadingService.forceHide();

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

    // Restore all signup credentials from sessionStorage (helps when component is recreated during navigation)
    const savedIdentifier = sessionStorage.getItem('requestedIdentifier');
    if (savedIdentifier) {
      this.requestedIdentifier = savedIdentifier;
    }

    this.loginMode = 'email';

    // Restore country code
    const savedCountryCode = sessionStorage.getItem('countryCode');
    if (savedCountryCode) {
      const foundCountry = this.countries?.find(c => c.code === savedCountryCode);
      if (foundCountry) {
        this.selectedCountry = foundCountry;
      }
    }

    // Restore role selection
    const savedRole = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self';
    if (savedRole) {
      this.roleSelected = savedRole;
    }

    this.restoreSignupStateFromSession();

    // Pre-fill profile data if coming from Google sign-in
    if (sessionStorage.getItem('signup_via_google') === 'true') {
      const googleName = sessionStorage.getItem('google_signup_name');
      const googleEmail = sessionStorage.getItem('google_signup_email');
      if (googleName) {
        this.profileForm.patchValue({ name: googleName });
        this.profileForm.get('name')?.markAsDirty();
        this.profileForm.markAsDirty();
      }
      if (googleEmail) {
        this.signupForm.patchValue({ email: googleEmail });
        this.requestedIdentifier = googleEmail;
      }
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
    private userService: UserService,
    private loadingService: LoadingService,
    public parentImageService: ParentImageService,
    private credentialSaverService: CredentialSaverService
  ) {
    // Initialize with default country
    this.selectedCountry = this.countriesService.getDefaultCountry();
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', []],
    });

    this.profileForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(40),
        Validators.pattern(/^[A-Za-z][A-Za-z\s.'-]*$/)
      ]],
      dob: ['', [Validators.required]],
    })

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(12)]],
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
      // Ensure the view is at the top when step changes (prevents previous scroll position hiding the navigator)
      setTimeout(() => {
        try {
          // use a short delay to let the DOM update after the step change
          this.ionContent?.scrollToTop(250);
        } catch (e) { /* ignore */ }
      }, 30);
      // If we've navigated directly to pet selection, ensure a pet is selected and carousel shows
      try {
        if (this.step === 4) {
          // ensure roleSelected is set from session if available
          const storedRole = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self' | null;
          if (storedRole) this.roleSelected = storedRole;

          const petFromSession = sessionStorage.getItem('signup_pet');
          if (petFromSession) {
            const idx = this.pets.findIndex(p => p.apiName === petFromSession || p.name === petFromSession);
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
                // reflect in UI state
                this.currentSlideIndex = targetIndex >= 0 ? targetIndex : 0;
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

  get isProfileStepInvalid(): boolean {
    if (this.profileForm.invalid) return true;
    if (!this.gender) return true;
    if (this.currentRole !== 'parent' && !this.avatarSelected) return true;
    return false;
  }

  getPasswordErrorMessage(): string {
    const control = this.password;
    if (!control) return '';
    if (control.hasError('required')) return 'Please create a password.';
    if (control.hasError('minlength')) return 'Password must be at least 8 characters.';
    if (control.hasError('maxlength')) return 'Password cannot be more than 12 characters.';
    return 'Please enter a valid password.';
  }

  getNameErrorMessage(): string {
    const control = this.name;
    if (!control) return '';
    if (control.hasError('required')) return 'Please enter your full name.';
    if (control.hasError('minlength')) return 'Name must be at least 2 characters.';
    if (control.hasError('maxlength')) return 'Name cannot be more than 40 characters.';
    if (control.hasError('pattern')) return 'Name can only include letters, spaces, apostrophes, hyphens, and periods.';
    return 'Please enter a valid full name.';
  }

  selectGender(gender: 'male' | 'female'): void {
    if (this.gender !== gender) {
      this.avatarSelected = null;
    }
    this.gender = gender;
  }

  // Determine current role from session or selection
  get currentRole(): SignupRole | undefined {
    const stored = sessionStorage.getItem('signup_role') as SignupRole | null;
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

  // Header helpers for template bindings to avoid complex inline expressions
  get headerText(): string {
    if (this.step === 1) return "Who's using the app?";
    if (this.step === 0.1) return 'Add email address';
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
    if (this.email?.invalid) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }
    const identifier = this.email?.value;
    this.errorMessage = null;

    // Step 1: check if email already exists
    this.authService.checkEmailExists(identifier).subscribe({
      next: (res) => {
        if (res.exists) {
          this.errorMessage = 'This email is already registered. Please login instead.';
          return;
        }
        // Step 2: email is new — send OTP
        this.authService.sendLoginOtp(identifier).subscribe({
          next: () => {
            this.requestedIdentifier = identifier;
            try {
              if (identifier) {
                sessionStorage.setItem('requestedIdentifier', identifier);
                sessionStorage.setItem('loginMode', 'email');
              }
            } catch (e) { }
            this.startOtpTimer();
            this.router.navigate(['home/sign-up'], { queryParams: { step: 0.2 } });
          },
          error: (err) => {
            this.errorMessage = err?.error?.message || 'Failed to send OTP. Please try again.';
          }
        });
      },
      error: () => {
        this.errorMessage = 'Unable to verify email. Please try again.';
      }
    });
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
        selectedPetName = this.pets[currentIndex]?.apiName;
      } else {
        selectedPetName = this.currentImage?.apiName;
      }

      // If still no pet name, check session storage
      if (!selectedPetName) {
        selectedPetName = sessionStorage.getItem('signup_pet');
      }

      // Last resort: use first pet
      if (!selectedPetName && this.pets.length > 0) {
        selectedPetName = this.pets[0].apiName;
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

    // If user is under 8 years old, show access restricted popup
    if (age !== null && age < 8) {
      this.showAccessRestrictedModal = true;
      return;
    }

    if (age !== null) {
      const suggestionRoles = this.getAgeSuggestionRoles(this.roleSelected, age);
      if (suggestionRoles.length) {
        this.openAgeSuggestionModal(suggestionRoles);
        return;
      }

      if (this.roleSelected === 'child') {
        this.router.navigate(['home/instructions-for-child'], { queryParams: { role: 'child' } });
        return;
      }

      if (this.roleSelected === 'parent') {
        this.router.navigate(['home/instructions-for-parent'], { queryParams: { role: 'parent' } });
        return;
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
    this.profileForm.markAllAsTouched();

    if (this.profileForm.get('name')?.invalid) {
      this.core.triggerToasrt(this.getNameErrorMessage());
      return;
    }

    if (this.profileForm.get('dob')?.invalid) {
      this.core.triggerToasrt('Please enter your date of birth');
      return;
    }

    if (!this.gender) {
      this.core.triggerToasrt('Please select your gender');
      return;
    }

    // Skip avatar requirement for parent; require for others
    if (this.currentRole !== 'parent' && !this.avatarSelected) {
      this.core.triggerToasrt('Please select an avatar');
      return;
    }

    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;

    // If user is under 8 years old, show access restricted popup
    if (age !== null && age < 8) {
      this.showAccessRestrictedModal = true;
      return;
    }

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
      // Persist referral code (if provided)
      if (this.referralCode && this.referralCode.length > 0) {
        try { sessionStorage.setItem('referralCode', this.referralCode); } catch (e) { }
      }
    } catch (e) { }

    // Get the role from session storage or current selection
    const role = (sessionStorage.getItem('signup_role') as SignupRole) || this.roleSelected;

    const suggestionRoles = this.getAgeSuggestionRoles(role, age);
    if (suggestionRoles.length) {
      this.openAgeSuggestionModal(suggestionRoles);
      return;
    }

    // Apply age-based routing rules
    if (role === 'child') {
      this.router.navigate(['home/instructions-for-child'], { queryParams: { role: 'child' } });
      return;
    } else if (role === 'parent') {
      this.router.navigate(['home/instructions-for-parent'], { queryParams: { role: 'parent' } });
      return;
    } else if (role === 'self') {
      // For self users, go straight to pet selection (step 4)
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
      // From step 0.3 (password creation), go back to step 0.1 (email entry)
      this.router.navigate(['home/sign-up'], { queryParams: { step: 0.1 } });
    } else if (this.step === 1) {
      // From step 1 (role selection), go back to login if Google flow, else step 0.3
      if (sessionStorage.getItem('signup_via_google') === 'true') {
        this.router.navigate(['home/login']);
      } else {
        this.router.navigate(['home/sign-up'], { queryParams: { step: 0.3 } });
      }
    } else if (this.step > 1) {
      // Special-case: if user is in "self" flow and on pet-selection (step 4),
      // back should return to profile/details entry (step 2) rather than step 3.
      const savedRole = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
      if (this.step === 4 && savedRole === 'self') {
        this.router.navigate(['home/sign-up'], { queryParams: { step: 2 } });
        return;
      }

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
      this.currentSlideIndex = currentIndex;

      // Store the selected pet name
      if (this.pets[currentIndex]) {
        const petName = this.pets[currentIndex].name;
        sessionStorage.setItem('signup_pet', petName);
      }
    } else {
    }
  }

  // Helper getter for template: only enable certain actions for first slide
  get isFirstSlideActive(): boolean {
    return this.currentSlideIndex === 0;
  }

  openBirthdayPickerNow() {
    // Force a toggled change so child sees a new `showTrigger` value even
    // if it was previously left `true` when the picker was closed without selection.
    this.openBirthdayPicker = false;
    // Small timeout ensures Angular processes the change and triggers ngOnChanges
    setTimeout(() => {
      this.openBirthdayPicker = true;
    }, 50);
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

  private getAgeSuggestionRoles(role: SignupRole, age: number): SignupRole[] {
    if (role === 'child') {
      if (age >= 25) {
        return ['self', 'parent'];
      }

      if (age >= 18 && age < 25) {
        return ['self'];
      }
    }

    if (role === 'parent') {
      if (age >= 8 && age < 18) {
        return ['child', 'self'];
      }

      if (age >= 18 && age < 25) {
        return ['self'];
      }
    }

    return [];
  }

  private openAgeSuggestionModal(roles: SignupRole[]): void {
    this.ageSuggestionRoles = roles;
    this.ageSuggestionTarget = roles.length === 1 ? roles[0] : null;
    this.showAgeSuggestionModal = true;
  }

  closeAgeSuggestionModal(): void {
    this.showAgeSuggestionModal = false;
    this.ageSuggestionTarget = null;
    this.ageSuggestionRoles = [];
  }

  closeAccessRestrictedModal(): void {
    this.showAccessRestrictedModal = false;
  }

  get ageSuggestionSubtitle(): string {
    if (this.ageSuggestionRoles.length === 0) {
      return '';
    }

    if (this.ageSuggestionRoles.length === 1) {
      return `Based on your profile, you might love our ${this.getRoleDisplayName(this.ageSuggestionRoles[0])} mode`;
    }

    const labels = this.ageSuggestionRoles.map((role) => this.getRoleDisplayName(role));
    return `Based on your profile, you might love ${labels.join(' or ')} mode`;
  }

  getRoleDisplayName(role: SignupRole): string {
    if (role === 'child') return 'Child';
    if (role === 'parent') return 'Parent';
    return 'Self';
  }

  isPrimaryAgeSuggestion(role: SignupRole): boolean {
    return this.ageSuggestionRoles[this.ageSuggestionRoles.length - 1] === role;
  }

  selectSuggestedRole(role: SignupRole): void {
    this.applySuggestedRole(role);
  }

  selectSelfRole(): void {
    this.applySuggestedRole('self');
  }

  selectChildRole(): void {
    this.applySuggestedRole('child');
  }

  selectParentRole(): void {
    this.applySuggestedRole('parent');
  }

  private applySuggestedRole(role: SignupRole): void {
    this.roleSelected = role;
    this.showAgeSuggestionModal = false;
    this.ageSuggestionTarget = null;
    this.ageSuggestionRoles = [];
    try { sessionStorage.setItem('signup_role', role); } catch (e) { }
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
      try { sessionStorage.removeItem('referralCode'); } catch (e) { }
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
    // Allow only alphanumeric, up to 8 chars, and normalize to UPPERCASE
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    this.referralCode = cleaned;
    // Update input value to cleaned value (prevents caret jump)
    try { event.target.value = cleaned; } catch (e) { }
    try { sessionStorage.setItem('referralCode', this.referralCode); } catch (e) { }

    // Check referral code validity when exactly 8 characters are entered
    if (cleaned.length === 8) {
      this.checkReferralCodeValidity(cleaned);
    } else {
      // Reset validation status if user clears or modifies the code
      this.referralValidationStatus = null;
      this.referralErrorMessage = '';
    }
  }

  // Check if referral code is valid by calling the API
  private checkReferralCodeValidity(referralCode: string): void {
    if (this.referralCheckInProgress) {
      return; // Prevent duplicate requests
    }

    this.referralCheckInProgress = true;
    this.referralValidationStatus = 'pending';
    this.referralErrorMessage = '';

    const apiUrl = `${environment.apiUrl}/auth/check-referral?referralCode=${referralCode}`;

    this.authService.checkReferralCode(referralCode).subscribe({
      next: (response: any) => {
        this.referralCheckInProgress = false;

        // Handle several possible response shapes from the backend.
        // If the API returns an explicit boolean or an object with a flag, respect it.
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
          console.log('Referral code is invalid (server indicated false):', response);
        } else {
          // If server didn't explicitly return false, treat 200 as valid
          this.referralValidationStatus = 'valid';
          this.referralErrorMessage = '';
          console.log('Referral code is valid:', response);
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

    this.authService.verifyLoginOtp(identifier || '', otp).subscribe({
      next: () => {
        this.errorMessage = null;
        this.clearOtpTimer();
        // Proceed to password creation
        this.router.navigate(['home/sign-up'], { queryParams: { step: 0.3 } });
      },
      error: (err) => {
        console.error('OTP verification failed:', err);
        if (err instanceof ProgressEvent || (err && err.type === 'error' && err.target)) {
          this.errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else if (typeof err?.error === 'string') {
          try {
            const parsed = JSON.parse(err.error);
            this.errorMessage = parsed?.message || parsed?.error?.message || err.error;
          } catch (e) {
            this.errorMessage = err.error;
          }
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
        this.core.triggerToasrt('OTP resent successfully');
      },
      error: (err) => {
        let body = err?.error;
        if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }
        const msg = body?.message || body?.error || 'Failed to resend OTP. Please try again.';
        this.core.triggerToasrt(msg);
      }
    });
  }

  private startOtpTimer(): void {
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
      this.passwordForm.markAllAsTouched();
      this.core.triggerToasrt(this.getPasswordErrorMessage());
    }
  }

  /**
   * Assemble registration payload from session and current form values and call register API
   */
  registerFromSession(): void {
    this.errorMessage = null;

    // Google OAuth flow: user already has an account, just complete their profile
    if (sessionStorage.getItem('signup_via_google') === 'true') {
      const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
      this.completeGoogleOnboardingFlow(role);
      return;
    }

    // Collect values from session and forms
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password') || this.password?.value;
    const role = sessionStorage.getItem('signup_role') || this.roleSelected;
    const identifier = this.requestedIdentifier || this.email?.value || this.phone?.value;
    const familyCode = sessionStorage.getItem('familyCode');
    const familyName = sessionStorage.getItem('familyName');
    const referralCode = sessionStorage.getItem('referralCode');

    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) { profile = {}; }

    // Determine avatar selection (prefer saved profile value, then current selection)
    const avatarKey = profile.avatar ?? this.avatarSelected ?? null;
    const avatarNameValue = avatarKey ? `avatar${avatarKey}` : undefined;
    const avatarImageNameValue = avatarKey ? `Avatar ${Number(avatarKey)}` : undefined;

    const payload: any = {
      name: profile.name || this.profileForm.get('name')?.value,
      gender: (profile.gender || this.gender || '').toUpperCase(),
      relationship: (role || '').toUpperCase(),
      password: password || undefined,
      avatarName: avatarNameValue,
      avatarImageName: avatarImageNameValue,
      familyCode: familyCode || '',
      familyName: familyName || '',
      referralCode: referralCode || null
    };

    // Include explicit family role: CREATOR when user created the family in this session,
    // otherwise CO_PARENT when joining an existing family. Keep `relationship` as PARENT.
    try {
      const createdFlag = sessionStorage.getItem('familyCreator');
      if (createdFlag === 'true') {
        payload.familyRole = 'CREATOR';
      } else if (payload.familyCode) {
        payload.familyRole = 'CO_PARENT';
      }
    } catch (e) { }

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

    // Mark family role for parent flows: if user created the family in this session, mark CREATOR,
    // otherwise if joining a family mark CO_PARENT. This preserves `relationship: PARENT` while
    // allowing backend to distinguish creator vs co-parent.
    try {
      const created = sessionStorage.getItem('familyCreator');
      if (created === 'true') payload.familyRole = 'CREATOR';
      else if (payload.familyCode) payload.familyRole = 'CO_PARENT';
    } catch (e) { }

    // Include selected pet name if available (from session or current selection)
    try {

      // Try to get current swiper selection first
      let petName;
      const swiperInstance = this.swiperRef?.nativeElement?.swiper;
      if (swiperInstance) {
        const currentIndex = swiperInstance.realIndex;
        petName = this.pets[currentIndex]?.apiName;
      }

      // If no pet from swiper, try session storage
      if (!petName) {
        petName = sessionStorage.getItem('signup_pet');
      }

      // If still no pet, try current image
      if (!petName && this.currentImage) {
        petName = this.currentImage.apiName;
      }

      // Last resort: use first pet
      if (!petName && this.pets.length > 0) {
        petName = this.pets[0].apiName;
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

        // IMPORTANT: Store login credentials for auto-login on "Begin My Journey" button
        const passwordForLogin = password || sessionStorage.getItem('signup_password') || this.password?.value || '';
        try {
          if (payload.email) sessionStorage.setItem('login_email', payload.email);
          if (payload.phone) sessionStorage.setItem('login_phone', payload.phone);
          sessionStorage.setItem('login_password', passwordForLogin);
        } catch (e) { }

        // Clear signup session data
        try {
          sessionStorage.removeItem('signup_profile');
          sessionStorage.removeItem('signup_password');
          sessionStorage.removeItem('signup_role');
          sessionStorage.removeItem('signup_avatar');
          sessionStorage.removeItem('requestedIdentifier');
          sessionStorage.removeItem('familyCode');
          sessionStorage.removeItem('familyName');
          sessionStorage.removeItem('familyCreator');
          sessionStorage.removeItem('referralCode');
        } catch (e) { }

        // Mark onboarding completed so onboarding routes are blocked later
        try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) { }

        // Attempt automatic login after registration (useful on mobile)
        const credentials: any = { password: passwordForLogin };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        // If we have credentials, try to login and route based on user relationship
        if (credentials.password && (credentials.email || credentials.phone)) {
          this.authService.login(credentials).subscribe({
            next: (loginResp) => {
              this.requestPasswordSavePrompt(credentials);
              if (credentials.email) {
                this.credentialSaverService.save({ identifier: credentials.email, password: credentials.password || '', mode: 'email' });
              }
              // After login, user session is set by AuthService
              // Navigate to appropriate dashboard with loader hidden
              const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
              setTimeout(() => {
                this.loadingService.forceHide();
                this.router.navigate([route]);
              }, 50);
            },
            error: (loginErr) => {
              // If auto-login fails, fall back to login page
              console.error('Auto-login failed after registration', loginErr);
              this.core.triggerToasrt('Account created. Please login to continue.');
              setTimeout(() => {
                this.loadingService.forceHide();
                this.router.navigate(['/home/login']);
              }, 50);
            }
          });
        } else {
          // No credentials available - redirect to login
          setTimeout(() => {
            this.loadingService.forceHide();
            this.router.navigate(['/home/login']);
          }, 50);
        }
      },
      error: (err) => {
        const serverMsg = err?.error?.message || err?.error || 'Registration failed';
        const registrationMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
        if (this.isRecoverableFamilyCapacityError(registrationMessage)) {
          this.errorMessage = registrationMessage;
          this.handleRecoverableFamilyJoinError(this.errorMessage);
          try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
          return;
        }
        // If registration failed because user already exists, try to login automatically
        const passwordForLogin = password || sessionStorage.getItem('signup_password') || this.password?.value || '';
        const credentials: any = { password: passwordForLogin };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        if (credentials.password && (credentials.email || credentials.phone)) {
          this.authService.login(credentials).subscribe({
            next: () => {
              this.requestPasswordSavePrompt(credentials);
              if (credentials.email) {
                this.credentialSaverService.save({ identifier: credentials.email, password: credentials.password || '', mode: 'email' });
              }
              const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
              setTimeout(() => {
                this.loadingService.forceHide();
                this.router.navigate([route]);
              }, 50);
            },
            error: (loginErr) => {
              // If auto-login fails, show original registration error
              this.errorMessage = registrationMessage;
              try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
            }
          });
        } else {
          this.errorMessage = registrationMessage;
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
  private completeGoogleOnboardingFlow(role: 'child' | 'parent' | 'self'): void {
    this.errorMessage = null;

    const profileStr = sessionStorage.getItem('signup_profile');
    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) {}

    const email     = sessionStorage.getItem('google_signup_email') || this.email?.value;
    const providerId = sessionStorage.getItem('google_signup_provider_id') || '';
    const avatarUrl  = sessionStorage.getItem('google_signup_avatar') || '';
    const avatarKey  = profile.avatar ?? this.avatarSelected ?? null;

    // Resolve avatar filename from the avatars list (e.g. "Image-Onboarding-Avatar-Female1.png")
    const foundAvatar = avatarKey ? this.avatars.find(a => a.key === avatarKey) : null;
    const avatarImageName = foundAvatar
      ? (foundAvatar.value.split('/').pop() ?? `Avatar ${Number(avatarKey)}`)
      : (avatarKey ? `Avatar ${Number(avatarKey)}` : undefined);

    const googlePayload: any = {
      provider:        'google',
      providerId,
      email,
      name:            profile.name || this.profileForm.get('name')?.value || sessionStorage.getItem('google_signup_name'),
      avatarUrl,
      role:            role.toUpperCase(),          // backend uses "role", not "relationship"
      gender:          (profile.gender || this.gender || '').toUpperCase(),
      avatarName:      avatarKey ? `avatar${avatarKey}` : undefined,
      avatarImageName,
      referralCode:    sessionStorage.getItem('referralCode') || null
    };

    // Use field name "dob" as expected by oauth2-login endpoint
    const dobValue = profile.dob || this.profileForm.get('dob')?.value;
    if (dobValue) {
      googlePayload.dob = new Date(dobValue).toISOString().split('T')[0];
    }

    // Child role: attach familyCode to join existing family
    if (role === 'child') {
      const familyCode = sessionStorage.getItem('familyCode') || '';
      if (familyCode) googlePayload.familyCode = familyCode;
    }

    if (role !== 'parent') {
      try {
        // Backend expects short pet name ("Dragon"), not the filename ("Dragon-Age1-Happy.png")
        const storedPet = sessionStorage.getItem('signup_pet') || this.currentImage?.apiName;
        const foundPet = storedPet
          ? this.pets.find(p => p.apiName === storedPet || p.name === storedPet)
          : null;
        const petName = foundPet?.name ?? (this.pets.length > 0 ? this.pets[0].name : undefined);
        if (petName) googlePayload.petName = petName;
      } catch (e) {}
    }

    console.log('[Google signup] payload:', JSON.stringify(googlePayload));

    // Use oauth2-login — it creates the user if new, returns a valid token
    this.authService.googleOAuthLogin(googlePayload).subscribe({
      next: (response) => {
        const userId = response.user?.id;
        if (response.token && userId) {
          this.authService.setSession(
            { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
            false
          );
        }
        try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) {}
        this.clearGoogleSignupSession();
        const route = role === 'parent' ? '/authed/parent-account' : '/authed/user-dashboard';
        setTimeout(() => {
          this.loadingService.forceHide();
          this.router.navigate([route], { replaceUrl: true });
        }, 50);
      },
      error: (err) => {
        const serverMsg = err?.error?.message || 'Sign-up failed. Please try again.';
        this.errorMessage = serverMsg;
        this.handleRecoverableFamilyJoinError(serverMsg);
        try { this.core.triggerToasrt(this.errorMessage!); } catch (e) {}
      }
    });
  }

  private clearGoogleSignupSession(): void {
    try {
      ['signup_via_google', 'google_signup_email', 'google_signup_name',
        'google_signup_avatar', 'google_signup_provider_id', 'signup_profile',
        'signup_role', 'signup_avatar', 'signup_pet', 'requestedIdentifier',
        'familyCode', 'familyName', 'familyCreator', 'referralCode'].forEach(k => {
        sessionStorage.removeItem(k);
      });
    } catch (e) {}
  }

  private registerChildOrSelfFromSession(role: 'child' | 'self') {
    this.errorMessage = null;

    // Google OAuth flow: user already has an account, just complete their profile
    if (sessionStorage.getItem('signup_via_google') === 'true') {
      this.completeGoogleOnboardingFlow(role);
      return;
    }

    // Collect values from session and forms (reuse registerFromSession logic)
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password') || this.password?.value;
    const identifier = this.requestedIdentifier || this.email?.value || this.phone?.value;
    const familyCode = sessionStorage.getItem('familyCode');
    const referralCode = sessionStorage.getItem('referralCode');

    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) { profile = {}; }

    // Determine avatar selection (prefer saved profile value, then current selection)
    const avatarKey2 = profile.avatar ?? this.avatarSelected ?? null;
    const avatarNameValue2 = avatarKey2 ? `avatar${avatarKey2}` : undefined;
    const avatarImageNameValue2 = avatarKey2 ? `Avatar ${Number(avatarKey2)}` : undefined;

    const payload: any = {
      name: profile.name || this.profileForm.get('name')?.value,
      gender: (profile.gender || this.gender || '').toUpperCase(),
      relationship: (role || '').toUpperCase(),
      password: password || undefined,
      avatarName: avatarNameValue2,
      avatarImageName: avatarImageNameValue2,
      familyCode: familyCode || '',
      referralCode: referralCode || null
    };

    // If this flow included a family code, mark whether the current user created the family
    try {
      const createdFlag = sessionStorage.getItem('familyCreator');
      if (createdFlag === 'true') payload.familyRole = 'CREATOR';
      else if (payload.familyCode) payload.familyRole = 'CO_PARENT';
    } catch (e) { }

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
      let petName = sessionStorage.getItem('signup_pet') || this.currentImage?.apiName;
      if (!petName && this.pets.length > 0) petName = this.pets[0].apiName;
      if (petName) payload.petName = petName;
    } catch (e) { }

    this.authService.register(payload).subscribe({
      next: (resp) => {
        // IMPORTANT: Store login credentials for auto-login on "Begin My Journey" button
        const passwordForLogin = password || sessionStorage.getItem('signup_password') || this.password?.value || '';
        try {
          if (payload.email) sessionStorage.setItem('login_email', payload.email);
          if (payload.phone) sessionStorage.setItem('login_phone', payload.phone);
          sessionStorage.setItem('login_password', passwordForLogin);
        } catch (e) { }

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
          sessionStorage.removeItem('familyCreator');
          sessionStorage.removeItem('referralCode');
        } catch (e) { }

        // Navigate to welcome step with a small delay to ensure loader state is properly updated
        setTimeout(() => {
          this.loadingService.forceHide();
          this.router.navigate(['home/sign-up'], { queryParams: { step: 5 } });
        }, 50);
      },
      error: (err) => {
        const serverMsg = err?.error?.message || err?.error || 'Registration failed';
        this.errorMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
        this.handleRecoverableFamilyJoinError(this.errorMessage);
        try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
      }
    });
  }

  // Auto-login and redirect to dashboard
  onBegin() {
    // Get login credentials stored during registration
    const email = sessionStorage.getItem('login_email');
    const phone = sessionStorage.getItem('login_phone');
    const password = sessionStorage.getItem('login_password');

    // Build login credentials
    const credentials: any = { password };
    if (email) {
      credentials.email = email;
    } else if (phone) {
      credentials.phone = phone;
    }

    // Auto-login
    this.authService.login(credentials).subscribe({
      next: () => {
        this.requestPasswordSavePrompt(credentials);
        if (credentials.email) {
          this.credentialSaverService.save({ identifier: credentials.email, password: credentials.password || '', mode: 'email' });
        }
        this.loadingService.forceHide();
        this.router.navigate(['/authed/user-dashboard']);
      },
      error: () => {
        this.loadingService.forceHide();
        this.router.navigate(['/home/login']);
      }
    });
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

  getSignupCredentialIdentifier(): string {
    const savedMode = (sessionStorage.getItem('loginMode') as 'email' | 'phone' | null) || this.loginMode;
    const savedIdentifier = sessionStorage.getItem('requestedIdentifier') || this.requestedIdentifier || '';

    if (savedIdentifier) {
      if (savedMode === 'phone' && !savedIdentifier.startsWith('+')) {
        return `${sessionStorage.getItem('countryCode') || this.selectedCountry.code}${savedIdentifier}`;
      }
      return savedIdentifier;
    }

    if (savedMode === 'phone') {
      const phoneValue = this.phone?.value || '';
      return phoneValue ? `${this.selectedCountry.code}${phoneValue}` : '';
    }

    return this.email?.value || '';
  }

  private requestPasswordSavePrompt(credentials: { email?: string; phone?: string; password?: string }): void {
    const credentialApi = (window.navigator as any)?.credentials;
    const PasswordCredentialCtor = (window as any)?.PasswordCredential;
    const username = credentials.email || credentials.phone;
    const password = credentials.password;

    if (!credentialApi?.store || !PasswordCredentialCtor || !username || !password) {
      return;
    }

    try {
      const credential = new PasswordCredentialCtor({
        id: username,
        name: username,
        password,
      });
      credentialApi.store(credential).catch(() => {});
    } catch (error) {
      // Browser/password-manager support varies across WebView and desktop.
    }
  }

  private restoreSignupStateFromSession(): void {
    try {
      const profileStr = sessionStorage.getItem('signup_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile?.name || profile?.dob) {
          this.profileForm.patchValue({
            name: profile.name || '',
            dob: profile.dob ? new Date(profile.dob).toISOString().slice(0, 10) : ''
          }, { emitEvent: false });
        }
        if (profile?.gender) {
          this.gender = profile.gender;
        }
        if (profile?.avatar && profile.avatar !== this.getNameInitial()) {
          this.avatarSelected = profile.avatar;
        }
      }

      const savedPassword = sessionStorage.getItem('signup_password');
      if (savedPassword) {
        this.passwordForm.patchValue({ password: savedPassword }, { emitEvent: false });
      }

      const identifier = sessionStorage.getItem('requestedIdentifier');
      const savedLoginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone' | null;
      if (savedLoginMode) {
        this.loginMode = savedLoginMode;
      }
      if (identifier) {
        if (this.loginMode === 'phone') {
          this.signupForm.patchValue({ phone: identifier }, { emitEvent: false });
        } else {
          this.signupForm.patchValue({ email: identifier }, { emitEvent: false });
        }
      }
    } catch (error) {
      console.warn('[Signup] Unable to restore saved onboarding state', error);
    }
  }

  private handleRecoverableFamilyJoinError(message?: string | null): void {
    const isChildJoinFlow = (sessionStorage.getItem('signup_role') || this.roleSelected) === 'child'
      && !!sessionStorage.getItem('familyCode');
    const isFamilyCapacityError = this.isRecoverableFamilyCapacityError(message);

    if (!isChildJoinFlow || !isFamilyCapacityError) {
      return;
    }

    this.loadingService.forceHide();
    try { sessionStorage.setItem('familyJoinBlocked', 'true'); } catch (e) {}
  }

  private isRecoverableFamilyCapacityError(message?: string | null): boolean {
    const text = (message || '').toLowerCase();
    return text.includes('two children')
      || text.includes('2 children')
      || text.includes('maximum number of children')
      || text.includes('maximum children')
      || text.includes('child limit')
      || text.includes('family is full');
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
