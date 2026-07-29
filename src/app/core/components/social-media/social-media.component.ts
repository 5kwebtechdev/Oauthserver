import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, Platform, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthSessionCleanupService } from '../../services/auth-session-cleanup.service';
import { CrashlyticsService } from '../../services/crashlytics.service';
import { OnboardingStateService } from '../../services/onboarding-state.service';

type OAuthProviderName = 'google' | 'apple';

type GoogleOAuthProfile = {
  provider: 'google';
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
  idToken: string;
  accessToken?: string;
  serverAuthCode?: string;
};

type OAuthSignupSessionData = {
  email: string;
  name: string;
  avatarUrl: string;
  providerId: string;
  idToken?: string;
  accessToken?: string;
  serverAuthCode?: string;
};

@Component({
  selector: 'social-media',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './social-media.component.html',
  styleUrls: ['./social-media.component.scss']
})
export class SocialMediaComponent implements OnInit {
  @Input() variant?: string;
  isIos = false;
  isSocialLoginInProgress = false;

  links = [
    { name: 'facebook', label: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/SuperMeAppOfficial' },
    { name: 'instagram', label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/supermeappofficial' },
    { name: 'youtube', label: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@SuperMeApp' },
    { name: 'x', label: 'X', icon: 'x', url: 'https://x.com/GetSuperMeApp' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private platform: Platform,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private analytics: AnalyticsService,
    private authSessionCleanup: AuthSessionCleanupService,
    private crashlytics: CrashlyticsService,
    private onboardingState: OnboardingStateService
  ) {}

  ngOnInit() {
    // Include iPad — platform.is('ios') may not catch iPadOS in some Capacitor versions
    this.isIos = this.platform.is('ios') || this.platform.is('ipad');
  }

  open(link: { name: string; url?: string }) {
    if (this.isSocialLoginInProgress && (link.name === 'google' || link.name === 'apple')) {
      return;
    }

    if (link.name === 'google' && this.variant === 'login-with') {
      this.signInWithGoogle();
      return;
    }
    if (link.name === 'apple' && this.variant === 'login-with') {
      this.signInWithApple();
      return;
    }
    if (link.url) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  private async signInWithGoogle(): Promise<void> {
    const isNative = this.platform.is('capacitor') || this.platform.is('android');

    if (!isNative) {
      const toast = await this.toastCtrl.create({
        message: 'Google sign-in is only available in the mobile app.',
        duration: 2500,
        position: 'bottom'
      });
      await toast.present();
      return;
    }

    if (this.isSocialLoginInProgress) return;
    this.isSocialLoginInProgress = true;

    const loading = await this.loadingCtrl.create({ message: 'Signing in with Google...' });
    await loading.present();

    try {
      await this.authSessionCleanup.prepareGoogleSignIn();

      const googleUser = await GoogleAuth.signIn();
      const googleProfile = this.buildGoogleOAuthProfile(googleUser);
      console.log('[SocialMedia] Google user:', JSON.stringify({
        ...googleProfile,
        idToken: googleProfile.idToken ? '[present]' : '[missing]',
        accessToken: googleProfile.accessToken ? '[present]' : '[missing]',
        serverAuthCode: googleProfile.serverAuthCode ? '[present]' : '[missing]'
      }));

      // Register the user in Firebase Authentication so they appear in the
      // Firebase console. This is independent of the backend auth flow and
      // fails silently if Firebase is not yet initialized.
      await this.registerWithFirebaseAuth(googleUser);

      this.authService.checkEmailExists(googleProfile.email).subscribe({
        next: (res) => {
          if (res.exists) {
            this.loginWithOAuthProfile(googleProfile, loading, 'google');
          } else {
            void this.finishSocialLogin(loading);
            this.storeOAuthSignupSession('google', googleProfile);
            this.analytics.logSignUp('google');
            this.router.navigate(['home/sign-up'], { queryParams: { step: 1 }, replaceUrl: true });
          }
        },
        error: async (err) => {
          await this.finishSocialLogin(loading);
          console.error('[SocialMedia] Email check error:', err);
          this.crashlytics.recordException(err, {
            provider: 'google',
            stage: 'checkEmailExists'
          });
          const toast = await this.toastCtrl.create({
            message: 'Unable to verify account. Please try again.',
            duration: 3000,
            position: 'bottom'
          });
          await toast.present();
        }
      });
    } catch (err: any) {
      await this.finishSocialLogin(loading);
      const normalizedError = this.normalizeGoogleSignInError(err);
      console.error('[SocialMedia] Google signIn error:', normalizedError.debugDetails, err);
      this.crashlytics.log(`[Google Sign-In] ${normalizedError.debugDetails}`);
      this.crashlytics.recordException(err, {
        provider: 'google',
        stage: 'signIn',
        code: normalizedError.code || '',
        message: normalizedError.message
      });

      if (!normalizedError.cancelled) {
        const toast = await this.toastCtrl.create({
          message: normalizedError.userMessage,
          duration: 4500,
          position: 'bottom'
        });
        await toast.present();
      }
    }
  }

  private async signInWithApple(): Promise<void> {
    // Use the same iPad-inclusive check as the button's *ngIf (see isIos above) —
    // platform.is('ios') alone can miss iPadOS in some Capacitor versions, which
    // would otherwise make this button silently do nothing on iPad.
    if (!this.isIos) return;
    if (this.isSocialLoginInProgress) return;
    this.isSocialLoginInProgress = true;

    const loading = await this.loadingCtrl.create({ message: 'Signing in with Apple...' });
    await loading.present();

    try {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in') as any;
      const result = await SignInWithApple.authorize({
        clientId: 'com.supermeapp.app',
        redirectURI: '',
        scopes: 'email name',
        state: '',
        nonce: ''
      });

      const appleUser = result?.response;
      if (!appleUser?.identityToken) {
        throw new Error('Apple sign-in did not return an identity token.');
      }

      const providerId = appleUser.user || '';
      const email = (appleUser.email || '').trim();
      const givenName = appleUser.givenName || '';
      const familyName = appleUser.familyName || '';
      const name = [givenName, familyName].filter(Boolean).join(' ') || email || 'Apple User';

      try {
        if (getApps().length) {
          const provider = new OAuthProvider('apple.com');
          const credential = provider.credential({ idToken: appleUser.identityToken });
          await signInWithCredential(getAuth(getApp()), credential);
        }
      } catch (fbErr) {
        console.warn('[SocialMedia] Firebase Apple sign-in (non-fatal):', fbErr);
      }

      if (!providerId) {
        throw new Error('Apple sign-in did not return a user ID.');
      }

      const appleProfile = { provider: 'apple', providerId, email, name, avatarUrl: '' };

      if (!email) {
        this.attemptAppleProviderLogin(appleProfile, loading);
        return;
      }

      this.authService.checkEmailExists(email).subscribe({
        next: (res) => {
          if (res.exists) {
            this.loginWithOAuthProfile(appleProfile, loading, 'apple');
          } else {
            void this.finishSocialLogin(loading);
            this.storeOAuthSignupSession('apple', { email, name, avatarUrl: '', providerId });
            this.analytics.logSignUp('apple');
            this.router.navigate(['home/sign-up'], { queryParams: { step: 1 }, replaceUrl: true });
          }
        },
        error: async () => {
          await this.finishSocialLogin(loading);
          const toast = await this.toastCtrl.create({
            message: 'Unable to verify account. Please try again.',
            duration: 3000,
            position: 'bottom'
          });
          await toast.present();
        }
      });
    } catch (err: any) {
      await this.finishSocialLogin(loading);
      const cancelled = err?.message?.includes('cancel') || err?.message?.includes('dismiss');
      if (!cancelled) {
        const toast = await this.toastCtrl.create({
          message: err?.message || 'Apple sign-in failed. Please try again.',
          duration: 3000,
          position: 'bottom'
        });
        await toast.present();
      }
    }
  }

  /**
   * Apple withheld email/name on this authorization (not the user's first
   * grant to this app). Try logging in by providerId alone; if no account is
   * linked yet, fall back to asking for an email instead of dead-ending.
   */
  private async attemptAppleProviderLogin(appleProfile: any, loading: any): Promise<void> {
    this.authService.googleOAuthLogin(appleProfile).subscribe({
      next: async (response) => {
        await this.finishSocialLogin(loading);
        const userId = response.user?.id;
        if (response.token && userId) {
          this.authService.setSession(
            { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
            false
          );
          this.analytics.logLogin('apple');
          this.analytics.setUserId(String(userId));
          this.router.navigate([this.authService.getDashboardRoute()], { replaceUrl: true });
          return;
        }
        await this.promptForAppleEmail(appleProfile.providerId, appleProfile.name);
      },
      error: async () => {
        await this.finishSocialLogin(loading);
        await this.promptForAppleEmail(appleProfile.providerId, appleProfile.name);
      }
    });
  }

  private async promptForAppleEmail(providerId: string, name: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Almost there',
      message: "Apple didn't share an email for this sign-in. Enter your email to continue creating your account.",
      inputs: [{ name: 'email', type: 'email', placeholder: 'Email address' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Continue',
          handler: (data) => {
            const email = (data?.email || '').trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return false;
            }
            this.storeOAuthSignupSession('apple', { email, name: name || email, avatarUrl: '', providerId });
            this.analytics.logSignUp('apple');
            this.router.navigate(['home/sign-up'], { queryParams: { step: 1 }, replaceUrl: true });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private loginWithOAuthProfile(
    profile: any,
    loading: any,
    provider: OAuthProviderName,
    fallbackMessage?: string
  ): void {
    this.authService.googleOAuthLogin(profile).subscribe({
      next: async (response) => {
        await this.finishSocialLogin(loading);
        const userId = response.user?.id;
        if (response.token && userId) {
          this.authService.setSession(
            { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
            false
          );
          this.analytics.logLogin(provider);
          this.analytics.setUserId(String(userId));

          const onboardingResume = this.onboardingState.getResumeNavigation(response.user);
          if (onboardingResume) {
            this.router.navigate([onboardingResume.url], {
              queryParams: onboardingResume.queryParams,
              replaceUrl: true
            });
          } else {
            this.onboardingState.markExistingUser();
            this.router.navigate([this.authService.getDashboardRoute()], { replaceUrl: true });
          }
          return;
        }

        console.error('[SocialMedia] OAuth login response missing token or userId:', response);
        await this.presentToast('Sign-in failed: invalid server response. Please try again.');
      },
      error: async (err) => {
        await this.finishSocialLogin(loading);
        console.error('[SocialMedia] OAuth login error:', err);
        this.crashlytics.recordException(err, {
          provider,
          stage: 'oauthLogin'
        });
        await this.presentToast(
          err?.error?.message || fallbackMessage || `${this.getProviderLabel(provider)} sign-in failed. Please try again.`
        );
      }
    });
  }

  private storeOAuthSignupSession(
    provider: OAuthProviderName,
    data: OAuthSignupSessionData
  ): void {
    try {
      sessionStorage.setItem('signup_via_google', 'true');
      sessionStorage.setItem('signup_via_oauth', 'true');
      sessionStorage.setItem('oauth_signup_provider', provider);
      sessionStorage.setItem('google_signup_email', data.email);
      sessionStorage.setItem('google_signup_name', data.name);
      sessionStorage.setItem('google_signup_avatar', data.avatarUrl);
      sessionStorage.setItem('google_signup_provider_id', data.providerId);

      if (data.idToken) {
        sessionStorage.setItem('oauth_signup_id_token', data.idToken);
      } else {
        sessionStorage.removeItem('oauth_signup_id_token');
      }

      if (data.accessToken) {
        sessionStorage.setItem('oauth_signup_access_token', data.accessToken);
      } else {
        sessionStorage.removeItem('oauth_signup_access_token');
      }

      if (data.serverAuthCode) {
        sessionStorage.setItem('oauth_signup_server_auth_code', data.serverAuthCode);
      } else {
        sessionStorage.removeItem('oauth_signup_server_auth_code');
      }

      sessionStorage.setItem('requestedIdentifier', data.email);
    } catch (e) {}
  }

  private async finishSocialLogin(loading: any): Promise<void> {
    this.isSocialLoginInProgress = false;
    try {
      await loading?.dismiss();
    } catch (e) {}
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }

  private getProviderLabel(provider: OAuthProviderName): string {
    return provider === 'apple' ? 'Apple' : 'Google';
  }

  private buildGoogleOAuthProfile(googleUser: any): GoogleOAuthProfile {
    const providerId = String(googleUser?.id || '').trim();
    const email = String(googleUser?.email || '').trim();
    const name = String(
      googleUser?.name || `${googleUser?.givenName || ''} ${googleUser?.familyName || ''}`
    ).trim();
    const avatarUrl = String(googleUser?.imageUrl || '').trim();
    const idToken = String(googleUser?.authentication?.idToken || googleUser?.idToken || '').trim();
    const accessToken = String(googleUser?.authentication?.accessToken || '').trim();
    const serverAuthCode = String(googleUser?.serverAuthCode || '').trim();

    if (!providerId || !email) {
      throw new Error('Google sign-in did not return user ID or email.');
    }

    if (!idToken) {
      throw new Error(
        'Google sign-in did not return an ID token. Please verify the Google OAuth configuration.'
      );
    }

    return {
      provider: 'google',
      providerId,
      email,
      name: name || email,
      avatarUrl,
      idToken,
      ...(accessToken ? { accessToken } : {}),
      ...(serverAuthCode ? { serverAuthCode } : {})
    };
  }

  private normalizeGoogleSignInError(err: any): {
    cancelled: boolean;
    code: string;
    message: string;
    userMessage: string;
    debugDetails: string;
  } {
    const rawCode = err?.code ?? err?.errorCode ?? err?.status ?? '';
    const code = String(rawCode || '').trim();
    const message = String(err?.message || err?.error || 'Google sign-in failed').trim();
    const lowerMessage = message.toLowerCase();
    const cancelled = code === '12501'
      || err?.error === 'popup_closed_by_user'
      || lowerMessage.includes('canceled')
      || lowerMessage.includes('cancelled')
      || lowerMessage.includes('closed by user');

    let userMessage = message || 'Google sign-in failed. Please try again.';
    if (!cancelled) {
      if (code === '10' || lowerMessage.includes('developer error')) {
        userMessage = 'Google sign-in configuration error (code 10). Please check the package name, SHA certificate, and Google OAuth client IDs.';
      } else if (code === '7') {
        userMessage = 'Google sign-in could not connect to Google services (code 7). Please check the network and try again.';
      } else if (code === '12500') {
        userMessage = 'Google sign-in failed because the current app build is not authorized correctly (code 12500). Please verify the Google OAuth setup.';
      } else if (lowerMessage.includes('access token')) {
        userMessage = 'Google sign-in could not retrieve the access token correctly. Please try again.';
      } else if (code) {
        userMessage = `Google sign-in failed (code ${code}). ${message}`;
      } else if (message === 'Something went wrong') {
        userMessage = 'Google sign-in failed before the token could be verified. Please try again.';
      }
    }

    return {
      cancelled,
      code,
      message,
      userMessage,
      debugDetails: `code=${code || 'n/a'} message=${message}`
    };
  }

  /**
   * Signs the user into Firebase Authentication using the Google ID token so
   * they appear under Authentication > Users in the Firebase console.
   * Non-fatal: failures are logged but never block the main auth flow.
   */
  private async registerWithFirebaseAuth(googleUser: any): Promise<void> {
    try {
      const idToken: string | undefined = googleUser?.authentication?.idToken;
      if (!idToken) {
        console.warn('[SocialMedia] No Google idToken available for Firebase sign-in.');
        return;
      }

      const apps = getApps();
      if (!apps.length) {
        console.warn('[SocialMedia] Firebase not initialised yet — skipping Firebase Auth.');
        return;
      }

      const auth = getAuth(getApp());
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      console.log('[SocialMedia] Firebase Auth: signed in as', result.user.email);
    } catch (error: any) {
      console.warn('[SocialMedia] Firebase signInWithCredential failed (non-fatal):', error?.code ?? error);
    }
  }
}
