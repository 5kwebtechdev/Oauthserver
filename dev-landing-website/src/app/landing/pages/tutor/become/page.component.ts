import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LandingNavbarComponent } from '../../../components/navbar/navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { StepOneComponent, Step1Data } from './step-one.component';
import { StepTwoComponent, Step2Data } from './step-two.component';
import { StepThreeComponent } from './step-three.component';
import { FaqSectionComponent } from './faq-section.component';

type StepNum = 1 | 2 | 3;

interface StepMeta {
  num: StepNum;
  label: string;
}

@Component({
  selector: 'app-become-tutor-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LandingNavbarComponent,
    CommonFooterComponent,
    StepOneComponent,
    StepTwoComponent,
    StepThreeComponent,
    FaqSectionComponent,
  ],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class BecomeTutorPageComponent {
  readonly isAcademyListing: boolean;
  currentStep: StepNum = 1;

  readonly steps: StepMeta[] = [
    { num: 1, label: 'Who Are\nYou?' },
    { num: 2, label: 'Where &\nWhat You Teach' },
    { num: 3, label: 'Documents\nUpload' },
  ];

  step1Data: Step1Data | null = null;
  step2Data: Step2Data | null = null;

  // Step 3 data hoisted here so files + text survive unmount when user goes Back
  step3ProfilePic: File | null = null;
  step3Certs: File[] = [];
  step3Achievement = '';

  constructor(route: ActivatedRoute) {
    this.isAcademyListing = route.snapshot.data['academyListing'] === true;
    if (this.isAcademyListing) {
      this.step1Data = { entityType: 'Academy', name: '', gender: '', phone: '', phoneCountry: 'IN', email: '', dateOfBirth: '' };
    }
  }

  private scroll(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleStep1Next(data: Step1Data): void {
    this.step1Data = data;
    this.currentStep = 2;
    this.scroll();
  }

  handleStep2Next(data: Step2Data): void {
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
