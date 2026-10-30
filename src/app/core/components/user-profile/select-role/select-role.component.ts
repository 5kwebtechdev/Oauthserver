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
import { EligibilityOption, RoleEligibilityResponse, RoleEligibilityService } from '../../../services/role-eligibility.service';
import { take } from 'rxjs/operators';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  standalone: true,
  selector: 'role-select',
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, InstructioListComponent, ProfileFactsComponent, ProfileEditInputComponent, QRCodeComponent],
  template: `
<ion-content>
	<div class="step step-1" *ngIf="currentStep === 1">
		<div class="role-flow-shell">
			<superme-navigator heading="Select the role" backIcon="arrowSvg" (back)="goBack()"></superme-navigator>
			<div class="role-options">
			<div class="role-selector container p-0" *ngIf="roleOption('self') && !roleOption('self')?.current" data-role="self" role="button" [attr.tabindex]="canSelectRole('self') ? 0 : -1"
				(click)="selectRole('self')" (keydown)="onKeySelect($event, 'self')"
				[class.active]="selectedRole === 'self'" [class.ineligible]="!canSelectRole('self')" [attr.aria-disabled]="!canSelectRole('self')" [attr.aria-pressed]="selectedRole === 'self'">
				<div class="row">
					<div class="col-6">
						<h2 style="padding-left:10px;">Self</h2>
						<h4 style="padding-left:10px;">Continue your personal journey</h4>
					</div>
					<div class="col-6"></div>
				</div>
				<p class="role-reason" *ngIf="roleReason('self')">{{ roleReason('self') }}</p>
			</div>
			<div class="role-selector container p-0" *ngIf="shouldShowChildRole()" data-role="child" role="button" [attr.tabindex]="canSelectRole('child') ? 0 : -1"
				(click)="selectRole('child')" (keydown)="onKeySelect($event, 'child')"
				[class.active]="selectedRole === 'child'" [class.ineligible]="!canSelectRole('child')" [attr.aria-disabled]="!canSelectRole('child')" [attr.aria-pressed]="selectedRole === 'child'">

				<div class="row">
					<div class="col-6">
						<h2 style="padding-left:10px;">Child</h2>
						<h4 style="padding-left:10px;">Learn and grow</h4>
						<h4 style="padding-left:10px;">Link with your parents</h4>
						<h4 style="padding-left:10px;">Earn rewards together</h4>
					</div>
					<div class="col-6 p-l-0 child-role-image">
						<img src="assets/Images-Transparent/Image-Role-Child.webp" alt="Child role">
					</div>
				</div>
				<p class="role-reason" *ngIf="roleReason('child')">{{ roleReason('child') }}</p>
			</div>

			<div class="role-selector container p-0" *ngIf="shouldShowParentRole()" data-role="parent" role="button" [attr.tabindex]="canSelectRole('parent') ? 0 : -1"
				(click)="selectRole('parent')" (keydown)="onKeySelect($event, 'parent')"
				[class.active]="selectedRole === 'parent'" [class.ineligible]="!canSelectRole('parent')" [attr.aria-disabled]="!canSelectRole('parent')" [attr.aria-pressed]="selectedRole === 'parent'">

				<div class="row">
					<div class="col-6 p-l-0 image-parent">
						<img src="assets/Images-Transparent/Image-Role-Parent.webp" alt="Parent role">
					</div>

					<div class="col-6">
						<h2 style="text-align: right; padding-right: 10px;">Parent</h2>
						<h4 style="text-align: right; padding-right: 10px;">Grow together</h4>
						<h4 style="text-align: right; padding-right: 10px;">Link with child</h4>
						<h4 style="text-align: right; padding-right: 10px;">Track progress</h4>
					</div>
				</div>
				<p class="role-reason" *ngIf="roleReason('parent')">{{ roleReason('parent') }}</p>
			</div>
			<p class="role-reason" *ngIf="roleEligibility?.ageSwitchConfirmationRequired">Please confirm your age to switch from Child to Self.</p>

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
				<superme-button type="green" size="full" text="Save & Continue" [disabled]="!selectedRole || eligibilityLoading || isSubmitting" (click)="save()"></superme-button>
			</div>
			</div>
		</div>
	</div>

	<div class="step step-2" *ngIf="currentStep === 2">
		<div class="role-flow-shell instruction-flow-shell">
			<superme-navigator heading="Instructions" backIcon="arrowSvg" (back)="prevStep()"></superme-navigator>

		<div class="instruction-card">
			<instructio-list
				[heading]="selectedRole === 'child' ? 'Before Switching from Self to Child' : 'Before Switching from Self to Parent'"
				[items]="selectedRole === 'child' ? childRoleInstructions : roleSelectionInstructions"
				type="role-selection-instruction">
			</instructio-list>
		</div>

		<div class="instruction-faqs">
			<profile-facts [faqs]="selectedRole === 'child' ? profileChildFaqs : profileParentFaqs"></profile-facts>
		</div>

		<div class="role-switch-consent">
			<ion-checkbox
				[checked]="instructionConsentChecked"
				(ionChange)="instructionConsentChecked = $any($event).detail.checked === true">
			</ion-checkbox>
			<p>I have read and understood that switching roles affects account linkage and family access as described above.</p>
		</div>

		<div class="instruction-action">
			<superme-button type="green" size="full" text="Next" [disabled]="!instructionConsentChecked" (click)="save()"></superme-button>
		</div>
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

.role-flow-shell {
  width: min(100%, 900px);
  margin: 0 auto;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 8px 8px;
}

.instruction-card {
  max-width: 680px;
  margin: 24px auto 32px;
  padding: 24px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 22px rgba(107, 101, 106, 0.10);
}

.instruction-faqs,
.role-switch-consent,
.instruction-action {
  width: min(100%, 680px);
  margin-left: auto;
  margin-right: auto;
}

.instruction-action {
  margin-top: 20px;
  text-align: center;
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
  min-height: 210px;
  padding-top: 0 !important;
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

.role-selector.ineligible {
  opacity: 0.55;
  cursor: not-allowed;
}

.role-reason {
  margin: 0 14px 12px;
  font-size: 14px;
  color: #625b64;
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
    min-height: 210px;
    height: 100%;
    margin: 0;
  }

  .col-6 {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }

  .col-6 img {
    width: 100%;
    height: 210px;
    max-width: none;
    object-fit: contain;
    object-position: center bottom;
    margin: auto 0 0;
    display: block;
    align-self: center;
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

.role-switch-consent {
  margin: 18px auto 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;

  ion-checkbox {
    --size: 16px;
    --checkbox-background-checked: #4CAF50;
    margin-top: 2px;
    flex: 0 0 auto;
  }

  ion-checkbox::part(container) {
    border-radius: 3px;
    border: 2px solid rgba(40, 37, 39, 0.7);
  }

  p {
    margin: 0;
    color: #282527;
    font-family: Nunito, sans-serif;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
  }
}

@media (max-width: 767px) {
  .step-1,
  .step-2,
  .step-3 {
    padding: 8px;
  }

  .role-options {
    gap: 16px;
    padding: 12px 4px 8px;
  }

  .role-selector,
  .role-selector .row {
    min-height: 156px;
  }

  .role-selector {
    border-width: 3px;
    border-radius: 22px;

    &.active {
      border-width: 3px;
      border-radius: 22px;
    }

    .col-6 {
      padding-inline: 10px;
    }

    .col-6 img {
      height: 156px;
    }

    h2 {
      font-size: 22px !important;
    }

    h4 {
      font-size: 12px !important;
      line-height: 1.35;
      margin-bottom: 6px;
    }
  }

  .instruction-card {
    margin: 16px 4px 24px;
    padding: 18px 16px;
    border-radius: 16px;
  }

  .instruction-faqs,
  .role-switch-consent,
  .instruction-action {
    width: calc(100% - 8px);
  }
}

@media (min-width: 768px) and (max-width: 1100px) {
  .role-flow-shell {
    width: min(100%, 760px);
  }

  .role-options {
    padding-inline: 16px;
  }
}
`]
})
export class RoleSelectComponent implements OnDestroy {
  // currently selected role: 'child' | 'parent' | 'self' | null
  selectedRole: string | null = null;
  currentStep = 1;
  instructionConsentChecked = false;

