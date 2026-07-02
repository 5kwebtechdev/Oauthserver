import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { InstructioListComponent } from '../family-connection/instructio-list';
import { ProfileFactsComponent, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { NavigationService } from '../../../services/navigation.service';
import { FamilyService } from '../../../services/family.service';
import { AuthService } from '../../../services/auth.service';
import { take } from 'rxjs/operators';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  standalone: true,
  selector: 'role-select',
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, InstructioListComponent, ProfileFactsComponent, ProfileEditInputComponent, QRCodeComponent],
  template: `
<ion-content>
	<div class="step step-1" *ngIf="currentStep === 1">
		<superme-navigator heading="Select the role" backIcon="arrowSvg" (back)="goBack()"></superme-navigator>
		<div class="d-flex flex-column gap-4">
			<div class="role-selector container p-0" *ngIf="shouldShowChildRole()" data-role="child" role="button" tabindex="0"
				(click)="selectRole('child')" (keydown)="onKeySelect($event, 'child')"
				[class.active]="selectedRole === 'child'" [attr.aria-pressed]="selectedRole === 'child'">

				<div class="row">
					<div class="col-6">
						<h2 style="padding-left:10px;">Child</h2>
						<h4 style="padding-left:10px;">Learn and grow</h4>
						<h4 style="padding-left:10px;">Link with your parents</h4>
						<h4 style="padding-left:10px;">Earn rewards together</h4>
					</div>
					<div class="col-6 p-l-0 child-role-image">
						<img src="assets/Images-Transparent/Image-Role-Child.png" alt="">
					</div>
				</div>
			</div>

			<div class="role-selector container p-0" *ngIf="shouldShowParentRole()" data-role="parent" role="button" tabindex="0"
				(click)="selectRole('parent')" (keydown)="onKeySelect($event, 'parent')"
				[class.active]="selectedRole === 'parent'" [attr.aria-pressed]="selectedRole === 'parent'">

				<div class="row">
					<div class="col-6 p-l-0 image-parent">
						<img src="assets/Images-Transparent/Image-Role-Parent.png" alt="">
					</div>

					<div class="col-6">
						<h2 style="text-align: right; padding-right: 10px;">Parent</h2>
						<h4 style="text-align: right; padding-right: 10px;">Grow together</h4>
						<h4 style="text-align: right; padding-right: 10px;">Link with child</h4>
						<h4 style="text-align: right; padding-right: 10px;">Track progress</h4>
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
					<h4>Superme Growth</h4>
				</div>
				<div class="col-6">
					<img src="/assets/app-assets/Onboarding-role-selection-self.svg" alt="">
				</div>
			</div>
		</div>
		-->
			<div>
				<superme-button type="green" size="full" text="Save & Continue" [disabled]="!selectedRole" (click)="save()"></superme-button>
			</div>
		</div>
	</div>

	<div class="step step-2" *ngIf="currentStep === 2">
		<superme-navigator heading="Instructions" backIcon="arrowSvg" (back)="prevStep()"></superme-navigator>

		<div class="container" style="max-width:420px; margin: 16px auto;">
			<instructio-list [items]="selectedRole === 'child' ? childRoleInstructions : roleSelectionInstructions" type="role-selection-instruction"></instructio-list>
		</div>

		<profile-facts [faqs]="selectedRole === 'child' ? profileChildFaqs : profileParentFaqs"></profile-facts>

		<div style="margin-top:20px; text-align:center;">
			<superme-button type="green" size="full" text="Next" (click)="save()"></superme-button>
		</div>
	</div>

  <div class="step step-3" *ngIf="currentStep === 3">
    <superme-navigator *ngIf="!familyCreated" heading="Create your account" backIcon="arrowSvg" (back)="prevStep()"></superme-navigator>

		<div class="container w-full p-0" style="display: flex; justify-content: center; align-items: center;">
			<div class="container w-full p-0" style="padding: 20px 0px !important; max-width:420px; width:100%">
				
				<!-- FAMILY CREATION FORM (before family is created) -->
				<ng-container *ngIf="!familyCreated">
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

					<div *ngIf="selectedFamilyAction === 'join' && familyInput && familyInput.length === 8" style="margin-top: 0.5rem;">
						<div *ngIf="isCheckingFamilyCode" style="color: #1976d2; font-size: 0.85rem; font-weight: 500;">Checking code...</div>
						<div *ngIf="!isCheckingFamilyCode && familyCodeValidationStatus === 'valid'" style="color: #4CAF50; font-size: 0.85rem; font-weight: 600;">✓ Family code is valid</div>
						<div *ngIf="!isCheckingFamilyCode && familyCodeValidationStatus === 'invalid'" style="color: #d32f2f; font-size: 0.85rem; font-weight: 600;">✗ Family code is invalid!</div>
					</div>
				</div>

				<div style="margin-top:20px; text-align:center;">
					<superme-button type="green" size="full"
						[text]="(isSubmitting ? 'Processing...' : (selectedFamilyAction === 'create' ? 'Create Family' : 'Join Family'))"
						[disabled]="!isFormValid() || isSubmitting" (click)="save()"></superme-button>

					<div style="margin-top:18px; max-width:420px; margin-left:auto; margin-right:auto;">
						<profile-facts [faqs]="faqsForStep3"></profile-facts>
					</div>
				</div>
				</ng-container>

				<!-- FAMILY CREATED SUCCESS STATE (after family is created) -->
				<ng-container *ngIf="familyCreated">
					<div class="family-success-section">
						<div class="success-header">
							<h5 class="success-title">Family Created Successfully!</h5>
              <h5 class="success-title">Your Self account is converted to Parent account.</h5>
						</div>

						<div class="family-code-section">
							<p class="code-label">Your Family Code</p>
							<div class="code-display">
								<span class="code-text">{{ familyCode }}</span>
								<button class="copy-btn" (click)="copyFamilyCode()" aria-label="Copy family code">
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="15" viewBox="0 0 13 15" fill="none">
  <path d="M11.3333 12H4C3.63333 12 3.31944 11.8694 3.05833 11.6083C2.79722 11.3472 2.66667 11.0333 2.66667 10.6667V1.33333C2.66667 0.966667 2.79722 0.652778 3.05833 0.391667C3.31944 0.130556 3.63333 0 4 0H8.66667L12.6667 4V10.6667C12.6667 11.0333 12.5361 11.3472 12.275 11.6083C12.0139 11.8694 11.7 12 11.3333 12ZM8 4.66667V1.33333H4V10.6667H11.3333V4.66667H8ZM1.33333 14.6667C0.966667 14.6667 0.652778 14.5361 0.391667 14.275C0.130556 14.0139 0 13.7 0 13.3333V4H1.33333V13.3333H8.66667V14.6667H1.33333Z" fill="#282527"/>
</svg>
								</button>
							</div>
						</div>

						<div class="divider">
							<span>OR</span>
						</div>

						<div class="qr-code-section">
							<div class="qr-code-container">
								<qrcode [qrdata]="qrCodeData" [width]="200" [errorCorrectionLevel]="'M'" [elementType]="'canvas'" [margin]="2" cssClass="qr-canvas">
								</qrcode>
							</div>
							<button class="share-qr-btn" (click)="shareQRCode()">
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" fill="none">
  <path d="M10 13.3333C9.44444 13.3333 8.97222 13.1389 8.58333 12.75C8.19444 12.3611 8 11.8889 8 11.3333C8 11.2667 8.01667 11.1111 8.05 10.8667L3.36667 8.13333C3.18889 8.3 2.98333 8.43056 2.75 8.525C2.51667 8.61944 2.26667 8.66667 2 8.66667C1.44444 8.66667 0.972222 8.47222 0.583333 8.08333C0.194444 7.69444 0 7.22222 0 6.66667C0 6.11111 0.194444 5.63889 0.583333 5.25C0.972222 4.86111 1.44444 4.66667 2 4.66667C2.26667 4.66667 2.51667 4.71389 2.75 4.80833C2.98333 4.90278 3.18889 5.03333 3.36667 5.2L8.05 2.46667C8.02778 2.38889 8.01389 2.31389 8.00833 2.24167C8.00278 2.16944 8 2.08889 8 2C8 1.44444 8.19444 0.972222 8.58333 0.583333C8.97222 0.194444 9.44444 0 10 0C10.5556 0 11.0278 0.194444 11.4167 0.583333C11.8056 0.972222 12 1.44444 12 2C12 2.55556 11.8056 3.02778 11.4167 3.41667C11.0278 3.80556 10.5556 4 10 4C9.73333 4 9.48333 3.95278 9.25 3.85833C9.01667 3.76389 8.81111 3.63333 8.63333 3.46667L3.95 6.2C3.97222 6.27778 3.98611 6.35278 3.99167 6.425C3.99722 6.49722 4 6.57778 4 6.66667C4 6.75556 3.99722 6.83611 3.99167 6.90833C3.98611 6.98056 3.97222 7.05555 3.95 7.13333L8.63333 9.86667C8.81111 9.7 9.01667 9.56944 9.25 9.475C9.48333 9.38056 9.73333 9.33333 10 9.33333C10.5556 9.33333 11.0278 9.52778 11.4167 9.91667C11.8056 10.3056 12 10.7778 12 11.3333C12 11.8889 11.8056 12.3611 11.4167 12.75C11.0278 13.1389 10.5556 13.3333 10 13.3333ZM10 12C10.1889 12 10.3472 11.9361 10.475 11.8083C10.6028 11.6806 10.6667 11.5222 10.6667 11.3333C10.6667 11.1444 10.6028 10.9861 10.475 10.8583C10.3472 10.7306 10.1889 10.6667 10 10.6667C9.81111 10.6667 9.65278 10.7306 9.525 10.8583C9.39722 10.9861 9.33333 11.1444 9.33333 11.3333C9.33333 11.5222 9.39722 11.6806 9.525 11.8083C9.65278 11.9361 9.81111 12 10 12ZM2 7.33333C2.18889 7.33333 2.34722 7.26944 2.475 7.14167C2.60278 7.01389 2.66667 6.85556 2.66667 6.66667C2.66667 6.47778 2.60278 6.31944 2.475 6.19167C2.34722 6.06389 2.18889 6 2 6C1.81111 6 1.65278 6.06389 1.525 6.19167C1.39722 6.31944 1.33333 6.47778 1.33333 6.66667C1.33333 6.85556 1.39722 7.01389 1.525 7.14167C1.65278 7.26944 1.81111 7.33333 2 7.33333ZM10 2.66667C10.1889 2.66667 10.3472 2.60278 10.475 2.475C10.6028 2.34722 10.6667 2.18889 10.6667 2C10.6667 1.81111 10.6028 1.65278 10.475 1.525C10.3472 1.39722 10.1889 1.33333 10 1.33333C9.81111 1.33333 9.65278 1.39722 9.525 1.525C9.39722 1.65278 9.33333 1.81111 9.33333 2C9.33333 2.18889 9.39722 2.34722 9.525 2.475C9.65278 2.60278 9.81111 2.66667 10 2.66667Z" fill="white"/>
</svg>
								Share QR code
							</button>
						</div>

            <!-- First button: Child has done the required -->
            <superme-button
              *ngIf="!childCompletedTask"
              type="green"
              size="full"
              text="My child has done the required"
              [disabled]="isSubmitting"
              (click)="onChildTaskCompleted()">
            </superme-button>

            <!-- Second button: Go to Parent account (shows after confirming child done) -->
            <superme-button
              *ngIf="childCompletedTask"
              type="green"
              size="full"
              text="Let's Begin"
              [disabled]="isSubmitting"
              (click)="beginParentAccount()">
            </superme-button>
					</div>
				</ng-container>

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
  // padding-left: 15px !important;
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
  h5{margin: 0px;}


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

/* Role card image sizing */
.role-selector {
  // height: 150px;

  .row {
    display: flex;
    align-items: stretch;
    height: 100%;
  }

  .col-6 {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }

  .col-6 img {
    max-height: 150px;
    width: auto;
    max-width: 100%;
    object-fit: cover;
    margin-top: auto;
    display: block;
    align-self: flex-end;
  }

  h2 {
    font-size: 26px !important;
    margin: 0 0 6px 0 !important;
  }

  h4 {
    font-size: 13px !important;
  }
}

/* ============ QR CODE SECTION STYLES (matching family-onboard) ============ */
.family-success-section {
  margin: 2rem 0;
}

.success-header {
  text-align: center;
}

.success-title {
 color: #4CAF50;
text-align: center;
font-family: Nunito;
font-size: 16px;
font-weight: 600;
  margin: 0;
}

.family-code-section {
      margin: 1.5rem 0;
    padding: 0 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.code-label {
  font-size: 0.85rem;
  color: #888;
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}

.code-display {
  display: flex;
  align-items: center;
  gap: 1rem;
 
}

.code-text {
 color: #282527;
    font-family: Nunito;
    font-size: 20px;
    font-weight: 700;
}

.copy-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.7;
  }
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #ddd;
  }

}

.qr-code-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
}

.qr-code-container {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  
  .qr-canvas {
    canvas {
      max-width: 100%;
      height: auto;
    }
  }
}

.share-qr-btn {
  display: flex;
    padding: 8px;
    justify-content: center;
    align-items: center;
    gap: 6px;
    border-radius: 32px;
    background: #4CAF50;
    color: #FFF;
    font-family: Nunito;
    font-size: 13px;
    font-weight: 500;
  
  &:hover {
    background: #f0f8f4;
  }
}
`]
})
export class RoleSelectComponent implements OnDestroy {
  // currently selected role: 'child' | 'parent' | 'self' | null
  selectedRole: string | null = null;
  currentStep = 1;

