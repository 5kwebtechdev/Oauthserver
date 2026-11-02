import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { LandingNavbarComponent } from '../../../components/navbar/navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';

import {
  LISTING_CONFIGS,
  ListingConfig,
  ListingType,
} from './listing-config';

import {
  ListingBasicData,
  ListingDetailsData,
  defaultBasic,
  defaultDetails,
} from './listing-shared';

import { ListingStepOneComponent } from './step-one.component';
import { ListingStepTwoComponent } from './step-two.component';
import { ListingStepThreeComponent } from './step-three.component';

type StepNum = 1 | 2 | 3;

@Component({
  selector: 'app-become-listing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LandingNavbarComponent,
    CommonFooterComponent,
    ListingStepOneComponent,
    ListingStepTwoComponent,
    ListingStepThreeComponent,
  ],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class BecomeListingPageComponent {
  currentStep: StepNum = 1;

  readonly config: ListingConfig;

  step1Data: ListingBasicData | null = null;
  step2Data: ListingDetailsData | null = null;
  step3Images: File[] = [];

  constructor(private route: ActivatedRoute) {
    const listingType =
      (this.route.snapshot.data['listingType'] || 'stationary') as ListingType;

    this.config = LISTING_CONFIGS[listingType] || LISTING_CONFIGS.stationary;
  }

  get steps(): { num: StepNum; label: string }[] {
    return this.config.steps.map((label, idx) => ({
      num: (idx + 1) as StepNum,
      label,
    }));
  }

  private scroll(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleStep1Next(data: ListingBasicData): void {
    this.step1Data = data;
    this.currentStep = 2;
    this.scroll();
  }

  handleStep2Next(data: ListingDetailsData): void {
    this.step2Data = data;
    this.currentStep = 3;
    this.scroll();
  }

  goToStep1(): void {
    this.currentStep = 1;
    this.scroll();
  }

  goToStep2(): void {
    this.currentStep = 2;
    this.scroll();
  }

  getState(step: number): 'completed' | 'active' | 'future' {
    if (step < this.currentStep) return 'completed';
    if (step === this.currentStep) return 'active';
    return 'future';
  }

  isLastStep(idx: number): boolean {
    return idx === this.steps.length - 1;
  }
}
