import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService, ReferralCodeResponse } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { NavController } from '@ionic/angular';
import { ContestBannerComponent } from '../../../../referral/components/contest-banner/contest-banner.component';
import { CONTEST_DURATION_MONTHS } from '../../../../referral/contest/contest.data';
import { ReferralShareService } from '../../../services/referral-share.service';

@Component({
  standalone: true,
  selector: 'refer-friend',
  imports: [CommonModule, SupermeNavigatorComponent, IonicModule, ContestBannerComponent],
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

  readonly contestMonths = CONTEST_DURATION_MONTHS;

  constructor(private authService: AuthService, private toastCtrl: ToastController,
    private nav: NavController, private referralShare: ReferralShareService) { }

  openContest(): void {
    void this.nav.navigateForward('/authed/refer-friend/contest');
  }

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
    this.referralShare.share(this.referralCode);
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
