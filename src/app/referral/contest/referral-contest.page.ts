import { Component, ViewChild, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ReferralShareService } from '../../core/services/referral-share.service';
import { NavigationService } from '../../core/services/navigation.service';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonFooter, NavController } from '@ionic/angular/standalone';
import {
  CONTEST_DURATION_MONTHS,
  CONTEST_LINKS,
  OTHER_PRIZES_TEXT,
  PARTICIPATION_STEPS,
  PODIUM_PRIZES,
  VOUCHER_ART,
  GIFTS_ART,
  VOUCHER_PRIZE,
} from './contest.data';

/** Distance (px) from the bottom that counts as "scrolled to the end". */
const BOTTOM_THRESHOLD_PX = 8;

@Component({
  selector: 'app-referral-contest',
  standalone: true,
  imports: [IonContent, IonFooter],
  templateUrl: './referral-contest.page.html',
  styleUrls: ['./referral-contest.page.scss'],
})
export class ReferralContestPage implements OnInit {
  private readonly nav = inject(NavController);
  private readonly navigation = inject(NavigationService);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly share = inject(ReferralShareService);
  private readonly destroyRef = inject(DestroyRef);
  readonly referralCode = signal('');
  readonly shareError = signal('');
  private isLeaving = false;

  ngOnInit(): void {
    this.referralCode.set(this.auth.getUserData()?.referralCode || '');
    this.loadReferralCode();
  }

  loadReferralCode(): void {
    this.shareError.set('');
    this.auth.generateReferralCode().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.referralCode.set(response.referralCode || ''),
      error: () => {
        if (!this.referralCode()) this.shareError.set('Unable to load your referral code. Please try again.');
      }
    });
  }

  @ViewChild(IonContent, { static: true }) private readonly content!: IonContent;

  readonly months = CONTEST_DURATION_MONTHS;
  readonly podium = PODIUM_PRIZES;
  readonly voucher = VOUCHER_PRIZE;
  readonly otherPrizesText = OTHER_PRIZES_TEXT;
  readonly voucherArt = VOUCHER_ART;
  readonly giftsArt = GIFTS_ART;
  readonly steps = PARTICIPATION_STEPS;
  readonly links = CONTEST_LINKS;

  /**
   * The CTA unlocks once the user has reached the bottom of the page.
   * One-time: it stays enabled if they scroll back up.
   */
  readonly ctaUnlocked = signal(false);

  /** Ionic lifecycle: unlock straight away if the page fits without scrolling. */
  ionViewDidEnter(): void {
    this.isLeaving = false;
    void this.checkScrolledToBottom();
  }

  async checkScrolledToBottom(): Promise<void> {
    if (this.ctaUnlocked()) return;
    const el = await this.content.getScrollElement();
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD_PX) {
      this.ctaUnlocked.set(true);
    }
  }

  goBack(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;

    // Pop the contest from app history. Navigating *to* Refer Friend here
    // instead would add another entry, so its Back button reopens the contest.
    const history = this.navigation.getHistory();
    const current = history[history.length - 1]?.split('?')[0];
    const previous = history[history.length - 2]?.split('?')[0];
    if (current === '/authed/refer-friend/contest' && previous && previous !== current) {
      // Use the actual history entry so Android/system Back cannot reopen this
      // screen after the visible back button was pressed.
      this.location.back();
      return;
    }

    // A direct/deep link has no reliable previous page: return to the entry
    // screen without leaving a contest entry for the next Back press.
    this.navigation.replaceHistory('/authed/refer-friend');
    void this.nav.navigateRoot('/authed/refer-friend', { animated: false });
  }

  openLegal(event: Event, url: string): void {
    event.preventDefault();
    window.open(url, Capacitor.isNativePlatform() ? '_system' : '_blank', 'noopener,noreferrer');
  }

  inviteFriends(): void {
    if (!this.ctaUnlocked() || !this.referralCode()) return;
    this.share.share(this.referralCode());
  }
}
