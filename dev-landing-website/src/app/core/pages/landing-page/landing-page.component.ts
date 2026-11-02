import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReferralService } from '../../services/referral.service';

// Landing-specific components
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { LandingFooterComponent } from '../../../landing/components/footer/footer.component';
import { HeroSectionComponent } from '../../../landing/sections/hero/hero.component';
import { PillarsSectionComponent } from '../../../landing/sections/pillars/pillars.component';
import { OneAppSectionComponent } from '../../../landing/sections/one-app/one-app.component';
import { GrowthSectionComponent } from '../../../landing/sections/growth/growth.component';
import { PetsSectionComponent } from '../../../landing/sections/pets/pets.component';
import { TestimonialsSectionComponent } from '../../../landing/sections/testimonials/testimonials.component';
import { AccessAnywhereSectionComponent } from '../../../landing/sections/access-anywhere/access-anywhere.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PublicNavbarComponent,
    LandingFooterComponent,
    HeroSectionComponent,
    PillarsSectionComponent,
    OneAppSectionComponent,
    GrowthSectionComponent,
    PetsSectionComponent,
    TestimonialsSectionComponent,
    AccessAnywhereSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private referralService = inject(ReferralService);
  private cdr = inject(ChangeDetectorRef);
  private welcomeTimers: number[] = [];
  referralCode = this.referralService.getReferralCode();
  showReferralToast = false;
  showPandaWelcome = false;
  pandaWelcomeLeaving = false;

  ngOnInit(): void {
    if (this.referralCode) {
      this.showReferralToast = true;
      setTimeout(() => this.showReferralToast = false, 6000);
    }
    this.startPandaWelcome();
  }

  ngOnDestroy(): void {
    this.welcomeTimers.forEach(timer => window.clearTimeout(timer));
  }

  dismissPandaWelcome(): void {
    if (!this.showPandaWelcome || this.pandaWelcomeLeaving) return;
    this.pandaWelcomeLeaving = true;
    this.cdr.markForCheck();
    this.welcomeTimers.push(window.setTimeout(() => {
      this.showPandaWelcome = false;
      this.cdr.markForCheck();
    }, 650));
  }

  private startPandaWelcome(): void {
    if (typeof window === 'undefined') return;
    const sessionKey = 'superme_panda_welcomed';
    try {
      if (sessionStorage.getItem(sessionKey) === 'true') return;
      sessionStorage.setItem(sessionKey, 'true');
    } catch {
      // Continue for this page load if storage is unavailable.
    }

    this.welcomeTimers.push(window.setTimeout(() => {
      this.showPandaWelcome = true;
      this.cdr.markForCheck();
      this.welcomeTimers.push(window.setTimeout(() => this.dismissPandaWelcome(), 5200));
    }, 500));
  }
}
