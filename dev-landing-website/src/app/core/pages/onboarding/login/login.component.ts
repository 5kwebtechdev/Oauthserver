import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, LoginCredentials } from '../../../services/auth.service';
import { CountriesService, Country } from '../../../services/countries.service';
import { UserService } from '../../../services/user.service';
import { SocialMediaComponent } from '../../../components/social-media/social-media.component';
import { LogoComponent } from '../../../components/logo/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SocialMediaComponent, LogoComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  public signInForm: FormGroup;
  public loginMode: 'email' | 'phone' = 'email';
  public whatsappConsent = true;
  public rememberMe = false;
  public loading = false;
  public loginError: string | null = null;
  public hidePassword = true;

  public showCountryCodeModal = false;
  public selectedCountry: Country;
  public countries: Country[] = [];
  public activeSlide = 0;
  public readonly splashSlides = [
    {
      eyebrow: 'Focus Quest',
      title: 'Welcome back to your growth space.',
      description: 'Plan the day, build habits, and keep your pet growing with every small win.',
      image: 'assets/Landing/Images-Transparent/Image-Hero-Right.png'
    },
    {
      eyebrow: 'Daily Streaks',
      title: 'Turn routines into momentum.',
      description: 'Track habits, complete tasks, and make progress feel visible every day.',
      image: 'assets/Images-Transparent/Image-Home-GreatWork.png'
    },
    {
      eyebrow: 'Learn & Grow',
      title: 'A calmer way to learn life skills.',
      description: 'Explore quizzes, articles, reels, and challenges made for curious minds.',
      image: 'assets/Images-Transparent/Academy-Course-Thubmnail-Big.png'
    }
  ];
  private subscription = new Subscription();
  private returnUrl: string = '';
  private slideTimer?: ReturnType<typeof setInterval>;

  constructor(
    private fb: FormBuilder,
    private countriesService: CountriesService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.selectedCountry = { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' };
    this.signInForm = this.fb.group({
      email: ['', [Validators.email]],
      password: ['', [Validators.required]],
      phone: ['', []],
    });
  }

  get email() { return this.signInForm.get('email')!; }
  get phone() { return this.signInForm.get('phone')!; }
  get password() { return this.signInForm.get('password')!; }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;
    if (mode === 'email') {
      this.email?.setValidators([Validators.required, Validators.email]);
      this.phone?.clearValidators();
      this.phone?.setValue('');
    } else {
      this.phone?.setValidators([Validators.required]);
      this.email?.clearValidators();
      this.email?.setValue('');
    }
    this.email?.updateValueAndValidity();
    this.phone?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.isLoginFormValid()) {
      this.loading = true;
      this.loginError = null;

      const credentials: LoginCredentials = {
        password: this.signInForm.get('password')?.value,
        rememberMe: this.rememberMe
      };

      if (this.loginMode === 'email') {
        credentials.email = this.signInForm.get('email')?.value;
      } else {
        const phoneNumber = this.signInForm.get('phone')?.value;
        credentials.phone = this.selectedCountry.code + phoneNumber;
      }

      this.authService.login(credentials).subscribe({
        next: (response: any) => {
          this.loading = false;
          try {
            const user = response.user || response.admin || {};
            this.userService.setUserProfile({
              userId: user.id,
              name: user.name || user.fullName || '',
              email: user.email || undefined,
              phone: user.phone || undefined,
              dob: user.dateOfBirth || undefined,
              gender: user.gender ? (user.gender.toLowerCase() as 'male' | 'female') : undefined,
              avatarUrl: user.avatar?.url || undefined,
              avatarName: user.avatar?.avatarName || undefined,
              relationship: (user.relationship || '').toUpperCase() as any
            });
          } catch (e) {
            console.warn('[LoginComponent] Failed to sync user profile', e);
          }

          const dashboardRoute = this.authService.getDashboardRoute();
          const navigationTarget = this.returnUrl || dashboardRoute;
          this.router.navigateByUrl(navigationTarget);
        },
        error: (error) => {
          this.loading = false;
          if (error instanceof ProgressEvent || (error && error.type === 'error' && error.target)) {
            this.loginError = 'Network error. Cannot reach server. Check connection and server availability.';
          } else if (error.status === 401 || error.status === 403) {
            this.loginError = error.error?.message || 'Invalid email/phone or password. Please try again.';
          } else if (error.status === 404) {
            this.loginError = 'User not found. Please check your credentials.';
          } else if (error.status === 0 || !error.status) {
            this.loginError = 'Cannot connect to server at: ' + (error.url || 'API endpoint');
          } else if (error.error?.message) {
            this.loginError = error.error.message;
          } else if (typeof error.error === 'string') {
            try {
              const parsed = JSON.parse(error.error);
              this.loginError = parsed?.message || parsed?.error?.message || error.error;
            } catch (e) {
              this.loginError = error.error;
            }
          } else {
            this.loginError = 'Error (status ' + error.status + '). Please try again.';
          }
        }
      });
    }
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
    this.switchMode('email');
    this.startSplashSlider();

    this.subscription.add(
      this.countriesService.getCountries().subscribe({
        next: (countries) => {
          this.countries = countries;
          const defaultCountry = countries.find(c => c.iso === 'IN');
          if (defaultCountry) this.selectedCountry = defaultCountry;
        },
        error: (error) => {
          console.error('Error loading countries:', error);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
  }

  setActiveSlide(index: number): void {
    this.activeSlide = index;
  }

  openCountryCodeModal(): void {
    if (this.loginMode === 'phone') {
      this.showCountryCodeModal = true;
    }
  }

  closeCountryCodeModal(): void {
    this.showCountryCodeModal = false;
  }

  get currentPhoneLength(): number {
    return this.selectedCountry.phoneLength;
  }

  isPhoneValid(phoneValue: string): boolean {
    if (!phoneValue) return false;
    const cleanPhone = phoneValue.replace(/\D/g, '');
    return cleanPhone.length === this.currentPhoneLength;
  }

  getPhoneErrorMessage(): string {
    return `Please enter a valid ${this.currentPhoneLength} digit phone number for ${this.selectedCountry.name}`;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.showCountryCodeModal = false;
    const phoneControl = this.signInForm.get('phone');
    if (phoneControl) {
      phoneControl.markAsUntouched();
      phoneControl.updateValueAndValidity();
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  onPhoneInput(event: any): void {
    const input = event.target;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    this.signInForm.patchValue({ phone: numericValue });
    setTimeout(() => {
      input.setSelectionRange(numericValue.length, numericValue.length);
    }, 0);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  goHome() {
    this.router.navigate(['/']);
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

  private startSplashSlider(): void {
    this.slideTimer = setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % this.splashSlides.length;
    }, 4200);
  }
}
