import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { IonicModule } from '@ionic/angular';
import { AuthService, ReferralCodeResponse } from '../../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  selector: 'refer-friend',
  imports: [CommonModule, MindfulNavigatorComponent, MindfulButtonComponent, IonicModule, ProfileFactsComponent],
  templateUrl: './refer-friend.component.html',
  styleUrls: ['./refer-friend.component.scss']
})
export class ReferFriendComponent implements OnInit, OnDestroy {
  referralCode: string = '';
  shareLink: string = '';
  faqs: FaqItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.initializeFaqs();
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
        this.shareLink = `https://mindfulbuddy.app/referral?code=${this.referralCode}`;
      });
  }


  copyLink(): void {
    if (this.referralCode) {
      navigator.clipboard?.writeText(this.shareLink);
    }
  }

  shareNow(): void {
    if (!this.referralCode) return;

    const message = `Join me on MindfulBuddy! Use my referral code ${this.referralCode} to sign up: ${this.shareLink}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

}
