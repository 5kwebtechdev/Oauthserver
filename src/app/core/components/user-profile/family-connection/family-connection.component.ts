import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { QRCodeComponent } from 'angularx-qrcode';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';
import { InstructioListComponent } from './instructio-list';
import { AuthService, FamilyInfo, FamilyMember } from '../../../../../package/api/auth.service';
import { take } from 'rxjs/operators';
import { AuthService as CoreAuthService } from '../../../services/auth.service';
@Component({
  standalone: true,
  selector: 'family-connection',
  imports: [CommonModule, FormsModule, IonicModule, QRCodeComponent, MindfulNavigatorComponent, ProfileFactsComponent, MindfulPetComponent, MindfulButtonComponent, MindfulPopupComponent, InstructioListComponent],
  templateUrl: './family-connection.component.html',
  styleUrls: ['./family-connection.component.scss']
})
export class FamilyConnectionComponent implements OnInit {
  familyName: string = 'Your Family';
  familyStatus: string = 'ACTIVE';
  createdOn: string = '';
  creator: FamilyMember | null = null;
  members: FamilyMember[] = [];
  familyCode: string = '';
  qrCodeData: string = ''; // Prefixed QR code data for scanning validation
  showInstructions: boolean = false;
  isLoading: boolean = true;
  showQrModal: boolean = false;
  familyFaqs: FaqItem[] = [];
  showRemovePopup: boolean = false;
  memberToRemove: FamilyMember | null = null;

  constructor(private router: Router, private authService: AuthService, private coreAuthService: CoreAuthService) { }

  /**
   * Open full-screen QR code modal
   */
  openQrModal(): void {
    if (!this.familyCode) {
      console.warn('No family code available');
      return;
    }
    this.showQrModal = true;
  }

  /**
   * Close QR code modal
   */
  closeQrModal(): void {
    this.showQrModal = false;
  }

