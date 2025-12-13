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

  constructor(private router: Router, private authService: AuthService) { }

  instructionItems: string[] = [
    'You will link your account to your family and get benefits like learning together and earning rewards.',
    'Your Parents can view your progress (habits, tasks etc) and give you rewards.',
    'If later you are removed from the family or the family gets deleted, your account returns to normal with all your data safe and no family connection. Note: Any data related to family will not be there',
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


  continueWithNewRole() {
    console.log('Continue with a new role clicked');
    this.showInstructions = true;
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
