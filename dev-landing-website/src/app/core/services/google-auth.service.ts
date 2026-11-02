import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface GoogleAuthData {
  provider: 'google';
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
}

declare var google: any;

const STORAGE_KEY = 'google_auth_data';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly CLIENT_ID =
    '124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com';

  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private zone: NgZone
  ) {}

  signIn(mode: 'login' | 'signup'): void {
    this.errorMessage = '';

    // Wait for GSI script if not yet loaded
    if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
      this.waitForGsi(() => this.signIn(mode));
      return;
    }

    this.isLoading = true;

    const client = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: 'openid email profile',
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          this.zone.run(() => {
            this.isLoading = false;
            this.errorMessage = 'Google sign-in was cancelled.';
          });
          return;
        }
        this.fetchUserInfo(tokenResponse.access_token, mode);
      },
      error_callback: (err: any) => {
        this.zone.run(() => {
          this.isLoading = false;
          // popup_closed is user cancellation — don't show error
          if (err?.type !== 'popup_closed') {
            this.errorMessage = 'Google sign-in failed. Please try again.';
          }
        });
      }
    });

    client.requestAccessToken({ prompt: 'select_account' });
  }

  private waitForGsi(callback: () => void, attempts = 0): void {
    if (attempts > 20) {
      this.errorMessage = 'Google Sign-In failed to load. Please refresh and try again.';
      return;
    }
    setTimeout(() => {
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        callback();
      } else {
        this.waitForGsi(callback, attempts + 1);
      }
    }, 300);
  }

  private fetchUserInfo(accessToken: string, mode: 'login' | 'signup'): void {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((userInfo: any) => {
        this.zone.run(() => this.handleUserInfo(userInfo, mode));
      })
      .catch(() => {
        this.zone.run(() => {
          this.isLoading = false;
          this.errorMessage = 'Failed to get Google profile. Please try again.';
        });
      });
  }

  private handleUserInfo(userInfo: any, mode: 'login' | 'signup'): void {
    if (!userInfo?.email) {
      this.isLoading = false;
      this.errorMessage = 'Could not retrieve email from Google. Please try again.';
      return;
    }

    const googleData: GoogleAuthData = {
      provider: 'google',
      providerId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || '',
      avatarUrl: userInfo.picture || '',
    };

    this.authService.checkEmailExists(googleData.email).subscribe({
      next: (res: any) => {
        const exists = res?.exists ?? res?.data?.exists ?? false;

        if (exists) {
          // Existing account — log in directly
          this.authService.oauth2Login(googleData).subscribe({
            next: () => {
              this.isLoading = false;
              const route = this.authService.getDashboardRoute();
              this.router.navigate([route]);
            },
            error: (err: any) => {
              this.isLoading = false;
              this.errorMessage = err?.error?.message || 'Google sign-in failed. Please try again.';
            }
          });
        } else {
          // New user — store Google data and go to signup role selection
          this.isLoading = false;
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(googleData));
            sessionStorage.setItem('requestedIdentifier', googleData.email);
          } catch (e) {}
          // Skip email/password steps — go straight to role selection (step 1)
          this.router.navigate(['/auth/signup'], { queryParams: { step: 1 } });
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to verify account. Please try again.';
      }
    });
  }

  getStoredData(): GoogleAuthData | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clearStoredData(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }
}
