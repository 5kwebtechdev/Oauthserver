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
  /** variant controls rendering behavior; "login-with" shows provider icons for sign-in */
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

    console.warn('No handler for social link', link.name);
  }

  private async signInWithGoogle(): Promise<void> {
    const isNative = this.platform.is('capacitor') || this.platform.is('android');

    if (!isNative) {
      // On web, Google auth requires OAuth redirect — not implemented for web yet.
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
      const idToken = googleUser.authentication?.idToken;

      if (!idToken) {
        throw new Error('No ID token returned from Google');
      }

      this.authService.googleAuth(idToken).subscribe({
        next: (response) => {
          loading.dismiss();
          const route = this.authService.getDashboardRoute();
          this.router.navigate([route], { replaceUrl: true });
        },
        error: async (err) => {
          loading.dismiss();
          console.error('[SocialMedia] Google auth backend error:', err);
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
      console.error('[SocialMedia] Google signIn error:', err);
      if (err?.error !== 'popup_closed_by_user' && err?.message !== 'The user canceled the sign-in flow.') {
        const toast = await this.toastCtrl.create({
          message: 'Google sign-in was cancelled or failed.',
          duration: 2500,
          position: 'bottom'
        });
        await toast.present();
      }
    }
  }
}