  // User data and account type
  userAccountType: 'child' | 'parent' | 'self' | null = null;
  userAge: number | null = null;
  userDob: string | null = null;

  roleSelectionInstructions: string[] = [
    'Create a new family or join an existing one to continue as a Parent.',
    'If you create a family, you will receive a family code and QR code to share with your child.',
    'If you join a family, enter the family code shared by the family creator.',
    'Once connected, you can support your child with progress tracking, routines, approvals, and rewards.'
  ];

  // Instructions shown when a child selects the role
  childRoleInstructions: string[] = [
    'Choose Child when you want to connect your account with a parent or guardian.',
    'Ask your parent for their family code or scan the QR code from their app.',
    'Enter the code on the next screen to send your join request.',
    'After joining, your parent can view family-linked progress and help you with routines and rewards.',
    'Your personal account, notes, coins, pet, and learning progress stay safe.'
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

  // Family creation state
  familyCreated: boolean = false;
  familyCode: string = '';
  qrCodeData: string = '';
  createdFamilyName: string = '';
  childCompletedTask: boolean = false; // Track if child has completed task

  // Family code validation state
  familyCodeValidationStatus: 'valid' | 'invalid' | null = null;
  isCheckingFamilyCode = false;
  private familyCodeCheckTimeout: any;

  setFamilyAction(action: 'create' | 'join') {
    this.selectedFamilyAction = action;
    this.familyInput = ''; // Reset input when switching actions
    this.familyCodeValidationStatus = null; // Reset validation status
  }

  /**
   * Handle family input changes
   */
  onFamilyInputChange(value: string | null) {
    const raw = (value || '').toString();

    if (this.selectedFamilyAction === 'join') {
      const normalized = raw.trim().toUpperCase().slice(0, 8);
      this.familyInput = normalized;

      if (this.familyInput.length === 8) {
        this.onJoinFamilyCodeInputChange(this.familyInput);
      } else {
        this.familyCodeValidationStatus = null;
      }

      return;
    }

    this.familyInput = raw;
    this.familyCodeValidationStatus = null;
  }

  /**
   * Handle family code input change when joining
   * Auto-check when 8 characters are entered
   */
  private onJoinFamilyCodeInputChange(code: string): void {
    // Clear previous timeout
    if (this.familyCodeCheckTimeout) {
      clearTimeout(this.familyCodeCheckTimeout);
    }

    const trimmedCode = code.trim().toUpperCase();

    // Reset validation if code is not 8 characters
    if (trimmedCode.length !== 8) {
      this.familyCodeValidationStatus = null;
      return;
    }

    // Auto-check when exactly 8 characters
    this.checkFamilyCodeValidity(trimmedCode);
  }

  /**
   * Check family code validity via API
   */
  private checkFamilyCodeValidity(familyCode: string): void {
    if (this.isCheckingFamilyCode) return; // Already checking

    this.isCheckingFamilyCode = true;

    this.familyService.checkFamilyCode(familyCode).subscribe({
      next: (response) => {
        this.isCheckingFamilyCode = false;
        if (response.exists) {
          this.familyCodeValidationStatus = 'valid';
        } else {
          this.familyCodeValidationStatus = 'invalid';
        }
      },
      error: (error) => {
        this.isCheckingFamilyCode = false;
        console.error('Error checking family code:', error);
        this.familyCodeValidationStatus = 'invalid';
      }
    });
  }

  /**
   * Validate form before submission
   */
  isFormValid(): boolean {
    if (!this.familyInput || !this.familyInput.trim()) {
      return false;
    }

    // If user selected Join, family code must be exactly 8 characters
    if (this.selectedFamilyAction === 'join') {
      const trimmed = this.familyInput.trim();
      if (trimmed.length !== 8) return false;
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

  private async joinFamilyViaApiV2(): Promise<void> {
    if (!this.isFormValid()) {
      await this.showToast('Please enter a family code', 'warning');
      return;
    }

    if (!this.selectedRole) {
      await this.showToast('Role not selected', 'danger');
      return;
    }

    this.isSubmitting = true;
    const familyCode = this.familyInput.trim().toUpperCase();
    const relationship = this.selectedRole.toUpperCase() as 'CHILD' | 'PARENT';

    this.familyService
      .joinFamilyWithCode(familyCode, relationship)
      .pipe(take(1))
      .subscribe({
        next: async (response) => {
          this.isSubmitting = false;
          this.applyRoleConversionResponse(response, relationship, familyCode);
          await this.showToast("You're connected to your family", 'success');

          const target = relationship === 'PARENT' ? '/authed/parent-account' : '/authed/user-dashboard';
          this.router.navigate([target], { replaceUrl: true });
        },
        error: (error) => {
          this.isSubmitting = false;

          if (error.status === 200) {
            this.applyRoleConversionResponse({}, relationship, familyCode);
            const target = relationship === 'PARENT' ? '/authed/parent-account' : '/authed/user-dashboard';
            this.router.navigate([target], { replaceUrl: true });
            return;
          }

          this.showToast(this.getRoleSwitchErrorMessage(error), 'danger');
        }
      });
  }

  private async createFamilyViaApiV2(): Promise<void> {
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
          this.isSubmitting = false;
          this.applyRoleConversionResponse(response, 'PARENT', response?.familyCode, response?.familyName || familyName);
          this.familyCreated = true;
          this.familyCode = response?.familyCode || this.familyCode;
          this.createdFamilyName = response?.familyName || familyName;
          this.qrCodeData = this.familyCode ? 'GROUP:' + this.familyCode : '';
        },
        error: (error) => {
          this.isSubmitting = false;

          if (error.status === 200) {
            this.applyRoleConversionResponse({}, 'PARENT', this.familyCode, familyName);
            this.familyCreated = true;
            this.createdFamilyName = familyName;
            this.qrCodeData = this.familyCode ? 'GROUP:' + this.familyCode : '';
            return;
          }

          this.showToast(this.getRoleSwitchErrorMessage(error), 'danger');
        }
      });
  }

