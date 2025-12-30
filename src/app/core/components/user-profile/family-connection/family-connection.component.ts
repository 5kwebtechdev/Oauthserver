import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { QRCodeComponent } from 'angularx-qrcode';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { InstructioListComponent } from './instructio-list';
import { AuthService, FamilyInfo, FamilyMember } from '../../../../../package/api/auth.service';
import { take } from 'rxjs/operators';
import { AuthService as CoreAuthService } from '../../../services/auth.service';
@Component({
  standalone: true,
  selector: 'family-connection',
  imports: [CommonModule, FormsModule, IonicModule, QRCodeComponent, MindfulNavigatorComponent, MindfulBadgeComponent, ProfileFactsComponent, MindfulPetComponent, MindfulButtonComponent, InstructioListComponent],
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
      const role = (() => {
        try { return this.coreAuthService.getUserRelationship?.(); } catch { return null; }
      })();

      if (this.isParentUser()) {
        // Parent view: prefer My Family (Parent) entries
        this.familyFaqs = PROFILE_FAQS.filter(f => (f.screen && f.screen.toLowerCase().includes('parent')) || (f.section && f.section.toLowerCase().includes('my family') && f.screen && f.screen.toLowerCase().includes('parent')));
      } else if (role === 'SELF' || this.isSelfUser()) {
        // Self mode for child
        this.familyFaqs = PROFILE_FAQS.filter(f => (f.section && f.section.toLowerCase().includes('self mode')) || (f.screen && f.screen.toLowerCase().includes('self mode')));
      } else {
        // Default to child view (My Family (Child))
        this.familyFaqs = PROFILE_FAQS.filter(f => (f.screen && f.screen.toLowerCase().includes('my family (child)')) || ((f.section && f.section.toLowerCase().includes('my family')) && (f.screen && f.screen.toLowerCase().includes('child'))));
      }
    } catch (e) {
      console.error('Error selecting family faqs:', e);
      this.familyFaqs = [];
    }

    // Fallbacks: try broader child/self entries, then full list
    if (!this.familyFaqs || this.familyFaqs.length === 0) {
      this.familyFaqs = PROFILE_FAQS.filter(f => (f.screen && (f.screen.toLowerCase().includes('my family (child)') || f.screen.toLowerCase().includes('self mode') || f.screen.toLowerCase().includes('parent'))));
    }

    if (!this.familyFaqs || this.familyFaqs.length === 0) {
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
