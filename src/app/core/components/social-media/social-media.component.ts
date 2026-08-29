import { Component, Input, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, Platform, LoadingController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  UserCredential
} from 'firebase/auth';
import { timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthSessionCleanupService } from '../../services/auth-session-cleanup.service';
import { CrashlyticsService } from '../../services/crashlytics.service';
import { FirebaseRuntimeService } from '../../services/firebase-runtime.service';
import { OnboardingStateService } from '../../services/onboarding-state.service';
import {
  AppleAuthorizationCredential,
  AppleSignInService
} from '../../services/apple-sign-in.service';
import { environment } from '../../../../environments/environment';

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
  identityToken?: string;
  authorizationCode?: string;
  rawNonce?: string;
  clientId?: string;
  isDevelopmentMock?: boolean;
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
    private analytics: AnalyticsService,
    private authSessionCleanup: AuthSessionCleanupService,
    private crashlytics: CrashlyticsService,
    private firebaseRuntime: FirebaseRuntimeService,
    private onboardingState: OnboardingStateService,
    private appleSignIn: AppleSignInService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Apple sign-in belongs to the native iOS application only. The same
    // shared component is rendered by login, signup, and password recovery,
    // so gating it here removes the button consistently from every web flow
    // without changing the native iOS experience.
    this.isIos = Capacitor.isNativePlatform()
      && (this.detectAppleDevice() || this.appleSignIn.isDevelopmentMockActive());
  }

  /**
   * Ionic's platform.is('ios') is tuned for detecting a mobile OS context and
   * can false-positive on desktop web (e.g. a narrow browser window, or
   * Chrome DevTools' device toolbar leaving a spoofed iOS user agent active)
   * — showing the Apple button to non-Apple web visitors who can't actually
   * use it. On native builds platform.is() is reliable (the binary only ever
   * runs on the OS it was built for), so only web needs the stricter check.
   */
  private detectAppleDevice(): boolean {
    if (Capacitor.isNativePlatform()) {
      return this.platform.is('ios') || this.platform.is('ipad');
    }

    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua);
    // iPadOS masks its user agent as "Macintosh" — real Macs report the same
    // UA, so touch support is what actually distinguishes an iPad from a Mac.
    const isIpadMasked = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints <= 1;
    return isIphoneOrIpad || isIpadMasked || isMac;
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
    if (this.isSocialLoginInProgress) return;
    this.isSocialLoginInProgress = true;

    // The Capacitor plugin's browser implementation still uses the deprecated
    // `gapi.auth2` API, which can return `server_error` after account selection
    // in current browsers. Firebase Auth uses Google Identity Services and is
    // already configured for this app. Start its popup immediately inside the
    // click gesture so browser popup blockers cannot intercept it.
    if (!Capacitor.isNativePlatform()) {
      await this.signInWithGoogleWeb();
      return;
    }

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

      // The OAuth endpoint is the single authority for both existing and new
      // accounts. An email-exists preflight races with private relay emails and
      // can create two different navigation paths for the same provider user.
      this.storeOAuthSignupSession('google', googleProfile);
      this.loginWithOAuthProfile(
        this.withSelectedSignupRole(googleProfile),
        loading,
        'google'
      );
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

  private async signInWithGoogleWeb(): Promise<void> {
    let loading: HTMLIonLoadingElement | null = null;

    try {
      this.firebaseRuntime.initialize();
      if (!getApps().length) {
        throw new Error('Google sign-in is not initialized. Please refresh the page and try again.');
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });

      // Calling signInWithPopup before the first await preserves the browser's
      // user-activation context and reliably opens the account picker.
      const signInPromise = signInWithPopup(getAuth(getApp()), provider);
      loading = await this.loadingCtrl.create({ message: 'Signing in with Google...' });
      await loading.present();

      const result = await signInPromise;
      const googleProfile = await this.buildWebGoogleOAuthProfile(result);
      this.storeOAuthSignupSession('google', googleProfile);
      this.loginWithOAuthProfile(
        this.withSelectedSignupRole(googleProfile),
        loading,
        'google'
      );
    } catch (err: any) {
      await this.finishSocialLogin(loading);
      const normalizedError = this.normalizeGoogleSignInError(err);
      console.error('[SocialMedia] Web Google signIn error:', normalizedError.debugDetails, err);
      this.crashlytics.recordException(err, {
        provider: 'google',
        platform: 'web',
        stage: 'signIn',
        code: normalizedError.code || ''
      });

      if (!normalizedError.cancelled) {
        await this.presentToast(normalizedError.userMessage);
      }
    }
  }

  private async buildWebGoogleOAuthProfile(result: UserCredential): Promise<GoogleOAuthProfile> {
    const user = result.user;
    const oauthCredential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = String(oauthCredential?.idToken || await user.getIdToken()).trim();
    const accessToken = String(oauthCredential?.accessToken || '').trim();
    const providerId = String(user.providerData[0]?.uid || user.uid || '').trim();
    const email = String(user.email || '').trim();
    const name = String(user.displayName || email).trim();
    const avatarUrl = String(user.photoURL || '').trim();

    if (!providerId || !email || !idToken) {
      throw new Error('Google sign-in did not return the required account details.');
    }

    return {
      provider: 'google',
      providerId,
      email,
      name,
      avatarUrl,
      idToken,
      ...(accessToken ? { accessToken } : {})
    };
  }

  private async signInWithApple(): Promise<void> {
    // Use the same iPad-inclusive check as the button's *ngIf (see isIos above) —
    // platform.is('ios') alone can miss iPadOS in some Capacitor versions, which
    // would otherwise make this button silently do nothing on iPad.
    if (!this.isIos && !this.appleSignIn.isDevelopmentMockActive()) return;
    if (this.isSocialLoginInProgress) return;
    this.isSocialLoginInProgress = true;

    const loading = await this.loadingCtrl.create({ message: 'Signing in with Apple...' });
    await loading.present();

    try {
      const credential: AppleAuthorizationCredential = await this.appleSignIn.authorize();
      const {
        isDevelopmentMock,
        ...appleProfile
      } = credential;

      if (!environment.production) {
        console.info('[Apple Sign-In] Authorization completed', {
          providerId: appleProfile.providerId,
          hasEmail: !!appleProfile.email,
          hasName: !!appleProfile.name,
          hasIdentityToken: !!appleProfile.identityToken,
          hasAuthorizationCode: !!appleProfile.authorizationCode,
          developmentMock: !!isDevelopmentMock
        });
      }

      if (isDevelopmentMock) {
        // The development mock is intentionally client-only. Never send its
        // unsigned token or synthetic identity to Firebase or the live API.
        await this.finishSocialLogin(loading);
        this.storeOAuthSignupSession('apple', credential);
        const selectedRole = this.getSelectedSignupRole();
        this.onboardingState.saveRegistrationDraft({
          email: credential.email,
          name: credential.name,
          authProvider: 'apple',
          socialProviderId: credential.providerId,
          socialOnboarding: true,
          socialDetailsCompleted: false,
          socialRolePending: !selectedRole,
          selectedSignupRole: selectedRole || undefined,
          relationship: selectedRole?.toUpperCase(),
          asChild: selectedRole === 'child',
          onboardingStep: 3
        }, 3, 'EMAIL');
        await this.presentToast(
          'Apple development mock verified. Live backend authentication was not called.'
        );
        this.router.navigate(
          ['home/sign-up'],
          {
            queryParams: selectedRole ? { step: 2, role: selectedRole } : { step: 1 },
            replaceUrl: true
          }
        );
        return;
      }

      // Apple sends fullName only on the first successful authorization. Save
      // the native credential before any Firebase/backend request or route
      // transition so the name is available throughout onboarding.
      this.storeOAuthSignupSession('apple', appleProfile);

      try {
        // Firebase is only used to mirror the user in Firebase Auth. The
        // SuperMe backend is the authority for Apple authentication, so a
        // stalled Firebase request must never strand an iOS user on a blank
        // screen after the native Apple sheet closes.
        await this.registerWithFirebaseAppleAuth(appleProfile);
      } catch (fbErr) {
        console.warn('[SocialMedia] Firebase Apple sign-in (non-fatal):', fbErr);
      }

      // Always let the backend verify the Apple token and stable `sub`.
      // Email is not a reliable account key and Apple may omit name/email on
      // later authorizations.
      // Capacitor callbacks can resolve outside Angular's zone on iOS. Enter
      // it explicitly so routing and the Ionic view update reliably on iPhone
      // and iPad after the native authorization sheet is dismissed.
      this.ngZone.run(() => this.loginWithOAuthProfile(
        this.withSelectedSignupRole(appleProfile),
        loading,
        'apple'
      ));
    } catch (err: any) {
      await this.finishSocialLogin(loading);
      const normalizedError = this.appleSignIn.normalizeError(err);
      if (!normalizedError.cancelled) {
        console.error('[Apple Sign-In] Authorization failed:', normalizedError.debugMessage, err);
        this.crashlytics.recordException(err, {
          provider: 'apple',
          stage: 'authorize',
          code: normalizedError.code || ''
        });
        const toast = await this.toastCtrl.create({
          message: normalizedError.userMessage,
          duration: 4500,
          position: 'bottom'
        });
        await toast.present();
      }
    }
  }

  private loginWithOAuthProfile(
    profile: any,
    loading: any,
    provider: OAuthProviderName,
    fallbackMessage?: string
  ): void {
    this.authService.googleOAuthLogin(profile).pipe(
      // Prevent a stalled network request from leaving the native auth view in
      // a loading/blank state indefinitely. This only cancels the client wait;
      // the backend remains the final source of truth on a retry.
      timeout({ first: 20_000 })
    ).subscribe({
      next: async (response) => {
        await this.finishSocialLogin(loading);
        // Older OAuth responses may place the onboarding step at the top
        // level. Keep the backend value when present instead of rejecting an
        // otherwise valid Apple session as an unknown account state.
        const responseUser = {
          ...(response.user || {}),
          onboardingStep: response.user?.onboardingStep
            ?? (response as any)?.onboardingStep
            ?? (response as any)?.nextStep
        };
        const userId = responseUser.id;
        if (response.token && userId) {
          const onboardingStep = this.onboardingState.getOnboardingStep(responseUser);
          const selectedRole = this.getSelectedSignupRole();

          this.authService.setSession(
            { token: response.token, userId, expiresIn: response.expiresIn, user: responseUser },
            false
          );
          this.analytics.logLogin(provider);
          this.analytics.setUserId(String(userId));

          if (onboardingStep !== null && onboardingStep < 7) {
            // Keep the exact Apple private-relay email and the one-time Apple
            // name. Returning Apple users fall back to the backend/cached name.
            const signupIdentity: OAuthSignupSessionData = {
              ...profile,
              email: String(profile?.email || responseUser.email || '').trim(),
              name: String(profile?.name || responseUser.name || '').trim(),
              avatarUrl: String(profile?.avatarUrl || '').trim(),
              providerId: String(profile?.providerId || '').trim()
            };
            this.storeOAuthSignupSession(provider, signupIdentity);

            const roleFromBackend = onboardingStep >= 5
              ? this.onboardingState.getSignupRole(responseUser)
              : null;
            const onboardingRole = selectedRole || roleFromBackend;
            this.onboardingState.saveRegistrationDraft({
              ...responseUser,
              email: signupIdentity.email || responseUser.email,
              name: signupIdentity.name || responseUser.name,
              authProvider: provider,
              socialProviderId: signupIdentity.providerId,
              socialOnboarding: true,
              socialDetailsCompleted: onboardingStep >= 5,
              socialRolePending: !onboardingRole,
              selectedSignupRole: onboardingRole || undefined,
              relationship: onboardingRole
                ? onboardingRole.toUpperCase()
                : responseUser.relationship,
              asChild: onboardingRole === 'child' || responseUser.asChild === true,
              onboardingStep
            }, onboardingStep, 'EMAIL');
          }

          const onboardingResume = this.onboardingState.getResumeNavigation(responseUser);
          if (onboardingResume) {
            this.router.navigate([onboardingResume.url], {
              queryParams: onboardingResume.queryParams,
              replaceUrl: true
            });
          } else {
            this.onboardingState.markExistingUser();
            this.clearOAuthSignupSession();
            this.router.navigate([this.authService.getDashboardRoute()], { replaceUrl: true });
          }
          return;
        }

        console.error('[SocialMedia] OAuth login response missing token or userId:', response);
        await this.presentToast('Sign-in failed: invalid server response. Please try again.');
      },
      error: async (err) => {
        await this.finishSocialLogin(loading);
        this.clearOAuthSignupSession();
        console.error('[SocialMedia] OAuth login error:', err);
        this.crashlytics.recordException(err, {
          provider,
          stage: 'oauthLogin'
        });
        const timedOut = err?.name === 'TimeoutError';
        await this.presentToast(
          timedOut
            ? `${this.getProviderLabel(provider)} sign-in is taking too long. Please check your connection and try again.`
            : err?.error?.message || fallbackMessage || `${this.getProviderLabel(provider)} sign-in failed. Please try again.`
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

      if (data.identityToken) {
        sessionStorage.setItem('oauth_signup_identity_token', data.identityToken);
      } else {
        sessionStorage.removeItem('oauth_signup_identity_token');
      }

      if (data.authorizationCode) {
        sessionStorage.setItem('oauth_signup_authorization_code', data.authorizationCode);
      } else {
        sessionStorage.removeItem('oauth_signup_authorization_code');
      }

      if (data.rawNonce) {
        sessionStorage.setItem('oauth_signup_raw_nonce', data.rawNonce);
      } else {
        sessionStorage.removeItem('oauth_signup_raw_nonce');
      }

      if (data.clientId) {
        sessionStorage.setItem('oauth_signup_client_id', data.clientId);
      } else {
        sessionStorage.removeItem('oauth_signup_client_id');
      }

      if (!environment.production && data.isDevelopmentMock) {
        sessionStorage.setItem('oauth_signup_is_development_mock', 'true');
      } else {
        sessionStorage.removeItem('oauth_signup_is_development_mock');
      }

      sessionStorage.setItem('requestedIdentifier', data.email);
    } catch (e) {}
  }

  private clearOAuthSignupSession(): void {
    try {
      [
        'signup_via_google', 'signup_via_oauth', 'oauth_signup_provider',
        'google_signup_email', 'google_signup_name', 'google_signup_avatar',
        'google_signup_provider_id', 'oauth_signup_id_token',
        'oauth_signup_access_token', 'oauth_signup_server_auth_code',
        'oauth_signup_identity_token', 'oauth_signup_authorization_code',
        'oauth_signup_raw_nonce', 'oauth_signup_client_id',
        'oauth_signup_is_development_mock', 'requestedIdentifier'
      ].forEach(key => sessionStorage.removeItem(key));
    } catch {
      // Session storage is a convenience layer; the authenticated backend
      // session remains the source of truth for completed accounts.
    }
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

  private getSelectedSignupRole(): 'child' | 'parent' | 'self' | null {
    try {
      const role = sessionStorage.getItem('signup_role');
      return role === 'child' || role === 'parent' || role === 'self' ? role : null;
    } catch {
      return null;
    }
  }

  private withSelectedSignupRole(profile: any): any {
    const selectedRole = this.getSelectedSignupRole();
    if (!selectedRole) return profile;

    return {
      ...profile,
      role: selectedRole.toUpperCase(),
      ...(selectedRole === 'child' ? { asChild: true } : {})
    };
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
      } else if (err?.error === 'popup_blocked_by_browser' || lowerMessage.includes('popup')) {
        userMessage = 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
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

  /**
   * Firebase is supplementary to the backend Apple-auth flow. Give it a
   * bounded amount of time so a Firebase/network problem cannot block native
   * Apple users from continuing through SuperMe onboarding.
   */
  private async registerWithFirebaseAppleAuth(profile: AppleAuthorizationCredential): Promise<void> {
    if (!getApps().length) {
      return;
    }

    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: profile.identityToken,
      rawNonce: profile.rawNonce
    });

    await this.withTimeout(
      signInWithCredential(getAuth(getApp()), firebaseCredential),
      7_500,
      'Firebase Apple sign-in timed out.'
    );
  }

  private withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      operation.then(
        value => {
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}
