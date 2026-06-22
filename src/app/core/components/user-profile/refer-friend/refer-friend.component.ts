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
    this.loadReferralCode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      const toast = await this.toastCtrl.create({
        message: 'Code copied',
        duration: 1000,
        position: 'bottom',
        cssClass: 'copied-toast'
      });
      try {
        (toast as any).style?.setProperty('--background', '#FFF');
        (toast as any).style?.setProperty('--color', '#282527');
        (toast as any).style && ((toast as any).style.borderRadius = '4px');
        (toast as any).style && ((toast as any).style.boxShadow = '0 0 2px 1px rgba(107, 101, 106, 0.10)');
        (toast as any).style && ((toast as any).style.fontFamily = 'Nunito, sans-serif');
        (toast as any).style && ((toast as any).style.fontSize = '13px');
        (toast as any).style && ((toast as any).style.fontWeight = '600');
        (toast as any).style && ((toast as any).style.color = '#282527');
      } catch (e) {
        // ignore style injection errors
      }
      await toast.present();
    } catch (err) {
      // fallback: still try to show feedback even if clipboard fails
      const toast = await this.toastCtrl.create({
        message: 'Unable to copy code',
        duration: 1500,
        position: 'bottom',
        cssClass: 'copied-toast'
      });
      try {
        (toast as any).style?.setProperty('--background', '#FFF');
        (toast as any).style?.setProperty('--color', '#282527');
        (toast as any).style && ((toast as any).style.borderRadius = '4px');
        (toast as any).style && ((toast as any).style.boxShadow = '0 0 2px 1px rgba(107, 101, 106, 0.10)');
        (toast as any).style && ((toast as any).style.fontFamily = 'Nunito, sans-serif');
        (toast as any).style && ((toast as any).style.fontSize = '13px');
        (toast as any).style && ((toast as any).style.fontWeight = '600');
        (toast as any).style && ((toast as any).style.color = '#282527');
      } catch (e) {
        // ignore style injection errors
      }
      await toast.present();
    }
  }

  shareNow(): void {
    if (!this.referralCode) return;

    const message = this.buildShareMessage();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private buildShareMessage(): string {
    return `🎁 I am gifting you 100 bonus coins on SuperMe App.\n\nManage your time, build habits that last and learn skills and achieve your goals - all while earning rewards!!!\n\nSuper App for Super You: ${this.referralCode}\n\n📲 Hurry up and download now to claim free coins before they expire\n${this.mobileAppLink}`;
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
