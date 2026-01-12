import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { InstructioListComponent } from '../family-connection/instructio-list';
import { ProfileFactsComponent, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { NavigationService } from '../../../services/navigation.service';
import { FamilyService } from '../../../services/family.service';
import { AuthService } from '../../../services/auth.service';
import { take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'role-select',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, InstructioListComponent, ProfileFactsComponent, ProfileEditInputComponent],
  template: `
<ion-content>
	<div class="step step-1" *ngIf="currentStep === 1">
		<mindful-navigator heading="Select the role" backIcon="arrowSvg" (back)="goBack()"></mindful-navigator>
		<div class="d-flex flex-column gap-4">
			<div class="role-selector container p-0" data-role="child" role="button" tabindex="0"
				(click)="selectRole('child')" (keydown)="onKeySelect($event, 'child')"
				[class.active]="selectedRole === 'child'" [attr.aria-pressed]="selectedRole === 'child'">

				<div class="row">
					<div class="col-6">
						<h2>Child</h2>
						<h4>Learn and grow</h4>
						<h4>Link with your parents</h4>
						<h4>Earn rewards together</h4>
					</div>

					<div class="col-6">
						<img src="assets/Images-Transparent/Image-Role-Child.png" alt="">
					</div>
				</div>
			</div>

			<div class="role-selector container p-0" data-role="parent" role="button" tabindex="0"
				(click)="selectRole('parent')" (keydown)="onKeySelect($event, 'parent')"
				[class.active]="selectedRole === 'parent'" [attr.aria-pressed]="selectedRole === 'parent'">

				<div class="row">
					<div class="col-6 p-l-0">
						<img src="assets/Images-Transparent/Image-Role-Parent.png" alt="">
					</div>

					<div class="col-6">
						<h2>Parent</h2>
						<h4>Grow together</h4>
						<h4>Link with child</h4>
						<h4>Track progress</h4>
					</div>
				</div>
			</div>

			<!--
		<div class="role-selector container p-0" data-role="self" style="margin-top: 25px">
			<div class="row">
				<div class="col-6">
					<h2>Self</h2>
					<h4>Personal Journey</h4>
					<h4>Daily Reflections</h4>
					<h4>Mindful Growth</h4>
				</div>
				<div class="col-6">
					<img src="/assets/app-assets/Onboarding-role-selection-self.svg" alt="">
				</div>
			</div>
		</div>
		-->
			<div>
				<mindful-button type="green" size="full" text="Save & Continue" [disabled]="!selectedRole" (click)="save()"></mindful-button>
			</div>
		</div>
	</div>

	<div class="step step-2" *ngIf="currentStep === 2">
		<mindful-navigator heading="Instructions" backIcon="arrowSvg" (back)="prevStep()"></mindful-navigator>

		<div class="container" style="max-width:420px; margin: 16px auto;">
			<instructio-list [items]="selectedRole === 'child' ? childRoleInstructions : roleSelectionInstructions" type="role-selection-instruction"></instructio-list>
		</div>

		<profile-facts [faqs]="selectedRole === 'child' ? profileChildFaqs : profileParentFaqs"></profile-facts>

		<div style="margin-top:20px; text-align:center;">
			<mindful-button type="green" size="full" text="Next" (click)="save()"></mindful-button>
		</div>
	</div>

	<div class="step step-3" *ngIf="currentStep === 3">
		<mindful-navigator heading="Create your account" backIcon="arrowSvg" (back)="prevStep()"></mindful-navigator>

		<div class="container w-full p-0" style="display: flex; justify-content: center; align-items: center;">
			<div class="container w-full p-0" style="padding: 20px 0px !important; max-width:420px; width:100%">
				<div *ngIf="selectedRole !== 'child'" class="toggle-buttons">
					<button [class.active]="selectedFamilyAction === 'create'"
						(click)="setFamilyAction('create')">Create Family</button>
					<button [class.active]="selectedFamilyAction === 'join'" (click)="setFamilyAction('join')">Join
						Family</button>
				</div>

				<div style="position:relative;">
				<profile-edit-input 
					desc="For naming your family"
					[placeholder]="selectedFamilyAction === 'create' ? 'Set family name' : 'Enter family code or scan QR'"
					[value]="familyInput"
					(valueChange)="onFamilyInputChange($event)">
				</profile-edit-input>

				<button *ngIf="selectedFamilyAction === 'join'" (click)="onScanQr()" aria-label="Scan QR"
					[disabled]="isSubmitting"
					style="position:absolute; right:8px; top:50%; transform:translateY(-50%); border:none; background:transparent; padding:6px; display:flex; align-items:center; cursor: pointer; z-index: 10;">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" [style.opacity]="isSubmitting ? 0.5 : 1">
						<path
							d="M0 8V0H8V8H0ZM2 6H6V2H2V6ZM0 18V10H8V18H0ZM2 16H6V12H2V16ZM10 8V0H18V8H10ZM12 6H16V2H12V6ZM16 18V16H18V18H16ZM10 12V10H12V12H10ZM12 14V12H14V14H12ZM10 16V14H12V16H10ZM12 18V16H14V18H12ZM14 16V14H16V16H14ZM14 12V10H16V12H14ZM16 14V12H18V14H16Z"
							fill="#282527" />
					</svg>
				</button>
			</div>

			<div style="margin-top:20px; text-align:center;">
				<mindful-button type="green" size="full"
					[text]="(isSubmitting ? 'Processing...' : (selectedFamilyAction === 'create' ? 'Create Family' : 'Join Family'))"
					[disabled]="!isFormValid() || isSubmitting" (click)="save()"></mindful-button>

				<div style="margin-top:18px; max-width:420px; margin-left:auto; margin-right:auto;">
					<profile-facts [faqs]="faqsForStep3"></profile-facts>
				</div>
			</div>
		</div>
	</div>
`,
  styles: [`
.step-1,
.step-2,
.step-3 {
  padding: 16px;
}

.select-role {
  .select-role__container {
    max-width: 420px;
    margin: 0 auto;
    text-align: center;
  }

  &__title {
    font-size: 20px;
    margin-bottom: 16px;
    color: var(--ion-color-primary-contrast);
  }

  &__options {
    display: grid;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__option {
    --border-radius: 8px;
    --padding-start: 18px;
    --padding-end: 18px;
  }

  &__option--primary {
    --background: var(--ion-color-primary);
    color: white;
  }

  &__note {
    font-size: 13px;
    color: var(--ion-color-medium);
  }
}

/* Copied styles for steps 1-3 from signup component */
.role-selector {
  overflow: hidden;
  padding-top: 25px !important;
  padding-left: 15px !important;
  position: relative;
  border: 5px solid transparent;
  transition: 0.2s;
  border-radius: 32px;
  background: #FFF;
  box-shadow: 0 0 10px 5px rgba(107, 101, 106, 0.10);

  h2 {
    font-weight: 500;
    font-size: 40px;
    text-align: left;
    color: #282527;
    margin: 10px 0px 15px 0px;
  }

  h4 {
    font-weight: 400;
    font-size: 20px;
    text-align: left;
    opacity: 0.5;
  }

  &.active {
    border: 4px solid #4CAF50;
    border-radius: 32px;
    background: #FFF;
    box-shadow: 0 0 2px 2px rgba(107, 101, 106, 0.10);
  }

  &:hover {
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 3px solid rgba(76, 175, 80, 0.25);
    outline-offset: 4px;
  }

  &::before {
    content: '\\f00c';
    font-family: 'Font Awesome 6 Free', serif;
    font-weight: 900;
    position: absolute;
    top: 12px;
    right: 10px;
    width: 24px;
    aspect-ratio: 1;
    border-radius: 100px;
    background: #4CAF50;
    font-size: 12px;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: 0.2s;
  }

  &.active::before {
    opacity: 1;
  }
}

.toggle-buttons {
  display: flex;
  margin-bottom: 20px;
  border-radius: 40px;
  background: rgba(76, 175, 80, 0.20);

  button {
    flex: 1;
    padding: 0.7rem;
    border: none;
    border-radius: 30px;
    font-weight: 500;
    cursor: pointer;
    margin: 6px;
    background: transparent;
    color: #282527;

    &.active {
      background: #4CAF50;
      color: white;
    }
  }
}

.input-group {
  margin-bottom: 1rem;
  position: relative;

  input {
    width: 100%;
    padding: 0.8rem;
    border-radius: 10px !important;
    font-size: 1rem;
    background: #ffffff;
    border: 2px solid transparent;
    transition: 0.2s;

    &:focus,
    &:active,
    &:hover,
    &:focus-visible {
      border: 2px solid #ffffff;
      outline: none;
    }
  }
}

.signup-btn {
  width: 100%;
  background: #ffffff;
  padding: 0.9rem;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  color: white;
  margin-bottom: 1rem;
  cursor: pointer;

  &.active-bg {
    background: #4CAF50;
  }
}

.or-divider {
  text-align: center;
  margin: 1rem 0;

  span {
    background: #ffe9db;
    padding: 0 10px;
  }

  &::before,
  &::after {
    content: '';
    display: inline-block;
    height: 1px;
    background: #c08464;
    width: 40%;
    vertical-align: middle;
  }
}

.social-logins {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0px;
  gap: 40px;
  width: 200px;
  height: 40px;
  margin-bottom: 2rem;
  margin-top: 1.2rem;

  .social-btn {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
  }
}

.login-text {
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 500;
  font-size: 16px;
  color: #282527;

  a {
    color: #282527;
    font-weight: bold;
  }
}

.whatsapp-checkbox {
  align-items: center;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  gap: 0.5rem;
  font-weight: 500;
  color: #282527;
}

.terms {
  font-size: 0.75rem;
  text-align: center;
  color: #282527;

  a {
    color: #282527;
    font-weight: bold;
  }
}

/* Ensure the image column places the image at the bottom */
.role-selector {
  .row {
    display: flex;
    align-items: stretch;
  }

  .col-6 {
    display: flex;
    flex-direction: column;
  }

  .col-6 img {
    max-width: 100%;
    height: auto;
    margin-top: auto; /* push image to bottom */
    display: block;
  }
}
`]
})
export class RoleSelectComponent {
  // currently selected role: 'child' | 'parent' | 'self' | null
  selectedRole: string | null = null;
  currentStep = 1;

