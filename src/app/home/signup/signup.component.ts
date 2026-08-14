import { Component, OnInit, Renderer2, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { IonContent, NavController } from '@ionic/angular';
import { Router, ActivatedRoute } from "@angular/router";
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { CoreService } from "../../core/services/core.service";
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CountriesService, Country } from "../../core/services/countries.service";
import { LoadingService } from '../../core/services/loading.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { firstValueFrom, Subscription } from 'rxjs';
import { CredentialSaverService } from '../../core/services/credential-saver.service';
import { SignupCredentialStateService } from '../../core/services/signup-credential-state.service';
import { StoredGender, toApiGender, toStoredGender } from '../../core/models/gender.model';
import {
  OnboardingStateService,
  RegistrationDraftData
} from '../../core/services/onboarding-state.service';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';
import { environment } from '../../../environments/environment';

type SignupRole = 'child' | 'parent' | 'self';
type SignupGender = StoredGender;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('140ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class SignupComponent implements AfterViewInit, OnInit, OnDestroy {
  private static readonly CHILD_POST_FAMILY_WELCOME_KEY = 'show_child_welcome_after_family';
  private static readonly CREATE_CHILD_AFTER_FAMILY_KEY = 'create_child_after_family';
  private static readonly MANAGED_CHILD_SIGNUP_KEY = 'managed_child_signup';
  private static readonly MANAGED_CHILD_FAMILY_CODE_KEY = 'managed_child_family_code';
  private static readonly MANAGED_CHILD_SUCCESS_EMAIL_KEY = 'managed_child_success_email';
  private static readonly MANAGED_CHILD_PARENT_WELCOME_PENDING_KEY = 'managed_child_parent_welcome_pending';
  private static readonly MANAGED_CHILD_REFRESH_KEY = 'family_children_refresh_pending';
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
  public countrySearch: string = '';
  private subscription = new Subscription();

  get filteredCountries(): Country[] {
    const q = this.countrySearch.trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }

  public get isOAuthSignup(): boolean {
    try {
      return sessionStorage.getItem('signup_via_oauth') === 'true'
        || sessionStorage.getItem('signup_via_google') === 'true';
    } catch {
      return false;
    }
  }

  public get isAppleOAuthSignup(): boolean {
    if (!this.isOAuthSignup) return false;
    try {
      return sessionStorage.getItem('oauth_signup_provider') === 'apple';
    } catch {
      return false;
    }
  }

  /** The immutable account name supplied by Apple or returned by our backend. */
  public get appleAccountName(): string {
    if (!this.isAppleOAuthSignup) return '';
    return this.resolveAppleAccountName(this.profileForm?.get('name')?.value);
  }

  /** The immutable email supplied by Apple or returned by our backend. */
  public get appleAccountEmail(): string {
    if (!this.isAppleOAuthSignup) return '';
    return this.resolveAppleAccountEmail(this.signupForm?.get('email')?.value);
  }

  // OTP related properties
  public otpDigits: string[] = ['', '', '', ''];
  public canResendOtp = false;
  public otpResendTimer = 120; // 2 minutes
  private resendInterval: any;
  private isFromUserInput = false; // Track if input is from user typing vs auto-fill

  public roleSelected?: SignupRole;
  public gender: SignupGender | null = null;
  public avatarSelected: any;

  public errorMessage: string | null = null;
  // Referral code UI and value
  public showReferral: boolean = false;
  public referralCode: string = '';
  public referralCodeReadonly: boolean = false;
  public referralValidationStatus: 'pending' | 'valid' | 'invalid' | null = null;
  public referralErrorMessage: string = '';
  public otpRequestInProgress: boolean = false;
  public otpVerifyInProgress: boolean = false;
  public otpResendInProgress: boolean = false;
  public registrationInProgress: boolean = false;
  public managedChildSignup = false;
  public managedChildSuccessEmail = '';
  public expandedManagedChildFaq: number | null = null;
  private isEditingPendingChildOnboarding = false;
  private managedChildFamilyCode = '';
  private managedChildRegistrationComplete = false;
  private referralCheckInProgress: boolean = false;
  private validatedReferralCode: string = '';
  private referralValidationTimer: ReturnType<typeof setTimeout> | null = null;
  public usernameAvailability: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  private usernameCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private usernameCheckSubscription?: Subscription;
  private readonly reservedUsernames = new Set([
    'admin', 'administrator', 'help', 'moderator', 'official', 'root',
    'security', 'support', 'superme', 'supermeapp', 'system'
  ]);

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
    { key: 7, gender: 'male', value: 'assets/Images-Transparent/details-avatar-1-figma.png' },
    { key: 8, gender: 'male', value: 'assets/Images-Transparent/details-avatar-2-figma.png' },
    { key: 9, gender: 'male', value: 'assets/Images-Transparent/details-avatar-3-figma.png' },
    { key: 10, gender: 'male', value: 'assets/Images-Transparent/details-avatar-4-figma.png' },
    { key: 11, gender: 'male', value: 'assets/Images-Transparent/details-avatar-5-figma.png' },
    { key: 12, gender: 'male', value: 'assets/Images-Transparent/details-avatar-6-figma.png' },
  ]

  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef;
  @ViewChild('swiperEl', { static: false }) swiperRef!: ElementRef;
  @ViewChild('content', { static: false }) ionContent?: IonContent;
  @ViewChild('referralInput', { static: false }) referralInput?: ElementRef<HTMLInputElement>;
  public isPasswordKeyboardOpen = false;
  public passwordKeyboardHeight = 0;
  public referralKeyboardHeight = 0;
  private focusedPasswordField: HTMLElement | null = null;
  private focusedReferralField: HTMLElement | null = null;
  private keyboardShowListener: { remove: () => Promise<void> } | null = null;
  private keyboardHideListener: { remove: () => Promise<void> } | null = null;
  private visualViewportBaseline = 0;
  private readonly visualViewportResizeHandler = () => this.handleVisualViewportResize();

  // track active slide index so UI can react (e.g. enable button only on first slide)
  public currentSlideIndex: number = 0;
  // The user's confirmed pet choice — set only by an explicit tap, never by
  // swiping. Distinct from currentSlideIndex (just "what's centered right
  // now") so the UI can clearly show which pet is actually selected.
  public selectedPetIndex: number | null = null;

  images = [
    'https://picsum.photos/id/1011/600/400',
    'https://picsum.photos/id/1015/600/400',
    'https://picsum.photos/id/1019/600/400',
    'https://picsum.photos/id/1025/600/400',
  ];

  pets: any[] = [{
    displayName: 'Bao the Mindful Panda',
    name: 'Panda',
    apiName: 'Panda-Age1-Happy.png',
    image: 'assets/Images-Pet/Panda-Age1-Happy.png',
    cardImage: 'assets/Images-Pet/selection-cards/Panda-selection-card.png',
    text: ['Your gentle guide to inner peace', 'Celebrates small acts of kindness']
  }, {
    displayName: 'Luna the Wise Owl',
    name: 'Owl',
    apiName: 'Owl-Age1-Happy.png',
    image: 'assets/Images-Pet/Owl-Age1-Happy.png',
    cardImage: 'assets/Images-Pet/selection-cards/Owl-selection-card.png',
    text: ['Your midnight study buddy', 'Celebrates "aha!" moments']
  }, {
    displayName: 'Koda the Chill Llama',
    name: 'Llama',
    apiName: 'Llama-Age1-Happy.png',
    image: 'assets/Images-Pet/Llama-Age1-Happy.png',
    cardImage: 'assets/Images-Pet/selection-cards/Llama-selection-card.png',
    text: ['Master of staying cool under pressure', 'Loves colorful, quirky adventures']
  }, {
    displayName: 'Zuki the Fierce Dragon',
    name: 'Dragon',
    apiName: 'Dragon-Age1-Happy.png',
    image: 'assets/Images-Pet/Dragon-Age1-Happy.png',
    cardImage: 'assets/Images-Pet/selection-cards/Dragon-selection-card.png',
    text: ['Loves big ideas and bold moves', 'Celebrates when you go on streaks']
  }]

  readonly managedChildSuccessFaqs = [
    {
      question: 'Does the family code expire or stop working?',
      answer: 'No. Your family code stays active while the family exists. If it ever changes, the latest code will be available in your family profile.'
    },
    {
      question: 'Can multiple children use the same family code?',
      answer: 'Yes. You can create or connect more than one child account with the same family.'
    },
    {
      question: 'Is this code private or can anyone with it join my family?',
      answer: 'Keep the code private and share it only with trusted family members. Anyone with the code may be able to request access.'
    },
    {
      question: `What if my child enters the wrong code or it doesn't work?`,
      answer: 'Check every letter and number, or share the latest code again from your family profile.'
    }
  ];

  public currentImage: any = null;

  ngAfterViewInit(): void {
    this.setupPasswordKeyboardHandling();

    if (!this.swiperRef?.nativeElement) {
      return;
    }
    const swiperEl = this.swiperRef.nativeElement;

    // Wait until Swiper instance is ready
    swiperEl.addEventListener('swiperinit', () => {
      const swiperInstance = swiperEl.swiper;
      const storedPet = sessionStorage.getItem('signup_pet')
        || this.onboardingState.getRegistrationState()?.savedData?.petName;
      const storedIndex = storedPet
        ? this.pets.findIndex(p => p.apiName === storedPet || p.name === storedPet)
        : -1;

      this.currentImage = storedIndex >= 0 ? this.pets[storedIndex] : null;
      this.currentSlideIndex = storedIndex;
      this.selectedPetIndex = storedIndex >= 0 ? storedIndex : null;
      if (storedIndex >= 0) {
        swiperInstance?.slideTo(storedIndex, 0);
      }
    });

    // Swiping only moves which card is centered — it does NOT select a pet.
    // Selection happens exclusively via an explicit tap (selectPet()).
    swiperEl.addEventListener('swiperslidechange', () => {
      const swiperInstance = swiperEl.swiper;
      this.currentSlideIndex = swiperInstance.realIndex;
    });
  }

  ngOnInit(): void {
    // Safety: ensure any stuck loaders from navigation are cleared immediately
    this.loadingService.forceHide();

    // Auto-fill referral code if came via deep link
    try {
      const deepLinkCode = sessionStorage.getItem('referralCode');
      if (deepLinkCode && deepLinkCode.length > 0) {
        this.referralCode = deepLinkCode.toUpperCase();
        this.referralCodeReadonly = sessionStorage.getItem('referralCodeLocked') === 'true';
        this.showReferral = true;
      }
    } catch (e) {}

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
    this.managedChildFamilyCode = (
      sessionStorage.getItem(SignupComponent.MANAGED_CHILD_FAMILY_CODE_KEY)
      || ''
    ).trim().toUpperCase();
    this.managedChildSignup = (
      this.managedChildSignup
      || sessionStorage.getItem(SignupComponent.MANAGED_CHILD_SIGNUP_KEY) === 'true'
    );
    this.managedChildSuccessEmail = (
      sessionStorage.getItem(SignupComponent.MANAGED_CHILD_SUCCESS_EMAIL_KEY)
      || ''
    ).trim();

    this.restoreSignupStateFromSession();
    this.restorePersistedRegistrationState();
    this.updateComputedAge(this.profileForm.get('dob')?.value);
    this.refreshIncompleteAuthenticatedOnboarding();

    // Registration now starts with email only. Ignore a stale phone-mode value
    // left by an older version when this entry step is opened.
    if (this.step === 0.1) {
      this.loginMode = 'email';
      try {
        sessionStorage.setItem('loginMode', 'email');
        if (this.requestedIdentifier && !this.requestedIdentifier.includes('@')) {
          sessionStorage.removeItem('requestedIdentifier');
          this.requestedIdentifier = '';
        }
      } catch (e) { }
    }

    // Pre-fill profile data if coming from an OAuth sign-in
    if (this.isOAuthSignup) {
      const googleName = sessionStorage.getItem('google_signup_name');
      const googleEmail = sessionStorage.getItem('google_signup_email');
      // Only seed the field with Google's name if it's still empty here.
      // restoreSignupStateFromSession() (called just above) already
      // restores whatever name the user previously saved/edited in this
      // session — re-patching unconditionally would clobber that edit
      // every time this component re-initializes (e.g. navigating away
      // and back), silently reverting the user's correction.
      const existingName = this.profileForm.get('name')?.value;
      if (googleName && !existingName) {
        this.profileForm.patchValue({ name: googleName });
        this.profileForm.get('name')?.markAsDirty();
        this.profileForm.markAsDirty();
      }
      if (googleEmail) {
        this.signupForm.patchValue({ email: googleEmail });
        this.requestedIdentifier = googleEmail;
      }

      // Sign in with Apple supplies the account name on the initial native
      // authorization and may omit it on later authorizations. In both cases,
      // use the identity already supplied by Apple or returned by the backend.
      // It stays visible as a read-only, prefilled value and is kept in the
      // payload, so the backend never receives an empty required name.
      if (this.isAppleOAuthSignup) {
        this.hydrateAppleIdentity();
        this.profileForm.get('name')?.clearValidators();
        this.profileForm.get('name')?.updateValueAndValidity({ emitEvent: false });
      }

      // Apple and Google don't provide DOB. It is optional for OAuth accounts
      // and must not block App Store review or account completion.
      this.profileForm.get('dob')?.clearValidators();
      this.profileForm.get('dob')?.updateValueAndValidity({ emitEvent: false });
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
    private credentialSaverService: CredentialSaverService,
    private signupCredentialState: SignupCredentialStateService,
    private navCtrl: NavController,
    private onboardingState: OnboardingStateService,
    private ngZone: NgZone
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
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z][A-Za-z\s'-]*$/),
        this.noRepeatedLetterValidator()
      ]],
      username: ['', [
        Validators.required,
        this.usernameRulesValidator()
      ]],
      phone: ['', []],
      dob: ['', [Validators.required]],
    })

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12), this.noCommonPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator() })

    this.subscription.add(
      this.username!.valueChanges.subscribe(() => this.scheduleUsernameAvailabilityCheck())
    );
    this.subscription.add(
      this.name!.valueChanges.subscribe(() => {
        this.username?.updateValueAndValidity({ emitEvent: false });
        this.scheduleUsernameAvailabilityCheck();
      })
    );
    this.subscription.add(
      this.profileForm.get('dob')!.valueChanges.subscribe(value => this.updateComputedAge(value))
    );

    this.route.queryParams.subscribe(params => {
      // Query-param steps reuse this component instance. Clear every transient
      // overlay before rendering the destination so a modal from the previous
      // step can never remain visible over the new one.
      this.resetTransientStepUi();

      const stepParam = params['step'];
      const roleParam = params['role'];
      const managedChildParam = params['managedChild'] === 'true';
      this.managedChildSignup = managedChildParam
        || sessionStorage.getItem(SignupComponent.MANAGED_CHILD_SIGNUP_KEY) === 'true';
      if (managedChildParam) {
        try {
          sessionStorage.setItem(SignupComponent.MANAGED_CHILD_SIGNUP_KEY, 'true');
        } catch (error) {
          console.warn('[Signup] Unable to persist managed child route state', error);
        }
      }
      this.isEditingPendingChildOnboarding = params['editOnboarding'] === 'true'
        && stepParam === '2'
        && roleParam === 'child';

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
      this.syncSignupStatusBar();
      if (this.step === 0.2 && !this.resendInterval) {
        this.startOtpTimer();
      }
      // Ensure birthday picker doesn't open automatically when navigating to step 3
      this.openBirthdayPicker = false;
      // Ensure the view is at the top when step changes (prevents previous scroll position hiding the navigator)
      setTimeout(() => {
        try {
          // use a short delay to let the DOM update after the step change
          this.ionContent?.scrollToTop(250);
        } catch (e) { /* ignore */ }
      }, 30);
      // Carry over the phone number if the user already entered one at the
      // identifier step, so they don't have to type it twice.
      if (this.step === 2) {
        if (!this.profilePhone?.value && this.loginMode === 'phone' && this.phone?.value) {
          this.profilePhone?.setValue(this.phone.value);
        }
      }

      // If we've navigated directly to pet selection, ensure a pet is selected and carousel shows
      try {
        if (this.step === 4) {
          // ensure roleSelected is set from session if available
          const storedRole = sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self' | null;
          if (storedRole) this.roleSelected = storedRole;

          const petFromSession = sessionStorage.getItem('signup_pet');
          if (petFromSession) {
            const idx = this.pets.findIndex(p => p.apiName === petFromSession || p.name === petFromSession);
            this.currentImage = idx >= 0 ? this.pets[idx] : null;
            this.currentSlideIndex = idx;
            this.selectedPetIndex = idx >= 0 ? idx : null;
          } else {
            this.currentImage = null;
            this.currentSlideIndex = -1;
            this.selectedPetIndex = null;
          }

          // If swiper instance exists, move it to the stored pet index
          setTimeout(() => {
            try {
              const swiperInstance = this.swiperRef?.nativeElement?.swiper;
              if (swiperInstance) {
                const storedPet = petFromSession;
                const targetIndex = this.pets.findIndex(p => p.apiName === storedPet || p.name === storedPet);
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

  get username() {
    return this.profileForm.get('username');
  }

  // Separate from signupForm's `phone` (used for the login identifier at the
  // email/phone entry step) — this one is the profile's own contact number,
  // shown on the "Tell us about yourself!" step.
  get profilePhone() {
    return this.profileForm.get('phone');
  }

  get password() {
    return this.passwordForm.get('password');
  }

  get confirmPassword() {
    return this.passwordForm.get('confirmPassword');
  }

  get name() {
    return this.profileForm.get('name');
  }

  get isProfileStepInvalid(): boolean {
    if (this.name?.invalid || this.dob()?.invalid) return true;
    if (this.currentRole !== 'parent' && this.username?.invalid) return true;
    if (this.currentRole !== 'parent' && this.usernameAvailability !== 'available') return true;
    // Phone and gender remain optional; DOB and avatar are required.
    if (!this.avatarSelected) return true;
    return false;
  }

  private firstNonEmptyText(...values: unknown[]): string {
    for (const value of values) {
      const text = String(value || '').trim();
      if (text) return text;
    }
    return '';
  }

  private resolveAppleAccountName(...values: unknown[]): string {
    let sessionName = '';
    try {
      sessionName = sessionStorage.getItem('google_signup_name') || '';
    } catch { /* Storage can be unavailable in a restricted web view. */ }
    return this.firstNonEmptyText(
      ...values,
      sessionName,
      this.authService.getUserData()?.name
    );
  }

  private resolveAppleAccountEmail(...values: unknown[]): string {
    let sessionEmail = '';
    try {
      sessionEmail = sessionStorage.getItem('google_signup_email') || '';
    } catch { /* Storage can be unavailable in a restricted web view. */ }
    return this.firstNonEmptyText(
      ...values,
      sessionEmail,
      this.authService.getUserData()?.email
    );
  }

  private hydrateAppleIdentity(): void {
    const appleName = this.resolveAppleAccountName(this.profileForm.get('name')?.value);
    const appleEmail = this.resolveAppleAccountEmail(this.signupForm.get('email')?.value);

    if (appleName) {
      this.profileForm.get('name')?.setValue(appleName, { emitEvent: false });
    }
    if (appleEmail) {
      this.signupForm.get('email')?.setValue(appleEmail, { emitEvent: false });
      this.requestedIdentifier = appleEmail;
    }
  }

  private usernameRulesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value || '');
      if (!value) return null;

      if (/\s/.test(value)) return { usernameSpaces: true };
      if (value.length < 3) return { usernameMinLength: true };
      if (value.length > 20) return { usernameMaxLength: true };
      if (/[A-Z]/.test(value)) return { usernameUppercase: true };
      if (value.startsWith('_')) return { usernameStartsWithUnderscore: true };
      if (value.includes('__')) return { usernameConsecutiveUnderscores: true };
      if (!/^[a-z0-9_]+$/.test(value)) return { usernameInvalidCharacters: true };
      if (!/[a-z]/.test(value)) return { usernameMissingLetter: true };
      if (this.reservedUsernames.has(value)) return { usernameReserved: true };
      if (this.looksLikeRealName(value)) return { usernameLooksLikeRealName: true };

      return null;
    };
  }

  private looksLikeRealName(username: string): boolean {
    const fullName = String(this.profileForm?.get('name')?.value || '').trim().toLowerCase();
    if (!fullName) return false;

    const usernameLetters = username.replace(/_/g, '');
    const nameParts = fullName.split(/[^a-z]+/).filter(part => part.length >= 3);
    const joinedName = nameParts.join('');

    return joinedName.length >= 3 && (
      usernameLetters === joinedName ||
      nameParts.some(part => usernameLetters === part)
    );
  }

  public getUsernameValidationMessage(): string {
    const errors = this.username?.errors;
    if (!errors) return '';

    if (errors['required']) return 'Username is required.';
    if (errors['usernameSpaces']) return "Spaces aren't allowed. Use _ instead";
    if (errors['usernameMinLength']) return 'Minimum 3 characters required.';
    if (errors['usernameMaxLength']) return 'Maximum limit is 20 characters';
    if (errors['usernameUppercase']) return 'Only lowercase letters allowed';
    if (errors['usernameStartsWithUnderscore']) return 'Username cannot start with underscore';
    if (errors['usernameConsecutiveUnderscores']) return 'Username cannot have consecutive underscores';
    if (errors['usernameInvalidCharacters']) return 'Only letters, numbers, and underscore are allowed.';
    if (errors['usernameMissingLetter']) return 'Username must include at least one letter';
    if (errors['usernameReserved']) return 'Invalid username. Choose another';
    if (errors['usernameLooksLikeRealName']) return 'This looks like a real name. Try a nickname for privacy';
    if (errors['usernameTaken']) return 'Oops! Someone already has this username';

    return 'Invalid username. Choose another';
  }

  public shouldShowUsernameError(): boolean {
    return Boolean(this.username?.invalid && (this.username?.dirty || this.username?.touched));
  }

  public shouldShowUsernameSuccess(): boolean {
    return Boolean(
      this.usernameAvailability === 'available' &&
      this.username?.valid &&
      (this.username?.dirty || this.username?.touched)
    );
  }

  public isUsernamePrivacyWarning(): boolean {
    return Boolean(this.username?.errors?.['usernameLooksLikeRealName']);
  }

  public onUsernameBlur(): void {
    this.username?.markAsTouched();
    if (this.username?.valid && this.usernameAvailability === 'idle') {
      this.clearUsernameCheckTimer();
      this.checkUsernameAvailability(String(this.username.value || ''));
    }
  }

  private scheduleUsernameAvailabilityCheck(): void {
    this.clearUsernameCheckTimer();
    this.usernameCheckSubscription?.unsubscribe();
    this.usernameAvailability = 'idle';

    const username = String(this.username?.value || '').trim();
    if (!username || this.username?.invalid) return;

    this.usernameCheckTimer = setTimeout(() => this.checkUsernameAvailability(username), 450);
  }

  private checkUsernameAvailability(username: string): void {
    if (!username || this.username?.invalid || String(this.username?.value || '') !== username) return;

    this.usernameAvailability = 'checking';
    this.usernameCheckSubscription = this.authService.checkUsernameExists(username).subscribe({
      next: exists => {
        if (String(this.username?.value || '') !== username) return;

        if (exists) {
          this.username?.setErrors({ ...(this.username.errors || {}), usernameTaken: true });
          this.usernameAvailability = 'taken';
        } else {
          this.usernameAvailability = 'available';
        }
      },
      error: () => {
        if (String(this.username?.value || '') === username) {
          this.usernameAvailability = 'idle';
        }
      }
    });
    this.subscription.add(this.usernameCheckSubscription);
  }

  private clearUsernameCheckTimer(): void {
    if (this.usernameCheckTimer) {
      clearTimeout(this.usernameCheckTimer);
      this.usernameCheckTimer = null;
    }
  }

  private handleUsernameRegistrationError(message: string): boolean {
    const isUsernameConflict = /username/i.test(message) && /(already|exist|taken|unavailable|duplicate)/i.test(message);
    if (!isUsernameConflict) return false;

    this.username?.setErrors({ ...(this.username.errors || {}), usernameTaken: true });
    this.username?.markAsTouched();
    this.usernameAvailability = 'taken';
    this.errorMessage = 'Oops! Someone already has this username';
    this.navigateToSignupStep(2);
    try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
    return true;
  }

  private noCommonPasswordValidator(): import('@angular/forms').ValidatorFn {
    const common = ['123456', '1234567', '12345678', '123456789', '1234567890', 'password', 'abcdef', 'qwerty', '111111', '000000', 'abc123'];
    return (control: import('@angular/forms').AbstractControl) => {
      const v = (control.value || '').toLowerCase();
      return common.includes(v) ? { commonPassword: true } : null;
    };
  }

  private passwordsMatchValidator(): import('@angular/forms').ValidatorFn {
    return (control: import('@angular/forms').AbstractControl) => {
      const password = control.get('password')?.value;
      const confirmation = control.get('confirmPassword')?.value;
      return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
    };
  }

  private noRepeatedLetterValidator(): import('@angular/forms').ValidatorFn {
    return (control: import('@angular/forms').AbstractControl) => {
      const v: string = (control.value || '').toLowerCase();
      // Fail if any letter appears 3+ times IN A ROW (e.g. "aaa", "bbb")
      if (/(.)\1{2}/.test(v)) return { repeatedLetter: true };
      return null;
    };
  }

  getPasswordErrorMessage(): string {
    const control = this.password;
    if (!control) return '';
    if (control.hasError('required')) return 'Please create a password.';
    if (control.hasError('minlength')) return 'Password should be 6 characters or more.';
    if (control.hasError('maxlength')) return 'Password cannot be more than 12 characters.';
    if (control.hasError('commonPassword')) return 'This password is too common. Please choose a stronger one.';
    return 'Please enter a valid password.';
  }

  getConfirmPasswordErrorMessage(): string {
    if (this.confirmPassword?.hasError('required')) return 'Please confirm your password.';
    if (this.passwordForm.hasError('passwordMismatch')) return 'Passwords do not match.';
    return '';
  }

  hasUpperCase(value: string | null | undefined): boolean {
    return !!value && /[A-Z]/.test(value);
  }

  hasNumber(value: string | null | undefined): boolean {
    return !!value && /[0-9]/.test(value);
  }

  getNameErrorMessage(): string {
    const control = this.name;
    if (!control) return '';
    if (control.hasError('required')) return 'Please enter your full name.';
    if (control.hasError('minlength')) return 'Name must be at least 2 characters.';
    if (control.hasError('maxlength')) return 'Name cannot exceed 50 characters.';
    if (control.hasError('pattern')) return 'Name can only include letters, spaces, apostrophes and hyphens.';
    if (control.hasError('repeatedLetter')) return 'Name cannot have the same letter three times in a row (e.g. "aaa").';
    return 'Please enter a valid full name.';
  }

  selectGender(gender: SignupGender): void {
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

  get isManagedChildSignup(): boolean {
    return this.managedChildSignup && this.currentRole === 'child';
  }

  /**
   * The Parent completion screen is entered from both normal registration and
   * the family setup flow. Family setup deliberately clears the temporary
   * signup role before returning here, so also use the persisted onboarding
   * relationship, authenticated user, and one-time family acknowledgement.
   */
  get isParentWelcomeScreen(): boolean {
    if (this.step !== 5) return false;

    const registrationRole = String(
      this.onboardingState.getRegistrationState()?.savedData?.relationship || ''
    ).trim().toUpperCase();
    const authenticatedRole = String(
      this.authService.getUserData()?.relationship || ''
    ).trim().toUpperCase();
    let familyAcknowledgement = '';
    try {
      familyAcknowledgement = String(sessionStorage.getItem('family_connected_ack') || '')
        .trim()
        .toUpperCase();
    } catch {
      // The page remains usable when session storage is unavailable.
    }

    return this.currentRole === 'parent'
      || registrationRole === 'PARENT'
      || authenticatedRole === 'PARENT'
      || familyAcknowledgement === 'PARENT';
  }

  get isPostFamilyChildPetStep(): boolean {
    return this.step === 4
      && this.currentRole === 'child'
      && this.authService.isLoggedIn()
      && sessionStorage.getItem(SignupComponent.CHILD_POST_FAMILY_WELCOME_KEY) === 'true';
  }

  get hasSelectedPet(): boolean {
    return this.selectedPetIndex !== null
      && Number.isInteger(this.selectedPetIndex)
      && !!this.pets[this.selectedPetIndex];
  }

  getPetTrait(pet: any, traitIndex: number): string {
    const fallback = pet?.text?.[traitIndex] || '';
    if (!this.isManagedChildSignup) {
      return fallback;
    }

    if (pet?.name === 'Panda' && traitIndex === 0) {
      return 'Their gentle guide to inner peace';
    }
    if (pet?.name === 'Owl' && traitIndex === 0) {
      return 'Their midnight study buddy';
    }
    if (pet?.name === 'Dragon' && traitIndex === 1) {
      return 'Celebrates when they go on streaks';
    }
    return fallback;
  }

  // Header helpers for template bindings to avoid complex inline expressions
  get headerText(): string {
    if (this.step === 1) return "Who's using the app?";
    if (this.step === 0.1) return 'Create your account';
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
      this.navigateToSignupStep(4);
    }
  }

  signupFromLogin() {
    if (this.otpRequestInProgress) {
      return;
    }

    if (this.email?.invalid) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }
    const identifier = this.email?.value;
    this.errorMessage = null;
    this.otpRequestInProgress = true;

    this.authService.registerRequestOtp(identifier, true).subscribe({
      next: (response) => {
        this.otpRequestInProgress = false;
        if (response?.success === false) {
          this.errorMessage = response.message || 'Failed to send OTP. Please try again.';
          return;
        }

        this.requestedIdentifier = identifier;
        try {
          sessionStorage.setItem('requestedIdentifier', identifier);
          sessionStorage.setItem('loginMode', 'email');
        } catch (e) { }

        const savedData = response?.savedData;
        const effectiveStep = savedData?.onboardingStep ?? response?.nextStep;

        if (savedData) {
          // Some backend versions return the resume step only as `nextStep`.
          // Put that effective value onto the draft before routing so an
          // email-verified draft never falls back to the OTP screen.
          const restoredDraft: RegistrationDraftData = {
            ...savedData,
            ...(effectiveStep != null ? { onboardingStep: Number(effectiveStep) } : {})
          };
          this.onboardingState.saveRegistrationDraft(restoredDraft, effectiveStep, 'EMAIL');
          this.applyRegistrationDraft(restoredDraft);

          if (savedData.emailVerified === true) {
            if (Number(effectiveStep) >= 7) {
              this.onboardingState.clearRegistrationDraft();
              this.core.triggerToasrt('Your account is already set up. Please log in to continue.');
              this.navigateReplacing('/home/login');
              return;
            }
            const resume = this.onboardingState.getResumeNavigation(restoredDraft);
            if (resume) {
              void this.navCtrl.navigateRoot(resume.url, {
                queryParams: resume.queryParams,
                animated: false
              });
              return;
            }
          }
        } else {
          this.onboardingState.saveRegistrationDraft({
            email: identifier,
            emailVerified: false,
            onboardingStep: 2
          }, 2, 'EMAIL');
        }

        this.startOtpTimer();
        this.navigateToSignupStep(0.2);
      },
      error: (err) => {
        this.otpRequestInProgress = false;
        this.errorMessage = this.getApiErrorMessage(
          err,
          'Failed to send OTP. Please try again.'
        );
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
    this.onboardingState.updateRegistrationDraft({
      relationship: this.roleSelected.toUpperCase(),
      asChild: this.roleSelected === 'child'
    });
    this.onboardingState.markRoleSelectionCompleted();

    // The first-launch flow asks for the role before account credentials.
    // Existing signup entry points may already have verified credentials.
    const hasCredentials = !!this.signupCredentialState.getPassword()
      || this.isOAuthSignup;
    this.navigateToSignupStep(hasCredentials ? 2 : 0.1);
  }

  chooseRoleAndContinue(role: SignupRole): void {
    this.roleSelected = role;
  }

  proceedWithAvatar() {
    if (this.step === 4 && !this.hasSelectedPet) {
      this.core.triggerToasrt('Please choose your pet to continue.');
      return;
    }

    // Profile completion requires an explicit avatar for every signup role.
    if (this.step !== 4 && !this.avatarSelected) {
      this.core.triggerToasrt('Please select an avatar');
      return;
    }

    // Persist the user's explicit avatar selection.
    try {
      const avatarValue = this.avatarSelected ?? '';
      if (avatarValue) sessionStorage.setItem('signup_avatar', String(avatarValue));
    } catch (e) { }

    // If we're currently on the pet selection step (step 4), persist selected pet and navigate to welcome step
    if (this.step === 4) {
      // Use the user's explicit tap-selection — never the carousel's current
      // scroll position, which can drift away from what was actually chosen
      // if the user swipes to browse after selecting.
      let selectedPetName = this.selectedPetIndex !== null
        ? this.pets[this.selectedPetIndex]?.apiName
        : this.currentImage?.apiName;

      // If still no pet name, check session storage
      if (!selectedPetName) {
        selectedPetName = sessionStorage.getItem('signup_pet');
      }

      if (selectedPetName) {
        sessionStorage.setItem('signup_pet', selectedPetName);
        this.onboardingState.updateRegistrationDraft({
          petName: selectedPetName,
          onboardingStep: 5
        }, 5);
      } else {
        this.core.triggerToasrt('Please choose your pet to continue.');
        return;
      }

      // Self registers here. A fresh Child account is already registered and
      // linked to a family before this post-family Pet step is shown.
      const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
      if (this.isManagedChildSignup) {
        void this.createManagedChildAccount(selectedPetName);
        return;
      }

      if (this.isPostFamilyChildPetStep) {
        this.registerChildOrSelfFromSession('child', true);
        return;
      }

      if (role === 'self') {
        this.registerChildOrSelfFromSession('self', true);
        return;
      }

      // Navigate to welcome step (step 5) for other flows
      this.navigateToSignupStep(5);
      return;
    }

    // If role is 'self', go to pet selection (step 4)
    if (this.roleSelected === 'self') {
      this.navigateToSignupStep(4);
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
      const suggestionRoles = this.getAgeSuggestionRoles(this.roleSelected!, age);
      if (suggestionRoles.length) {
        this.openAgeSuggestionModal(suggestionRoles);
        return;
      }

      if (this.roleSelected === 'child') {
        // The old instruction interstitial was retired. Register/sign in the
        // pending child and open the real family-code screen directly.
        this.registerChildOrSelfFromSession('child', false);
        return;
      }

      if (this.roleSelected === 'parent') {
        void this.navCtrl.navigateRoot('/home/instructions-for-parent', {
          queryParams: { role: 'parent' },
          animated: false
        });
        return;
      }
    }

    // Date of birth was collected on the required profile step.

    // Persist profile details in session.
    try {
      const profile = {
        name: this.profileForm.get('name')?.value,
        dob: parsedDob ? parsedDob.getTime() : null,
        gender: this.gender,
        avatar: this.avatarSelected
      };
      sessionStorage.setItem('signup_profile', JSON.stringify(profile));
      sessionStorage.setItem('signup_avatar', String(this.avatarSelected));
      this.persistProfileDraft(profile);
    } catch (e) { }

    // Fallback: continue to step 3 (phone/email)
    this.navigateToSignupStep(3);
  }

  /**
   * Called from profile Save & Continue when user should be registered immediately
   */
  async registerOrProceed(): Promise<void> {
    if (
      this.registrationInProgress
      || (this.showReferral && this.referralCheckInProgress)
    ) {
      return;
    }

    if (this.isAppleOAuthSignup) {
      const appleName = this.resolveAppleAccountName(this.profileForm.get('name')?.value);
      if (!appleName) {
        this.errorMessage = 'We could not retrieve your name from Apple. Please try Sign in with Apple again.';
        this.core.triggerToasrt(this.errorMessage);
        return;
      }
      this.profileForm.get('name')?.setValue(appleName, { emitEvent: false });
    }

    this.profileForm.markAllAsTouched();

    if (this.profileForm.get('name')?.invalid) {
      this.core.triggerToasrt(this.getNameErrorMessage());
      return;
    }

    if (this.currentRole !== 'parent' && this.profileForm.get('username')?.invalid) {
      this.core.triggerToasrt(this.getUsernameValidationMessage());
      return;
    }

    if (this.profileForm.get('dob')?.invalid) {
      this.core.triggerToasrt('Please select your date of birth.');
      return;
    }

    if (!this.avatarSelected) {
      this.core.triggerToasrt('Please select an avatar');
      return;
    }

    const dobVal = this.profileForm.get('dob')?.value;
    const parsedDob = dobVal ? new Date(dobVal) : null;
    const age = parsedDob ? this.calculateAge(parsedDob) : null;

    // If user is under 8 years old, show the access restricted popup.
    if (age !== null && age < 8) {
      this.showAccessRestrictedModal = true;
      return;
    }

    if (!(await this.validateReferralBeforeContinue())) {
      return;
    }

    // Persist profile details, including the selected avatar for every role.
    try {
      const profile = {
        name: this.profileForm.get('name')?.value,
        username: this.profileForm.get('username')?.value,
        phone: this.profileForm.get('phone')?.value || undefined,
        dob: parsedDob ? parsedDob.getTime() : null,
        gender: this.gender,
        avatar: this.avatarSelected
      };
      sessionStorage.setItem('signup_profile', JSON.stringify(profile));
      sessionStorage.setItem('signup_avatar', String(this.avatarSelected));
      this.persistProfileDraft(profile);
      // Persist referral code (if provided)
      if (this.referralCode && this.referralCode.length > 0) {
        try { sessionStorage.setItem('referralCode', this.referralCode); } catch (e) { }
      }
    } catch (e) { }

    // Get the role from session storage or current selection
    const role = ((sessionStorage.getItem('signup_role') as SignupRole) || this.roleSelected)!;

    // A child added by a parent follows the same age rules as a child creating
    // an account independently. Do this before routing to the Pet step so an
    // adult date of birth cannot be registered as a managed child.
    const suggestionRoles = this.getAgeSuggestionRoles(role, age);
    if (suggestionRoles.length) {
      this.openAgeSuggestionModal(suggestionRoles);
      return;
    }

    if (this.isManagedChildSignup) {
      this.navigateToSignupStep(4);
      return;
    }

    if (
      role === 'child'
      && this.isEditingPendingChildOnboarding
      && this.authService.isPendingChild()
    ) {
      // Back from Join Family is an edit/review action for an already-created
      // pending child. Preserve the edited draft and return directly without
      // issuing a duplicate registration request.
      this.onboardingState.setRegistrationStep(5);
      void this.navCtrl.navigateRoot('/home/join-family', {
        queryParams: { role: 'child' },
        animated: false
      });
      return;
    }

    // Apply age-based routing rules
    if (role === 'parent') {
      void this.navCtrl.navigateRoot('/home/instructions-for-parent', {
        queryParams: { role: 'parent' },
        animated: false
      });
      return;
    } else if (role === 'self') {
      // Save backend step 4 before opening pet selection (backend step 5).
      this.registerChildOrSelfFromSession('self', false);
      return;
    } else if (role === 'child') {
      // Join Family needs an authenticated pending-child account. Register and
      // sign in now, then defer Pet selection until the family join succeeds.
      this.registerChildOrSelfFromSession('child', false);
      return;
    }
  }

  /**
   * Signup is a single wizard, not a stack of independent pages. Replacing the
   * current URL prevents Ionic/browser history from briefly rendering stale
   * completed steps and stops the device Back action from reopening them.
   */
  private navigateToSignupStep(step: number): void {
    if (this.step === 0.3 && step !== 0.3) {
      this.dismissPasswordKeyboard();
    }
    this.resetTransientStepUi();
    const queryParams: Record<string, string | number | boolean> = { step };
    if (this.isManagedChildSignup) {
      queryParams['role'] = 'child';
      queryParams['managedChild'] = true;
    }
    void this.navCtrl.navigateRoot('/home/sign-up', {
      queryParams,
      animated: false
    });
  }

  private navigateReplacing(url: string): void {
    this.resetTransientStepUi();
    void this.navCtrl.navigateRoot(url, { animated: false });
  }

  private resetTransientStepUi(): void {
    this.openBirthdayPicker = false;
    this.showCountryCodeModal = false;
    this.countrySearch = '';
    this.showAgeSuggestionModal = false;
    this.ageSuggestionTarget = null;
    this.ageSuggestionRoles = [];
    this.showAccessRestrictedModal = false;
    this.focusedReferralField = null;
    this.referralKeyboardHeight = 0;
  }

  private syncSignupStatusBar(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const isDetailsStep = this.step === 2;
    StatusBar.setStyle({ style: isDetailsStep ? Style.Dark : Style.Light }).catch(() => undefined);
    if (Capacitor.getPlatform() === 'android') {
      const backgroundColor = isDetailsStep ? '#E2DBFD' : '#FFE9D6';
      StatusBar.setBackgroundColor({ color: backgroundColor }).catch(() => undefined);
    }
  }

  goBackToEmail() {
    this.clearOtpTimer();
    this.otpDigits = ['', '', '', ''];
    this.errorMessage = null;
    this.navigateToSignupStep(0.1);
  }

  goBack() {
    if (this.step === 0.1) {
      if (this.isManagedChildSignup) {
        this.cancelManagedChildSignup();
        return;
      }
      this.returnToRoleSelection();
    } else if (this.step === 0.2) {
      this.clearOtpTimer();
      this.navigateToSignupStep(0.1);
    } else if (this.step === 0.3) {
      this.navigateToSignupStep(0.1);
    } else if (this.step === 1) {
      if (this.isOAuthSignup) {
        this.navigateReplacing('/home/login');
      } else if (this.signupCredentialState.getPassword()) {
        this.navigateToSignupStep(0.3);
      } else {
        this.navigateReplacing('/home/login');
      }
    } else if (this.step > 1) {
      const savedRole = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected;
      if (this.step === 4 && (savedRole === 'self' || savedRole === 'child')) {
        this.navigateToSignupStep(2);
        return;
      }
      if (this.step === 2) {
        this.roleSelected = undefined;
      }
      this.navigateToSignupStep(this.step - 1);
    }
  }

  toggleManagedChildFaq(index: number): void {
    this.expandedManagedChildFaq = this.expandedManagedChildFaq === index ? null : index;
  }

  returnToParentApp(): void {
    let showParentWelcome = false;
    try {
      showParentWelcome = sessionStorage.getItem(
        SignupComponent.MANAGED_CHILD_PARENT_WELCOME_PENDING_KEY
      ) === 'true';
      sessionStorage.removeItem(SignupComponent.MANAGED_CHILD_PARENT_WELCOME_PENDING_KEY);
    } catch (error) {
      console.warn('[Signup] Unable to read deferred parent welcome state', error);
    }

    try {
      // The parent dashboard uses this one-time flag to reload the family
      // members after the new child has been committed by the backend.
      sessionStorage.setItem(SignupComponent.MANAGED_CHILD_REFRESH_KEY, 'true');
    } catch (error) {
      console.warn('[Signup] Unable to mark parent child-list refresh', error);
    }

    this.clearManagedChildSignupState();
    this.loadingService.forceHide();
    if (showParentWelcome) {
      void this.navCtrl.navigateRoot('/home/sign-up', {
        queryParams: { step: 5 },
        animated: false
      });
      return;
    }

    void this.navCtrl.navigateRoot(this.authService.getDashboardRoute() || '/authed/parent-account', {
      animated: false
    });
  }

  private cancelManagedChildSignup(): void {
    this.clearManagedChildSignupState();
    this.loadingService.forceHide();
    void this.navCtrl.navigateRoot(this.authService.getDashboardRoute() || '/authed/parent-account', {
      animated: false
    });
  }

  private async createManagedChildAccount(selectedPetName: string): Promise<void> {
    if (this.registrationInProgress) {
      return;
    }

    const payload = this.buildManagedChildRegistrationPayload(selectedPetName);
    if (!payload) {
      return;
    }

    const password = this.signupCredentialState.getPassword() || this.password?.value || '';
    if (!password) {
      this.core.triggerToasrt('Please create a password for your child before continuing.');
      return;
    }

    this.registrationInProgress = true;
    this.errorMessage = null;
    const loaderToken = this.loadingService.show('Creating child account...', {
      delayMs: 0,
      minVisibleMs: 300
    });

    try {
      if (!this.managedChildRegistrationComplete) {
        const registrationResponse = await firstValueFrom(
          this.authService.registerManagedChild(payload)
        );
        const onboardingStep = this.getResponseOnboardingStep(registrationResponse);
        if (onboardingStep !== 6) {
          throw new Error(
            registrationResponse?.message
            || 'The child account could not be completed. Please try again.'
          );
        }
        this.managedChildRegistrationComplete = true;
      }

      await firstValueFrom(this.authService.shareLoginCredentials({
        email: payload.email,
        password,
        message: 'Your parent has created your SuperMe account. Use these credentials to log in.'
      }));

      this.managedChildSuccessEmail = payload.email;
      try {
        sessionStorage.setItem(
          SignupComponent.MANAGED_CHILD_SUCCESS_EMAIL_KEY,
          this.managedChildSuccessEmail
        );
      } catch (error) {
        console.warn('[Signup] Unable to persist managed child success email', error);
      }

      this.authService.refreshUserData().subscribe({
        error: () => {
          // The Parent screen can refresh again when it is opened.
        }
      });
      this.navigateToSignupStep(6);
    } catch (error: any) {
      this.errorMessage = error?.error?.message
        || error?.message
        || 'We could not create the child account. Please check your connection and try again.';
      this.core.triggerToasrt(this.errorMessage);
    } finally {
      this.registrationInProgress = false;
      this.loadingService.hide(loaderToken);
    }
  }

  private buildManagedChildRegistrationPayload(selectedPetName: string): any | null {
    const email = this.getSignupCredentialIdentifier().trim();
    const password = this.signupCredentialState.getPassword() || this.password?.value || '';
    if (!email || !email.includes('@')) {
      this.core.triggerToasrt('Please enter a valid email address for your child.');
      return null;
    }
    if (!password) {
      this.core.triggerToasrt('Please create a password for your child.');
      return null;
    }
    if (!this.managedChildFamilyCode) {
      this.core.triggerToasrt('Family code is not available. Please return to your family and try again.');
      return null;
    }

    let profile: any = {};
    try {
      profile = JSON.parse(sessionStorage.getItem('signup_profile') || '{}');
    } catch (error) {
      console.warn('[Signup] Unable to read managed child profile', error);
    }

    const persistedDraft = this.onboardingState.getRegistrationState()?.savedData || {};
    const avatarKey = Number(profile.avatar || this.avatarSelected);
    const avatar = this.avatars.find(item => item.key === avatarKey);
    const dobValue = profile.dob
      || persistedDraft.dateOfBirth
      || this.profileForm.get('dob')?.value;
    const dateOfBirth = dobValue ? this.toDateInputValue(dobValue) : '';
    const profilePhone = String(
      profile.phone
      || this.profileForm.get('phone')?.value
      || ''
    ).trim();
    const payload: any = {
      email,
      password,
      name: profile.name || persistedDraft.name || this.profileForm.get('name')?.value,
      username: profile.username || persistedDraft.username || this.profileForm.get('username')?.value,
      relationship: 'CHILD',
      familyCode: this.managedChildFamilyCode,
      avatarName: avatarKey ? `avatar${avatarKey}` : undefined,
      avatarImageName: avatar?.value?.split('/').pop(),
      petName: selectedPetName,
      referralCode: this.referralCode || null,
      unlockPotential: false
    };

    if (this.gender) {
      payload.gender = this.gender;
    }
    if (dateOfBirth) {
      payload.dateOfBirth = dateOfBirth;
    }
    if (profilePhone) {
      const countryCode = sessionStorage.getItem('countryCode') || this.selectedCountry.code;
      payload.phone = profilePhone.startsWith('+')
        ? profilePhone
        : `${countryCode}${profilePhone}`;
    }

    return payload;
  }

  private clearManagedChildSignupState(): void {
    this.onboardingState.clearRegistrationDraft();
    this.signupCredentialState.clear();
    this.managedChildSignup = false;
    this.managedChildFamilyCode = '';
    this.managedChildSuccessEmail = '';
    this.managedChildRegistrationComplete = false;
    this.expandedManagedChildFaq = null;
    try {
      [
        SignupComponent.CREATE_CHILD_AFTER_FAMILY_KEY,
        SignupComponent.MANAGED_CHILD_SIGNUP_KEY,
        SignupComponent.MANAGED_CHILD_FAMILY_CODE_KEY,
        SignupComponent.MANAGED_CHILD_SUCCESS_EMAIL_KEY,
        'signup_profile',
        'signup_role',
        'signup_avatar',
        'signup_pet',
        'requestedIdentifier',
        'loginMode',
        'countryCode',
        'familyCode',
        'referralCode',
        'referralCodeLocked'
      ].forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('[Signup] Unable to clear managed child signup state', error);
    }
  }

  private returnToRoleSelection(): void {
    this.roleSelected = undefined;
    this.onboardingState.resetRoleSelection();
    this.navigateToSignupStep(1);
  }

  onCancel() {
    this.navCtrl.navigateRoot(['/home']);
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

  // Swiping only tracks which card is centered for the carousel's visual
  // state — it does NOT select a pet. Selection happens exclusively via an
  // explicit tap (selectPet()).
  onSlideChange() {
    if (!this.swiperRef?.nativeElement) {
      return;
    }

    const swiperInstance = this.swiperRef.nativeElement.swiper;
    if (swiperInstance) {
      this.currentSlideIndex = swiperInstance.realIndex;
    }
  }

  /**
   * Explicitly confirm a pet as the user's choice (tap-to-select). Centers
   * the tapped card, marks it as selected, and persists the choice — but
   * never calls the registration API; that only happens on "Next".
   */
  selectPet(index: number): void {
    const pet = this.pets[index];
    if (!pet) return;

    this.selectedPetIndex = index;
    this.currentImage = pet;
    this.currentSlideIndex = index;

    try {
      sessionStorage.setItem('signup_pet', pet.apiName);
    } catch (e) { }

    const swiperInstance = this.swiperRef?.nativeElement?.swiper;
    swiperInstance?.slideTo(index);
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

    this.updateComputedAge(parsedDate);
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

  private updateComputedAge(value: unknown): void {
    const dob = value instanceof Date ? value : new Date(String(value || ''));
    const today = new Date();
    this.computedAge = isNaN(dob.getTime()) || dob > today ? null : this.calculateAge(dob);
  }

  private getAgeSuggestionRoles(role: SignupRole, age: number | null): SignupRole[] {
    // No date of birth provided (it's optional) — nothing to suggest.
    if (age === null) return [];

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
    this.navigateToSignupStep(1);
  }

  openCountryCodeModal(): void {
    if (this.step === 2 || this.loginMode === 'phone') {
      this.countrySearch = '';
      this.showCountryCodeModal = true;
    }
  }

  closeCountryCodeModal(): void {
    this.countrySearch = '';
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

  // Toggle the optional referral-code field and keep its value, validation,
  // persisted draft, and accessibility state synchronized.
  toggleReferral(): void {
    this.showReferral = !this.showReferral;

    if (!this.showReferral) {
      this.clearReferralState();
      return;
    }

    this.referralValidationStatus = null;
    this.referralErrorMessage = '';
    // Let the expand animation begin before opening the native keyboard.
    setTimeout(() => this.referralInput?.nativeElement.focus(), 220);
  }

  // Handle referral input: allow only alphanumeric and max length 8
  onReferralInput(event: Event): void {
    if (this.referralCodeReadonly) {
      if (event.target instanceof HTMLInputElement) {
        event.target.value = this.referralCode;
      }
      return;
    }

    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const raw = input?.value || '';
    // Allow only alphanumeric, up to 8 chars, and normalize to UPPERCASE
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    this.referralCode = cleaned;
    this.validatedReferralCode = '';
    this.clearReferralValidationTimer();
    if (input) input.value = cleaned;

    try {
      if (cleaned) {
        sessionStorage.setItem('referralCode', cleaned);
      } else {
        sessionStorage.removeItem('referralCode');
      }
      sessionStorage.removeItem('referralCodeLocked');
    } catch (e) { }
    this.onboardingState.updateRegistrationDraft({ referralCode: cleaned || null });

    this.referralValidationStatus = null;
    this.referralErrorMessage = '';

    // Validate after the user pauses. The Next handler still validates
    // immediately, so a quick tap never requires a second attempt.
    if (cleaned.length === 8) {
      this.referralValidationTimer = setTimeout(() => {
        void this.checkReferralCodeValidity(cleaned);
      }, 450);
    }
  }

  onReferralFieldFocus(event: FocusEvent): void {
    this.focusedReferralField = event.target instanceof HTMLElement ? event.target : null;
    this.visualViewportBaseline = Math.max(
      this.visualViewportBaseline,
      window.visualViewport?.height || window.innerHeight
    );
    setTimeout(() => this.scrollReferralControlsIntoView(), 80);
    setTimeout(() => this.scrollReferralControlsIntoView(), 320);
  }

  onReferralFieldBlur(): void {
    setTimeout(() => {
      if (document.activeElement !== this.referralInput?.nativeElement) {
        this.focusedReferralField = null;
        if (!Capacitor.isNativePlatform()) {
          this.referralKeyboardHeight = 0;
        }
      }
    }, 0);
  }

  private async validateReferralBeforeContinue(): Promise<boolean> {
    if (!this.showReferral) {
      return true;
    }

    const code = this.referralCode.trim().toUpperCase();
    if (code.length !== 8) {
      this.referralValidationStatus = 'invalid';
      this.referralErrorMessage = code
        ? 'Referral code must be exactly 8 characters.'
        : 'Enter your 8-character referral code, or close this section to continue.';
      this.focusReferralField();
      return false;
    }

    if (
      this.referralValidationStatus === 'valid'
      && this.validatedReferralCode === code
    ) {
      return true;
    }

    this.clearReferralValidationTimer();
    const isValid = await this.checkReferralCodeValidity(code);
    if (!isValid) {
      this.focusReferralField();
    }
    return isValid;
  }

  // Check if referral code is valid by calling the API.
  private async checkReferralCodeValidity(referralCode: string): Promise<boolean> {
    if (this.referralCheckInProgress) {
      return false;
    }

    const requestedCode = referralCode.trim().toUpperCase();
    this.referralCheckInProgress = true;
    this.referralValidationStatus = 'pending';
    this.referralErrorMessage = '';

    try {
      const response: any = await firstValueFrom(this.authService.checkReferralCode(requestedCode));
      // Ignore a response for a code that was changed or hidden while the
      // request was running.
      if (!this.showReferral || this.referralCode !== requestedCode) {
        this.referralValidationStatus = null;
        this.referralErrorMessage = '';
        return false;
      }

      const result = response?.data ?? response;
      let isValid: boolean | null = null;
      if (typeof result === 'boolean') {
        isValid = result;
      } else if (result && typeof result === 'object') {
        if ('valid' in result) isValid = !!result.valid;
        else if ('isValid' in result) isValid = !!result.isValid;
        else if ('success' in result) isValid = !!result.success;
        else if ('status' in result && typeof result.status === 'string') {
          const status = result.status.toLowerCase();
          isValid = status === 'valid' || status === 'success' || status === 'active';
        }
      }

      // The live endpoint may return a successful response without a flag.
      // A 2xx response is valid unless the payload explicitly says otherwise.
      if (isValid === false) {
        this.referralValidationStatus = 'invalid';
        this.referralErrorMessage = response?.message || result?.message || 'Invalid referral code.';
        this.validatedReferralCode = '';
        return false;
      }

      this.referralValidationStatus = 'valid';
      this.referralErrorMessage = '';
      this.validatedReferralCode = requestedCode;
      this.onboardingState.updateRegistrationDraft({ referralCode: requestedCode });
      return true;
    } catch (error: any) {
      if (this.showReferral && this.referralCode === requestedCode) {
        this.referralValidationStatus = 'invalid';
        this.referralErrorMessage = error?.error?.message
          || (error?.status === 0
            ? 'Unable to verify the code. Check your connection and try again.'
            : 'Invalid referral code.');
      }
      this.validatedReferralCode = '';
      return false;
    } finally {
      this.referralCheckInProgress = false;
    }
  }

  private clearReferralState(): void {
    this.clearReferralValidationTimer();
    this.referralCode = '';
    this.referralCodeReadonly = false;
    this.referralValidationStatus = null;
    this.referralErrorMessage = '';
    this.validatedReferralCode = '';
    this.focusedReferralField = null;
    this.referralKeyboardHeight = 0;
    try {
      sessionStorage.removeItem('referralCode');
      sessionStorage.removeItem('referralCodeLocked');
    } catch (e) { }
    this.onboardingState.updateRegistrationDraft({ referralCode: null });
  }

  private clearReferralValidationTimer(): void {
    if (this.referralValidationTimer) {
      clearTimeout(this.referralValidationTimer);
      this.referralValidationTimer = null;
    }
  }

  private focusReferralField(): void {
    setTimeout(() => {
      this.referralInput?.nativeElement.focus();
      this.scrollReferralControlsIntoView();
    }, 0);
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

  // Same numeric-only cleanup as onPhoneInput, but for the profile step's own
  // contact-number field (profileForm.phone), not the login identifier.
  onProfilePhoneInput(event: any): void {
    const input = event.target;
    const numericValue = (input.value || '').replace(/[^0-9]/g, '');

    this.profileForm.patchValue({ phone: numericValue });

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
    if (this.otpVerifyInProgress) {
      return;
    }

    if (!this.isOtpComplete()) {
      this.core.triggerToasrt('Please enter the complete OTP');
      return;
    }

    const otp = this.otpDigits.join('');

    // Get saved values from session storage if available
    const savedLoginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone' || this.loginMode;
    const identifier = this.requestedIdentifier || (savedLoginMode === 'phone' ? this.phone?.value : this.email?.value);

    this.otpVerifyInProgress = true;
    this.authService.registerVerifyOtp(
      identifier || '',
      otp,
      savedLoginMode === 'email',
      savedLoginMode === 'phone' ? this.selectedCountry.code : undefined
    ).subscribe({
      next: (response) => {
        this.otpVerifyInProgress = false;
        if (response?.success === false) {
          this.errorMessage = response.message || 'OTP verification failed. Please try again.';
          return;
        }

        this.errorMessage = null;
        this.clearOtpTimer();
        const nextStep = this.getResponseOnboardingStep(response) || 4;
        this.onboardingState.updateRegistrationDraft({
          ...(savedLoginMode === 'email'
            ? { email: identifier || undefined }
            : { phone: identifier || undefined }),
          emailVerified: true,
          onboardingStep: nextStep
        }, nextStep);

        // Password creation is the app's first UI within backend step 4.
        // It is intentionally kept in memory only and never persisted.
        this.navigateToSignupStep(0.3);
      },
      error: (err) => {
        this.otpVerifyInProgress = false;
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
    if (this.otpResendInProgress) {
      return;
    }

    const savedLoginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone' || this.loginMode;
    const identifier = this.requestedIdentifier || (savedLoginMode === 'phone' ? this.phone?.value : this.email?.value);
    const isEmail = savedLoginMode === 'email';
    const countryCode = savedLoginMode === 'phone' ? (sessionStorage.getItem('countryCode') || this.selectedCountry.code) : undefined;

    if (!identifier) {
      this.errorMessage = 'No identifier available to resend OTP';
      return;
    }

    this.otpResendInProgress = true;
    // Resend uses /api/auth/send-otp — same endpoint the initial OTP
    // request now uses too (see AuthService.registerRequestOtp).
    this.authService.resendRegisterOtp(identifier, isEmail, countryCode).subscribe({
      next: () => {
        this.otpResendInProgress = false;
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
        this.otpResendInProgress = false;
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

  getMaskedEmail(): string {
    const emailValue = String(this.signupForm.get('email')?.value || this.requestedIdentifier || '').trim();
    const [localPart, domain] = emailValue.split('@');
    if (!localPart || !domain) {
      return emailValue;
    }

    const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
    const maskLength = Math.max(4, localPart.length - visiblePrefix.length);
    return `${visiblePrefix}${'*'.repeat(maskLength)}@${domain}`;
  }

  // Format timer display as MM:SS
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    void this.keyboardShowListener?.remove();
    void this.keyboardHideListener?.remove();
    window.visualViewport?.removeEventListener('resize', this.visualViewportResizeHandler);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({ color: '#FFE9D6' }).catch(() => undefined);
      }
    }
    this.clearUsernameCheckTimer();
    this.clearReferralValidationTimer();
    this.usernameCheckSubscription?.unsubscribe();
    this.subscription.unsubscribe();
    this.clearOtpTimer();
  }

  onPasswordFieldFocus(event: FocusEvent): void {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    this.focusedPasswordField = target;
    this.visualViewportBaseline = Math.max(
      this.visualViewportBaseline,
      window.visualViewport?.height || window.innerHeight
    );

    // First position the field immediately, then repeat after the native
    // keyboard animation reports its final height.
    setTimeout(() => this.scrollPasswordFieldIntoView(target), 60);
  }

  onPasswordScreenTap(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    // Field rows, visibility toggles, submit, and Back remain interactive.
    if (target.closest('.pwd-field, .pwd-next-btn, superme-auth-back-button')) {
      return;
    }

    this.dismissPasswordKeyboard();
  }

  private setupPasswordKeyboardHandling(): void {
    this.visualViewportBaseline = window.visualViewport?.height || window.innerHeight;
    window.visualViewport?.addEventListener('resize', this.visualViewportResizeHandler);

    if (!Capacitor.isNativePlatform()) return;

    void Keyboard.addListener('keyboardDidShow', (info: KeyboardInfo) => {
      this.ngZone.run(() => {
        const keyboardHeight = Number(info?.keyboardHeight) || 0;
        if (this.step === 0.3) {
          this.setPasswordKeyboardState(keyboardHeight);
          setTimeout(() => this.scrollPasswordFieldIntoView(), 90);
        } else if (this.step === 2 && this.focusedReferralField) {
          this.referralKeyboardHeight = Math.max(0, Math.round(keyboardHeight));
          setTimeout(() => this.scrollReferralControlsIntoView(), 90);
        }
      });
    }).then(listener => {
      this.keyboardShowListener = listener;
    }).catch(() => undefined);

    void Keyboard.addListener('keyboardDidHide', () => {
      this.ngZone.run(() => {
        this.setPasswordKeyboardState(0);
        this.referralKeyboardHeight = 0;
      });
    }).then(listener => {
      this.keyboardHideListener = listener;
    }).catch(() => undefined);
  }

  private handleVisualViewportResize(): void {
    // Native builds use Capacitor's reliable keyboard height. visualViewport
    // is retained as a fallback for mobile browsers and responsive previews.
    if (Capacitor.isNativePlatform() || !window.visualViewport) {
      return;
    }

    const isPasswordFieldActive = this.step === 0.3;
    const isReferralFieldActive = this.step === 2 && !!this.focusedReferralField;
    if (!isPasswordFieldActive && !isReferralFieldActive) {
      return;
    }

    const viewport = window.visualViewport;
    const baseline = Math.max(this.visualViewportBaseline, window.innerHeight);
    const obscuredHeight = Math.max(0, Math.round(baseline - viewport.height - viewport.offsetTop));
    this.ngZone.run(() => {
      const keyboardHeight = obscuredHeight > 100 ? obscuredHeight : 0;
      if (isPasswordFieldActive) {
        this.setPasswordKeyboardState(keyboardHeight);
        if (keyboardHeight) {
          setTimeout(() => this.scrollPasswordFieldIntoView(), 60);
        }
      } else {
        this.referralKeyboardHeight = keyboardHeight;
        if (keyboardHeight) {
          setTimeout(() => this.scrollReferralControlsIntoView(), 60);
        }
      }

      if (!keyboardHeight) {
        this.referralKeyboardHeight = 0;
        if (isPasswordFieldActive) {
          this.setPasswordKeyboardState(0);
        }
        this.visualViewportBaseline = viewport.height;
      } else {
        this.visualViewportBaseline = Math.max(this.visualViewportBaseline, window.innerHeight);
      }
    });
  }

  private setPasswordKeyboardState(height: number): void {
    this.passwordKeyboardHeight = Math.max(0, Math.round(height));
    this.isPasswordKeyboardOpen = this.passwordKeyboardHeight > 0;
    if (!this.isPasswordKeyboardOpen) {
      this.focusedPasswordField = null;
    }
  }

  private scrollPasswordFieldIntoView(target: HTMLElement | null = this.focusedPasswordField): void {
    if (this.step !== 0.3 || !target || !this.ionContent) return;

    void this.ionContent.getScrollElement().then(scrollElement => {
      if (!target.isConnected) return;
      const targetRect = target.getBoundingClientRect();
      const scrollRect = scrollElement.getBoundingClientRect();
      const isConfirmation = target.id === 'signup-confirm-password';
      const preferredTop = isConfirmation
        ? Math.max(72, scrollElement.clientHeight * 0.18)
        : Math.max(96, scrollElement.clientHeight * 0.28);
      const nextScrollTop = Math.max(
        0,
        scrollElement.scrollTop + targetRect.top - scrollRect.top - preferredTop
      );
      void this.ionContent?.scrollToPoint(0, nextScrollTop, 220);
    }).catch(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private scrollReferralControlsIntoView(): void {
    const input = this.referralInput?.nativeElement;
    if (this.step !== 2 || !this.showReferral || !input || !this.ionContent) return;

    void this.ionContent.getScrollElement().then(scrollElement => {
      if (!input.isConnected) return;

      const inputRect = input.getBoundingClientRect();
      const scrollRect = scrollElement.getBoundingClientRect();
      const actionButton = input
        .closest('.profile-step--figma')
        ?.querySelector<HTMLElement>('.details-next-button');
      const actionRect = actionButton?.getBoundingClientRect();
      const contentBottom = Math.max(inputRect.bottom, actionRect?.bottom || inputRect.bottom);
      const visibleBottom = scrollRect.bottom - 18;
      const visibleTop = scrollRect.top + 64;
      let offset = 0;

      if (contentBottom > visibleBottom) {
        offset = contentBottom - visibleBottom;
      } else if (inputRect.top < visibleTop) {
        offset = inputRect.top - visibleTop;
      }

      if (Math.abs(offset) > 1) {
        void this.ionContent?.scrollToPoint(
          0,
          Math.max(0, scrollElement.scrollTop + offset),
          220
        );
      }
    }).catch(() => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private dismissPasswordKeyboard(): void {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement
      && activeElement.closest('.pwd-step')
    ) {
      activeElement.blur();
    }

    if (Capacitor.isNativePlatform()) {
      void Keyboard.hide().catch(() => undefined);
    }
    this.setPasswordKeyboardState(0);
  }

  protected readonly top = top;

  proceedWithPassword(): void {
    if (this.passwordForm.valid) {
      this.errorMessage = null; // Clear any previous errors
      this.signupCredentialState.setPassword(this.password?.value || '');
      this.onboardingState.setRegistrationStep(4);

      // First-launch users selected their role before entering credentials.
      // Other signup entry points still show role selection at this point.
      const savedRole = sessionStorage.getItem('signup_role');
      this.navigateToSignupStep(savedRole ? 2 : 1);
    } else {
      this.passwordForm.markAllAsTouched();
      this.core.triggerToasrt(this.getPasswordErrorMessage());
    }
  }

  /**
   * Assemble registration payload from session and current form values and call register API
   */
  registerFromSession(): void {
    if (this.registrationInProgress) {
      return;
    }

    this.errorMessage = null;

    // OAuth flow: user already has an account, just complete their profile
    if (this.isOAuthSignup) {
      const role = ((sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.roleSelected)!;
      this.completeGoogleOnboardingFlow(role);
      return;
    }

    this.registrationInProgress = true;
    this.loadingService.show();

    // Collect values from session and forms
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = this.signupCredentialState.getPassword() || this.password?.value;
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

    // Optional — omit entirely rather than defaulting to a value the user
    // never actually chose (toApiGender() always resolves to a real enum).
    const genderValue = profile.gender || this.gender;

    const payload: any = {
      name: profile.name || this.profileForm.get('name')?.value,
      username: profile.username || this.profileForm.get('username')?.value || undefined,
      ...(genderValue ? { gender: toApiGender(genderValue) } : {}),
      relationship: (role || '').toUpperCase(),
      password: password || undefined,
      avatarName: avatarNameValue,
      avatarImageName: avatarImageNameValue,
      // null (not '') when absent — an empty-string familyCode/familyName can
      // make the backend attempt (and fail) a lookup for a family that was
      // never actually requested, surfacing as "Resource not found".
      familyCode: familyCode || null,
      familyName: familyName || null,
      referralCode: referralCode || null,
      unlockPotential: false
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

      // Use the user's explicit tap-selection — never the carousel's current
      // scroll position, which can drift away from what was actually chosen
      // if the user swipes to browse after selecting.
      let petName = this.selectedPetIndex !== null
        ? this.pets[this.selectedPetIndex]?.apiName
        : this.currentImage?.apiName;

      // If no explicit selection in memory, fall back to session storage
      if (!petName) {
        petName = sessionStorage.getItem('signup_pet');
      }

      if (petName && role !== 'parent') {
        payload.petName = petName;
      }

    } catch (e) {
      console.error('Error setting pet name:', e);
      // If all else fails, don't set a pet name
    }

    this.onboardingState.saveRegistrationDraft(
      payload,
      payload.petName ? 5 : 4,
      payload.email ? 'EMAIL' : 'PHONE'
    );

    // Call register API
    this.authService.register(payload).subscribe({
      next: (resp) => {
        this.registrationInProgress = false;
        this.errorMessage = null; // Clear any previous errors
        const responseStep = this.getResponseOnboardingStep(resp);
        this.persistRegistrationPet(resp, payload);
        if (responseStep) {
          this.onboardingState.saveRegistrationDraft({
            ...payload,
            ...this.getRegistrationResponseDraft(resp),
            onboardingStep: responseStep
          }, responseStep, payload.email ? 'EMAIL' : 'PHONE');
        }

        const completedPassword = password || this.signupCredentialState.getPassword() || this.password?.value || '';
        if (this.shouldOpenUnlockPotentialStep(resp, responseStep, payload, !!payload.petName)) {
          this.loadingService.forceHide();
          this.navigateToSignupStep(5);
          return;
        }

        if (responseStep && responseStep >= 7) {
          this.finishCompletedRegistration(resp, payload, completedPassword);
          return;
        }

        // Save user profile to UserService (best-effort)
        this.userService.setUserProfile({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          gender: payload.gender?.toLowerCase() as SignupGender,
          dob: payload.dateOfBirth,
          avatarName: payload.avatarName,
          avatarUrl: this.getAvatarUrlFromSelection(profile.avatar || this.avatarSelected, payload.gender?.toLowerCase()),
          relationship: payload.relationship as 'CHILD' | 'PARENT' | 'SELF',
          pet: payload.petName
        });

        const passwordForLogin = password || this.signupCredentialState.getPassword() || this.password?.value || '';
        this.signupCredentialState.setPendingLogin({
          ...(payload.email ? { email: payload.email } : {}),
          ...(payload.phone ? { phone: payload.phone } : {}),
          password: passwordForLogin
        });

        // Clear signup session data
        try {
          sessionStorage.removeItem('signup_profile');
          sessionStorage.removeItem('signup_role');
          sessionStorage.removeItem('signup_avatar');
          sessionStorage.removeItem('requestedIdentifier');
          sessionStorage.removeItem('familyCode');
          sessionStorage.removeItem('familyName');
          sessionStorage.removeItem('familyCreator');
          sessionStorage.removeItem('referralCode');
          sessionStorage.removeItem('referralCodeLocked');
        } catch (e) { }

        // Keep device-level onboarding state separate from user session data.
        this.onboardingState.markExistingUser();

        // Attempt automatic login after registration (useful on mobile)
        const credentials: any = { password: passwordForLogin };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        // If we have credentials, try to login and route based on user relationship
        if (credentials.password && (credentials.email || credentials.phone)) {
          this.authService.login(credentials).subscribe({
            next: (loginResp) => {
              this.requestPasswordSavePrompt(credentials);
              this.signupCredentialState.clear();
              // Set family acknowledgment flag if user linked to a family
              try {
                const role = sessionStorage.getItem('signup_role') || this.roleSelected || '';
                const hasFamilyCode = !!sessionStorage.getItem('familyCode');
                const isCreator = sessionStorage.getItem('familyCreator') === 'true';
                if (role && role !== 'self' && (hasFamilyCode || isCreator)) {
                  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
                  sessionStorage.setItem('family_connected_ack', displayRole);
                }
              } catch {}
              const resume = this.onboardingState.getResumeNavigation(loginResp.user);
              if (resume) {
                this.loadingService.forceHide();
                void this.navCtrl.navigateRoot(resume.url, {
                  queryParams: resume.queryParams,
                  animated: false
                });
                return;
              }
              // After login, user session is set by AuthService
              // Navigate to appropriate dashboard with loader hidden
              const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
              setTimeout(() => {
                this.loadingService.forceHide();
                this.navigateReplacing(route);
              }, 50);
            },
            error: (loginErr) => {
              // If auto-login fails, fall back to login page
              console.error('Auto-login failed after registration', loginErr);
              this.core.triggerToasrt('Account created. Please login to continue.');
              setTimeout(() => {
                this.loadingService.forceHide();
                this.navigateReplacing('/home/login');
              }, 50);
            }
          });
        } else {
          // No credentials available - redirect to login
          setTimeout(() => {
            this.loadingService.forceHide();
            this.navigateReplacing('/home/login');
          }, 50);
        }
      },
      error: (err) => {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        const serverMsg = err?.error?.message || err?.error || 'Registration failed';
        const registrationMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
        if (this.handleUsernameRegistrationError(registrationMessage)) return;
        if (this.isRecoverableFamilyCapacityError(registrationMessage)) {
          this.errorMessage = registrationMessage;
          this.handleRecoverableFamilyJoinError(this.errorMessage);
          try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
          return;
        }
        // If registration failed because user already exists, try to login automatically
        const passwordForLogin = password || this.signupCredentialState.getPassword() || this.password?.value || '';
        const credentials: any = { password: passwordForLogin };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        if (credentials.password && (credentials.email || credentials.phone)) {
          this.authService.login(credentials).subscribe({
            next: (loginResponse) => {
              this.requestPasswordSavePrompt(credentials);
              this.signupCredentialState.clear();
              const resume = this.onboardingState.getResumeNavigation(loginResponse.user);
              if (resume) {
                this.loadingService.forceHide();
                void this.navCtrl.navigateRoot(resume.url, {
                  queryParams: resume.queryParams,
                  animated: false
                });
                return;
              }
              const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
              setTimeout(() => {
                this.loadingService.forceHide();
                this.navigateReplacing(route);
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
  public hideConfirmPassword: boolean = true;

  /**
   * Register a child/self account using session data and then navigate to welcome (step 5).
   */
  private completeGoogleOnboardingFlow(
    role: 'child' | 'parent' | 'self',
    unlockPotential = false
  ): void {
    this.registrationInProgress = true;
    this.errorMessage = null;
    this.loadingService.show();

    if (
      !environment.production
      && sessionStorage.getItem('oauth_signup_is_development_mock') === 'true'
    ) {
      this.registrationInProgress = false;
      this.core.triggerToasrt(
        'Apple development mock completed the UI flow. Backend submission was safely blocked.'
      );
      return;
    }

    const profileStr = sessionStorage.getItem('signup_profile');
    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) {}

    const provider  = (sessionStorage.getItem('oauth_signup_provider') || 'google') as 'google' | 'apple';
    const email = provider === 'apple'
      ? this.resolveAppleAccountEmail(
        sessionStorage.getItem('google_signup_email'),
        this.email?.value
      )
      : sessionStorage.getItem('google_signup_email') || this.email?.value;
    const providerId = sessionStorage.getItem('google_signup_provider_id') || '';
    const avatarUrl  = sessionStorage.getItem('google_signup_avatar') || '';
    const idToken    = sessionStorage.getItem('oauth_signup_id_token') || '';
    const accessToken = sessionStorage.getItem('oauth_signup_access_token') || '';
    const serverAuthCode = sessionStorage.getItem('oauth_signup_server_auth_code') || '';
    const identityToken = sessionStorage.getItem('oauth_signup_identity_token') || '';
    const authorizationCode = sessionStorage.getItem('oauth_signup_authorization_code') || '';
    const rawNonce = sessionStorage.getItem('oauth_signup_raw_nonce') || '';
    const clientId = sessionStorage.getItem('oauth_signup_client_id') || '';
    const avatarKey  = profile.avatar ?? this.avatarSelected ?? null;

    // Resolve avatar filename from the avatars list (e.g. "Image-Onboarding-Avatar-Female1.png")
    const foundAvatar = avatarKey ? this.avatars.find(a => a.key === avatarKey) : null;
    const avatarImageName = foundAvatar
      ? (foundAvatar.value.split('/').pop() ?? `Avatar ${Number(avatarKey)}`)
      : (avatarKey ? `Avatar ${Number(avatarKey)}` : undefined);

    const resolvedName = provider === 'apple'
      ? this.resolveAppleAccountName(
        profile.name,
        this.profileForm.get('name')?.value,
        sessionStorage.getItem('google_signup_name')
      )
      : profile.name || this.profileForm.get('name')?.value || sessionStorage.getItem('google_signup_name');

    if (provider === 'apple' && (!resolvedName || !email)) {
      this.registrationInProgress = false;
      this.loadingService.forceHide();
      this.errorMessage = !resolvedName
        ? 'We could not retrieve your name from Apple. Please try Sign in with Apple again.'
        : 'We could not retrieve your email from Apple. Please try Sign in with Apple again.';
      this.core.triggerToasrt(this.errorMessage);
      return;
    }

    const googlePayload: any = {
      provider,
      providerId,
      email,
      name:            resolvedName,
      avatarUrl,
      role:            role.toUpperCase(),          // backend uses "role", not "relationship"
      avatarName:      avatarKey ? `avatar${avatarKey}` : undefined,
      avatarImageName,
      referralCode:    sessionStorage.getItem('referralCode') || null
    };

    if (idToken) {
      googlePayload.idToken = idToken;
    }
    if (accessToken) {
      googlePayload.accessToken = accessToken;
    }
    if (serverAuthCode) {
      googlePayload.serverAuthCode = serverAuthCode;
    }
    if (identityToken) {
      googlePayload.identityToken = identityToken;
    }
    if (authorizationCode) {
      googlePayload.authorizationCode = authorizationCode;
    }
    if (rawNonce) {
      googlePayload.rawNonce = rawNonce;
    }
    if (clientId) {
      googlePayload.clientId = clientId;
    }

    // Gender and DOB are optional — Apple/Google never supply them, and
    // Sign In with Apple review requires we don't force them.
    const oauthGenderValue = profile.gender || this.gender;
    if (oauthGenderValue) {
      googlePayload.gender = toApiGender(oauthGenderValue);
    }

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
        const petName = foundPet?.name;
        if (petName) googlePayload.petName = petName;
      } catch (e) {}
    }

    if (unlockPotential) {
      googlePayload.unlockPotential = true;
    }

    if (!environment.production) {
      console.info('[OAuth signup] Submitting provider profile', {
        provider,
        providerId,
        hasEmail: !!email,
        hasName: !!googlePayload.name,
        hasIdentityToken: !!(googlePayload.identityToken || googlePayload.idToken),
        hasAuthorizationCode: !!googlePayload.authorizationCode,
        role
      });
    }

    // Use oauth2-login — it creates the user if new, returns a valid token
    this.authService.googleOAuthLogin(googlePayload).subscribe({
      next: (response) => {
        const responseStep = this.getResponseOnboardingStep(response);
        const responseUser = {
          ...(response?.user || {}),
          ...(responseStep ? { onboardingStep: responseStep } : {})
        };
        const userId = responseUser.id;
        if (response.token && userId) {
          this.authService.setSession(
            { token: response.token, userId, expiresIn: response.expiresIn, user: responseUser },
            false
          );
        } else if (Object.keys(responseUser).length) {
          this.authService.updateUserData(responseUser);
        }

        const responseData = this.getRegistrationResponseDraft(response);
        const responseDraft: RegistrationDraftData = {
          ...googlePayload,
          ...responseData,
          relationship: String(
            responseData.relationship || role
          ).toUpperCase(),
          asChild: role === 'child',
          ...(responseStep ? { onboardingStep: responseStep } : {})
        };
        if (responseStep) {
          this.onboardingState.saveRegistrationDraft(responseDraft, responseStep, 'EMAIL');
        }

        // An OAuth account already exists as soon as Apple/Google authenticates
        // it. Keep its OAuth credentials until activation is complete, so the
        // Pet and Unlock steps update that same account instead of calling
        // /auth/register and triggering duplicate email/phone validation.
        if (unlockPotential) {
          this.clearGoogleSignupSession();
          this.continueAfterUnlock(responseDraft);
          return;
        }

        if (role === 'child') {
          try {
            sessionStorage.setItem(SignupComponent.CHILD_POST_FAMILY_WELCOME_KEY, 'true');
          } catch (e) {}

          this.registrationInProgress = false;
          this.loadingService.forceHide();

          if (googlePayload.petName) {
            // Step 6 is the activation screen. Replacing the route prevents
            // the prior Pet page from flashing or returning via device Back.
            this.navigateToSignupStep(5);
            return;
          }

          void this.navCtrl.navigateRoot('/home/join-family', {
            queryParams: { role: 'child' },
            animated: false
          });
          return;
        }

        this.onboardingState.markExistingUser();
        this.clearGoogleSignupSession();
        const route = role === 'parent' ? '/authed/parent-account' : '/authed/user-dashboard';
        setTimeout(() => {
          this.registrationInProgress = false;
          this.loadingService.forceHide();
          this.navigateReplacing(route);
        }, 50);
      },
      error: (err) => {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        const serverMsg = err?.error?.message || 'Sign-up failed. Please try again.';
        this.errorMessage = serverMsg;
        this.handleRecoverableFamilyJoinError(serverMsg);
        try { this.core.triggerToasrt(this.errorMessage!); } catch (e) {}
      }
    });
  }

  private clearGoogleSignupSession(): void {
    try {
      ['signup_via_google', 'signup_via_oauth', 'oauth_signup_provider',
        'google_signup_email', 'google_signup_name',
        'google_signup_avatar', 'google_signup_provider_id',
        'oauth_signup_id_token', 'oauth_signup_access_token', 'oauth_signup_server_auth_code',
        'oauth_signup_identity_token', 'oauth_signup_authorization_code',
        'oauth_signup_raw_nonce', 'oauth_signup_client_id',
        'oauth_signup_is_development_mock',
        'signup_profile',
        'signup_role', 'signup_avatar', 'signup_pet', 'requestedIdentifier',
        'familyCode', 'familyName', 'familyCreator', 'referralCode', 'referralCodeLocked'].forEach(k => {
        sessionStorage.removeItem(k);
      });
    } catch (e) {}
  }

  private registerChildOrSelfFromSession(role: 'child' | 'self', includePet: boolean = false) {
    if (this.registrationInProgress) {
      return;
    }

    this.errorMessage = null;

    // OAuth flow: user already has an account, just complete their profile
    if (this.isOAuthSignup) {
      this.completeGoogleOnboardingFlow(role);
      return;
    }
    this.registrationInProgress = true;
    this.loadingService.show();

    // Collect values from session and forms (reuse registerFromSession logic)
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = this.signupCredentialState.getPassword() || this.password?.value;
    const persistedDraft = this.onboardingState.getRegistrationState()?.savedData || {};
    const identifier = this.requestedIdentifier
      || persistedDraft.email
      || persistedDraft.phone
      || this.email?.value
      || this.phone?.value;
    const referralCode = sessionStorage.getItem('referralCode');

    let profile: any = {};
    try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) { profile = {}; }

    // Determine avatar selection (prefer saved profile value, then current selection)
    const avatarKey2 = profile.avatar ?? this.avatarSelected ?? null;
    const avatarNameValue2 = avatarKey2 ? `avatar${avatarKey2}` : undefined;
    const avatarImageNameValue2 = avatarKey2 ? `Avatar ${Number(avatarKey2)}` : undefined;

    // Both 'self' and 'child' register as relationship SELF now — a UI role
    // of 'child' just additionally sets asChild:true, marking them "pending"
    // until they separately link to a family post-login via
    // /family/convert-to-child. No familyCode/familyRole is ever sent here.
    // Optional — omit entirely rather than defaulting to a value the user
    // never actually chose (toApiGender() always resolves to a real enum).
    const genderValue2 = profile.gender || persistedDraft.gender || this.gender;

    const payload: any = {
      name: profile.name || persistedDraft.name || this.profileForm.get('name')?.value,
      username: profile.username || persistedDraft.username || this.profileForm.get('username')?.value || undefined,
      ...(genderValue2 ? { gender: toApiGender(genderValue2) } : {}),
      relationship: 'SELF',
      password: password || undefined,
      avatarName: avatarNameValue2,
      avatarImageName: persistedDraft.avatarImageName || avatarImageNameValue2,
      referralCode: referralCode || null,
      unlockPotential: false
    };

    if (role === 'child') {
      payload.asChild = true;
    }

    // include email or phone depending on loginMode or identifier content
    if (this.loginMode === 'email' || (identifier && identifier.includes && identifier.includes('@'))) {
      payload.email = identifier;
      // Contact number collected on the profile step (separate from the
      // login identifier) — only relevant when they signed up via email.
      const profilePhoneVal = profile.phone || this.profileForm.get('phone')?.value;
      if (profilePhoneVal) {
        const contactCode = sessionStorage.getItem('countryCode') || this.selectedCountry.code;
        payload.phone = contactCode + profilePhoneVal;
      }
    } else {
      const contactNumber = sessionStorage.getItem('countryCode') || this.selectedCountry.code;
      payload.phone = contactNumber + identifier;
    }

    // dateOfBirth
    const dobValue = profile.dob || persistedDraft.dateOfBirth || this.profileForm.get('dob')?.value;
    if (dobValue) {
      const dobDate = new Date(dobValue);
      payload.dateOfBirth = dobDate.toISOString().split('T')[0];
    }

    if (includePet) {
      const petName = sessionStorage.getItem('signup_pet')
        || this.currentImage?.apiName
        || persistedDraft.petName;
      if (!petName) {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        this.core.triggerToasrt('Please choose your pet to continue.');
        return;
      }
      payload.petName = petName;

      if (role === 'child' && this.authService.getUserRelationship() === 'CHILD') {
        payload.relationship = 'CHILD';
        delete payload.asChild;
        const familyCode = this.authService.getUserData()?.family?.familyCode
          || persistedDraft.familyCode;
        if (familyCode) payload.familyCode = familyCode;
      }
    }

    this.onboardingState.saveRegistrationDraft(
      payload,
      includePet ? 5 : 4,
      payload.email ? 'EMAIL' : 'PHONE'
    );

    this.authService.register(payload).subscribe({
      next: (resp) => {
        this.registrationInProgress = false;
        const passwordForLogin = password || this.signupCredentialState.getPassword() || this.password?.value || '';
        this.signupCredentialState.setPendingLogin({
          ...(payload.email ? { email: payload.email } : {}),
          ...(payload.phone ? { phone: payload.phone } : {}),
          password: passwordForLogin
        });

        const responseStep = this.getResponseOnboardingStep(resp);
        this.persistRegistrationPet(resp, payload);
        if (responseStep) {
          this.onboardingState.saveRegistrationDraft(
            {
              ...payload,
              ...this.getRegistrationResponseDraft(resp),
              onboardingStep: responseStep
            },
            responseStep,
            payload.email ? 'EMAIL' : 'PHONE'
          );
        }

        if (this.shouldOpenUnlockPotentialStep(resp, responseStep, payload, includePet)) {
          this.loadingService.forceHide();
          this.navigateToSignupStep(5);
          return;
        }

        if (responseStep && responseStep >= 7) {
          this.finishCompletedRegistration(resp, payload, passwordForLogin);
          return;
        }

        if (!includePet && (responseStep === 5 || !responseStep)) {
          if (role === 'self') {
            this.loadingService.forceHide();
            this.navigateToSignupStep(4);
            return;
          }
          // Child keeps the established family-link-first sequence. Once the
          // family link succeeds, backend step 5 resumes at Pet selection.
        }

        if (includePet && responseStep === 5) {
          this.loadingService.forceHide();
          this.core.triggerToasrt('Your pet was not saved yet. Please try again.');
          return;
        }

        // Keep device-level onboarding state separate from user session data.
        this.onboardingState.markExistingUser();

        // Clear transient signup session data (keep login flow separate)
        try {
          sessionStorage.removeItem('signup_profile');
          sessionStorage.removeItem('signup_role');
          sessionStorage.removeItem('signup_avatar');
          sessionStorage.removeItem('requestedIdentifier');
          sessionStorage.removeItem('familyCode');
          sessionStorage.removeItem('familyName');
          sessionStorage.removeItem('familyCreator');
          sessionStorage.removeItem('referralCode');
          sessionStorage.removeItem('referralCodeLocked');
        } catch (e) { }

        if (role === 'child') {
          const credentials = this.signupCredentialState.getPendingLogin();
          if (!credentials?.password || (!credentials.email && !credentials.phone)) {
            this.loadingService.forceHide();
            this.navigateReplacing('/home/login');
            return;
          }

          // Family linking is authenticated. Log the newly registered child in
          // now, open Link with Your Family first, and reserve the welcome
          // screen until convert-to-child succeeds.
          this.authService.login(credentials).subscribe({
            next: () => {
              this.registrationInProgress = false;
              this.requestPasswordSavePrompt(credentials);
              this.signupCredentialState.clear();
              try {
                sessionStorage.setItem(SignupComponent.CHILD_POST_FAMILY_WELCOME_KEY, 'true');
              } catch (e) {}
              this.loadingService.forceHide();
              void this.navCtrl.navigateRoot('/home/join-family', {
                queryParams: {
                  role: 'child',
                  ...(this.managedChildFamilyCode
                    ? { scannedCode: this.managedChildFamilyCode }
                    : {})
                },
                animated: false
              });
            },
            error: () => {
              this.registrationInProgress = false;
              this.loadingService.forceHide();
              this.core.triggerToasrt('Account created. Please login to link your family.');
              this.navigateReplacing('/home/login');
            }
          });
          return;
        }

        // Self accounts keep the existing welcome-before-dashboard sequence.
        setTimeout(() => {
          this.registrationInProgress = false;
          this.loadingService.forceHide();
          this.navigateToSignupStep(5);
        }, 50);
      },
      error: (err) => {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        const serverMsg = err?.error?.message || err?.error || 'Registration failed';
        this.errorMessage = typeof serverMsg === 'string' ? serverMsg : 'Registration failed. Please try again.';
        if (this.handleUsernameRegistrationError(this.errorMessage)) return;
        this.handleRecoverableFamilyJoinError(this.errorMessage);
        try { this.core.triggerToasrt(this.errorMessage); } catch (e) { }
      }
    });
  }

  // Auto-login and redirect to dashboard
  onBegin() {
    // Prevent duplicate taps from firing multiple requests while the
    // unlockPotential update is in flight.
    if (this.registrationInProgress) {
      return;
    }

    const userData = this.authService.getUserData();
    if (userData?.['unlockPotential'] === true) {
      // Already unlocked server-side (e.g. resumed session) — no need to
      // send the update again.
      this.registrationInProgress = true;
      this.errorMessage = null;
      this.loadingService.show();
      this.continueAfterUnlock(userData);
      return;
    }

    if (this.isOAuthSignup) {
      const role = ((sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self')
        || this.roleSelected
        || this.currentRole) as 'child' | 'parent' | 'self';
      this.completeGoogleOnboardingFlow(role, true);
      return;
    }

    this.registrationInProgress = true;
    this.errorMessage = null;
    this.loadingService.show();

    const persistedDraft = this.onboardingState.getRegistrationState()?.savedData || {};
    let signupProfile: any = {};
    try {
      const profileStr = sessionStorage.getItem('signup_profile');
      signupProfile = profileStr ? JSON.parse(profileStr) : {};
    } catch (error) {
      signupProfile = {};
    }

    const payload: any = { unlockPotential: true };

    if (userData?.email) {
      payload.email = userData.email;
    } else if (userData?.phone) {
      payload.phone = userData.phone;
    } else {
      const identifier = this.getSignupCredentialIdentifier();
      if (identifier && identifier.includes('@')) {
        payload.email = identifier;
      } else if (identifier) {
        payload.phone = identifier;
      }
    }

    const resolvedName = userData?.name
      || signupProfile?.name
      || persistedDraft?.name
      || this.profileForm.get('name')?.value
      || '';
    if (resolvedName) {
      payload.name = resolvedName;
    }

    const resolvedUsername = userData?.username
      || signupProfile?.username
      || persistedDraft?.username
      || this.profileForm.get('username')?.value
      || '';
    if (resolvedUsername) {
      payload.username = resolvedUsername;
    }

    const resolvedGender = userData?.gender
      || signupProfile?.gender
      || persistedDraft?.gender
      || this.gender;
    if (resolvedGender) {
      payload.gender = toApiGender(resolvedGender);
    }

    const resolvedRelationship = userData?.relationship
      || persistedDraft?.relationship
      || (sessionStorage.getItem('signup_role') || this.roleSelected || '').toUpperCase();
    if (resolvedRelationship) {
      payload.relationship = resolvedRelationship;
    }

    const resolvedDob = userData?.dateOfBirth
      || userData?.dob
      || userData?.birthDate
      || signupProfile?.dob
      || persistedDraft?.dateOfBirth
      || persistedDraft?.dob
      || persistedDraft?.birthDate
      || this.profileForm.get('dob')?.value;
    if (resolvedDob) {
      const dobDate = new Date(resolvedDob);
      if (!isNaN(dobDate.getTime())) {
        payload.dateOfBirth = dobDate.toISOString().split('T')[0];
      }
    }

    this.authService.register(payload).subscribe({
      next: (response) => {
        const responseStep = this.getResponseOnboardingStep(response);
        const responseDraft: RegistrationDraftData = {
          ...payload,
          ...this.getRegistrationResponseDraft(response),
          unlockPotential: true,
          ...(responseStep ? { onboardingStep: responseStep } : {})
        };

        this.authService.updateUserData(responseDraft);

        if (this.onboardingState.isOnboardingComplete(responseDraft)) {
          this.onboardingState.clearRegistrationDraft();
          this.onboardingState.markExistingUser();
        } else if (responseStep) {
          this.onboardingState.saveRegistrationDraft(
            responseDraft,
            responseStep,
            payload.email ? 'EMAIL' : 'PHONE'
          );
        }

        // Keep this final register response as the authoritative onboarding
        // state. An immediate login can briefly return the previous step while
        // the backend finishes persisting unlockPotential.
        this.continueAfterUnlock(responseDraft);
      },
      error: (err) => {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
      }
    });
  }

  private continueAfterUnlock(completedUserData?: RegistrationDraftData): void {
    // Child users reach this welcome screen only after a successful family
    // link and are already logged in. Continue directly without a second login.
    if (this.authService.isLoggedIn()) {
      const finalizedUserData = this.applyCompletedUnlockState(completedUserData);
      if (this.beginManagedChildSignupAfterParentUnlock()) {
        return;
      }
      const resume = this.onboardingState.isOnboardingComplete(finalizedUserData)
        ? null
        : this.onboardingState.getResumeNavigation(this.authService.getUserData());
      if (resume) {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        void this.navCtrl.navigateRoot(resume.url, {
          queryParams: resume.queryParams,
          animated: false
        });
        return;
      }
      try {
        sessionStorage.removeItem(SignupComponent.CHILD_POST_FAMILY_WELCOME_KEY);
        sessionStorage.removeItem('signup_role');
        sessionStorage.removeItem('signup_pet');
      } catch (e) {}
      this.signupCredentialState.clear();
      this.registrationInProgress = false;
      this.loadingService.forceHide();
      const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
      this.navigateReplacing(route);
      return;
    }

    const isOAuth = this.isOAuthSignup;

    // OAuth users (Apple / Google) are already authenticated.
    if (isOAuth) {
      try {
        sessionStorage.removeItem('signup_via_google');
        sessionStorage.removeItem('signup_via_oauth');
        sessionStorage.removeItem('oauth_signup_id_token');
        sessionStorage.removeItem('oauth_signup_access_token');
        sessionStorage.removeItem('oauth_signup_server_auth_code');
        sessionStorage.removeItem('oauth_signup_identity_token');
        sessionStorage.removeItem('oauth_signup_authorization_code');
        sessionStorage.removeItem('oauth_signup_raw_nonce');
        sessionStorage.removeItem('oauth_signup_client_id');
        sessionStorage.removeItem('oauth_signup_is_development_mock');
      } catch (e) {}
      this.applyCompletedUnlockState(completedUserData);
      if (this.beginManagedChildSignupAfterParentUnlock()) {
        return;
      }
      this.registrationInProgress = false;
      this.loadingService.forceHide();
      const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
      this.navigateReplacing(route);
      return;
    }

    const credentials = this.resolveCompletedLoginCredentials(completedUserData);
    if (!credentials) {
      this.registrationInProgress = false;
      this.loadingService.forceHide();
      this.errorMessage = 'Your account was created, but automatic sign-in could not start. Please tap Unlock My Potential again.';
      return;
    }

    this.authService.login(credentials).subscribe({
      next: (loginResponse) => {
        if (!this.authService.isLoggedIn()) {
          this.registrationInProgress = false;
          this.loadingService.forceHide();
          this.errorMessage = 'Your account is ready, but automatic sign-in did not complete. Please tap Unlock My Potential again.';
          return;
        }

        // AuthService stores the login response before this callback. Reapply
        // the newer unlock response so a stale login payload cannot send the
        // completed parent back into onboarding.
        const finalizedUserData = this.applyCompletedUnlockState(completedUserData);
        if (this.beginManagedChildSignupAfterParentUnlock()) {
          return;
        }
        this.requestPasswordSavePrompt(credentials);
        this.signupCredentialState.clear();
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        const resume = this.onboardingState.isOnboardingComplete(finalizedUserData)
          ? null
          : this.onboardingState.getResumeNavigation(loginResponse.user);
        if (resume) {
          void this.navCtrl.navigateRoot(resume.url, {
            queryParams: resume.queryParams,
            animated: false
          });
          return;
        }
        const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
        this.navigateReplacing(route);
      },
      error: (error) => {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        this.errorMessage = error?.error?.message || 'Your account is ready, but automatic sign-in failed. Please tap Unlock My Potential again.';
      }
    });
  }

  private resolveCompletedLoginCredentials(
    completedUserData?: RegistrationDraftData
  ): { email?: string; phone?: string; password: string } | null {
    const pending = this.signupCredentialState.getPendingLogin();
    const draft = this.onboardingState.getRegistrationState()?.savedData || {};
    const currentUser = this.authService.getUserData() || {};
    const password = String(
      pending?.password
      || this.signupCredentialState.getPassword()
      || ''
    );
    const email = String(
      pending?.email
      || completedUserData?.email
      || currentUser?.email
      || draft?.email
      || ''
    ).trim();
    const phone = String(
      pending?.phone
      || completedUserData?.phone
      || currentUser?.phone
      || draft?.phone
      || ''
    ).trim();

    if (!password || (!email && !phone)) {
      return null;
    }

    const credentials = {
      ...(email ? { email } : {}),
      ...(!email && phone ? { phone } : {}),
      password
    };
    this.signupCredentialState.setPendingLogin(credentials);
    return credentials;
  }

  private beginManagedChildSignupAfterParentUnlock(): boolean {
    let shouldStart = false;
    let familyCode = '';

    try {
      shouldStart = sessionStorage.getItem(SignupComponent.CREATE_CHILD_AFTER_FAMILY_KEY) === 'true';
      familyCode = (
        sessionStorage.getItem(SignupComponent.MANAGED_CHILD_FAMILY_CODE_KEY)
        || ''
      ).trim().toUpperCase();
    } catch (error) {
      console.warn('[Signup] Unable to read managed child signup state', error);
    }

    if (!shouldStart || !familyCode) {
      return false;
    }

    this.onboardingState.clearRegistrationDraft();
    this.signupCredentialState.clear();
    this.signupForm.reset({ email: '', phone: '' });
    this.profileForm.reset({ name: '', username: '', phone: '', dob: '' });
    this.passwordForm.reset({ password: '', confirmPassword: '' });
    this.requestedIdentifier = null;
    this.roleSelected = 'child';
    this.gender = null;
    this.avatarSelected = null;
    this.errorMessage = null;
    this.registrationInProgress = false;
    this.loadingService.forceHide();
    this.managedChildFamilyCode = familyCode;

    try {
      [
        'signup_profile', 'signup_avatar', 'signup_pet', 'requestedIdentifier',
        'familyName', 'familyCreator', 'referralCode', 'referralCodeLocked'
      ].forEach(key => sessionStorage.removeItem(key));
      sessionStorage.removeItem(SignupComponent.CREATE_CHILD_AFTER_FAMILY_KEY);
      sessionStorage.setItem(SignupComponent.MANAGED_CHILD_SIGNUP_KEY, 'true');
      sessionStorage.setItem(SignupComponent.MANAGED_CHILD_FAMILY_CODE_KEY, familyCode);
      sessionStorage.setItem('signup_role', 'child');
      sessionStorage.setItem('familyCode', familyCode);
    } catch (error) {
      console.warn('[Signup] Unable to prepare managed child signup', error);
    }

    void this.navCtrl.navigateRoot('/home/sign-up', {
      queryParams: {
        step: 0.1,
        role: 'child',
        managedChild: true
      },
      animated: false
    });
    return true;
  }

  private applyCompletedUnlockState(
    completedUserData?: RegistrationDraftData
  ): RegistrationDraftData | undefined {
    if (!completedUserData) {
      return undefined;
    }

    // The only way to reach this handler is a successful final
    // `unlockPotential: true` update. Some responses briefly still report
    // step 6 while the backend persists step 7; treating that stale value as
    // incomplete sends a parent back to this screen instead of Home.
    const finalizedUserData: RegistrationDraftData = {
      ...completedUserData,
      unlockPotential: true,
      onboardingStep: 7
    };

    this.authService.updateUserData(finalizedUserData);
    if (this.onboardingState.isOnboardingComplete(finalizedUserData)) {
      this.onboardingState.clearRegistrationDraft();
      this.onboardingState.markExistingUser();
    }

    return finalizedUserData;
  }

  /**
   * Get avatar URL from avatar selection number
   */
  private getAvatarUrlFromSelection(avatarNumber: number, gender?: string): string {
    const parsedAvatarNumber = Number(avatarNumber);
    if (!Number.isInteger(parsedAvatarNumber) || parsedAvatarNumber < 1 || parsedAvatarNumber > 12) {
      return '/assets/app-assets/Default-avatar-home.svg';
    }

    const isFemaleAvatar = parsedAvatarNumber <= 6;
    const avatarIndex = isFemaleAvatar ? parsedAvatarNumber : parsedAvatarNumber - 6;
    const genderPrefix = isFemaleAvatar ? 'Female' : 'Male';
    return `/assets/Images-Transparent/Image-Onboarding-Avatar-${genderPrefix}${avatarIndex}.png`;
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
    const password = credentials.password;
    const identifier = credentials.email || credentials.phone;

    if (!identifier || !password) {
      return;
    }

    void this.credentialSaverService.save({
      identifier,
      password,
      mode: credentials.email ? 'email' : 'phone'
    });
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
          const savedGender = String(profile.gender).toLowerCase();
          if (savedGender === 'male' || savedGender === 'female' || savedGender === 'prefer_not_to_say') {
            this.gender = savedGender;
          }
        }
        if (profile?.avatar) {
          this.avatarSelected = profile.avatar;
        }
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

  private restorePersistedRegistrationState(): void {
    const registrationState = this.onboardingState.getRegistrationState();
    if (!registrationState) return;
    this.applyRegistrationDraft(registrationState.savedData);
  }

  private applyRegistrationDraft(savedData: RegistrationDraftData): void {
    if (!savedData) return;

    const role = this.onboardingState.getSignupRole(savedData);
    if (role) {
      this.roleSelected = role;
      try { sessionStorage.setItem('signup_role', role); } catch {}
    }

    const identifier = savedData.email || savedData.phone;
    if (identifier) {
      this.requestedIdentifier = identifier;
      this.loginMode = savedData.email ? 'email' : 'phone';
      this.signupForm.patchValue(
        savedData.email ? { email: savedData.email } : { phone: savedData.phone },
        { emitEvent: false }
      );
      try {
        sessionStorage.setItem('requestedIdentifier', identifier);
        sessionStorage.setItem('loginMode', this.loginMode);
      } catch {}
    }

    const storedGender = toStoredGender(savedData.gender);
    if (storedGender) {
      this.gender = storedGender;
    }

    const dateOfBirth = this.toDateInputValue(savedData.dateOfBirth);
    this.profileForm.patchValue({
      name: savedData.name || this.profileForm.get('name')?.value || '',
      username: savedData.username || this.profileForm.get('username')?.value || '',
      phone: savedData.phone || this.profileForm.get('phone')?.value || '',
      dob: dateOfBirth || this.profileForm.get('dob')?.value || ''
    }, { emitEvent: false });

    if (savedData.username) {
      this.usernameAvailability = 'available';
    }

    const avatarKey = this.extractAvatarKey(savedData.avatarImageName || savedData.avatarName);
    if (avatarKey) {
      this.avatarSelected = avatarKey;
    }

    const petName = savedData.petName;
    if (petName) {
      const petIndex = this.pets.findIndex(p => p.apiName === petName || p.name === petName);
      this.currentImage = petIndex >= 0 ? this.pets[petIndex] : null;
      this.currentSlideIndex = petIndex;
      this.selectedPetIndex = petIndex >= 0 ? petIndex : null;
      try { sessionStorage.setItem('signup_pet', petName); } catch {}
    } else if (petName === null) {
      this.currentImage = null;
      this.currentSlideIndex = -1;
      this.selectedPetIndex = null;
      try { sessionStorage.removeItem('signup_pet'); } catch {}
    }

    const savedReferralCode = String(savedData['referralCode'] || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase();
    if (savedReferralCode && !this.referralCode) {
      this.referralCode = savedReferralCode;
      this.showReferral = true;
      this.referralValidationStatus = null;
      this.validatedReferralCode = '';
      try { sessionStorage.setItem('referralCode', savedReferralCode); } catch {}
    }

    const profile = {
      name: savedData.name || '',
      username: savedData.username || undefined,
      phone: savedData.phone || undefined,
      dob: dateOfBirth || null,
      gender: storedGender,
      avatar: avatarKey || undefined
    };
    try { sessionStorage.setItem('signup_profile', JSON.stringify(profile)); } catch {}
  }

  private persistProfileDraft(profile: any): void {
    const role = this.currentRole;
    const avatarKey = Number(profile?.avatar);
    const avatar = Number.isInteger(avatarKey)
      ? this.avatars.find(item => item.key === avatarKey)
      : undefined;
    const dateOfBirth = this.toDateInputValue(profile?.dob);

    this.onboardingState.updateRegistrationDraft({
      email: this.loginMode === 'email' ? this.getSignupCredentialIdentifier() : undefined,
      phone: profile?.phone || undefined,
      name: profile?.name || undefined,
      username: profile?.username || undefined,
      gender: profile?.gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      relationship: role ? role.toUpperCase() : undefined,
      asChild: role === 'child',
      avatarName: avatarKey ? `avatar${avatarKey}` : undefined,
      avatarImageName: avatar?.value?.split('/').pop(),
      referralCode: this.showReferral && this.referralCode ? this.referralCode : null,
      onboardingStep: 4
    }, 4);
  }

  private refreshIncompleteAuthenticatedOnboarding(): void {
    if (!this.authService.isLoggedIn()) return;
    if (this.isEditingPendingChildOnboarding && this.step === 2) return;

    const localResume = this.onboardingState.getResumeNavigation(this.authService.getUserData());
    if (!localResume) return;

    this.subscription.add(
      this.authService.refreshUserData().subscribe({
        next: () => {
          const freshUser = this.authService.getUserData() as RegistrationDraftData | null;
          const freshStep = this.onboardingState.getOnboardingStep(freshUser);
          if (this.onboardingState.isOnboardingComplete(freshUser)) {
            this.onboardingState.clearRegistrationDraft();
            this.onboardingState.markExistingUser();
            this.navigateReplacing(this.authService.getDashboardRoute());
            return;
          }

          if (freshUser && freshStep) {
            this.onboardingState.saveRegistrationDraft(freshUser, freshStep);
            this.applyRegistrationDraft(freshUser);
          }

          const resume = this.onboardingState.getResumeNavigation(freshUser);
          const targetStep = Number(resume?.queryParams?.['step']);
          if (resume && Number.isFinite(targetStep) && targetStep !== this.step) {
            void this.navCtrl.navigateRoot(resume.url, {
              queryParams: resume.queryParams,
              animated: false
            });
          }
        },
        error: () => {
          // The persisted backend step is used immediately when offline.
        }
      })
    );
  }

  private getResponseOnboardingStep(response: any): number | null {
    const rawStep = response?.savedData?.onboardingStep
      ?? response?.user?.onboardingStep
      ?? response?.onboardingStep
      ?? response?.nextStep;
    const step = Number(rawStep);
    return Number.isInteger(step) && step >= 1 && step <= 7 ? step : null;
  }

  private getRegistrationResponseDraft(response: any): RegistrationDraftData {
    if (!response || typeof response !== 'object') {
      return {};
    }

    const {
      token: _token,
      expiresIn: _expiresIn,
      success: _success,
      message: _message,
      savedData,
      user,
      ...topLevelData
    } = response;

    return {
      ...topLevelData,
      ...(savedData || {}),
      ...(user || {})
    };
  }

  /**
   * The registration endpoint can return `petName` directly, whereas login
   * returns `user.pet`. Persist the authoritative response immediately so the
   * shared pet renderer switches before any dashboard navigation occurs.
   */
  private persistRegistrationPet(response: any, payload: any): void {
    const responseDraft = this.getRegistrationResponseDraft(response);
    const hasResponsePet = Object.prototype.hasOwnProperty.call(responseDraft, 'pet')
      || Object.prototype.hasOwnProperty.call(responseDraft, 'petName')
      || Object.prototype.hasOwnProperty.call(responseDraft, 'petType')
      || Object.prototype.hasOwnProperty.call(responseDraft, 'selectedPetName');

    if (hasResponsePet) {
      this.authService.updateUserData(responseDraft);
      return;
    }

    // Some older responses omit pet data even when the registration was
    // accepted. Preserve the user's explicit selection until a later login or
    // profile refresh returns the backend value.
    if (payload?.petName) {
      this.authService.updateUserData({ petName: payload.petName });
    }
  }

  private shouldOpenUnlockPotentialStep(
    response: any,
    responseStep: number | null,
    payload: any,
    includePet: boolean
  ): boolean {
    if (!includePet || responseStep !== 6) {
      return false;
    }

    const relationship = String(
      payload?.relationship
      || response?.relationship
      || response?.user?.relationship
      || ''
    ).toUpperCase();

    const isSelfFlow = relationship === 'SELF' && !payload?.asChild;
    const isChildPostFamilyFlow = (
      this.isPostFamilyChildPetStep
      || (
        relationship === 'CHILD'
        && sessionStorage.getItem(SignupComponent.CHILD_POST_FAMILY_WELCOME_KEY) === 'true'
      )
    );

    if (isChildPostFamilyFlow) {
      return true;
    }

    if (!isSelfFlow) {
      return false;
    }

    return !response?.token;
  }

  private finishCompletedRegistration(response: any, payload: any, password: string): void {
    const completeNavigation = () => {
      this.registrationInProgress = false;
      this.loadingService.forceHide();
      this.onboardingState.clearRegistrationDraft();
      this.onboardingState.markExistingUser();
      this.signupCredentialState.clear();
      this.navigateReplacing(this.authService.getDashboardRoute());
    };

    const responseUserId = response?.user?.id;
    if (response?.token && responseUserId) {
      this.authService.setSession({
        token: response.token,
        userId: responseUserId,
        expiresIn: response.expiresIn,
        user: response.user
      });
    }

    if (this.authService.isLoggedIn()) {
      completeNavigation();
      return;
    }

    const credentials: any = { password };
    if (payload.email) credentials.email = payload.email;
    if (payload.phone) credentials.phone = payload.phone;

    if (!credentials.password || (!credentials.email && !credentials.phone)) {
      this.registrationInProgress = false;
      this.loadingService.forceHide();
      this.onboardingState.clearRegistrationDraft();
      this.navigateReplacing('/home/login');
      return;
    }

    this.authService.login(credentials).subscribe({
      next: (loginResponse) => {
        const resume = this.onboardingState.getResumeNavigation(loginResponse.user);
        if (resume) {
          this.registrationInProgress = false;
          this.loadingService.forceHide();
          void this.navCtrl.navigateRoot(resume.url, {
            queryParams: resume.queryParams,
            animated: false
          });
          return;
        }
        this.requestPasswordSavePrompt(credentials);
        completeNavigation();
      },
      error: () => {
        this.registrationInProgress = false;
        this.loadingService.forceHide();
        this.onboardingState.clearRegistrationDraft();
        this.navigateReplacing('/home/login');
      }
    });
  }

  private extractAvatarKey(value: unknown): number | null {
    const matches = String(value || '').match(/(\d+)/g);
    if (!matches?.length) return null;
    const key = Number(matches[matches.length - 1]);
    return Number.isInteger(key) && key >= 1 && key <= 12 ? key : null;
  }

  private toDateInputValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    const date = new Date(value as string | number);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    let body = error?.error;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    return body?.message || body?.error?.message || (typeof body === 'string' ? body : fallback);
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
   * Parent role should not see the self/child-only pet selection step.
   * The shared welcome step is intentionally available after parent registration.
   */
  private enforceParentFlowRestrictions(): void {
    if (this.currentRole !== 'parent') {
      return;
    }

    const stepValue = Number(this.step);

    if (stepValue === 4) {
      const fallbackStep = 2;
      this.step = fallbackStep;
      this.router.navigate(['home/sign-up'], {
        queryParams: { step: fallbackStep },
        replaceUrl: true
      });
    }
  }
}
