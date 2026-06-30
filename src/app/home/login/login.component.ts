import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { CountriesService, Country } from "../../core/services/countries.service";
import { AuthService, LoginCredentials } from "../../core/services/auth.service";
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { UserService } from '../../core/services/user.service';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CredentialSaverService, SavedCredentials } from '../../core/services/credential-saver.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit, OnDestroy {
  public signInForm: FormGroup;
  public loginMode: 'email' | 'phone' = 'email';
  public hidePassword = true;
  public whatsappConsent = true;
  public loading = false;
  public loginError: string | null = null;
  public emailFocused = false;
  public passwordFocused = false;
  public phoneFocused = false;

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
  private returnUrl: string = '';

  public showSaveCredsPrompt = false;
  public closingSheet = false;
  private pendingNav = '';
  private pendingNewCreds: SavedCredentials | null = null;

  @ViewChild('passwordInput') passwordInputRef!: ElementRef<HTMLInputElement>;


  constructor(
    private fb: FormBuilder,
    private countriesService: CountriesService,
    private authService: AuthService,
    private userService: UserService,
    private childSelfImageService: ChildSelfImageService,
    private route: ActivatedRoute,
    private credentialSaverService: CredentialSaverService,
    private navCtrl: NavController
  ) {
    // Initialize with default country
    this.selectedCountry = this.countriesService.getDefaultCountry();
    this.signInForm = this.fb.group({
      // Email/phone validators are applied dynamically in switchMode()
      email: ['', [Validators.email]],
      password: ['', [Validators.required]],
      phone: ['', []],
    });
  }

  get email() {
    return this.signInForm.get('email');
  }

  get phone() {
    return this.signInForm.get('phone');
  }
  get password() {
    return this.signInForm.get('password');
  }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;

    // Apply validators depending on selected login mode
    if (mode === 'email') {
      this.email?.setValidators([Validators.required, Validators.email]);
      this.phone?.clearValidators();
      // clear phone value when switching to email
      this.phone?.setValue('');
    } else {
      this.phone?.setValidators([Validators.required]);
      this.email?.clearValidators();
      // clear email value when switching to phone
      this.email?.setValue('');
    }

    // Ensure Angular re-evaluates validity
    this.email?.updateValueAndValidity();
    this.phone?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.loading) {
      return;
    }

    // Only proceed when fields required for the active mode are valid
    if (this.isLoginFormValid()) {
      this.loading = true;
      this.loginError = null;

      const credentials: LoginCredentials = {
        password: this.signInForm.get('password')?.value
      };

      // Add either email or phone based on login mode
      if (this.loginMode === 'email') {
        credentials.email = this.signInForm.get('email')?.value;
      } else {
        // Format phone with country code
        const phoneNumber = this.signInForm.get('phone')?.value;
        credentials.phone = this.selectedCountry.code + phoneNumber;
      }

      console.log('[LoginComponent] Attempting login with credentials:', {
        mode: this.loginMode,
        email: credentials.email,
        phone: credentials.phone,
        hasPassword: !!credentials.password
      });

      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('[LoginComponent] Login successful', response);
          console.log('[LoginComponent] Token received:', !!response.token);
          console.log('[LoginComponent] UserId:', response.user?.id);
          console.log('[LoginComponent] User relationship:', response.user?.relationship);

          // Sync profile into UserService so components (parent-account, dashboard) get immediate data
            try {
              const user = response.user || {};
              // Resolve avatar via shared resolver (ignore server-provided avatar.url)
              const resolved = this.childSelfImageService.resolveAvatarFromUser(user);

              const dob = user.dateOfBirth !== undefined && user.dateOfBirth !== null
                ? String(user.dateOfBirth)
                : undefined;

              this.userService.setUserProfile({
                userId: user.id,
                name: user.name || '',
                email: user.email || undefined,
                phone: user.phone || undefined,
                dob,
                gender: user.gender ? (user.gender.toLowerCase() as 'male' | 'female') : undefined,
                avatarUrl: resolved.url || undefined,
                avatarName: user.avatar?.avatarName || undefined,
                relationship: (user.relationship || '').toUpperCase() as any
              });
              console.log('[LoginComponent] UserService profile synced:', this.userService.getUserProfile());
            } catch (e) {
              console.warn('[LoginComponent] Failed to sync user profile to UserService', e);
            }

          // Determine the appropriate dashboard route based on user relationship
          const dashboardRoute = this.authService.getDashboardRoute();
          const navigationTarget = this.returnUrl || dashboardRoute;

          // Build credential object for saving
          const saveMode = this.loginMode;
          const rawIdentifier = saveMode === 'email'
            ? (credentials.email || '')
            : (this.signInForm.get('phone')?.value || '');
          const credsToSave: SavedCredentials = {
            identifier: rawIdentifier,
            password: credentials.password || '',
            mode: saveMode,
            countryCode: saveMode === 'phone' ? this.selectedCountry.code : undefined
          };

          if (!this.credentialSaverService.shouldAskToSave()) {
            // Already opted in — update silently and navigate
            this.navCtrl.navigateRoot(navigationTarget).catch(() => {
              this.loading = false;
            });
          } else if (this.credentialSaverService.wasDismissed()) {
            // User previously said "Not now" — don't ask again, just navigate
            this.navCtrl.navigateRoot(navigationTarget).catch(() => {
              this.loading = false;
            });
          } else {
            // First time — ask user whether to save
            this.loading = false;
            this.pendingNav = navigationTarget;
            this.pendingNewCreds = credsToSave;
            this.showSaveCredsPrompt = true;
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('[LoginComponent] Login error', {
            status: error.status,
            error: error.error,
            url: error.url
          });

          // Extract backend message if present
          let backendMsg: string | null = null;
          if (error.error?.message) {
            backendMsg = error.error.message;
          } else if (typeof error.error === 'string' && error.error) {
            try {
              const parsed = JSON.parse(error.error);
              backendMsg = parsed?.message || parsed?.error?.message || null;
            } catch {
              backendMsg = error.error;
            }
          }

          if (error instanceof ProgressEvent || (error?.type === 'error' && error?.target)) {
            this.loginError = 'Network error. Please check your connection.';
          } else if (error.status === 0 || !error.status) {
            this.loginError = 'Cannot connect to server. Please check your connection.';
          } else if (backendMsg) {
            this.loginError = backendMsg;
          } else {
            this.loginError = 'Something went wrong (status ' + error.status + '). Please try again.';
          }
        }
      });
    }
  }

  ngOnInit(): void {
    // Get return URL from route parameters (don't set default here, will be determined after login)
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
    console.log('[LoginComponent] Return URL set to:', this.returnUrl || 'Will be determined after login');

    // Initialize login mode and its validators
    this.switchMode('email');
    console.log('LoginComponent initialized');

    this.credentialSaverService.clearLegacySavedCredentials();

    // Load countries from service
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
          console.log('Countries loaded:', countries.length);
        },
        error: (error) => {
          console.error('Error loading countries:', error);
          this.countries = [this.countriesService.getDefaultCountry()];
        }
      })
    );

    // Debug: check if flag is properly loaded
    console.log('Selected country flag:', this.selectedCountry.flag);
    console.log('Selected country code:', this.selectedCountry.code);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openCountryCodeModal(): void {
    if (this.loginMode === 'phone') {
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
    const phoneControl = this.signInForm.get('phone');
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

  // Handle phone input to ensure only numbers
  onPhoneInput(event: any): void {
    const input = event.target;
    const value = input.value;
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');

    // Update the form control with clean numeric value
    this.signInForm.patchValue({
      phone: numericValue
    });

    // Set cursor position to end
    setTimeout(() => {
      input.setSelectionRange(numericValue.length, numericValue.length);
    }, 0);
  }

  focusPassword(): void {
    this.passwordInputRef?.nativeElement?.focus();
  }

  onEmailAutofill(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.signInForm.get('email')?.setValue(val, { emitEvent: true });
    this.signInForm.get('email')?.markAsDirty();
  }

  onPasswordAutofill(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.signInForm.get('password')?.setValue(val, { emitEvent: true });
    this.signInForm.get('password')?.markAsDirty();
  }

  navigateToSignup(): void {
    this.navCtrl.navigateForward(['/home/sign-up'], { queryParams: { step: '0.1' } });
  }

  navigateToForgotPassword(): void {
    this.navCtrl.navigateForward(['/home/reset-password'], { queryParams: { mode: this.loginMode } });
  }

  isLoginFormValid(): boolean {
    if (this.loginMode === 'phone') {
      const phoneControl = this.signInForm.get('phone');
      const passwordControl = this.signInForm.get('password');
      const phoneValid = !!phoneControl && !!phoneControl.valid && this.isPhoneValid(phoneControl.value);
      const passwordValid = !!passwordControl && !!passwordControl.valid;
      return phoneValid && passwordValid;
    } else if (this.loginMode === 'email') {
      const emailValid = !!this.signInForm.get('email') && !!this.signInForm.get('email')!.valid;
      const passwordValid = !!this.signInForm.get('password') && !!this.signInForm.get('password')!.valid;
      return emailValid && passwordValid;
    }
    return false;
  }

  async onSaveCreds(): Promise<void> {
    if (this.pendingNewCreds) {
      await this.credentialSaverService.save(this.pendingNewCreds);
    }
    this.dismissSheetThenNavigate();
  }

  onSkipSaveCreds(): void {
    this.credentialSaverService.dismissPrompt();
    this.dismissSheetThenNavigate();
  }

  private dismissSheetThenNavigate(): void {
    this.closingSheet = true;
    setTimeout(() => {
      this.showSaveCredsPrompt = false;
      this.closingSheet = false;
      this.loading = true;
      this.navCtrl.navigateRoot(this.pendingNav).catch(() => {
        this.loading = false;
      });
    }, 260);
  }

}