  roleSelectionInstructions: string[] = [
    'Create your family in the next step to get started.',
    'You\'ll receive a unique family code and QR code instantly.',
    'Share the code with your child or let them scan the QR code on their device.',
    'Once your child enters the code, you\'ll both be connected and can track progress together!'
  ];

  // Instructions shown when a child selects the role
  childRoleInstructions: string[] = [
    'Ask your parent to create their account on their device.',
    'After signup, your parent creates a family in the app.',
    'Your parent will see a family code and a QR code.',
    'Enter the family code or scan the QR code in the next screen to join their family.',
    'Once linked, you are good to proceed !'
  ];

  faqsForSelectRole = [
    { question: "What if my child doesn't have the app downloaded yet?", answer: '' },
    { question: "Can I add multiple children to the same family?", answer: '' },
    { question: "What if the family code stops working or expires?", answer: '' },
    { question: "What if I want to join someone else's family instead of creating my own?", answer: '' }
  ];

  // Filtered FAQ lists derived from the shared PROFILE_FAQS
  profileChildFaqs = PROFILE_FAQS.filter(f => f.screen === 'Instructions- Child (Pre Linking)');
  profileParentFaqs = PROFILE_FAQS.filter(f => f.screen === 'Instructions-Parents');

  // FAQs shown on Step 3 (Account Creation)
  faqsForStep3 = [
    { question: "What if I don't have the family code or QR yet?", answer: '' },
    { question: "Can I add multiple children to the same family?", answer: '' },
    { question: "What happens if the code is wrong or expired?", answer: '' },
    { question: "Can I use the app without linking right now?", answer: '' }
  ];