  private applyRoleConversionResponse(
    response: any,
    relationship: 'CHILD' | 'PARENT',
    fallbackFamilyCode?: string,
    fallbackFamilyName?: string
  ): void {
    if (response?.token) {
      this.authService.replaceAuthToken(response.token);
    }

    const currentUser = this.authService.getUserData() || this.readStoredUserData();
    const familyCode = response?.familyCode || fallbackFamilyCode || currentUser?.family?.familyCode || currentUser?.familyCode || '';
    const familyName = response?.familyName || fallbackFamilyName || currentUser?.family?.familyName || currentUser?.familyName || '';
    const updatedUser = {
      ...currentUser,
      relationship,
      familyCode,
      familyName,
      family: familyCode || familyName
        ? {
            ...(currentUser?.family || {}),
            familyCode,
            familyName
          }
        : currentUser?.family
    };

    this.authService.setUserData(updatedUser);
  }

  private readStoredUserData(): any {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }

  private getRoleSwitchErrorMessage(error: any): string {
    const normalized = this.extractBackendMessage(error).toLowerCase();
    if (normalized.includes('family not found')) return 'Invalid code. Double-check the code before entering.';
    if (normalized.includes('only two parents')) return 'This family already has 2 parents. You cannot join as parent.';
    if (normalized.includes('only two children')) return 'This family already has 2 children. Contact your parent.';
    if (normalized.includes('only self users can convert')) return 'You have already switched roles.';
    if (normalized.includes('already belongs to a family')) return 'You are already part of a family.';
    if (normalized.includes('family name is required')) return 'Family name is required.';
    if (normalized.includes('family code is required')) return 'Family code is required.';
    return this.extractErrorMessage(error);
  }

