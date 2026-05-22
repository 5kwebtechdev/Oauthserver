import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, Platform, LoadingController, ToastController } from '@ionic/angular';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'social-media',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './social-media.component.html',
  styleUrls: ['./social-media.component.scss']
})
export class SocialMediaComponent {
  @Input() variant?: string;
  links = [
    { name: 'facebook', label: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com' },
    { name: 'instagram', label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/supermeappofficial/' },
    { name: 'youtube', label: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com' },
    { name: 'x', label: 'X', icon: 'x', url: 'https://twitter.com' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private platform: Platform,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  open(link: { name: string; url?: string }) {
    if (link.name === 'google' && this.variant === 'login-with') {
      this.signInWithGoogle();
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
      const googleUser = await GoogleAuth.signIn();
      console.log('[SocialMedia] Google user:', JSON.stringify(googleUser));

      const providerId = googleUser.id;
      const email = googleUser.email;
      const name = googleUser.name || `${googleUser.givenName || ''} ${googleUser.familyName || ''}`.trim();
      const avatarUrl = googleUser.imageUrl || '';

      if (!providerId || !email) {
        throw new Error('Google sign-in did not return user ID or email.');
      }

      this.authService.googleOAuthLogin({ provider: 'google', providerId, email, name, avatarUrl }).subscribe({
        next: (response) => {
          loading.dismiss();

          // Use onboardingComplete flag — reliable regardless of backend response shape
          const alreadyOnboarded = localStorage.getItem('onboardingComplete') === 'true';

          if (alreadyOnboarded) {
            // Returning user — store session and go straight to dashboard
            const userId = response.user?.id;
            if (response.token && userId) {
              this.authService.setSession(
                { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
                false
              );
            }
            const route = this.authService.getDashboardRoute();
            this.router.navigate([route], { replaceUrl: true });
          } else {
            // New user — store auth response temporarily, do NOT log in yet
            // (keeps guestGuard working normally on sign-up route)
            try {
              sessionStorage.setItem('signup_via_google', 'true');
              sessionStorage.setItem('google_auth_response', JSON.stringify(response));
              sessionStorage.setItem('google_signup_email', email);
              sessionStorage.setItem('google_signup_name', name);
              sessionStorage.setItem('google_signup_avatar', avatarUrl);
              sessionStorage.setItem('google_signup_provider_id', providerId);
              sessionStorage.setItem('requestedIdentifier', email);
            } catch (e) {}
            this.router.navigate(['home/sign-up'], { queryParams: { step: 1 }, replaceUrl: true });
          }
        },
        error: async (err) => {
          loading.dismiss();
          console.error('[SocialMedia] Backend error:', err);
          const toast = await this.toastCtrl.create({
            message: err?.error?.message || 'Google sign-in failed. Please try again.',
            duration: 3000,
            position: 'bottom'
          });
          await toast.present();
        }
      });
    } catch (err: any) {
      await loading.dismiss();
      console.error('[SocialMedia] Google signIn error:', err?.message, err?.code);
      const cancelled = err?.error === 'popup_closed_by_user'
        || err?.message === 'The user canceled the sign-in flow.';
      if (!cancelled) {
        const toast = await this.toastCtrl.create({
          message: err?.message || 'Google sign-in failed.',
          duration: 3000,
          position: 'bottom'
        });
        await toast.present();
      }
    }
  }
}