  // User data and account type
  userAccountType: 'child' | 'parent' | 'self' | null = null;
  userAge: number | null = null;
  userDob: string | null = null;
  roleEligibility: RoleEligibilityResponse | null = null;
  eligibilityLoading = false;
  private eligibilityRequest = 0;

  roleSelectionInstructions: string[] = [
    'Switching from Self to Parent lets this account create a family or join an existing family as a parent.',
    'If you create a family, you will receive a family code and QR code to share with your child.',
    'If you join an existing family, use the family code shared by the family creator.',
    'Parent mode gives access to family tools such as child progress, approvals, routines, tasks, and rewards.',
    'If you are the family creator, you cannot switch this same account back to Self mode directly. To use Self mode separately, create another account with different login details.'
  ];

  // Instructions shown when a child selects the role
  childRoleInstructions: string[] = [
    'Switching from Self to Child connects this account to a family created by your parent or guardian.',
    'You will need the family code or QR code from your parent to complete the switch.',
    'After linking, your parent can see family activity such as habits, tasks, routines, streaks, progress, and rewards.',
    'Your personal space stays with you. Notes, coins, pet, and learning progress remain attached to this account.',
    'If you leave the family or are removed, this account returns to Self mode. Family-linked access stops until you join a family again.'
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
    // The acknowledgement belongs only to the deliberate Self → family-role
    // conversion. A new user joining/creating a family should continue straight
    // to their dashboard without seeing this extra popup.
    const isSelfRoleSwitch = this.isSelfRoleSwitch();

    this.familyService
      .joinFamilyWithCode(familyCode, relationship)
      .pipe(take(1))
      .subscribe({
        next: async (response) => {
          this.isSubmitting = false;
          this.applyRoleConversionResponse(response, relationship, familyCode);
          if (isSelfRoleSwitch) this.queueFamilyConnectedAcknowledgment(relationship);
          await this.showToast("You're connected to your family", 'success');

          const target = relationship === 'PARENT' ? '/authed/parent-account' : '/home';
          this.router.navigate([target], { replaceUrl: true });
        },
        error: (error) => {
          this.isSubmitting = false;

          if (error.status === 200) {
            this.applyRoleConversionResponse({}, relationship, familyCode);
            if (isSelfRoleSwitch) this.queueFamilyConnectedAcknowledgment(relationship);
            const target = relationship === 'PARENT' ? '/authed/parent-account' : '/home';
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

  private queueFamilyConnectedAcknowledgment(relationship: 'CHILD' | 'PARENT'): void {
    try {
      const displayRole = relationship === 'PARENT' ? 'Parent' : 'Child';
      sessionStorage.setItem('family_connected_ack', JSON.stringify({
        source: 'self-role-switch',
        role: displayRole
      }));
    } catch {
      // Storage can be unavailable in restricted browser contexts; role switching still succeeds.
    }
  }

  private isSelfRoleSwitch(): boolean {
    const relationship = String(this.authService.getUserData()?.relationship ?? '').trim().toUpperCase();
    return relationship === 'SELF';
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
    private authService: AuthService,
    private roleEligibilityService: RoleEligibilityService
  ) {
    this.loadUserData();
  }

  /**
   * Ionic can keep this route alive between visits, so refresh the current role
   * whenever the page is shown again.
   */
  ionViewWillEnter(): void {
    this.loadUserData();
  }

  /**
   * Load the current authenticated profile to determine account type and age.
   */
  private loadUserData(): void {
    try {
      const userData = this.authService.getUserData() || this.readStoredUserData();
      this.userAccountType = this.normalizeAccountType(userData?.relationship ?? userData?.role);

      const rawAge = Number(userData?.age ?? userData?.userAge);
      this.userDob = userData?.dateOfBirth || userData?.dob || userData?.birthDate || null;
      this.userAge = Number.isFinite(rawAge) && rawAge > 0
        ? Math.floor(rawAge)
        : this.userDob
          ? this.calculateAge(this.userDob)
          : null;

      const isUnlinkedChild = this.userAccountType === 'self' && userData?.asChild === true;
      const currentRole = isUnlinkedChild ? 'CHILD' : this.userAccountType?.toUpperCase() as 'SELF' | 'CHILD' | 'PARENT' | undefined;
      const requestId = ++this.eligibilityRequest;
      this.roleEligibility = null;
      this.eligibilityLoading = false;
      if (currentRole && this.userAge !== null && this.userAge >= 0) {
        this.eligibilityLoading = true;
        this.roleEligibilityService.options(this.userAge, currentRole, currentRole === 'CHILD' ? !isUnlinkedChild : undefined)
          .pipe(take(1)).subscribe({
            next: response => {
              if (requestId !== this.eligibilityRequest) return;
              this.eligibilityLoading = false;
              this.roleEligibility = response;
              if (this.selectedRole && !this.canSelectRole(this.selectedRole)) this.selectedRole = null;
            },
            error: () => {
              if (requestId !== this.eligibilityRequest) return;
              this.eligibilityLoading = false;
              // The role-eligibility endpoint is not present on all deployments yet.
              // Retain the existing family flow until it becomes available.
            }
          });
      }

      if (
        (this.selectedRole === 'parent' && !this.shouldShowParentRole()) ||
        (this.selectedRole === 'child' && !this.shouldShowChildRole())
      ) {
        this.selectedRole = null;
      }
    } catch (e) {
      console.error('[RoleSelect] Error loading user data:', e);
    }
  }

  private normalizeAccountType(value: unknown): 'child' | 'parent' | 'self' | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'co-parent' || normalized === 'co_parent') return 'parent';
    if (normalized === 'child' || normalized === 'parent' || normalized === 'self') {
      return normalized;
    }
    return null;
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
   * Never offer the role the account already has. Self accounts retain the
   * existing age-based role eligibility rules.
   */
  shouldShowChildRole(): boolean {
    if (this.roleEligibility) return !this.roleOption('child')?.current;
    if (this.userAccountType === 'child' || this.userAccountType === 'parent') return false;
    if (this.userAccountType !== 'self') return false;
    if (this.userAge === null) {
      return false;
    }
    return this.userAge >= 8 && this.userAge < 18;
  }

  /**
   * Never offer the role the account already has. Self accounts retain the
   * existing age-based role eligibility rules.
   */
  shouldShowParentRole(): boolean {
    if (this.roleEligibility) return !this.roleOption('parent')?.current;
    if (this.userAccountType !== 'self') return false;
    if (this.userAge === null) {
      return false;
    }
    return this.userAge >= 30;
  }

  roleOption(role: string): EligibilityOption | undefined {
    return this.roleEligibility?.options.find(option => option.role === role.toUpperCase());
  }

  canSelectRole(role: string): boolean {
    if (this.eligibilityLoading) return false;
    return this.roleEligibility ? this.roleOption(role)?.eligible === true
      : role === 'child' ? this.shouldShowChildRole() : this.shouldShowParentRole();
  }

  roleReason(role: string): string | null {
    const option = this.roleOption(role);
    return option && !option.eligible && !option.current ? option.reason : null;
  }

  selectRole(role: string) {
    if (!this.canSelectRole(role)) return;
    this.selectedRole = role;
    this.instructionConsentChecked = false;
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
      if (!this.selectedRole || !this.canSelectRole(this.selectedRole)) return;
      if (this.selectedRole === 'self') {
        this.confirmAgeSwitch();
        return;
      }
      console.log('Selected role:', this.selectedRole);
      this.instructionConsentChecked = false;
      this.nextStep();
      return;
    }

    if (this.currentStep === 2) {
      if (!this.instructionConsentChecked) return;
      this.nextStep();
      return;
    }

    if (this.currentStep === 3) {
      this.finish();
      return;
    }
  }

  private confirmAgeSwitch(): void {
    if (!this.roleEligibility?.ageSwitchConfirmationRequired || this.isSubmitting) return;
    this.isSubmitting = true;
    this.roleEligibilityService.confirmAgeSwitch().pipe(take(1)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.authService.refreshUserData().pipe(take(1)).subscribe({
          next: () => { this.router.navigate(['/home'], { replaceUrl: true }); },
          error: () => { this.router.navigate(['/home'], { replaceUrl: true }); }
        });
      },
      error: () => {
        this.isSubmitting = false;
        void this.showToast('Could not confirm your age. Please try again.', 'danger');
      }
    });
  }

  nextStep() {
    if (this.currentStep < 3) this.currentStep += 1;
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      if (this.currentStep === 1) {
        this.instructionConsentChecked = false;
      }
    }
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
    this.queueFamilyConnectedAcknowledgment('PARENT');
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
    console.log('🚪 Logging out and redirecting to /login...');

    try {
      if (this.authService && typeof this.authService.logout === 'function') {
        // Let AuthService perform logout and redirect to /login
        try {
          await this.authService.logout();
        } catch (e) {
          console.warn('AuthService.logout threw an error, falling back to client logout:', e);
          localStorage.clear();
          sessionStorage.clear();
          this.router.navigate(['/login'], { replaceUrl: true }).catch(err => {
            console.error('Navigation error:', err);
            window.location.href = '/login';
          });
        }
      } else {
        // Fallback: clear storage and navigate to /login
        localStorage.clear();
        sessionStorage.clear();
        this.router.navigate(['/login'], { replaceUrl: true }).catch(err => {
          console.error('Navigation error:', err);
          window.location.href = '/login';
        });
      }
    } catch (e) {
      console.error('Unexpected error during logout redirect:', e);
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/login'], { replaceUrl: true }).catch(err => {
        console.error('Navigation error:', err);
        window.location.href = '/login';
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
