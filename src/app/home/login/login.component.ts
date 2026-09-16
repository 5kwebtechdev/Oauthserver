import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService, LoginCredentials } from "../../core/services/auth.service";
import { ChildSelfImageService } from '../../core/services/child-self-image.service';
import { UserService } from '../../core/services/user.service';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { CredentialSaverService, SavedCredentials } from '../../core/services/credential-saver.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { SocialMediaComponent } from '../../core/components/social-media/social-media.component';
import { AuthBackButtonComponent } from '../../core/components/auth-back-button/auth-back-button.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    SocialMediaComponent,
    AuthBackButtonComponent,
  ],
})
export class LoginComponent implements OnInit, OnDestroy {
  public signInForm: FormGroup;
  public readonly loginMode = 'email' as const;
  public hidePassword = true;
  public whatsappConsent = true;
  public loading = false;
  public loginError: string | null = null;
  public hasLoggedInBefore = false;
  private returnUrl: string = '';

  @ViewChild('passwordInput') passwordInputRef!: ElementRef<HTMLInputElement>;


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private childSelfImageService: ChildSelfImageService,
    private route: ActivatedRoute,
    private credentialSaverService: CredentialSaverService,
    private navCtrl: NavController,
    private onboardingState: OnboardingStateService
  ) {
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get email() {
    return this.signInForm.get('email');
  }

  get password() {
    return this.signInForm.get('password');
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
        email: this.signInForm.get('email')?.value,
        password: this.signInForm.get('password')?.value
      };

      console.log('[LoginComponent] Attempting login with credentials:', {
        mode: 'email',
        email: credentials.email,
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
                gender: user.gender
                  ? (user.gender.toLowerCase() as 'male' | 'female' | 'prefer_not_to_say')
                  : undefined,
                avatarUrl: resolved.url || undefined,
                avatarName: user.avatar?.avatarName || undefined,
                avatarImageName: (user as any).avatarImageName || (user.avatar as any)?.avatarImageName || undefined,
                relationship: (user.relationship || '').toUpperCase() as any
              });
              console.log('[LoginComponent] UserService profile synced:', this.userService.getUserProfile());
            } catch (e) {
              console.warn('[LoginComponent] Failed to sync user profile to UserService', e);
            }

          const onboardingResume = this.onboardingState.getResumeNavigation(response.user);
          if (!onboardingResume) {
            this.onboardingState.markExistingUser();
            const onboardingStep = this.onboardingState.getOnboardingStep(response.user);
            if (this.onboardingState.isOnboardingComplete(response.user)) {
              this.onboardingState.clearRegistrationDraft();
            }
          }

          // Incomplete onboarding always wins over a returnUrl or dashboard
          // deep link. The main app is reachable only after backend step 7.
          const dashboardRoute = this.authService.getDashboardRoute();
          const navigationTarget = this.returnUrl || dashboardRoute;

          const credsToSave: SavedCredentials = {
            identifier: credentials.email || '',
            password: credentials.password || '',
            mode: 'email'
          };

          void this.credentialSaverService.save(credsToSave).finally(() => {
            const navigation = onboardingResume
              ? this.navCtrl.navigateRoot(onboardingResume.url, {
                  queryParams: onboardingResume.queryParams,
                  animated: false
                })
              : this.navCtrl.navigateRoot(navigationTarget);

            navigation.catch(() => {
              this.loading = false;
            });
          });
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

    this.hasLoggedInBefore = localStorage.getItem('has_logged_in_before') === 'true';

    console.log('LoginComponent initialized');
    void this.suggestSavedCredentials();

    // ion-router-outlet is capped to a centered readable column on tablet/
    // desktop by default (see global.scss); this page builds its own wide
    // web background, so it needs the same full-bleed outlet reset HomePage
    // uses (body.onboarding-active) or that column cap leaves white gutters
    // down both sides of this page's background regardless of its own CSS.
    document.body.classList.add('onboarding-active');

    const capacitor = (window as any).Capacitor;
    const isNativeShell = window.location.protocol === 'capacitor:' ||
      !!(capacitor?.isNativePlatform?.());
    if (!isNativeShell) {
      document.body.classList.add('login-web-full-bleed');
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('onboarding-active');
    document.body.classList.remove('login-web-full-bleed');
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
    this.returnToRoleSelection();
  }

  goBack(): void {
    this.returnToRoleSelection();
  }

  navigateToForgotPassword(): void {
    this.navCtrl.navigateForward(['/forgot-password'], { queryParams: { mode: 'email' } });
  }

  isLoginFormValid(): boolean {
    return !!this.email?.valid && !!this.password?.valid;
  }

  private async suggestSavedCredentials(): Promise<void> {
    const credentials = await this.credentialSaverService.suggest();
    if (!credentials) {
      return;
    }

    if (credentials.mode !== 'email') {
      return;
    }

    this.signInForm.patchValue({
      email: credentials.identifier,
      password: credentials.password
    });
  }

  private returnToRoleSelection(): void {
    this.onboardingState.resetRoleSelection();
    void this.navCtrl.navigateRoot('/signup', {
      queryParams: { step: 1 },
      animated: false
    });
  }

}
