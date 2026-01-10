import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { InstructioListComponent } from '../family-connection/instructio-list';
import { ProfileFactsComponent, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { ProfileEditInputComponent } from '../profile-edit-input/profile-edit-input.component';
import { NavigationService } from '../../../services/navigation.service';

@Component({
  standalone: true,
  selector: 'role-select',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, InstructioListComponent, ProfileFactsComponent, ProfileEditInputComponent],
  templateUrl: './select-role.component.html',
  styleUrls: ['./select-role.component.scss']
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

  setFamilyAction(action: 'create' | 'join') {
    this.selectedFamilyAction = action;
  }

  // Placeholder handler for QR scan action. Navigates to scan-qr page.
  onScanQr() {
    // prefer Router navigation to match app conventions
    try {
      this.router.navigate(['/home/scan-qr']).catch(() => { });
    } catch (e) {
      // fallback log
      console.log('QR scan navigation requested', e);
    }
  }

  constructor(private router: Router, private navigationService: NavigationService) { }

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
    console.log('Finishing flow. Family action:', this.selectedFamilyAction);
    // TODO: wire actual API calls and navigation
  }

  goBack() {
    // Use the app's navigation service for proper back navigation
    this.navigationService.back();
  }
}


