import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../../services/auth.service';
import { FamilyService } from '../../../services/family.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';
import { SupermeFactsComponent, PROFILE_FAQS, FaqItem } from '../../../components/superme-facts/superme-facts.component';

type ViewMode = 'instructions-child' | 'instructions-parent' | 'join-family-child' | 'join-family-parent';
type FamilyMode = 'create' | 'join';
type UserRole = 'child' | 'parent' | 'self';

// Use `FaqItem` from `superme-facts` (imported above)

@Component({
  selector: 'app-family-onboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, QRCodeComponent, SupermeNavigatorComponent, SupermeFactsComponent],
  templateUrl: './family-onboard.component.html',
  styleUrls: ['./family-onboard.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class FamilyOnboardComponent implements OnInit, OnDestroy {
  @Input() viewMode: ViewMode = 'instructions-child';

  // Form controls
  codeForm: FormGroup;
  familyForm: FormGroup;
  joinFamilyForm: FormGroup;

  // State management
  userRole: UserRole = 'child';
  selectedMode: FamilyMode = 'create';
  submitted = false;
  isLoading = false;
  familyCreated = false;
  isParentRegistered = false;
  showRegisterButton = false;

  // Data
  familyCode = '';
  qrCodeData = '';
  createdFamilyName = '';

  // Error message
  errorMessage = '';

  // Step descriptions (match signup flow so UI is consistent)
  public stepDescription: string[] = [
    'Pick a role to move forward',
    'Tell us about you!',
    'Sign up to begin your journey',
    "They'll grow with you, cheer you on"
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private familyService: FamilyService
  ) {
    // Single code input form for join-family flows
    this.codeForm = this.fb.group({
      code: ['']
    });

    // Create family form
    this.familyForm = this.fb.group({
      familyName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(30)
      ]]
    });

    // Join family form
    this.joinFamilyForm = this.fb.group({
      familyCode: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(10)
      ]]
    });
  }

  /**
   * Parse and return numeric step from `getStepInfo().step` like 'Step 2 of 4'
   */
  getCurrentStepNumber(): number {
    const s = this.getStepInfo().step || '';
    const m = s.match(/Step\s+(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  /**
   * Parse and return total steps from `getStepInfo().step` like 'Step 2 of 4'
   */
  getTotalSteps(): number {
    const s = this.getStepInfo().step || '';
    const m = s.match(/of\s+(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  /**
   * Return class name based on numeric step (1..4) matching signup CSS classes
   */
  returnSameNumber(stepNum: number): string {
    switch (stepNum) {
      case 1: return 'one';
      case 2: return 'two';
      case 3: return 'three';
      case 4: return 'four';
      default: return '';
    }
  }

  ngOnInit() {
    // Detect viewMode from current route URL if not set as @Input
    const currentUrl = this.router.url;
    if (currentUrl.includes('instructions-for-child')) {
      this.viewMode = 'instructions-child';
    } else if (currentUrl.includes('instructions-for-parent')) {
      this.viewMode = 'instructions-parent';
    } else if (currentUrl.includes('join-family2')) {
      this.viewMode = 'join-family-parent';
    } else if (currentUrl.includes('join-family')) {
      this.viewMode = 'join-family-child';
    }

    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const scannedCode = params['scannedCode'];

      if (role && ['child', 'parent', 'self'].includes(role)) {
        this.userRole = role as UserRole;
      }

      if (scannedCode) {
        if (this.viewMode === 'join-family-child') {
          this.codeForm.patchValue({ code: scannedCode });
        } else if (this.viewMode === 'join-family-parent') {
          this.selectedMode = 'join';
          this.joinFamilyForm.patchValue({ familyCode: scannedCode });
        }

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { role: this.userRole },
          queryParamsHandling: 'replace'
        });
      }
    });

    // FAQs are provided by superme-facts; no local initialization needed
    this.applyCodeValidators();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // FAQ initialization moved to `getFilteredFacts()` which uses shared PROFILE_FAQS

  /**
   * Apply validators for child role: code is required
   */
  private applyCodeValidators(): void {
    const control = this.codeForm.get('code');
    if (!control) return;

    if (this.userRole === 'child') {
      control.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{8}$/)]);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity({ onlySelf: true });
  }

  /**
   * Validate code format (8 alphanumeric)
   */
  private isValidCode(code?: string | null): boolean {
    if (!code) return false;
    return /^[A-Za-z0-9]{8}$/.test(code);
  }

  /**
   * Get form controls for template
   */
  get f() { return this.codeForm.controls as any; }
  get codeControl() { return this.codeForm.get('code'); }
  get familyNameControl() { return this.familyForm.get('familyName'); }
  get familyCodeControl() { return this.joinFamilyForm.get('familyCode'); }

  /**
   * Get dynamic navigation title based on view mode
   */
  getNavigationTitle(): string {
    const titles: Record<ViewMode, string> = {
      'instructions-child': 'Instructions',
      'instructions-parent': 'Instructions',
      'join-family-child': 'Join Your Family',
      'join-family-parent': 'Create or Join Your Family'
    };
    return titles[this.viewMode];
  }

  /**
   * Get step progress based on view mode
   */
  getStepInfo(): { step: string; progress: string } {
    const steps: Record<ViewMode, { step: string; progress: string }> = {
      'instructions-child': { step: 'Step 2 of 4', progress: '50%' },
      'instructions-parent': { step: 'Step 2 of 3', progress: '66%' },
      'join-family-child': { step: 'Step 3 of 4', progress: '75%' },
      'join-family-parent': { step: 'Step 3 of 3', progress: '100%' }
    };
    const info = steps[this.viewMode];
    return info || { step: '', progress: '0%' };
  }

  /**
   * Navigation: Back button behavior varies by view mode
   */
  goBack(): void {
    if (this.viewMode === 'join-family-parent' && this.familyCreated) {
      this.familyCreated = false;
      this.selectedMode = 'create';
      this.familyForm.reset();
      return;
    }

    const backRoutes: Record<ViewMode, string> = {
      'instructions-child': '/auth/signup',
      'instructions-parent': '/auth/signup',
      'join-family-child': '/auth/instructions-for-child',
      'join-family-parent': '/auth/instructions-for-parent'
    };

    const route = backRoutes[this.viewMode];
    const queryParams = this.viewMode.startsWith('join-family') ? { role: this.userRole } : { step: 2 };
    this.router.navigate([route], { queryParams });
  }

  /**
   * Select mode for parent: create or join
   */
  selectMode(mode: FamilyMode): void {
    this.selectedMode = mode;
    this.errorMessage = '';
    if (mode === 'join') {
      this.joinFamilyForm.reset();
    } else {
      this.familyForm.reset();
      this.familyCreated = false;
    }
  }

  /**
   * JOIN FAMILY (Child role): validate and store code
   */
  submitJoinFamily(): void {
    this.submitted = true;
    this.errorMessage = '';
    Object.keys(this.codeForm.controls).forEach(k => this.codeForm.controls[k].markAsTouched());

    if (this.userRole === 'child' && this.codeForm.invalid) {
      return;
    }

    const familyCode = this.codeForm.get('code')?.value;

    if (familyCode) {
      if (!this.isValidCode(familyCode)) {
        this.errorMessage = 'Please enter a valid 8-character family code';
        return;
      }
      sessionStorage.setItem('familyCode', familyCode);
    } else {
      if (this.userRole === 'child') {
        this.errorMessage = 'Family code is required to join as a child';
        return;
      }
    }

    sessionStorage.setItem('signup_role', this.userRole);

    if (familyCode) {
      const queryParams: any = { step: 4, role: this.userRole, familyCode };
      this.router.navigate(['/auth/signup'], { queryParams });
      return;
    }

    this.router.navigate(['/auth/login'], { queryParams: { role: this.userRole } });
  }

  /**
   * CREATE FAMILY (Parent role)
   */
  createFamily(): void {
    this.errorMessage = '';
    if (this.familyForm.invalid) {
      this.familyForm.markAllAsTouched();
      this.errorMessage = 'Please enter a valid family name (2-30 characters)';
      return;
    }

    this.isLoading = true;
    const familyName = this.familyForm.get('familyName')?.value;
    sessionStorage.setItem('familyName', familyName);
    this.createdFamilyName = familyName;

    this.familyService.createFamily(familyName).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.familyCreated = true;
        this.familyCode = response.familyCode || this.generateFamilyCode();
        this.qrCodeData = 'GROUP:' + this.familyCode;
        sessionStorage.setItem('familyCode', this.familyCode);
        try { sessionStorage.setItem('familyCreator', 'true'); } catch (e) { }
        this.showRegisterButton = true;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to create family. Please try again.';
      }
    });
  }

  /**
   * JOIN FAMILY (Parent role)
   */
  joinFamily(): void {
    this.errorMessage = '';
    if (this.joinFamilyForm.invalid) {
      this.joinFamilyForm.markAllAsTouched();
      this.errorMessage = 'Please enter a valid family code (6-10 characters)';
      return;
    }

    const familyCode = this.joinFamilyForm.get('familyCode')?.value;
    sessionStorage.setItem('familyCode', familyCode);
    try { sessionStorage.removeItem('familyCreator'); } catch (e) { }

    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password');
    if (profileStr && password) {
      this.registerAccount();
      return;
    }

    // If user is in signup flow (has signup_role), navigate back to signup step 2 to complete profile
    const signupRole = sessionStorage.getItem('signup_role');
    if (signupRole === 'parent') {
      this.router.navigate(['/auth/signup'], { queryParams: { step: 2 } });
      return;
    }

    this.redirectToLogin();
  }

  /**
   * Copy family code to clipboard
   */
  copyFamilyCode(): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(this.familyCode).then(() => {
        this.showCopySuccess();
      }).catch(() => {
        this.fallbackCopyTextToClipboard(this.familyCode);
      });
    } else {
      this.fallbackCopyTextToClipboard(this.familyCode);
    }
  }

  private showCopySuccess(): void {
    // Show a temporary success message
    const originalErrorMessage = this.errorMessage;
    this.errorMessage = '';
    alert('Family code copied to clipboard!');
  }

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
      alert('Family code copied to clipboard!');
    } catch (err) {
      alert('Failed to copy family code');
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
        url: `${window.location.origin}/auth/join-family?code=${this.familyCode}`
      }).catch(() => {
        this.fallbackShare();
      });
    } else {
      this.fallbackShare();
    }
  }

  private fallbackShare(): void {
    // Copy to clipboard as fallback
    this.copyFamilyCode();
  }

  /**
   * Child completed setup - redirect or register parent
   */
  childCompleted(): void {
    const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.userRole;

    if (role === 'child' || role === 'self') {
      // Navigate to pet selection in signup flow
      this.router.navigate(['/auth/signup'], { queryParams: { step: 4 } });
      return;
    }

    if (this.isParentRegistered || (!this.showRegisterButton && this.familyCreated)) {
      this.router.navigate(['/dashboard']);
      return;
    }

    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password');

    if (profileStr && password) {
      this.registerAccount();
    }
  }

  /**
   * Register parent account
   */
  registerAccount(): void {
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password');

    if (!profileStr || !password) {
      this.redirectToLogin();
      return;
    }

    try {
      const profile = JSON.parse(profileStr);
      const familyCode = sessionStorage.getItem('familyCode') || '';
      const isCreator = sessionStorage.getItem('familyCreator') === 'true';

      this.isLoading = true;

      const referralCode = sessionStorage.getItem('referralCode') || '';

      const payload: any = {
        name: profile.name || '',
        gender: (profile.gender || '').toUpperCase(),
        relationship: 'PARENT',
        password: password,
        familyCode: familyCode || '',
        familyName: sessionStorage.getItem('familyName') || this.createdFamilyName || '',
        referralCode: referralCode || null
      };

      // Include avatar fields when available and numeric (e.g., Avatar 3)
      try {
        const avatarKey = profile.avatar ?? null;
        const numericKey = typeof avatarKey === 'number' ? avatarKey : (typeof avatarKey === 'string' && avatarKey.match(/\d+/) ? Number(avatarKey.match(/\d+/)![0]) : null);
        if (numericKey && numericKey >= 1) {
          payload.avatarName = `avatar${numericKey}`;
          payload.avatarImageName = `Avatar ${numericKey}`;
        }
      } catch (e) { }

      // Add date of birth from profile
      if (profile.dob) {
        let dobDate: Date;
        if (typeof profile.dob === 'number') {
          dobDate = new Date(profile.dob);
        } else {
          dobDate = new Date(profile.dob);
        }
        if (!isNaN(dobDate.getTime())) {
          payload.dateOfBirth = dobDate.toISOString().split('T')[0];
        }
      }

      // Retrieve email or phone from signup flow
      const requestedIdentifier = sessionStorage.getItem('requestedIdentifier');
      const loginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone';
      const countryCode = sessionStorage.getItem('countryCode');

      if (loginMode === 'email' || (requestedIdentifier && requestedIdentifier.includes('@'))) {
        payload.email = requestedIdentifier || '';
      } else if (requestedIdentifier) {
        payload.phone = (countryCode ? countryCode : '') + requestedIdentifier;
      }

      if (isCreator) {
        payload.familyRole = 'CREATOR';
      } else if (familyCode) {
        payload.familyRole = 'CO_PARENT';
      }

      this.authService.register(payload).subscribe({
        next: () => {
          this.isParentRegistered = true;

          // Store credentials for auto-login
          try {
            if (payload.email) sessionStorage.setItem('login_email', payload.email);
            if (payload.phone) sessionStorage.setItem('login_phone', payload.phone);
            sessionStorage.setItem('login_password', password);
          } catch (e) { }

          // Auto-login parent after registration
          const loginCredentials: any = { password: password };
          if (payload.email) {
            loginCredentials.email = payload.email;
          } else if (payload.phone) {
            loginCredentials.phone = payload.phone;
          }

          if (loginCredentials.email || loginCredentials.phone) {
            this.authService.login(loginCredentials).subscribe({
              next: () => {
                // Clear signup session data after successful login
                this.clearSessionData();
                this.isLoading = false;
                this.router.navigate(['/dashboard']);
              },
              error: (loginErr) => {
                console.error('Auto-login failed after registration', loginErr);
                this.isLoading = false;
                this.router.navigate(['/dashboard']);
              }
            });
          } else {
            this.isLoading = false;
            this.childCompleted();
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isParentRegistered = false;
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }
      });
    } catch (error) {
      this.errorMessage = 'Error processing registration data';
      this.redirectToLogin();
    }
  }

  private clearSessionData(): void {
    try {
      sessionStorage.removeItem('signup_profile');
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('signup_role');
      sessionStorage.removeItem('requestedIdentifier');
      sessionStorage.removeItem('loginMode');
      sessionStorage.removeItem('countryCode');
      sessionStorage.removeItem('familyCode');
      sessionStorage.removeItem('familyName');
      sessionStorage.removeItem('familyCreator');
    } catch (e) { }
  }

  /**
   * Redirect to login
   */
  private redirectToLogin(): void {
    this.router.navigate(['/auth/login'], { queryParams: { role: this.userRole } });
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

  /**
   * Navigate to next step based on view mode
   */
  navigateNext(): void {
    if (this.viewMode === 'instructions-child') {
      this.router.navigate(['/auth/join-family'], { queryParams: { role: this.userRole } });
    } else if (this.viewMode === 'instructions-parent') {
      this.router.navigate(['/auth/join-family2'], { queryParams: { role: this.userRole } });
    }
  }

  getFilteredFacts(): FaqItem[] {
    // Default to onboarding-related FAQs
    let section = 'Onboarding';
    let screen = '';

    if (this.viewMode === 'instructions-child') {
      screen = 'Instructions- Child (Pre Linking)';
    } else if (this.viewMode === 'instructions-parent') {
      screen = 'Instructions-Parents';
    } else if (this.viewMode === 'join-family-parent') {
      // When parent is on the Create/Join family page, show the Join/Create Family-Parents FAQs
      screen = 'Join/Create Family-Parents';
    } else if (this.viewMode === 'join-family-child') {
      // For child join flow, surface profile/family related FAQs
      section = 'Profile';
      screen = 'My Family (Child)';
    }

    if (!screen) return [];

    return PROFILE_FAQS.filter(faq => faq.section === section && faq.screen === screen);
  }
}
