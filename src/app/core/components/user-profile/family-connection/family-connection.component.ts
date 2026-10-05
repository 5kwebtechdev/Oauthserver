import { Component, OnDestroy, OnInit } from '@angular/core';
import { displayName } from '../../../models/display-name';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { QRCodeComponent } from 'angularx-qrcode';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePopupComponent } from '../../superme-popup/superme-popup.component';
import { InstructioListComponent } from './instructio-list';
import { AuthService, FamilyInfo, FamilyMember } from '../../../../../package/api/auth.service';
import { ParentImageService } from '../../../services/parent-image.service';
import { ChildSelfImageService } from '../../../services/child-self-image.service';
import { take } from 'rxjs/operators';
import { AuthService as CoreAuthService } from '../../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
@Component({
  standalone: true,
  selector: 'family-connection',
  imports: [CommonModule, FormsModule, IonicModule, QRCodeComponent, SupermeNavigatorComponent, ProfileFactsComponent, SupermePetComponent, SupermeButtonComponent, SupermePopupComponent, InstructioListComponent],
  templateUrl: './family-connection.component.html',
  styleUrls: ['./family-connection.component.scss']
})
export class FamilyConnectionComponent implements OnInit, OnDestroy {
  readonly displayName = displayName;
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
  familyRelationship: 'SELF' | 'PARENT' | 'CHILD' | null = null;
  familyAsChild = false;
  familyCanSwitchRoles = false;
  familyAgeLocked = false;
  familyHasFamily = false;
  isCurrentUserCoParent = false;
  isSwitchingMember = false;
  copyFeedbackMessage = '';
  copyFeedbackIsError = false;
  private copyFeedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private coreAuthService: CoreAuthService,
    public parentImageService: ParentImageService,
    private childSelfImageService: ChildSelfImageService,
    private cdr: ChangeDetectorRef
  ) { }

  // Return the first uppercase initial for a name (safe for template bindings)
  getInitial(name?: string): string {
    if (!name) return '';
    return name.trim().charAt(0).toUpperCase();
  }

  // Determine female flag for member/creator (case-insensitive check)
  isFemale(member?: FamilyMember | null): boolean {
    try {
      const g = (member as any)?.gender;
      if (!g) return false;
      return String(g).toLowerCase() === 'female';
    } catch (e) {
      return false;
    }
  }

  /** Resolve every family member through the one shared avatar mapping. */
  getMemberAvatar(member: FamilyMember | null): { url: string | null; alt: string | null } | null {
    if (!member) return null;

    try {
      const resolved = this.childSelfImageService.resolveAvatarForMember(member as any);
      return resolved || { url: null, alt: null };
    } catch (e) {
      console.error('[FamilyConnection] getMemberAvatar error', e);
      return null;
    }
  }

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
   * Share QR code image + family code text via native share sheet.
   *
   * On native (Android / iOS):
   *   1. Render the QR canvas to a base64 PNG.
   *   2. Write it to a temporary file via Capacitor Filesystem.
   *   3. Open the native share sheet with the image file URI + family code text.
   *
   * On web / PWA:
   *   Use the Web Share API with a File object (image + text).
   *   Falls back to a simple file download if the API is unavailable.
   */
  async shareQrCode(): Promise<void> {
    try {
      const canvas = document.querySelector('.qr-modal-content qrcode canvas') as HTMLCanvasElement;
      if (!canvas) {
        console.error('[FamilyConnection] QR canvas element not found');
        return;
      }

      const base64Data = canvas.toDataURL('image/png').split(',')[1];
      if (!base64Data) {
        console.error('[FamilyConnection] Failed to export canvas to base64');
        return;
      }

      const shareText = `Join my family on SupermeBuddy!\n\nFamily Code: ${this.familyCode}\n\nScan the QR code or enter the code above to connect.`;

      if (Capacitor.isNativePlatform()) {
        await this.nativeShare(base64Data, shareText);
      } else {
        await this.webShare(base64Data, shareText);
      }
    } catch (error) {
      // User cancelled the share sheet — not an error
      if ((error as any)?.message?.includes('cancel') || (error as any)?.message?.includes('abort')) {
        return;
      }
      console.error('[FamilyConnection] shareQrCode error:', error);
    }
  }

  /**
   * Native share: write QR image to cache, then open the OS share sheet
   * with the file URI so the user can pick any app (WhatsApp, Telegram, etc.).
   */
  private async nativeShare(base64Data: string, text: string): Promise<void> {
    const fileName = `family-qr-${this.familyCode}.webp`;

    // Write the image into the app's cache directory
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache
    });

    // Capacitor Share accepts a file URI
    await Share.share({
      title: 'SupermeBuddy Family Code',
      text,
      url: savedFile.uri,
      dialogTitle: 'Share Family QR Code'
    });

    // Clean up temp file after share sheet closes (fire-and-forget)
    Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {});
  }

  /**
   * Web fallback: use the Web Share API with a File blob if supported,
   * otherwise trigger a direct download of the QR image.
   */
  private async webShare(base64Data: string, text: string): Promise<void> {
    const byteString = atob(base64Data);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });
    const file = new File([blob], `family-qr-${this.familyCode}.webp`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'SupermeBuddy Family Code',
        text,
        files: [file]
      });
    } else {
      // Direct download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Copy family code to clipboard with native toast feedback
   */
  async copyFamilyCode(): Promise<void> {
    const familyCode = this.familyCode.trim();
    if (!familyCode) {
      this.showCopyFeedback('Family code is not available yet.', true);
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: familyCode });
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(familyCode);
      } else {
        this.copyWithLegacyClipboard(familyCode);
      }

      this.showCopyFeedback('Copied!');
    } catch (error) {
      console.error('[FamilyConnection] Unable to copy family code:', error);
      this.showCopyFeedback('Could not copy. Please try again.', true);
    }
  }

  private copyWithLegacyClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.readOnly = true;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);

    try {
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);
      if (!document.execCommand('copy')) {
        throw new Error('Legacy clipboard command was rejected');
      }
    } finally {
      document.body.removeChild(textArea);
    }
  }

  private showCopyFeedback(message: string, isError = false): void {
    clearTimeout(this.copyFeedbackTimer);
    this.copyFeedbackMessage = message;
    this.copyFeedbackIsError = isError;
    this.copyFeedbackTimer = setTimeout(() => {
      this.copyFeedbackMessage = '';
      this.copyFeedbackIsError = false;
      try { this.cdr.detectChanges(); } catch (error) { /* component may be closing */ }
    }, 2200);
  }

  ngOnDestroy(): void {
    clearTimeout(this.copyFeedbackTimer);
  }

  instructionItems: string[] = [
    'Switching from Self to Child connects this account to a family created by your parent or guardian.',
    'You will need the family code or QR code from your parent to complete the switch.',
    'After linking, your parent can see family activity such as habits, tasks, routines, streaks, progress, and rewards.',
    'Your personal space stays with you. Notes, coins, pet, and learning progress remain attached to this account.',
    '<span style="color:#282527; opacity: 1;font-family:Nunito; font-size:var(--text-base); font-weight:500; text-decoration:underline;">Note:</span> <span style="color:#282527; font-family:Nunito; font-size:var(--text-base); font-weight:500;">If you leave the family or are removed, this account returns to Self mode. Family-linked access stops until you join a family again.</span>'
  ];

  instructionItemsParent: string[] = [
    'Switching from Self to Parent lets this account create a family or join an existing family as a parent.',
    'If you create a family, you will receive a family code and QR code to share with your child.',
    'If you join an existing family, use the family code shared by the family creator.',
    'Parent mode gives access to family tools such as child progress, approvals, routines, tasks, and rewards.',
    '<span style="color:#282527; opacity: 1;font-family:Nunito; font-size:var(--text-base); font-weight:500; text-decoration:underline;">Note:</span> <span style="color:#282527; font-family:Nunito; font-size:var(--text-base); font-weight:500;">If you are the family creator, you cannot switch this same account back to Self mode directly. To use Self mode separately, create another account with different login details.</span>'
  ];

  consentChecked: boolean = false;

  // Retry guard for stale "no family" responses right after a self->parent/child role switch
  // (backend can briefly lag behind a just-completed conversion within the same session)
  private familyStatusRetryCount = 0;
  private readonly maxFamilyStatusRetries = 2;

  ngOnInit(): void {
    // Pre-populate from locally stored user data so the UI isn't blank during the API call
    try {
      const userData = this.coreAuthService.getUserData();
      this.familyAsChild = userData?.asChild === true;
      if (userData?.family?.familyCode) {
        this.familyCode = userData.family.familyCode;
        this.familyName = userData.family.familyName || this.familyName;
        this.qrCodeData = 'GROUP:' + this.familyCode;
      }
    } catch (e) { /* noop */ }

    // Load family status (this will also refresh user relationship using the same response)
    this.loadFamilyDetails();
    this.setFamilyFaqs();
  }

  /**
   * Refresh user relationship using an optional family-details response.
   * If a response is provided we use it (avoids duplicate API calls). Otherwise
   * we fetch the family-details from the server.
   */
  private refreshUserRelationship(response?: any): void {
    const process = (resp: any) => {
      if (resp && resp.family) {
        const family = resp.family as any;
        const members = family.members || [];
        const creator = family.creator;

        const userData = this.coreAuthService.getUserData() || {};

        if (creator && creator.you) {
          userData.relationship = creator.relationship?.toUpperCase() || 'PARENT';
        } else {
          const currentUserMember = members.find((m: any) => m.you === true);
          if (currentUserMember) {
            userData.relationship = currentUserMember.relationship?.toUpperCase() || 'CHILD';
          }
        }

        localStorage.setItem('user_data', JSON.stringify(userData));
        try { this.coreAuthService.setUserData(userData); } catch (e) { /* noop */ }
        console.log('[FamilyConnection] Refreshed user relationship:', userData.relationship);
        this.setFamilyFaqs();
        try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
      }
    };

    if (response) {
      process(response);
      return;
    }

    // No response provided — make a single API call
    this.authService.getFamilyDetails().pipe(take(1)).subscribe({
      next: (resp) => process(resp),
      error: (err) => console.error('[FamilyConnection] Failed to refresh user relationship:', err)
    });
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
    this.familyStatusRetryCount = 0;
    this.fetchFamilyStatus();
  }

  private fetchFamilyStatus(): void {
    this.authService.getFamilyStatus().pipe(take(1)).subscribe({
      next: (response) => {
        if (this.shouldRetryStaleFamilyStatus(response)) {
          this.familyStatusRetryCount++;
          const delay = 800 * this.familyStatusRetryCount; // 800ms, then 1600ms
          console.warn(`[FamilyConnection] Family status looks stale (attempt ${this.familyStatusRetryCount}/${this.maxFamilyStatusRetries}), retrying in ${delay}ms…`);
          setTimeout(() => this.fetchFamilyStatus(), delay);
          return;
        }
        this.applyFamilyDetailsResponse(response);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading family status:', error);

        this.authService.getFamilyDetails().pipe(take(1)).subscribe({
          next: (response) => {
            this.applyFamilyDetailsResponse(response);
            this.isLoading = false;
          },
          error: (fallbackError) => {
            console.error('Error loading fallback family details:', fallbackError);
            this.isLoading = false;
          }
        });
      }
    });
  }

  /**
   * A freshly-fetched "no family / self mode" response can be stale for a few seconds right
   * after the user completes a self->parent (or self->child) conversion in this same session —
   * the backend hasn't propagated the new role yet. We trust the locally-stored relationship
   * (set synchronously when the conversion succeeded) over a contradicting API response and
   * retry briefly instead of flashing the wrong "Self mode" screen.
   */
  private shouldRetryStaleFamilyStatus(response: any): boolean {
    if (this.familyStatusRetryCount >= this.maxFamilyStatusRetries) return false;

    const apiSaysNoFamily = !!response && (
      response.hasFamily === false ||
      response.mode === 'SELF' ||
      response.family === null ||
      this.normalizeRelationshipValue(response?.relationship) === 'SELF'
    );
    if (!apiSaysNoFamily) return false;

    const localRelationship = (this.coreAuthService.getUserData()?.relationship || '').toString().toUpperCase();
    return localRelationship === 'PARENT' || localRelationship === 'CHILD';
  }

  private applyFamilyDetailsResponse(response: any): void {
    if (this.isFamilyStatusResponse(response)) {
      this.applyFamilyStatusResponse(response);
      return;
    }

    if (response && ((response as any).mode === 'SELF' || (response as any).family === null)) {
      this.clearFamilyStateForSelfMode();
      return;
    }

    if (response && response.family) {
      const f = response.family as any;
      this.familyName = f.familyName || this.familyName;
      this.familyStatus = f.status || this.familyStatus;
      this.createdOn = this.formatCreatedOn(f.createdOn) || this.createdOn;
      const currentUserId = Number(this.coreAuthService.getUserData()?.id || localStorage.getItem('user_id') || 0);
      const familyMembers: FamilyMember[] = [f.creator, ...(Array.isArray(f.members) ? f.members : [])]
        .filter(Boolean)
        .map(member => this.normalizeFamilyStatusMember(member, currentUserId));
      this.creator = familyMembers.find(member => this.isParentRelationship(member.relationship) && member.coParent === false)
        || familyMembers.find(member => this.isParentRelationship(member.relationship) && member.coParent !== true)
        || null;
      const creatorKey = this.creator ? this.memberIdentity(this.creator) : null;
      this.members = creatorKey
        ? familyMembers.filter(member => this.memberIdentity(member) !== creatorKey)
        : familyMembers;
      this.isCurrentUserCoParent = familyMembers.some(member => member.you && member.coParent === true);
      this.familyCode = f.familyCode || (response as any).familyCode || this.familyCode;
    } else if (response && (response as any).familyCode) {
      this.familyCode = (response as any).familyCode;
    }

    // Fallback: use family code stored in local user data when the API doesn't return it
    if (!this.familyCode) {
      try {
        const userData = this.coreAuthService.getUserData();
        if (userData?.family?.familyCode) {
          this.familyCode = userData.family.familyCode;
          if (!this.familyName || this.familyName === 'Your Family') {
            this.familyName = userData.family.familyName || this.familyName;
          }
        }
      } catch (e) { /* noop */ }
    }

    try { this.refreshUserRelationship(response); } catch (e) { /* noop */ }
    this.qrCodeData = this.familyCode ? 'GROUP:' + this.familyCode : '';
    this.setFamilyFaqs();
    try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
  }

  private isFamilyStatusResponse(response: any): boolean {
    return !!response && (
      Object.prototype.hasOwnProperty.call(response, 'relationship') ||
      Object.prototype.hasOwnProperty.call(response, 'hasFamily') ||
      Object.prototype.hasOwnProperty.call(response, 'canSwitchRoles') ||
      Object.prototype.hasOwnProperty.call(response, 'ageLocked')
    );
  }

  private applyFamilyStatusResponse(response: any): void {
    const relationship = this.normalizeRelationshipValue(response?.relationship);
    this.familyRelationship = relationship;
    this.familyAsChild = response?.asChild === true;
    this.familyCanSwitchRoles = response?.canSwitchRoles === true;
    this.familyAgeLocked = response?.ageLocked === true;
    this.familyHasFamily = response?.hasFamily === true;

    this.updateStoredUserFromFamilyStatus(response, relationship);

    if (!this.familyHasFamily) {
      this.clearFamilyStateForSelfMode();
      this.familyRelationship = relationship;
      this.familyCanSwitchRoles = response?.canSwitchRoles === true;
      this.familyAgeLocked = response?.ageLocked === true;
      this.familyHasFamily = false;
      return;
    }

    const currentUserId = Number(response?.userId || this.coreAuthService.getUserData()?.id || localStorage.getItem('user_id') || 0);
    const normalizedMembers = Array.isArray(response?.members)
      ? response.members.map((member: any) => this.normalizeFamilyStatusMember(member, currentUserId))
      : [];
    const creator = normalizedMembers.find((member: FamilyMember) => this.isParentRelationship(member.relationship) && member.coParent === false)
      || normalizedMembers.find((member: FamilyMember) => this.isParentRelationship(member.relationship) && member.coParent !== true)
      || null;
    const creatorKey = creator ? this.memberIdentity(creator) : null;

    this.familyName = response?.familyName || this.familyName;
    this.familyStatus = response?.status || 'ACTIVE';
    this.createdOn = this.formatCreatedOn(response?.createdOn || response?.createdAt);
    this.creator = creator;
    this.isCurrentUserCoParent = normalizedMembers.some((member: FamilyMember) => member.you && member.coParent === true);
    this.members = creatorKey
      ? normalizedMembers.filter((member: FamilyMember) => this.memberIdentity(member) !== creatorKey)
      : normalizedMembers;
    this.familyCode = response?.familyCode || '';
    this.qrCodeData = this.familyCode ? 'GROUP:' + this.familyCode : '';
    this.setFamilyFaqs();
    try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
  }

  private normalizeRelationshipValue(value: any): 'SELF' | 'PARENT' | 'CHILD' {
    const normalized = (value || 'SELF').toString().toUpperCase();
    if (normalized === 'PARENT' || normalized === 'CHILD') return normalized;
    return 'SELF';
  }

  private normalizeFamilyStatusMember(member: any, currentUserId: number): FamilyMember {
    const rawRelationship = (member?.relationship || '').toString().toUpperCase();
    const relationship = member?.coParent === true || rawRelationship === 'CO_PARENT' || rawRelationship === 'CO-PARENT'
      ? 'Co-Parent'
      : rawRelationship === 'PARENT'
        ? 'Parent'
      : rawRelationship === 'CHILD'
        ? 'Child'
        : this.titleCase(member?.relationship || 'Child');
    const userId = Number(member?.id ?? member?.userId ?? member?.memberId ?? 0);
    const memberId = Number(member?.memberId ?? member?.id ?? member?.userId ?? 0);

    return {
      ...member,
      id: userId || member?.id,
      memberId: memberId || member?.memberId,
      userId: userId || member?.userId,
      relationship,
      age: Number(member?.age) || this.calculateAgeFromDob(member?.dateOfBirth),
      you: member?.you === true || (!!currentUserId && userId === currentUserId)
    };
  }

  private titleCase(value: string): string {
    const normalized = value.toString().toLowerCase().replace(/_/g, ' ');
    return normalized.replace(/\b\w/g, char => char.toUpperCase());
  }

  private calculateAgeFromDob(rawDob: any): number {
    if (!rawDob) return 0;
    const dob = new Date(rawDob);
    if (Number.isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  }

  private updateStoredUserFromFamilyStatus(response: any, relationship: 'SELF' | 'PARENT' | 'CHILD'): void {
    try {
      const userData = this.coreAuthService.getUserData() || {};
      const updatedUser: any = {
        ...userData,
        id: response?.userId || userData.id,
        name: response?.name || userData.name,
        relationship,
        asChild: response?.asChild === true
      };

      if (response?.hasFamily && (response?.familyCode || response?.familyName)) {
        updatedUser.familyCode = response.familyCode || userData.familyCode || '';
        updatedUser.familyName = response.familyName || userData.familyName || '';
        updatedUser.family = {
          ...(userData.family || {}),
          familyCode: updatedUser.familyCode,
          familyName: updatedUser.familyName
        };
      } else {
        delete updatedUser.family;
        delete updatedUser.familyMembers;
        delete updatedUser.familyCode;
        delete updatedUser.familyName;
      }

      this.coreAuthService.setUserData(updatedUser);
    } catch (error) {
      console.error('[FamilyConnection] Failed to sync my-status user data:', error);
    }
  }

  private memberIdentity(member: FamilyMember): string {
    return String((member as any).id || member.userId || member.memberId || member.name || '');
  }

  private isParentRelationship(relationship: string | undefined): boolean {
    return relationship === 'Parent' || relationship === 'Co-Parent';
  }

  private formatCreatedOn(raw: string | null | undefined): string {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return raw || '';
    }
  }

  private clearFamilyStateForSelfMode(): void {
    try {
      const userData = this.coreAuthService.getUserData() || {};
      userData.relationship = 'SELF';
      delete userData.family;
      delete userData.familyMembers;
      delete userData.familyCode;
      delete userData.familyName;
      this.coreAuthService.setUserData(userData);
    } catch (e) {
      console.error('Failed to update local user_data for SELF mode', e);
    }

    this.familyName = 'Your Family';
    this.familyStatus = '';
    this.createdOn = '';
    this.creator = null;
    this.isCurrentUserCoParent = false;
    this.members = [];
    this.familyCode = '';
    this.qrCodeData = '';
    this.showRemovePopup = false;
    this.memberToRemove = null;
    this.setFamilyFaqs();
    try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
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
    if (member.coParent === true || member.relationship === 'Co-Parent') {
      return member.you ? 'Co-Parent / You' : 'Co-Parent';
    }
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
   * Handle back action from superme-navigator — return to the user profile page
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
  canRemoveMember(member: FamilyMember): boolean {
    if (!this.isParentUser() || member.you) return false;
    if (this.isChildMember(member)) return true;
    // Only the main parent may remove an explicitly identified co-parent.
    // A co-parent must never be able to remove the family creator.
    return !this.isCurrentUserCoParent && member.coParent === true;
  }

  removeMember(member: FamilyMember): void {
    if (!this.canRemoveMember(member)) return;
    this.memberToRemove = member;
    this.showRemovePopup = true;
  }

  /**
   * Confirm and proceed with removing the member from the family.
   */
  confirmRemoveMember(): void {
    if (!this.memberToRemove || !this.canRemoveMember(this.memberToRemove)) return;

    const member = this.memberToRemove;
    const memberId = member.userId ?? member.id;
    this.showRemovePopup = false;
    this.memberToRemove = null;
    if (memberId === null || memberId === undefined) {
      console.error('[FamilyConnection] Cannot remove a member without an id');
      this.loadFamilyDetails();
      return;
    }
    const userId = String(memberId);

    // Optimistic update — remove from UI immediately
    this.members = this.members.filter(m =>
      String(m.userId || '') !== userId && String(m.id || '') !== userId
    );
    try { this.cdr.detectChanges(); } catch (e) { /* noop */ }

    // Call backend API to remove the member from the family
    this.authService.removeMemberFromFamily(memberId).pipe(take(1)).subscribe({
      next: () => {
        console.log('[FamilyConnection] Member removed successfully:', member.userId);
        // Pass every identifier the API supplied. Different family endpoints
        // expose either id, userId, or memberId; all cached consumers must
        // recognise this as the same removed child.
        this.coreAuthService.notifyFamilyMemberRemoved(member);
        // Reload fresh from server so screen reflects confirmed server state
        this.loadFamilyDetails();
      },
      error: (error) => {
        console.error('[FamilyConnection] Error removing member:', error);
        // Reload to restore correct state from server on failure
        this.loadFamilyDetails();
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
    this.goToRoleSelect();
  }

  /**
   * Helper to determine if current user is a parent (used by template)
   */
  isParentUser(): boolean {
    if (this.familyRelationship) {
      return this.familyRelationship === 'PARENT';
    }

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
    if (this.familyRelationship) {
      return this.familyRelationship === 'SELF';
    }

    try {
      return this.coreAuthService.getUserRelationship() === 'SELF';
    } catch (e) {
      console.error('Failed to determine user relationship:', e);
      return false;
    }
  }

  /** Label the no-family state using the role selected for this SELF account. */
  get familyModeHeading(): string {
    return this.familyAsChild ? 'Using Child role' : 'Using Self mode';
  }

  /**
   * Helper to check if user is self and age is between 18-24
   */
  isSelfUserWithIndependentGrowth(): boolean {
    if (this.familyAgeLocked && this.familyRelationship === 'SELF') {
      return true;
    }

    try {
      const userData = this.coreAuthService.getUserData();
      if (!userData) return false;

      // Check if user is in SELF mode
      if (userData.relationship !== 'SELF') return false;

      // Check if age is between 18-24
      const age = userData.age;
      if (typeof age === 'number' && age >= 18 && age <= 24) {
        return true;
      }

      // If age is stored as dateOfBirth, calculate it
      if (userData.dateOfBirth) {
        const dob = new Date(userData.dateOfBirth);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          calculatedAge--;
        }
        return calculatedAge >= 18 && calculatedAge <= 24;
      }

      return false;
    } catch (e) {
      console.error('Failed to check independent growth eligibility:', e);
      return false;
    }
  }

  onInstructionsBack() {
    this.showInstructions = false;
  }

  goToRoleSelect() {
    // navigate to the select-role page (global route)
    console.log('Navigating to role selector');
    this.router.navigate(['/authed/select-role']).catch(err => {
      console.error('Navigation to select-role failed', err);
      this.router.navigate(['/select-role']).catch(() => { });
    });
  }

  canViewMember(member: FamilyMember): boolean {
    return this.isParentUser() && this.isChildMember(member) && !member.you;
  }

  isChildMember(member: FamilyMember): boolean {
    return (member?.relationship || '').toString().toLowerCase() === 'child';
  }

  viewChildMember(member: FamilyMember): void {
    if (!this.canViewMember(member) || this.isSwitchingMember) return;

    const memberId = Number((member as any).id || member.userId || member.memberId);
    if (!memberId) return;

    const parentToken = localStorage.getItem('auth_token');
    const parentUserData = this.coreAuthService.getUserData() || {};
    this.isSwitchingMember = true;

    this.authService.switchFamilyMember(memberId).pipe(take(1)).subscribe({
      next: (response) => {
        this.isSwitchingMember = false;

        if (parentToken) {
          localStorage.setItem('family_parent_token', parentToken);
        }

        localStorage.setItem('family_parent_user_data', JSON.stringify(parentUserData));

        if (response?.token) {
          this.coreAuthService.replaceAuthToken(response.token);
        }

        // A child-view session must be built from the child response/member,
        // not from the parent's cached profile.  Reusing parentUserData here
        // made the child profile lose its own avatar, age and contact details.
        const childResponse = response?.user || response?.member || response?.profile || response || {};
        const childName = displayName({ ...member, ...childResponse, name: childResponse?.name || member.name }) || 'Child';
        const childId = childResponse?.id || childResponse?.userId || childResponse?.memberId || memberId;
        const childUserData = {
          ...member,
          ...childResponse,
          id: childId,
          userId: childId,
          name: childName,
          relationship: 'CHILD',
          age: childResponse?.age ?? member.age,
          dateOfBirth: childResponse?.dateOfBirth ?? member.dateOfBirth,
          avatar: childResponse?.avatar ?? member.avatar,
          avatarUrl: childResponse?.avatarUrl ?? member.avatarUrl,
          avatarName: childResponse?.avatarName ?? member.avatarName,
          avatarImageName: childResponse?.avatarImageName
            ?? member.avatarImageName
            ?? member.avatar?.avatarImageName
            ?? member.avatarName
        };

        this.coreAuthService.setUserData(childUserData);
        localStorage.setItem('family_monitoring_state', JSON.stringify({
          isMonitoring: true,
          monitoringChildName: childName,
          monitoringChildId: childId
        }));
        window.dispatchEvent(new CustomEvent('family-monitoring-changed'));
        this.router.navigate(['/home'], { replaceUrl: true });
      },
      error: (error) => {
        this.isSwitchingMember = false;
        console.error('[FamilyConnection] Failed to switch to child view:', error);
      }
    });
  }
}
