import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService, ReferralCodeResponse } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'refer-friend',
  imports: [CommonModule, SupermeNavigatorComponent, SupermeButtonComponent, IonicModule, ProfileFactsComponent],
  templateUrl: './refer-friend.component.html',
  styleUrls: ['./refer-friend.component.scss']
})
export class ReferFriendComponent implements OnInit, OnDestroy {
  referralCode: string = '';
  shareLink: string = '';
  faqs: FaqItem[] = [];
  userDisplayName: string = '';
  copied = false;
  private copiedTimer: any;
  private readonly appName = 'Superme';
  private readonly mobileAppLink = 'https://play.google.com/store/apps/details?id=com.superme.app';
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService, private toastCtrl: ToastController) { }

  ngOnInit(): void {
    this.initializeFaqs();
    this.userDisplayName = this.getLoggedInUserName();
    this.authService.userData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.userDisplayName = this.getLoggedInUserName();
      });
    // Show cached code immediately if available — removes the delay
    const cached = this.authService.getUserData?.()?.referralCode;
    if (cached) {
      this.referralCode = cached;
      this.shareLink = `${this.getReferralBaseUrl()}?code=${encodeURIComponent(cached)}`;
    }
    this.loadReferralCode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.copiedTimer);
  }

  private initializeFaqs(): void {
    this.faqs = PROFILE_FAQS.filter(f => (f.section || '').toLowerCase() === 'profile' && (f.screen || '').toLowerCase().includes('refer a friend (child)'));
    // fallback to a minimal set if none found
    if (!this.faqs || this.faqs.length === 0) {
      this.faqs = [
        { question: 'How does this work?' },
        { question: 'The code is not working' },
        { question: 'I cannot copy the code' }
      ];
    }
  }

  private loadReferralCode(): void {
    this.authService.generateReferralCode()
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: ReferralCodeResponse) => {
        this.referralCode = response.referralCode;
        this.shareLink = `${this.getReferralBaseUrl()}?code=${encodeURIComponent(this.referralCode)}`;
      });
  }


  copyLink(): void {
    if (this.referralCode) {
      navigator.clipboard?.writeText(this.shareLink);
    }
  }

  async copyCode(event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.referralCode) return;
    try {
      await navigator.clipboard?.writeText(this.referralCode);
    } catch { /* fallback ok */ }
    // Show inline "Copied!" hint for 2s
    this.copied = true;
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => { this.copied = false; }, 2000);
  }

  shareNow(): void {
    if (!this.referralCode) return;

    const message = this.buildShareMessage();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private buildShareMessage(): string {
    const deepLink = `${this.getReferralBaseUrl()}?code=${encodeURIComponent(this.referralCode)}`;
    return `🎁 I am gifting you 100 bonus coins on SuperMe App.\n\nManage your time, build habits that last and learn skills and achieve your goals - all while earning rewards!!!\n\n📲 Click below to join & your bonus coins will be added automatically!\n${deepLink}\n\n(Already have the app? Use code: ${this.referralCode})`;
  }

  private getLoggedInUserName(): string {
    const userData = this.authService.getUserData?.();
    const rawName = userData?.name || userData?.fullName || userData?.userName || '';
    return this.cleanDisplayName(rawName);
  }

  private cleanDisplayName(value: unknown): string {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    return name && name.toLowerCase() !== 'user' ? name : '';
  }

  private getReferralBaseUrl(): string {
    const host = environment.firebase?.deepLinks?.hosts?.[0] || 'supermeapp.com';
    return `https://${host.replace(/^https?:\/\//, '').replace(/\/$/, '')}/referral`;
  }

}
