import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { CountriesService, Country } from "../../core/services/countries.service";
import { AuthService, LoginCredentials } from "../../core/services/auth.service";
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

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
  private returnUrl: string = '/authed/user-dashboard';


  constructor(
    private fb: FormBuilder,
    private countriesService: CountriesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize with default country
    this.selectedCountry = this.countriesService.getDefaultCountry();
    this.signInForm = this.fb.group({
      // Email/phone validators are applied dynamically in switchMode()
      email: ['', [Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
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
        // credentials.phone = phoneNumber;
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
          console.log('[LoginComponent] Login successful', response);
          console.log('[LoginComponent] Token received:', !!response.token);
          console.log('[LoginComponent] UserId:', response.userId);

          // Navigate to return URL if available, otherwise go to dashboard
          console.log('[LoginComponent] Navigating to:', this.returnUrl);
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          this.loading = false;
          console.error('[LoginComponent] Login error', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });

          // Handle different error scenarios
          if (error.status === 401) {
            this.loginError = 'Invalid email/phone or password. Please try again.';
          } else if (error.status === 404) {
            this.loginError = 'User not found. Please check your credentials.';
          } else if (error.status === 0) {
            this.loginError = 'Cannot connect to server. Please check your internet connection.';
          } else {
            this.loginError = 'An error occurred during login. Please try again later.';
          }
        }
      });
    }
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/authed/user-dashboard';
    console.log('[LoginComponent] Return URL set to:', this.returnUrl);

    // Initialize login mode and its validators
    this.switchMode('phone');
    console.log('LoginComponent initialized');

    // Load countries from service
    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
          console.log('Countries loaded:', countries.length);
        },
        error: (error) => {
          console.error('Error loading countries:', error);
          // Fallback to default country if loading fails
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
}
