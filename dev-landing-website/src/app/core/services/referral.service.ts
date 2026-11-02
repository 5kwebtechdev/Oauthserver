import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReferralService {
  private readonly BASE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.superme.app';

  getReferralCode(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('code');
  }

  getGooglePlayUrl(): string {
    const code = this.getReferralCode();
    if (code) {
      return `${this.BASE_PLAY_URL}&referrer=referralCode%3D${encodeURIComponent(code)}`;
    }
    return this.BASE_PLAY_URL;
  }
}