  /**
   * Share QR code using Web Share API (Capacitor-safe)
   */
  async shareQrCode(): Promise<void> {
    try {
      const canvas = document.querySelector('.qr-modal-content qrcode canvas') as HTMLCanvasElement;
      if (!canvas) {
        console.error('QR canvas not found');
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'family-qr-code.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Family QR Code',
            text: `Join our family with code: ${this.familyCode}`,
            files: [file]
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'family-qr-code.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  }

  /**
   * Copy family code to clipboard
   */
  async copyFamilyCode(): Promise<void> {
    if (!this.familyCode) {
      console.warn('No family code available to copy');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(this.familyCode);
        // Show a brief visual feedback (you can enhance this with a toast)
        console.log('Family code copied to clipboard:', this.familyCode);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = this.familyCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Family code copied to clipboard (fallback):', this.familyCode);
      }
    } catch (error) {
      console.error('Error copying family code:', error);
    }
  }

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
    this.setFamilyFaqs();
  }

  private setFamilyFaqs(): void {
    try {
      let targetSection: string;
      let targetScreen: string;

      if (this.isParentUser()) {
        targetSection = 'My Family';
        targetScreen = 'Parent';
      } else if (this.isSelfUser()) {
        targetSection = 'Profile';
        targetScreen = 'Self Mode (Child)';
      } else {
        // Child mode
        targetSection = 'Profile';
        targetScreen = 'My Family (Child)';
      }

      this.familyFaqs = PROFILE_FAQS.filter(faq =>
        faq.section === targetSection && faq.screen === targetScreen
      );

      // If no exact matches, fallback to broader search
      if (this.familyFaqs.length === 0) {
        console.warn(`No FAQs found for section: ${targetSection}, screen: ${targetScreen}. Falling back to broader search.`);
        this.familyFaqs = PROFILE_FAQS.filter(faq =>
          faq.section?.toLowerCase().includes(targetSection.toLowerCase()) ||
          faq.screen?.toLowerCase().includes(targetScreen.toLowerCase())
        );
      }

      // Ultimate fallback
      if (this.familyFaqs.length === 0) {
        console.warn('No relevant FAQs found. Using all FAQs as fallback.');
        this.familyFaqs = PROFILE_FAQS;
      }
    } catch (e) {
      console.error('Error selecting family faqs:', e);
      this.familyFaqs = PROFILE_FAQS;
    }
  }

  loadFamilyDetails(): void {
    this.isLoading = true;
    this.authService.getFamilyDetails().pipe(take(1)).subscribe({
      next: (response) => {
        if (response && response.family) {
          const f = response.family as any;
          this.familyName = f.familyName || this.familyName;
          this.familyStatus = f.status || this.familyStatus;
          this.createdOn = f.createdOn || this.createdOn;
          this.creator = f.creator || this.creator;
          this.members = f.members || this.members;
          // Defensive set for familyCode: support both nested and top-level shapes
          this.familyCode = f.familyCode || (response as any).familyCode || this.familyCode;
        } else if (response && (response as any).familyCode) {
          // In some API variants familyCode might be at the root
          this.familyCode = (response as any).familyCode;
        }

        // Set QR code data with GROUP: prefix for consistent scanning validation
        if (this.familyCode) {
          this.qrCodeData = 'GROUP:' + this.familyCode;
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
      return (member.relationship === 'Parent' || member.relationship === 'Co-Parent') ? 'Parent / You' : 'Child / You';
    }
    return (member.relationship === 'Parent' || member.relationship === 'Co-Parent') ? 'Parent' : 'Child';
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
   * Open the remove member confirmation popup.
   */
  removeMember(member: FamilyMember): void {
    if (!this.isParentUser()) return;
    this.memberToRemove = member;
    this.showRemovePopup = true;
  }

  /**
   * Confirm and proceed with removing the member from the family.
   */
  confirmRemoveMember(): void {
    if (!this.memberToRemove) return;

    const member = this.memberToRemove;
    this.showRemovePopup = false;

    // Show loading state while removing
    const originalMembers = this.members;
    this.members = this.members.filter(m => m.userId !== member.userId);

    // Call backend API to remove the member from the family
    this.authService.removeMemberFromFamily(member.userId).pipe(take(1)).subscribe({
      next: (response) => {
        console.log('[FamilyConnection] Member removed successfully:', member);
        this.memberToRemove = null;

        // Refresh family details by requesting the server endpoint with forUserId
        // (matches: http://.../v1/auth/family-details?forUserId=88)
        this.authService.getFamilyDetailsForUser(member.userId).pipe(take(1)).subscribe({
          next: (resp) => {
            if (resp && resp.family) {
              const f = resp.family as any;
              this.familyName = f.familyName || this.familyName;
              this.familyStatus = f.status || this.familyStatus;
              this.createdOn = f.createdOn || this.createdOn;
              this.creator = f.creator || this.creator;
              this.members = f.members || this.members;
              this.familyCode = f.familyCode || this.familyCode;
            }
          },
          error: (err) => {
            console.error('[FamilyConnection] Failed to refresh family details after removal', err);
            // fallback to local reload
            try { window.location.reload(); } catch (e) { this.loadFamilyDetails(); }
          }
        });
      },
      error: (error) => {
        console.error('[FamilyConnection] Error removing member:', error);
        // Restore the member to the list if the API call fails
        this.members = originalMembers;
        this.memberToRemove = null;
        // Do not show blocking window.alert; keep console error and UI restore.
      }
    });
  }

  /**
   * Cancel the remove member operation and close the popup.
   */
  cancelRemoveMember(): void {
    this.showRemovePopup = false;
    this.memberToRemove = null;
  }

  /**
   * Return the heading text for the remove-member popup.
   */
  getRemoveHeading(): string {
    const name = this.memberToRemove?.name || '';
    return `Are you sure you want to remove "${name}" from your family?`;
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