  // Family flow toggle for Step 3: 'create' | 'join'
  selectedFamilyAction: 'create' | 'join' = 'create';
  familyInput: string = ''; // Family name or family code input
  isSubmitting: boolean = false; // Loading state

  setFamilyAction(action: 'create' | 'join') {
    this.selectedFamilyAction = action;
    this.familyInput = ''; // Reset input when switching actions
  }

  /**
   * Handle family input changes
   */
  onFamilyInputChange(value: string | null) {
    this.familyInput = value || '';
  }

  /**
   * Validate form before submission
   */
  isFormValid(): boolean {
    if (!this.familyInput || !this.familyInput.trim()) {
      return false;
    }
    return true;
  }

  /**
   * Join family via API
   */
  private async joinFamilyViaApi(): Promise<void> {
    if (!this.isFormValid()) {
      await this.showToast('Please enter a family code', 'warning');
      return;
    }

    if (!this.selectedRole) {
      await this.showToast('Role not selected', 'danger');
      return;
    }

    this.isSubmitting = true;
    const familyCode = this.familyInput.trim();
    const relationship = this.selectedRole.toLowerCase();

    this.familyService
      .joinFamilyWithCode(familyCode, relationship)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('✅ Family join SUCCESS:', response);
          this.isSubmitting = false;

          // Update user_data relationship
          const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
          userData.relationship = relationship.toUpperCase();
          localStorage.setItem('user_data', JSON.stringify(userData));

          // Redirect immediately
          this.router.navigate(['/authed/family-connection']);
        },
        error: (error) => {
          console.error('❌ Family join ERROR:', error);
          this.isSubmitting = false;

          // If HTTP 200 but JSON parsing failed (server returned plain text), treat as success
          if (error.status === 200) {
            console.log('✅ Join succeeded (text response), redirecting...');
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            userData.relationship = relationship.toUpperCase();
            localStorage.setItem('user_data', JSON.stringify(userData));
            this.router.navigate(['/authed/family-connection']);
            return;
          }

          // Actual error
          this.showToast('Failed to join family', 'danger');
        }
      });
  }

  /**
   * Create family via API
   */
  private async createFamilyViaApi(): Promise<void> {
    if (!this.isFormValid()) {
      await this.showToast('Please enter a family name', 'warning');
      return;
    }

    this.isSubmitting = true;
    const familyName = this.familyInput.trim();

    this.familyService
      .createFamily(familyName)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('✅ Family create SUCCESS:', response);
          this.isSubmitting = false;

          // Update user_data relationship
          const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
          userData.relationship = 'PARENT';
          localStorage.setItem('user_data', JSON.stringify(userData));

          // Redirect immediately
          this.router.navigate(['/authed/family-connection']);
        },
        error: (error) => {
          console.error('❌ Family create ERROR:', error);
          this.isSubmitting = false;

          // If HTTP 200 but JSON parsing failed (server returned plain text), treat as success
          if (error.status === 200) {
            console.log('✅ Create succeeded (text response), redirecting...');
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            userData.relationship = 'PARENT';
            localStorage.setItem('user_data', JSON.stringify(userData));
            this.router.navigate(['/authed/family-connection']);
            return;
          }

          // Actual error
          this.showToast('Failed to create family', 'danger');
        }
      });
  }

  /**
   * Extract user-friendly error message from HTTP error response
   */
  private extractErrorMessage(error: any): string {
    // Check for common error structures
    if (error?.error?.message) return error.error.message;
    if (error?.error?.error) return error.error.error;
    if (error?.message) return error.message;
    if (error?.status === 404) return 'Family code not found. Please check and try again.';
    if (error?.status === 400) return 'Invalid family code or relationship. Please try again.';
    if (error?.status === 401 || error?.status === 403) return 'Authentication failed. Please login again.';
    if (error?.status === 409) return 'You are already a member of this family.';
    if (error?.status >= 500) return 'Server error. Please try again later.';
    return 'Failed to process request. Please try again.';
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      buttons: [
        {
          text: 'Close',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  // Placeholder handler for QR scan action. Navigates to scan-qr page.
  onScanQr() {
    // prefer Router navigation to match app conventions
    try {
      this.router.navigate(['/home/scan-qr']).catch(() => { });
    } catch (e) {
      // fallback log
      console.error('QR scan navigation error:', e);
    }
  }

  constructor(
    private router: Router,
    private navigationService: NavigationService,
    private familyService: FamilyService,
    private toastController: ToastController,
    private authService: AuthService
  ) { }

  selectRole(role: string) {
    this.selectedRole = role;
    // If user picks child role, they must join a family (cannot create)
    if (role === 'child') {
      this.selectedFamilyAction = 'join';
    } else if (role === 'parent') {
      this.selectedFamilyAction = 'create';
    }
  }

  // allow keyboard selection via Enter/Space
  onKeySelect(event: KeyboardEvent, role: string) {
    const key = event.key;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      this.selectRole(role);
    }
  }

  /**
   * Save/continue handler. Advances through steps:
   * - On step 1: require selectedRole, then go to step 2
   * - On step 2: go to step 3
   * - On step 3: finalize (finish flow)
   */
  save() {
    if (this.currentStep === 1) {
      if (!this.selectedRole) return; // guard
      console.log('Selected role:', this.selectedRole);
      this.nextStep();
      return;
    }

    if (this.currentStep === 2) {
      this.nextStep();
      return;
    }

    if (this.currentStep === 3) {
      this.finish();
      return;
    }
  }

  nextStep() {
    if (this.currentStep < 3) this.currentStep += 1;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep -= 1;
  }

  finish() {
    // Finalize account creation / family join or creation
    console.log('Finishing flow. Role:', this.selectedRole, 'Action:', this.selectedFamilyAction);

    // For child role, always join family
    if (this.selectedRole === 'child' || this.selectedFamilyAction === 'join') {
      this.joinFamilyViaApi();
    } else if (this.selectedFamilyAction === 'create') {
      // For parent creating family
      this.createFamilyViaApi();
    }
  }

  goBack() {
    // Use the app's navigation service for proper back navigation
    this.navigationService.back();
  }
}


