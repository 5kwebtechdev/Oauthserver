import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, Platform, LoadingController, ToastController } from '@ionic/angular';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthSessionCleanupService } from '../../services/auth-session-cleanup.service';

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
    private authSessionCleanup: AuthSessionCleanupService
  ) {}

  ngOnInit() {
    this.isIos = this.platform.is('ios');
  }

  open(link: { name: string; url?: string }) {
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

    const loading = await this.loadingCtrl.create({ message: 'Signing in with Google…' });
    await loading.present();

    try {
      await this.authSessionCleanup.prepareGoogleSignIn();

      const googleUser = await GoogleAuth.signIn();
      console.log('[SocialMedia] Google user:', JSON.stringify(googleUser));

      // Register the user in Firebase Authentication so they appear in the
      // Firebase console. This is independent of the backend auth flow and
      // fails silently if Firebase is not yet initialized.
      await this.registerWithFirebaseAuth(googleUser);

      const providerId = googleUser.id;
      const email = googleUser.email;
      const name = googleUser.name || `${googleUser.givenName || ''} ${googleUser.familyName || ''}`.trim();
      const avatarUrl = googleUser.imageUrl || '';

      if (!providerId || !email) {
        throw new Error('Google sign-in did not return user ID or email.');
      }

      // Step 1: check if email is already registered
      this.authService.checkEmailExists(email).subscribe({
        next: (res) => {
          if (res.exists) {
            // Existing user — login via oauth2-login and go to dashboard
            this.authService.googleOAuthLogin({ provider: 'google', providerId, email, name, avatarUrl }).subscribe({
              next: (response) => {
                loading.dismiss();
                const userId = response.user?.id;
                if (response.token && userId) {
                  this.authService.setSession(
                    { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
                    false
                  );
                  this.analytics.logLogin('google');
                  this.analytics.setUserId(String(userId));
                  const route = this.authService.getDashboardRoute();
                  this.router.navigate([route], { replaceUrl: true });
                } else {
                  console.error('[SocialMedia] Login response missing token or userId:', response);
                  this.toastCtrl.create({
                    message: 'Sign-in failed: invalid server response. Please try again.',
                    duration: 3000,
                    position: 'bottom'
                  }).then(t => t.present());
                }
              },
              error: async (err) => {
                loading.dismiss();
                console.error('[SocialMedia] Login error:', err);
                const toast = await this.toastCtrl.create({
                  message: err?.error?.message || 'Google sign-in failed. Please try again.',
                  duration: 3000,
                  position: 'bottom'
                });
                await toast.present();
              }
            });
          } else {
            // New user — store Google data, do NOT log in yet, go to step 1
            loading.dismiss();
            try {
              sessionStorage.setItem('signup_via_google', 'true');
              sessionStorage.setItem('google_signup_email', email);
              sessionStorage.setItem('google_signup_name', name);
              sessionStorage.setItem('google_signup_avatar', avatarUrl);
              sessionStorage.setItem('google_signup_provider_id', providerId);
              sessionStorage.setItem('requestedIdentifier', email);
            } catch (e) {}
            this.analytics.logSignUp('google');
            this.router.navigate(['home/sign-up'], { queryParams: { step: 1 }, replaceUrl: true });
          }
        },
        error: async (err) => {
          loading.dismiss();
          console.error('[SocialMedia] Email check error:', err);
          const toast = await this.toastCtrl.create({
            message: 'Unable to verify account. Please try again.',
            duration: 3000,
            position: 'bottom'
          });
          await toast.present();
        }
      });
    } catch (err: any) {
      await loading.dismiss();
      console.error('[SocialMedia] Google signIn error:', err?.message, err?.code, err?.error);
      // Android error code 12501 = user cancelled; also check string messages
      const cancelled = err?.code === 12501
        || err?.error === 'popup_closed_by_user'
        || err?.message === 'The user canceled the sign-in flow.'
        || err?.message?.includes('canceled')
        || err?.message?.includes('cancelled');
      if (!cancelled) {
        const toast = await this.toastCtrl.create({
          message: err?.message || 'Google sign-in failed. Please try again.',
          duration: 3000,
          position: 'bottom'
        });
        await toast.present();
      }
    }
  }

  private async signInWithApple(): Promise<void> {
    if (!this.platform.is('ios')) return;

    const loading = await this.loadingCtrl.create({ message: 'Signing in with Apple…' });
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

      const providerId = appleUser.user;
      const email = appleUser.email || '';
      const givenName = appleUser.givenName || '';
      const familyName = appleUser.familyName || '';
      const name = [givenName, familyName].filter(Boolean).join(' ') || email;

      // Register in Firebase Auth (non-fatal)
      try {
        if (getApps().length) {
          const provider = new OAuthProvider('apple.com');
          const credential = provider.credential({ idToken: appleUser.identityToken });
          await signInWithCredential(getAuth(getApp()), credential);
        }
      } catch (fbErr) {
        console.warn('[SocialMedia] Firebase Apple sign-in (non-fatal):', fbErr);
      }

      if (!providerId && !email) {
        throw new Error('Apple sign-in did not return user ID or email.');
      }

      this.authService.checkEmailExists(email).subscribe({
        next: (res) => {
          if (res.exists) {
            this.authService.googleOAuthLogin({ provider: 'apple', providerId, email, name, avatarUrl: '' }).subscribe({
              next: (response) => {
                loading.dismiss();
                const userId = response.user?.id;
                if (response.token && userId) {
                  this.authService.setSession(
                    { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
                    false
                  );
                  this.analytics.logLogin('apple');
                  this.analytics.setUserId(String(userId));
                  this.router.navigate([this.authService.getDashboardRoute()], { replaceUrl: true });
                }
              },
              error: async (err) => {
                loading.dismiss();
                const toast = await this.toastCtrl.create({
                  message: err?.error?.message || 'Apple sign-in failed. Please try again.',
                  duration: 3000, position: 'bottom'
                });
                await toast.present();
              }
            });
          } else {
            loading.dismiss();
            try {
              sessionStorage.setItem('signup_via_google', 'true');
              sessionStorage.setItem('google_signup_email', email);
              sessionStorage.setItem('google_signup_name', name);
              sessionStorage.setItem('google_signup_avatar', '');
              sessionStorage.setItem('google_signup_provider_id', providerId);
              sessionStorage.setItem('requestedIdentifier', email);
            } catch (e) {}
            this.analytics.logSignUp('apple');
            this.router.navigate(['home/sign-up'], { queryParams: { step: 1 }, replaceUrl: true });
          }
        },
        error: async () => {
          loading.dismiss();
          const toast = await this.toastCtrl.create({
            message: 'Unable to verify account. Please try again.',
            duration: 3000, position: 'bottom'
          });
          await toast.present();
        }
      });
    } catch (err: any) {
      await loading.dismiss();
      const cancelled = err?.message?.includes('cancel') || err?.message?.includes('dismiss');
      if (!cancelled) {
        const toast = await this.toastCtrl.create({
          message: err?.message || 'Apple sign-in failed. Please try again.',
          duration: 3000, position: 'bottom'
        });
        await toast.present();
      }
    }
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
      // auth/invalid-credential or network errors — never break the sign-in flow
      console.warn('[SocialMedia] Firebase signInWithCredential failed (non-fatal):', error?.code ?? error);
    }
  }
}
