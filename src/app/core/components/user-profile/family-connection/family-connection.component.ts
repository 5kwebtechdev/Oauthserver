import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { ProfileFactsComponent } from '../profile-facts/profile-facts.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { InstructioListComponent } from './instructio-list';
import { AuthService, FamilyInfo, FamilyMember } from '../../../../../package/api/auth.service';
import { AuthService as CoreAuthService } from '../../../services/auth.service';
@Component({
  standalone: true,
  selector: 'family-connection',
  imports: [CommonModule, FormsModule, IonicModule, MindfulNavigatorComponent, MindfulBadgeComponent, ProfileFactsComponent, MindfulPetComponent, MindfulButtonComponent, InstructioListComponent],
  templateUrl: './family-connection.component.html',
  styleUrls: ['./family-connection.component.scss']
})
export class FamilyConnectionComponent implements OnInit {
  familyName: string = 'Your Family';
  familyStatus: string = 'ACTIVE';
  createdOn: string = '';
  creator: FamilyMember | null = null;
  members: FamilyMember[] = [];
  showInstructions: boolean = false;
  isLoading: boolean = true;

  constructor(private router: Router, private authService: AuthService, private coreAuthService: CoreAuthService) { }

  instructionItems: string[] = [
    'You will link your account to your family and get benefits like learning together and earning rewards.',
    'Your Parents can view your progress (habits, tasks etc) and give you rewards.',
    'If later you are removed from the family or the family gets deleted, your account returns to normal with all your data safe and no family connection.',
    '<span style="color:#282527; opacity: 1;font-family:Nunito; font-size:16px; font-weight:500; text-decoration:underline;">Note:</span> <span style="color:#282527; font-family:Nunito; font-size:16px; font-weight:500;">Any data related to family will not be there</span>',
    'You can always use the app on your own that\'s your regular account experience.'
  ];

  instructionItemsParent: string[] = [
    'You can connect with your child\'s progress and celebrate achievements together.',
    'You must create or join a family (step-by-step instructions will guide you through this).',
    'If you are removed from the family or if you delete your family, your account returns to self role and all parent features and data will be permanently lost.',
    'Keep your current account and create a separate parent account with different login details - this way you never lose any data and can switch between accounts.'
  ];

  consentChecked: boolean = false;

  ngOnInit(): void {
    this.loadFamilyDetails();
  }

  loadFamilyDetails(): void {
    this.isLoading = true;
    this.authService.getFamilyDetails().subscribe({
      next: (response) => {
        if (response.family) {
          this.familyName = response.family.familyName;
          this.familyStatus = response.family.status;
          this.createdOn = response.family.createdOn;
          this.creator = response.family.creator;
          this.members = response.family.members;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading family details:', error);
        this.isLoading = false;
      }
    });
  }

  onMemberActiveChange(userId: number, active: boolean): void {
    // Handle member active state change if needed
    console.log(`Member ${userId} active state changed to ${active}`);
  }

  toggleMemberActive(member: FamilyMember): void {
    member.you = !member.you;
    this.onMemberActiveChange(member.userId, member.you);
  }

  getBadgeText(member: FamilyMember): string {
    if (member.you) {
      return member.relationship === 'Parent' ? 'Parent / You' : 'Child / You';
    }
    return member.relationship === 'Parent' ? 'Parent' : 'Child';
  }

  onRemovedPetClick() {
    console.log('Removed pet clicked');
  }

  onFeedback() {
    this.router.navigate(['/authed/select-role']).catch(() => { });
  }

  /**
   * Handle back action from mindful-navigator — return to the user profile page
   */
  onBackFromFamily() {
    // Prefer explicit navigation to the authenticated user-profile route
    this.router.navigate(['/authed', 'user-profile']).catch(err => {
      console.error('Navigation to user-profile failed, falling back to history.back()', err);
      try {
        history.back();
      } catch (e) {
        // no-op
      }
    });
  }

  /**
   * Triggered when user clicks Delete Family button. Shows confirmation and
   * serves as a placeholder for the deletion API call.
   */
  onDeleteFamily(): void {
    const ok = confirm('Are you sure you want to delete the family? This action is irreversible.');
    if (!ok) return;

    // TODO: call backend API to delete the family. For now, log and show a message.
    console.log('[FamilyConnection] Delete family confirmed by user');
    // Example placeholder: this.authService.deleteFamily().subscribe(...)
    alert('Delete family action is not yet implemented.');
  }

  /**
   * Remove a member from the local view (placeholder for actual API call).
   */
  removeMember(member: FamilyMember): void {
    if (!this.isParentUser()) return;

    const ok = confirm(`Remove ${member.name} from family?`);
    if (!ok) return;

    // Optimistically remove from local list
    this.members = this.members.filter(m => m.userId !== member.userId);
    console.log('[FamilyConnection] Member removed locally:', member);

    // TODO: call backend API to remove the member from the family
    // e.g. this.authService.removeMember(member.userId).subscribe(...)
  }


  continueWithNewRole() {
    console.log('Continue with a new role clicked');
    this.showInstructions = true;
  }

  /**
   * Helper to determine if current user is a parent (used by template)
   */
  isParentUser(): boolean {
    try {
      return this.coreAuthService.isParentUser();
    } catch (e) {
      console.error('Failed to determine user role:', e);
      return false;
    }
  }

  /**
   * Helper to determine if current user is in SELF role
   */
  isSelfUser(): boolean {
    try {
      return this.coreAuthService.getUserRelationship() === 'SELF';
    } catch (e) {
      console.error('Failed to determine user relationship:', e);
      return false;
    }
  }

  onInstructionsBack() {
    this.showInstructions = false;
  }

  goToRoleSelect() {
    // navigate to the select-role page (global route)
    console.log('Navigating to role selector');
    this.router.navigate(['/select-role']).catch(err => {
      console.error('Navigation to select-role failed', err);
      // fallback to authed path if global path doesn't work
      this.router.navigate(['/authed/select-role']).catch(() => { });
    });
  }
}
