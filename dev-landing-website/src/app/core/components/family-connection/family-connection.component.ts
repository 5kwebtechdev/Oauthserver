import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupermeFactsComponent, FaqItem } from '../superme-facts/superme-facts.component';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { AuthService, FamilyMember, FamilyDetailsResponse } from '../../services/auth.service';
import { ParentImageService } from '../../services/parent-image.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { ParentDataService } from '../../services/parent-data.service';
import { MoodService } from '../../services/mood.service';

@Component({
  selector: 'app-family-connection',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, SupermeFactsComponent, SupermeButtonComponent],
  templateUrl: './family-connection.component.html',
  styleUrls: ['./family-connection.component.scss']
})
export class FamilyConnectionComponent implements OnInit {
  @Input() family: any = {};
  @Input() familyFaqs: FaqItem[] = [];
  @Output() switchToEdit = new EventEmitter<void>();

  // Family data from API
  familyName: string = 'Your Family';
  familyStatus: string = 'ACTIVE';
  createdOn: string = '';
  creator: FamilyMember | null = null;
  apiMembers: FamilyMember[] = [];

  selectedFamilyMemberIndex: number = 0;
  isLoading: boolean = true;

  // UI state for role-instructions shown after clicking 'Continue with a new role?'
  showRoleInstructions: boolean = false;
  // whether the user checked the accept/read checkbox in instructions
  acceptedRoleInstructions: boolean = false;
  // show the role selection cards after instructions
  showRoleSelection: boolean = false;
  // selected role choice: 'child' | 'parent'
  selectedRole: 'child' | 'parent' | null = null;
  // show confirmation/instructions after role is saved
  showRoleConfirmed: boolean = false;
  // show the join family screen (child flow)
  showJoinFamily: boolean = false;
  // show the create/join family screen for parent flow
  showCreateFamily: boolean = false;
  // whether create or join tab is active in the parent flow
  // use a plain string here to avoid template type-narrowing issues
  createMode: string = 'create';
  // family name entered when creating a family
  createFamilyName: string = '';
  // family code entered by user when joining
  familyCode: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    public parentImageService: ParentImageService,
    private childSelfImageService: ChildSelfImageService,
    private parentDataService: ParentDataService,
    private moodService: MoodService
  ) { }

  ngOnInit() {
    this.loadFamilyDetails();
    // Ensure vibes data is loaded so we can resolve child avatarImageNames
    if (!this.parentDataService.children.length) {
      this.moodService.getParentVibesDisplay().subscribe({
        next: (vibes) => { if (vibes?.length) this.parentDataService.setChildren(vibes); },
        error: () => {}
      });
    }
  }

  /**
   * Load family details from API
   */
  private loadFamilyDetails(): void {
    this.isLoading = true;
    this.authService.getFamilyDetails().subscribe({
      next: (response: FamilyDetailsResponse) => {
        this.isLoading = false;
        if (response.family) {
          this.familyName = response.family.familyName;
          this.familyStatus = response.family.status;
          this.createdOn = response.family.createdOn;
          this.creator = response.family.creator;
          this.apiMembers = response.family.members;

          // Update family input object with API data
          this.family = {
            ...this.family,
            name: response.family.familyName,
            active: response.family.status === 'ACTIVE',
            createdOn: response.family.createdOn,
            owner: {
              initials: this.getInitial(response.family.creator.name),
              name: response.family.creator.name,
              age: response.family.creator.age,
              roleLabel: response.family.creator.relationship + (response.family.creator.you ? ' / Creator / You' : ' / Creator'),
              avatar: response.family.creator.avatarName
            },
            members: response.family.members.map(m => ({
              id: 'm' + m.userId,
              name: m.name,
              age: m.age,
              role: m.relationship + (m.you ? ' / You' : ''),
              avatar: m.avatarName,
              isYou: m.you
            }))
          };

          console.log('[FamilyConnection] Loaded family details:', {
            familyName: this.familyName,
            creator: this.creator,
            members: this.apiMembers
          });
        } else {
          // No family connection - show self mode
          this.family.active = false;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('[FamilyConnection] Failed to load family details:', error);
        // Show self mode on error
        this.family.active = false;
      }
    });
  }

  // Return the uppercase initial for a given name
  getInitial(name?: string): string {
    try {
      if (!name) return '?';
      return name.trim().charAt(0).toUpperCase();
    } catch {
      return '?';
    }
  }

  isFemale(member?: any): boolean {
    try {
      const g = (member as any)?.gender;
      if (!g) return false;
      return String(g).toLowerCase() === 'female';
    } catch {
      return false;
    }
  }

  /**
   * Resolve avatar URL+alt for a family member.
   */
  getMemberAvatar(member: FamilyMember | null): { url: string | null; alt: string | null } | null {
    if (!member) return null;
    try {
      // Try to find avatarImageName from vibes display data (has "Avatar N" key)
      const vibesChildren = this.parentDataService.children;
      const vibesMatch = vibesChildren.find(
        c => c.assignedTo === (member as any).userId || c.userName === member.name
      );
      if (vibesMatch?.avatarImageName) {
        const resolved = this.childSelfImageService.resolveAvatarFromUser({ avatarImageName: vibesMatch.avatarImageName });
        if (resolved.url) return resolved;
      }
      // Fallback: try resolving from member directly
      const resolved = this.childSelfImageService.resolveAvatarForMember(member as any);
      return resolved?.url ? resolved : { url: null, alt: null };
    } catch (e) {
      console.error('[FamilyConnection] getMemberAvatar error', e);
      return null;
    }
  }

  isParentMember(i: number): boolean {
    const rel = (this.apiMembers[i]?.relationship ?? '').toUpperCase();
    return rel === 'PARENT' || rel === 'CO-PARENT';
  }

  selectFamilyMember(i: number) {
    this.selectedFamilyMemberIndex = i;
  }

  continueWithNewRole() {
    // Show role-switching instructions and hide other family UI
    console.log('User chose to continue with a new role (self-mode) — showing instructions');
    this.setExclusive('instructions');
    // make sure the active family/family-self-mode blocks are not visible while instructions are shown
    // (those template blocks already check showRoleInstructions)
  }

  nextAfterInstructions() {
    if (!this.acceptedRoleInstructions) return;
    // Move to role selection cards instead of directly emitting edit event
    console.log('User accepted role-switch instructions — showing role selection');
    this.setExclusive('selection');
  }

  selectRole(role: 'child' | 'parent') {
    this.selectedRole = role;
  }

  saveAndContinue() {
    if (!this.selectedRole) return;
    // attach the chosen role to the family.owner or emit to parent as needed
    console.log('User selected role:', this.selectedRole);
    if (this.family && this.family.owner) {
      switch (this.selectedRole) {
        case 'child':
          // child-specific handling
          this.family.owner.roleLabel = 'Child';
          break;
        case 'parent':
          // parent-specific handling
          this.family.owner.roleLabel = 'Parent';
          break;
        default:
          this.family.owner.roleLabel = '';
      }
    }

    // close selection UI and show confirmation/instructions for the chosen role
    this.setExclusive('confirmed');
  }

  cancelRoleConfirmation() {
    // go back to role selection if user changes mind
    this.setExclusive('selection');
  }

  confirmRoleAndProceed() {
    // If child selected, open join family flow; otherwise proceed as before
    if (this.selectedRole === 'child') {
      this.setExclusive('join');
      return;
    }

    // If parent selected, show create/join family screen
    if (this.selectedRole === 'parent') {
      this.setExclusive('create');
      return;
    }

    // finalise and let parent handle navigation (existing event)
    this.setExclusive('none');
    this.switchToEdit.emit();
  }

  joinFamily() {
    if (!this.familyCode) return;
    console.log('Joining family with code:', this.familyCode);
    // For now, mark family as active locally and proceed to edit flow
    this.family.active = true;
    this.setExclusive('none');
    // Optionally inform parent
    this.switchToEdit.emit();
    // Navigate to home and show the connected popup. Include role=child so home knows message.
    try {
      this.router.navigate(['/'], { queryParams: { joined: 'child' }, queryParamsHandling: 'merge' });
    } catch (e) {
      console.warn('Navigation to home failed', e);
    }
  }

  createFamily() {
    if (!this.createFamilyName || this.createFamilyName.trim().length === 0) return;
    console.log('Creating family with name:', this.createFamilyName);
    // Simulate family creation locally
    this.family.name = this.createFamilyName.trim();
    this.family.active = true;
    // Reset and navigate home showing connected modal for parent
    this.setExclusive('none');
    this.switchToEdit.emit();
    try {
      this.router.navigate(['/'], { queryParams: { joined: 'parent' }, queryParamsHandling: 'merge' });
    } catch (e) {
      console.warn('Navigation to home failed', e);
    }
  }

  triggerUpload(input: HTMLInputElement) {
    input.click();
  }

  onQrFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    console.log('QR file selected:', file.name);
    // TODO: parse QR and join family. For now simulate success.
    this.family.active = true;
    this.setExclusive('none');
    this.switchToEdit.emit();
    try {
      this.router.navigate(['/'], { queryParams: { joined: 'child' }, queryParamsHandling: 'merge' });
    } catch (e) {
      console.warn('Navigation to home failed', e);
    }
  }

  /**
   * Central helper to activate one UI container and deactivate others.
   * Allowed values: 'instructions' | 'selection' | 'confirmed' | 'join' | 'none'
   */
  private setExclusive(container: 'instructions' | 'selection' | 'confirmed' | 'join' | 'create' | 'none') {
    this.showRoleInstructions = false;
    this.showRoleSelection = false;
    this.showRoleConfirmed = false;
    this.showJoinFamily = false;
    this.showCreateFamily = false;

    switch (container) {
      case 'instructions':
        this.showRoleInstructions = true;
        break;
      case 'selection':
        this.showRoleSelection = true;
        break;
      case 'confirmed':
        this.showRoleConfirmed = true;
        break;
      case 'join':
        this.showJoinFamily = true;
        break;
      case 'create':
        this.showCreateFamily = true;
        // default to the create tab
        this.createMode = 'create';
        break;
      case 'none':
      default:
        // all false
        break;
    }
  }

  // small helpers used by template back buttons
  backToSelf() {
    this.setExclusive('none');
  }

  backToInstructions() {
    this.setExclusive('instructions');
  }

  backToConfirmation() {
    this.setExclusive('confirmed');
  }
}