  private extractBackendMessage(error: any): string {
    if (error?.error?.message) return String(error.error.message);
    if (typeof error?.error === 'string') return error.error;
    if (error?.message) return String(error.message);
    return '';
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
  ) {
    this.loadUserData();
  }

  /**
   * Load user data from localStorage to determine account type and age
   */
  private loadUserData(): void {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsedData = JSON.parse(userData);
        this.userAccountType = (parsedData.relationship as 'CHILD' | 'PARENT' | 'SELF')?.toLowerCase() as any;
        this.userDob = parsedData.dateOfBirth;
        if (this.userDob) {
          this.userAge = this.calculateAge(this.userDob);
          console.log('[RoleSelect] User age calculated:', this.userAge);
        }
      }
    } catch (e) {
      console.error('[RoleSelect] Error loading user data:', e);
    }
  }

  /**
   * Calculate age from date of birth
   * @param dob Date of birth in any parseable format
   * @returns Age in years
   */
  private calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Check if child role should be shown based on age
   * For 'self' users: show child if under 18
   * For other account types: always show child
   */
  shouldShowChildRole(): boolean {
    if (this.userAccountType !== 'self') {
      return true;
    }
    if (this.userAge === null) {
      return true; // Show if age not available
    }
    return this.userAge < 18;
  }

  /**
   * Check if parent role should be shown based on age
   * For 'self' users: show parent if 24 or above
   * For other account types: always show parent
   */
  shouldShowParentRole(): boolean {
    if (this.userAccountType !== 'self') {
      return true;
    }
    if (this.userAge === null) {
      return true; // Show if age not available
    }
    return this.userAge >= 25;
  }

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
      this.joinFamilyViaApiV2();
    } else if (this.selectedFamilyAction === 'create') {
      this.createFamilyViaApiV2();
    }
  }

  async beginParentAccount(): Promise<void> {
    await this.router.navigate(['/authed/parent-account'], { replaceUrl: true });
  }

  /**
   * Create family locally and show QR code screen
   */
  private createFamilyLocally(): void {
    if (!this.isFormValid()) {
      this.showToast('Please enter a family name', 'warning');
      return;
    }

    this.isSubmitting = true;
    const familyName = this.familyInput.trim();
    this.createdFamilyName = familyName;

    // Simulate family creation - in real app, call API
    this.familyService.createFamily(familyName).pipe(take(1)).subscribe({
      next: (response) => {
        console.log('✅ Family created:', response);
        this.familyCreated = true;
        this.familyCode = response.familyCode || this.generateFamilyCode();
        this.qrCodeData = 'GROUP:' + this.familyCode;

        // Automatically call self-to-parent API with family code and name
        this.convertSelfToParent(this.familyCode, response.familyName || familyName);
      },
      error: (error) => {
        console.error('❌ Family creation failed:', error);
        this.isSubmitting = false;
        this.showToast('Failed to create family', 'danger');
      }
    });
  }

  /**
   * Convert self account to parent account via API
   */
  private convertSelfToParent(familyCode: string, familyName: string): void {
    console.log('🔄 Converting self to parent with code:', familyCode, 'and name:', familyName);

    this.familyService
      .convertSelfToParent(familyCode, familyName)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('✅ Self-to-parent conversion SUCCESS:', response);
          this.isSubmitting = false;
          // UI is already showing QR code and buttons
        },
        error: (error) => {
          console.error('❌ Self-to-parent conversion failed:', error);
          this.isSubmitting = false;
          // Still allow user to proceed even if conversion fails - they can retry or use the family code
          this.showToast('Note: Family created but conversion encountered an issue. You can still proceed.', 'warning');
        }
      });
  }

  /**
   * Continue after family creation
   */
  continueAfterFamilyCreation(): void {
    if (!this.familyCreated) return;

    // Save family code to localStorage
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    userData.familyCode = this.familyCode;
    userData.familyName = this.createdFamilyName;
    localStorage.setItem('user_data', JSON.stringify(userData));

    // Navigate to next step or dashboard
    this.router.navigate(['/authed/family-connection']);
  }

  /**
   * Handle when child has completed the required task
   */
  onChildTaskCompleted(): void {
    if (!this.familyCreated) return;
    this.childCompletedTask = true;
  }

  /**
   * Logout and redirect to login page
   */
  async goToParentAccount(): Promise<void> {
    if (!this.familyCreated) return;
    this.isSubmitting = true;
    console.log('🚪 Logging out and redirecting to /home/login...');

    try {
      if (this.authService && typeof this.authService.logout === 'function') {
        // Let AuthService perform logout and redirect to /home/login
        try {
          await this.authService.logout();
        } catch (e) {
          console.warn('AuthService.logout threw an error, falling back to client logout:', e);
          localStorage.clear();
          sessionStorage.clear();
          this.router.navigate(['/home/login'], { replaceUrl: true }).catch(err => {
            console.error('Navigation error:', err);
            window.location.href = '/home/login';
          });
        }
      } else {
        // Fallback: clear storage and navigate to /home/login
        localStorage.clear();
        sessionStorage.clear();
        this.router.navigate(['/home/login'], { replaceUrl: true }).catch(err => {
          console.error('Navigation error:', err);
          window.location.href = '/home/login';
        });
      }
    } catch (e) {
      console.error('Unexpected error during logout redirect:', e);
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/home/login'], { replaceUrl: true }).catch(err => {
        console.error('Navigation error:', err);
        window.location.href = '/home/login';
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Copy family code to clipboard
   */
  copyFamilyCode(): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(this.familyCode).then(() => {
        this.showToast('Family code copied to clipboard!', 'success');
      }).catch(() => {
        this.fallbackCopyTextToClipboard(this.familyCode);
      });
    } else {
      this.fallbackCopyTextToClipboard(this.familyCode);
    }
  }

  /**
   * Fallback copy to clipboard for non-secure contexts
   */
  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast('Family code copied to clipboard!', 'success');
    } catch (err) {
      this.showToast('Failed to copy family code', 'danger');
    }
    document.body.removeChild(textArea);
  }

  /**
   * Share QR code via native share or fallback
   */
  shareQRCode(): void {
    if (navigator.share) {
      navigator.share({
        title: 'Family Code',
        text: `Join my family with code: ${this.familyCode}`,
        url: `${window.location.origin}/join-family?code=${this.familyCode}`
      }).catch(() => {
        this.fallbackShare();
      });
    } else {
      this.fallbackShare();
    }
  }

  /**
   * Fallback share when native share not available
   */
  private fallbackShare(): void {
    this.showToast('Share functionality not available on this device', 'warning');
  }

  /**
   * Generate random family code
   */
  private generateFamilyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  goBack() {
    // Use the app's navigation service for proper back navigation
    this.navigationService.back();
  }

  ngOnDestroy() {
    // Clear any pending timeouts
    if (this.familyCodeCheckTimeout) {
      clearTimeout(this.familyCodeCheckTimeout);
    }
  }
}
