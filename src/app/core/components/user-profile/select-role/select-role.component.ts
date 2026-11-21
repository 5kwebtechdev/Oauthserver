import { secureTemporaryStorage as sessionStorage } from '../../../storage/session-storage';
import { sessionStorageAdapter as localStorage } from '../../../storage/session-storage';
import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { ProfileFactsComponent, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { NavigationService } from '../../../services/navigation.service';
import { FamilyService } from '../../../services/family.service';
import { AuthService } from '../../../services/auth.service';
import { EligibilityOption, RoleEligibilityResponse, RoleEligibilityService } from '../../../services/role-eligibility.service';
import { take } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  standalone: true,
  selector: 'role-select',
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, ProfileFactsComponent, QRCodeComponent],
  templateUrl: './select-role.component.html',
  styleUrls: ['../../../../home/family-onboard/family-onboard.component.scss', './select-role.component.scss']
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

  readonly switchInstructions = [
    {
      heading: 'When You Switch to Child Role',
      parent: false,
      items: [
        { icon: 'instruction-family', title: 'Join your family', before: 'Your parent creates the family, you join it. They can track your progress and ', emphasis: 'send you rewards.', after: '' },
        { icon: 'instruction-key', title: 'No code? No problem', before: "Skip the family code for now and start using the app. ", emphasis: "Link up whenever you're ready.", after: '' },
        { icon: 'instruction-control', title: "You're still in control", before: "Add your own activities and use the app your way. ", emphasis: "Being linked doesn't change that.", after: '' }
      ]
    },
    {
      heading: 'When You Switch to Parent Role',
      parent: true,
      items: [
        { icon: 'instruction-visibility', title: 'Full view of their day', before: "See your child's activities, track progress, assign tasks, and ", emphasis: "send rewards", after: " all from your account." },
        { icon: 'instruction-add', title: 'Create or join a family', before: "After switching, you'll set up a family. ", emphasis: "The app walks you through it", after: " step by step." }
      ]
    }
  ];

  readonly profileChildFaqs = PROFILE_FAQS
    .filter(faq => faq.screen === 'Instructions- Child (Pre Linking)')
    .map(faq => faq.question === 'Can I skip this step and link with my parent later?'
      ? { ...faq, answer: 'Yes. You can keep using your current account and link with your parent later from My Family.' }
      : faq);
  readonly profileParentFaqs = PROFILE_FAQS.filter(faq => faq.screen === 'Join/Create Family-Parents');
  readonly familySuccessFaqs = PROFILE_FAQS.filter(faq => faq.screen === 'Create Family Code Display- Parents').slice(0, 4);

  // Family flow toggle for Step 3: 'create' | 'join'
  selectedFamilyAction: 'create' | 'join' = 'create';
  showRoleOverview = false;
  roleOverviewAccepted = false;
  familyModeChosen = false;
  showQrEntry = false;
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

  private queueFamilyConnectedAcknowledgment(relationship: 'CHILD' | 'PARENT', created = false): void {
    try {
      const displayRole = relationship === 'PARENT' ? 'Parent' : 'Child';
      sessionStorage.setItem('family_connected_ack', JSON.stringify({
        source: 'self-role-switch',
        role: displayRole,
        created
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

  chooseRoleCard(role: string): void {
    this.selectRole(role);
    if (this.roleOverviewAccepted && this.selectedRole === role) this.save();
  }

  backFromRoleSelection(): void {
    if (this.roleOverviewAccepted) {
      this.showRoleOverview = true;
    } else {
      this.goBack();
    }
  }

  chooseSwitchFamilyMode(mode: 'create' | 'join'): void {
    this.setFamilyAction(mode);
    this.showQrEntry = false;
    this.familyModeChosen = true;
  }

  backFromFamilyForm(): void {
    if (this.selectedRole === 'parent') {
      this.familyModeChosen = false;
    } else {
      this.prevStep();
    }
  }

  async onFamilySuccessDone(): Promise<void> {
    if (!this.familyCreated || this.isSubmitting) return;
    this.onChildTaskCompleted();
    await this.beginParentAccount();
  }

  skipForNow(): void {
    void this.router.navigate(['/home'], { replaceUrl: true });
  }

  async shareFamilyCodeRequest(): Promise<void> {
    const text = 'Please share your SuperMeApp family code so I can join our family.';
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ text });
      else if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        await this.showToast('Message copied.', 'success');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        await this.showToast('Could not share the message.', 'warning');
      }
    }
  }

  async onScanQr(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      await this.showToast('Upload a QR image or enter the family code on this browser.', 'warning');
      return;
    }
    try {
      if (Capacitor.getPlatform() === 'android') {
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!available) {
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          await this.showToast('QR scanner is being set up. Try again or enter the family code.', 'warning');
          return;
        }
      }
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const result = barcodes[0];
      if (result) await this.applyScannedFamilyCode(result.rawValue || result.displayValue);
    } catch {
      await this.showToast('Could not scan the QR code. Try entering the family code.', 'warning');
    }
  }

  async readFamilyQrImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      if (Capacitor.isNativePlatform()) {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const path = `family-qr-${crypto.randomUUID()}`;
        const { uri } = await Filesystem.writeFile({ path, data, directory: Directory.Cache });
        try {
          const { barcodes } = await BarcodeScanner.readBarcodesFromImage({ path: uri, formats: [BarcodeFormat.QrCode] });
          await this.applyScannedFamilyCode(barcodes[0]?.rawValue);
        } finally {
          await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
        }
      } else {
        const Detector = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => {
          detect(image: ImageBitmap): Promise<{ rawValue: string }[]>;
        } }).BarcodeDetector;
        if (!Detector) {
          await this.showToast('Enter the family code to join on this browser.', 'warning');
          return;
        }
        const bitmap = await createImageBitmap(file);
        try {
          const results = await new Detector({ formats: ['qr_code'] }).detect(bitmap);
          await this.applyScannedFamilyCode(results[0]?.rawValue);
        } finally {
          bitmap.close();
        }
      }
    } catch {
      await this.showToast('Could not read this QR image.', 'warning');
    }
  }

  private async applyScannedFamilyCode(value?: string): Promise<void> {
    const code = value?.trim().replace(/^GROUP:/i, '').trim();
    if (!code || !/^[a-z0-9]{8}$/i.test(code)) {
      await this.showToast('This QR code does not contain a valid family code.', 'warning');
      return;
    }
    this.onFamilyInputChange(code);
    this.showQrEntry = false;
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
    this.showRoleOverview = this.userAccountType === 'self';
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
      this.chooseRoleCard(role);
    }
  }

  /**
   * Save/continue handler. Advances through steps:
   * - On step 1: require selectedRole, then go to step 2
   * - On step 2: go to step 3
   * - On step 3: finalize (finish flow)
   */
  advanceRoleInstructions(): void {
    if (this.showRoleOverview) {
      this.showRoleOverview = false;
      this.roleOverviewAccepted = true;
    } else {
      this.save();
    }
  }

  save() {
    if (this.currentStep === 1) {
      if (!this.selectedRole || !this.canSelectRole(this.selectedRole)) return;
      if (this.selectedRole === 'self') {
        this.confirmAgeSwitch();
        return;
      }
      console.log('Selected role:', this.selectedRole);
      this.instructionConsentChecked = this.roleOverviewAccepted;
      this.nextStep();
      if (this.roleOverviewAccepted) this.save();
      return;
    }

    if (this.currentStep === 2) {
      if (!this.instructionConsentChecked) return;
      this.familyModeChosen = false;
      this.showQrEntry = false;
      this.nextStep();
      return;
    }

    if (this.currentStep === 3 && !this.isSubmitting) {
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
      this.currentStep = this.currentStep === 3 && this.roleOverviewAccepted ? 1 : this.currentStep - 1;
      if (this.currentStep === 1) {
        this.instructionConsentChecked = this.roleOverviewAccepted;
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
    this.queueFamilyConnectedAcknowledgment('PARENT', this.familyCreated);
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

  async shareQRCode(container: HTMLElement): Promise<void> {
    const canvas = container.querySelector('canvas');
    if (!canvas || !this.familyCode) return;
    const text = `Join my family on SuperMeApp with code: ${this.familyCode}`;
    try {
      if (Capacitor.isNativePlatform()) {
        const path = `family-share-${crypto.randomUUID()}.png`;
        const data = canvas.toDataURL('image/png').split(',')[1];
        const { uri } = await Filesystem.writeFile({ path, data, directory: Directory.Cache });
        try {
          await Share.share({ text, files: [uri] });
        } finally {
          await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
        }
      } else {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('QR image unavailable');
        const files = [new File([blob], 'family-qr.png', { type: 'image/png' })];
        if (navigator.canShare?.({ files })) {
          try {
            await navigator.share({ text, files });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
          }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = files[0].name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      if (!/cancel|abort/i.test(String(error))) await this.showToast('Could not share the QR code.', 'warning');
    }
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
