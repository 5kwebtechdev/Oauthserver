import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { CountriesService, Country } from "../../core/services/countries.service";
import { AuthService, LoginCredentials } from "../../core/services/auth.service";
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { UserService } from '../../core/services/user.service';
import { Router, ActivatedRoute } from '@angular/router';
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

  public showCountryCodeModal = false;
  public selectedCountry: Country;
  public countries: Country[] = [];
  private subscription = new Subscription();
  private returnUrl: string = '';

  public showSaveCredsPrompt = false;
  public autoFilledFromSave = false;
  private pendingNav = '';
  private pendingNewCreds: SavedCredentials | null = null;
  private pendingPhoneRestore: SavedCredentials | null = null;


  constructor(
    private fb: FormBuilder,
    private countriesService: CountriesService,
    private authService: AuthService,
    private userService: UserService,
    private childSelfImageService: ChildSelfImageService,
    private router: Router,
    private route: ActivatedRoute,
    private credentialSaverService: CredentialSaverService
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
          this.loading = false;
          this.requestPasswordSavePrompt(credentials);
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

          if (this.credentialSaverService.hasSaved()) {
            // Already opted in — update silently and proceed
            this.credentialSaverService.save(credsToSave);
            console.log('[LoginComponent] Navigating to:', navigationTarget);
            this.router.navigateByUrl(navigationTarget);
          } else {
            // First time — ask user whether to save
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

    // Auto-fill from saved credentials
    const saved = this.credentialSaverService.load();
    if (saved) {
      if (saved.mode === 'email') {
        this.switchMode('email');
        this.signInForm.patchValue({ email: saved.identifier, password: saved.password });
        this.signInForm.markAsDirty();
        this.autoFilledFromSave = true;
      } else {
        this.switchMode('phone');
        this.pendingPhoneRestore = saved;
      }
    }

    // Load countries from service
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
          console.log('Countries loaded:', countries.length);
          // Apply deferred phone restore once countries are available
          if (this.pendingPhoneRestore) {
            const restore = this.pendingPhoneRestore;
            this.pendingPhoneRestore = null;
            const matched = countries.find(c => c.code === restore.countryCode);
            if (matched) this.selectedCountry = matched;
            this.signInForm.patchValue({ phone: restore.identifier, password: restore.password });
            this.signInForm.markAsDirty();
            this.autoFilledFromSave = true;
          }
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

  goBack() {
    // Navigate to home page
    window.location.href = '/home';
    // Or, if you use Angular Router:
    // this.router.navigate(['/home']);
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

  onSaveCreds(): void {
    if (this.pendingNewCreds) {
      this.credentialSaverService.save(this.pendingNewCreds);
    }
    this.showSaveCredsPrompt = false;
    this.router.navigateByUrl(this.pendingNav);
  }

  onSkipSaveCreds(): void {
    this.showSaveCredsPrompt = false;
    this.router.navigateByUrl(this.pendingNav);
  }

  clearSavedCreds(): void {
    this.credentialSaverService.clear();
    this.autoFilledFromSave = false;
    this.signInForm.reset();
    this.switchMode('email');
  }

  private requestPasswordSavePrompt(credentials: LoginCredentials): void {
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
}
