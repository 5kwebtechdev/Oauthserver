import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Shared by the existing Referral screen and the contest; no reward/API changes. */
@Injectable({ providedIn: 'root' })
export class ReferralShareService {
  link(code: string): string {
    const host = environment.firebase?.deepLinks?.hosts?.[0] || 'supermeapp.com';
    return `https://${host.replace(/^https?:\/\//, '').replace(/\/$/, '')}/referral?code=${encodeURIComponent(code)}`;
  }

  share(code: string): void {
    if (!code) return;
    const message = `🎁 I am gifting you 500 bonus coins on SuperMe App.\n\nManage your time, build habits that last and learn skills and achieve your goals - all while earning rewards!!!\n\n📲 Click below to join & your bonus coins will be added automatically!\n${this.link(code)}\n\n(Already have the app? Use code: ${code})`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }
}
