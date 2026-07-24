import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FamilyService } from '../../core/services/family.service';
import { CoreService } from '../../core/services/core.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CredentialSaverService } from '../../core/services/credential-saver.service';
import { SignupCredentialStateService } from '../../core/services/signup-credential-state.service';
import { BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';
import { AlertController, IonicModule } from '@ionic/angular';
import { FaqItem, PROFILE_FAQS } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { SupermeNavigatorComponent } from '../../core/components/superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../core/components/superme-button/superme-button.component';
import { ProfileFactsComponent } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { QRCodeComponent } from 'angularx-qrcode';
import { toApiGender } from '../../core/models/gender.model';

type ViewMode = 'instructions-child' | 'instructions-parent' | 'join-family-child' | 'join-family-parent';
type FamilyMode = 'create' | 'join';
type UserRole = 'child' | 'parent' | 'self';

@Component({
    selector: 'app-family-onboard',
    standalone: true,
    imports: [CommonModule, IonicModule, ReactiveFormsModule, SupermeNavigatorComponent, SupermeButtonComponent, ProfileFactsComponent, QRCodeComponent],
    templateUrl: './family-onboard.component.html',
    styleUrls: ['./family-onboard.component.scss']
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
    isScanning = false;
    isParentRegistered = false;
    showRegisterButton = false;

    // Data
    familyCode = '';
    qrCodeData = '';
    createdFamilyName = '';

    // Family code validation state
    codeValidationStatus: 'valid' | 'invalid' | null = null;
    joinFamilyCodeValidationStatus: 'valid' | 'invalid' | null = null;
    isCheckingCode = false;
    isCheckingJoinFamilyCode = false;
    private codeCheckTimeout: any;
    private joinFamilyCodeCheckTimeout: any;

    // Max parents error state
    maxParentsErrorMessage: string | null = null;

    // FAQs
    faqs: FaqItem[] = [];
    createModeFaqs: FaqItem[] = [];
    joinModeFaqs: FaqItem[] = [];
    createdModeFaqs: FaqItem[] = [];
    expandedFamilyCodeFaq: number | null = null;
    expandedCreateFamilyFaq: number | null = null;
    expandedParentJoinFamilyFaq: number | null = null;
    readonly familyCodeFaqs = [
        {
            question: `What if my parent doesn't have an account yet?`,
            answer: `Ask your parent to create a Parent account in SuperMe first. They can then create a family and share its Family Code or QR Code with you.`
        },
        {
            question: `Can I skip this step and link with my parent later?`,
            answer: `Yes. You can continue for now and link with your parent later from your profile.`
        },
        {
            question: `What happens if I link to the wrong family by mistake?`,
            answer: `Ask the family owner to remove the connection, then enter the correct Family Code. You can also contact support if you need help.`
        },
        {
            question: `What information can my parent see about me?`,
            answer: `Once linked, your parent can see the family progress and activity information available through the SuperMe parental experience.`
        }
    ];

    constructor(
        private fb: FormBuilder,
        public router: Router,
        private route: ActivatedRoute,
        private familyService: FamilyService,
        private core: CoreService,
        private alertController: AlertController,
        private authService: AuthService,
        private userService: UserService,
        private credentialSaverService: CredentialSaverService,
        private signupCredentialState: SignupCredentialStateService
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

        // Join family form (current 6-character and legacy 8-character codes)
        this.joinFamilyForm = this.fb.group({
            familyCode: ['', [
                Validators.required,
                Validators.pattern(/^(?:[A-Za-z0-9]{6}|[A-Za-z0-9]{8})$/)
            ]]
        });
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
            const requestedMode = params['mode'];
            const savedFamilyCode = (sessionStorage.getItem('familyCode') || '').trim().toUpperCase();

            if (role && ['child', 'parent', 'self'].includes(role)) {
                this.userRole = role as UserRole;
            }

            if (this.viewMode === 'join-family-parent' && (requestedMode === 'create' || requestedMode === 'join')) {
                this.selectedMode = requestedMode;
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
                    queryParams: this.viewMode === 'join-family-parent'
                        ? { role: this.userRole, mode: 'join' }
                        : { role: this.userRole },
                    queryParamsHandling: 'replace'
                });
            } else if (savedFamilyCode) {
                if (this.viewMode === 'join-family-child' && !this.codeForm.get('code')?.value) {
                    this.codeForm.patchValue({ code: savedFamilyCode });
                    if (this.isValidCode(savedFamilyCode)) {
                        this.checkFamilyCodeValidity(savedFamilyCode, 'child');
                    }
                } else if (this.viewMode === 'join-family-parent' && !this.joinFamilyForm.get('familyCode')?.value) {
                    this.selectedMode = 'join';
                    this.joinFamilyForm.patchValue({ familyCode: savedFamilyCode });
                    if (this.isValidCode(savedFamilyCode)) {
                        this.checkFamilyCodeValidity(savedFamilyCode, 'parent');
                    }
                }
            }
        });

        this.initializeFaqs();
        this.applyCodeValidators();

        // Also watch parent join-family input for 6/8-character validation and auto-check
        const joinCtrl = this.joinFamilyForm.get('familyCode');
        if (joinCtrl) {
            joinCtrl.valueChanges.subscribe((val: any) => {
                const raw = (val || '').toString();
                const trimmed = raw.trim().toUpperCase();

                if (!trimmed) {
                    this.joinFamilyCodeValidationStatus = null;
                    return;
                }

                // If longer than 8, truncate to 8 and update control silently
                if (trimmed.length > 8) {
                    const truncated = trimmed.slice(0, 8);
                    joinCtrl.setValue(truncated, { emitEvent: false });
                    // Trigger a check for a supported truncated value.
                    if (truncated.length === 6 || truncated.length === 8) {
                        this.onJoinFamilyCodeInputChange(truncated);
                    } else {
                        this.joinFamilyCodeValidationStatus = null;
                    }
                    return;
                }

                if (trimmed.length === 6 || trimmed.length === 8) {
                    this.onJoinFamilyCodeInputChange(trimmed);
                } else {
                    this.joinFamilyCodeValidationStatus = null;
                }
            });
        }
    }

    ngOnDestroy() {
        // Clear any pending timeouts
        if (this.codeCheckTimeout) {
            clearTimeout(this.codeCheckTimeout);
        }
        if (this.joinFamilyCodeCheckTimeout) {
            clearTimeout(this.joinFamilyCodeCheckTimeout);
        }
        this.stopScanner().catch(e => console.error('Error stopping scanner:', e));
    }

    /**
     * Initialize FAQs based on view mode
     */
    private initializeFaqs(): void {
        const baseFilter = (screen: string) =>
            (f: FaqItem) => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes(screen);

        switch (this.viewMode) {
            case 'instructions-child':
                this.faqs = PROFILE_FAQS.filter(baseFilter('instructions- child (pre linking)'));
                break;
            case 'instructions-parent':
                this.faqs = PROFILE_FAQS.filter(baseFilter('instructions-parents'));
                break;
            case 'join-family-child':
                this.faqs = PROFILE_FAQS.filter(baseFilter('code entry'));
                break;
            case 'join-family-parent':
                // Separate FAQs for create and join modes
                this.createModeFaqs = PROFILE_FAQS.filter(baseFilter('join/create'));
                this.joinModeFaqs = PROFILE_FAQS.filter(f =>
                    baseFilter('join family')(f) && !(f.screen || '').toLowerCase().includes('create')
                );
                this.createdModeFaqs = PROFILE_FAQS.filter(baseFilter('create family code'));
                // Show appropriate FAQs based on mode and family creation status
                this.updateParentFaqs();
                break;
        }
    }

    /**
     * Update FAQs for parent role based on current mode and family status
     */
    private updateParentFaqs(): void {
        if (this.familyCreated) {
            // Show created family FAQs when family is already created
            this.faqs = this.createdModeFaqs;
        } else if (this.selectedMode === 'create') {
            // Show only create FAQs
            this.faqs = this.createModeFaqs;
        } else {
            // Show only join FAQs
            this.faqs = this.joinModeFaqs;
        }
    }

    /**
     * Apply validators for child role: code is required
     */
    private applyCodeValidators(): void {
        const control = this.codeForm.get('code');
        if (!control) return;

        if (this.userRole === 'child') {
            control.setValidators([
                Validators.required,
                Validators.pattern(/^(?:[A-Za-z0-9]{6}|[A-Za-z0-9]{8})$/)
            ]);
        } else {
            control.clearValidators();
        }
        control.updateValueAndValidity({ onlySelf: true });

        // Listen to value changes for auto-validation when user is joining family
        control.valueChanges.subscribe(value => {
            if (this.viewMode === 'join-family-child' && value) {
                this.onCodeInputChange(value);
            }
            if (this.viewMode === 'join-family-parent' && this.selectedMode === 'join' && value) {
                this.onJoinFamilyCodeInputChange(value);
            }
        });
    }

    /**
     * Handle code input change for child joining family
     * Auto-check when a supported 6- or 8-character code is entered.
     */
    private onCodeInputChange(code: string): void {
        // Clear previous timeout
        if (this.codeCheckTimeout) {
            clearTimeout(this.codeCheckTimeout);
        }

        const trimmedCode = code.trim().toUpperCase();

        // New family codes are 6 characters; legacy 8-character codes remain supported.
        if (trimmedCode.length !== 6 && trimmedCode.length !== 8) {
            this.codeValidationStatus = null;
            return;
        }

        // Auto-check at either supported length.
        this.checkFamilyCodeValidity(trimmedCode, 'child');
    }

    /**
     * Handle family code input change for parent joining family
     * Auto-check when a supported 6- or 8-character code is entered.
     */
    private onJoinFamilyCodeInputChange(code: string): void {
        // Clear previous timeout
        if (this.joinFamilyCodeCheckTimeout) {
            clearTimeout(this.joinFamilyCodeCheckTimeout);
        }

        const trimmedCode = code.trim().toUpperCase();

        // New family codes are 6 characters; legacy 8-character codes remain supported.
        if (trimmedCode.length !== 6 && trimmedCode.length !== 8) {
            this.joinFamilyCodeValidationStatus = null;
            return;
        }

        // Clear any previous max parents error when user changes the code
        this.maxParentsErrorMessage = null;

        // Auto-check at either supported length.
        this.checkFamilyCodeValidity(trimmedCode, 'parent');
    }

    /**
     * Check family code validity via API
     */
    private checkFamilyCodeValidity(familyCode: string, role: 'child' | 'parent'): void {
        const isChildRole = role === 'child';
        const loadingFlag = isChildRole ? this.isCheckingCode : this.isCheckingJoinFamilyCode;

        if (loadingFlag) return; // Already checking

        const setLoading = (value: boolean) => {
            if (isChildRole) {
                this.isCheckingCode = value;
            } else {
                this.isCheckingJoinFamilyCode = value;
            }
        };

        const setStatus = (status: 'valid' | 'invalid' | null) => {
            if (isChildRole) {
                this.codeValidationStatus = status;
            } else {
                this.joinFamilyCodeValidationStatus = status;
            }
        };

        setLoading(true);

        this.familyService.checkFamilyCode(familyCode).subscribe({
            next: (response) => {
                setLoading(false);
                if (response.exists) {
                    setStatus('valid');
                } else {
                    setStatus('invalid');
                }
            },
            error: (error) => {
                setLoading(false);
                console.error('Error checking family code:', error);
                setStatus('invalid');
            }
        });
    }

    /**
     * Validate child family-code format. New codes use 6 characters while
     * existing accounts can still have legacy 8-character codes.
     */
    private isValidCode(code?: string | null): boolean {
        if (!code) return false;
        return /^(?:[A-Za-z0-9]{6}|[A-Za-z0-9]{8})$/.test(code);
    }

    /**
     * Get form controls for template
     */
    get f() { return this.codeForm.controls as any; }
    get codeControl() { return this.codeForm.get('code'); }
    get familyNameControl() { return this.familyForm.get('familyName'); }
    get familyCodeControl() { return this.joinFamilyForm.get('familyCode'); }
    get isCreateFamilyScreen(): boolean {
        return this.viewMode === 'join-family-parent' && this.selectedMode === 'create' && !this.familyCreated;
    }
    get isParentJoinFamilyScreen(): boolean {
        return this.viewMode === 'join-family-parent' && this.selectedMode === 'join' && !this.familyCreated;
    }

    /**
     * Get dynamic navigation title based on view mode
     */
    getNavigationTitle(): string {
        const titles: Record<ViewMode, string> = {
            'instructions-child': 'Instructions',
            'instructions-parent': 'Instructions',
            // The child code-entry screen shows its own "Step 6 of 6" hero
            // header in the page body, so the nav bar itself stays title-less
            // (back arrow only) to match the reference design.
            'join-family-child': '',
            'join-family-parent': 'Create or Join Your Family'
        };
        return titles[this.viewMode];
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
            'instructions-child': '/home/sign-up',
            'instructions-parent': '/home/sign-up',
            'join-family-child': '/home/instructions-for-child',
            'join-family-parent': '/home/instructions-for-parent'
        };

        const route = backRoutes[this.viewMode];
        // If user arrived from sign-up, back should return them to the profile/details entry (step 2)
        const queryParams = this.viewMode.startsWith('join-family') ? { role: this.userRole } : { step: 2 };
        this.router.navigate([route], { queryParams });
    }

    /**
     * Select mode for parent: create or join
     */
    selectMode(mode: FamilyMode): void {
        this.selectedMode = mode;
        // Clear any max parents error when changing mode
        this.maxParentsErrorMessage = null;
        // Update FAQs based on selected mode
        if (this.viewMode === 'join-family-parent') {
            this.updateParentFaqs();
        }
        if (mode === 'join') {
            this.joinFamilyForm.reset();
        } else {
            this.familyForm.reset();
            this.familyCreated = false;
        }
    }

    chooseParentFamilyMode(mode: FamilyMode): void {
        this.selectedMode = mode;
        this.router.navigate(['/home/join-family2'], {
            queryParams: { role: 'parent', mode }
        });
    }

    toggleCreateFamilyFaq(index: number): void {
        this.expandedCreateFamilyFaq = this.expandedCreateFamilyFaq === index ? null : index;
    }

    toggleParentJoinFamilyFaq(index: number): void {
        this.expandedParentJoinFamilyFaq = this.expandedParentJoinFamilyFaq === index ? null : index;
    }

    /**
     * JOIN FAMILY (Child role): this screen is now only reached by an
     * already-registered, already-logged-in "pending child" (relationship
     * SELF + asChild:true) — either right after signup or on a later app
     * open via AuthService.getDashboardRoute(). So this calls the real
     * authenticated /family/convert-to-child endpoint directly, instead of
     * the old approach of stashing the code and looping back into the
     * pre-registration signup wizard.
     */
    submitJoinFamily(): void {
        this.submitted = true;
        Object.keys(this.codeForm.controls).forEach(k => this.codeForm.controls[k].markAsTouched());

        if (this.codeForm.invalid) {
            return;
        }

        const familyCode = (this.codeForm.get('code')?.value || '').trim().toUpperCase();
        if (!familyCode || !this.isValidCode(familyCode)) {
            this.core.triggerToasrt('Please enter a valid 6- or 8-character family code');
            return;
        }

        if (this.isLoading) return;
        this.isLoading = true;

        this.familyService.convertToChild(familyCode).subscribe({
            next: (response) => {
                this.isLoading = false;

                // A fresh JWT is always returned on a successful role/family
                // change — swap it in immediately, the old one is now stale.
                if (response?.token) {
                    this.authService.replaceAuthToken(response.token);
                }

                // Update the cached profile so the rest of the app stops
                // treating this user as a pending child.
                this.authService.updateUserData({
                    relationship: response?.relationship || 'CHILD',
                    asChild: false,
                    family: {
                        familyCode: response?.familyCode || familyCode,
                        familyName: response?.familyName
                    }
                });
                try { localStorage.removeItem('familyLinkSkipped'); } catch (e) { }

                this.core.triggerToasrt(response?.message || 'Joined your family!', 'success');

                const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
                this.router.navigate([route], { replaceUrl: true });
            },
            error: (error) => {
                this.isLoading = false;
                const msg = error?.error?.message || 'Failed to join family. Please try again.';
                this.core.triggerToasrt(msg);
            }
        });
    }

    /**
     * Child chooses not to link to a family right now. Marks the skip so
     * AuthService.isPendingChild() stops bouncing them back to this screen,
     * and sends them straight to their dashboard. They can still link a
     * family later from their profile.
     */
    skipForNow(): void {
        try { localStorage.setItem('familyLinkSkipped', 'true'); } catch (e) { }
        const route = this.authService.getDashboardRoute() || '/authed/user-dashboard';
        this.router.navigate([route], { replaceUrl: true });
    }

    /**
     * CREATE FAMILY (Parent role)
     */
    createFamily(): void {
        if (this.familyForm.invalid) {
            this.familyForm.markAllAsTouched();
            this.core.triggerToasrt('Please enter a valid family name (2-30 characters)');
            return;
        }

        const familyName = this.familyForm.get('familyName')?.value;
        sessionStorage.setItem('familyName', familyName);
        this.createdFamilyName = familyName;

        // Google OAuth signup: backend creates the family via oauth2-login (familyName param).
        // Do NOT pre-create the family here — it would create a duplicate.
        if (sessionStorage.getItem('signup_via_google') === 'true') {
            sessionStorage.setItem('familyCreator', 'true');
            sessionStorage.removeItem('familyCode');
            this.familyCreated = true;
            this.showRegisterButton = true;
            return;
        }

        // Fresh signup (no account/token yet): /family/convert-to-parent is an
        // authenticated endpoint and would 401 here. The /auth/register call
        // itself creates the family via familyName + familyRole=CREATOR, so
        // defer straight to registration instead — same pattern joinFamily()
        // already uses below.
        const profileStr = sessionStorage.getItem('signup_profile');
        const password = this.signupCredentialState.getPassword();
        if (profileStr && password) {
            sessionStorage.setItem('familyCreator', 'true');
            sessionStorage.removeItem('familyCode');
            this.registerAccount();
            return;
        }

        this.isLoading = true;
        this.familyService.createFamily(familyName).subscribe({
            next: (response) => {
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
                this.core.triggerToasrt(error.error?.message || 'Failed to create family. Please try again.');
            }
        });
    }

    /**
     * JOIN FAMILY (Parent role)
     */
    joinFamily(): void {
        if (this.joinFamilyForm.invalid) {
            this.joinFamilyForm.markAllAsTouched();
            this.core.triggerToasrt('Please enter a valid family code (6-8 characters)');
            return;
        }

        const familyCode = (this.joinFamilyForm.get('familyCode')?.value || '').trim().toUpperCase();
        sessionStorage.setItem('familyCode', familyCode);
        try { sessionStorage.removeItem('familyCreator'); } catch (e) { }

        // Google OAuth signup: no password available — use oauth2-login instead
        if (sessionStorage.getItem('signup_via_google') === 'true') {
            this.completeGoogleParentSignup();
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        const password = this.signupCredentialState.getPassword();
        if (profileStr && password) {
            this.registerAccount();
            return;
        }

        // If user is in signup flow (has signup_role), navigate back to signup step 2 to complete profile
        const signupRole = sessionStorage.getItem('signup_role');
        if (signupRole === 'parent') {
            // Navigate to signup step 2 (profile information) to continue parent signup
            this.router.navigate(['/home/sign-up'], { queryParams: { step: 2 } });
            return;
        }

        this.redirectToLogin();
    }

    /**
     * Open QR Scanner
     */
    async openQRScanner(): Promise<void> {
        try {
            const returnTo = this.viewMode === 'join-family-child' ? 'join-family' : 'join-family2';
            this.router.navigate(['/home/scan-qr'], {
                queryParams: { role: this.userRole, returnTo }
            }).catch((err) => {
                console.error('Navigation to scan-qr failed:', err);
                this.core.triggerToasrt('Failed to open scanner. Please try again.');
            });
        } catch (error) {
            console.error('Error navigating to scanner:', error);
            this.core.triggerToasrt('Failed to open scanner. Please try again.');
        }
    }

    /**
     * Copy family code to clipboard
     */
    copyFamilyCode(): void {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(this.familyCode).then(() => {
                this.core.triggerToasrt('Family code copied to clipboard!', 'success');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(this.familyCode);
            });
        } else {
            this.fallbackCopyTextToClipboard(this.familyCode);
        }
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
            this.core.triggerToasrt('Family code copied to clipboard!', 'success');
        } catch (err) {
            this.core.triggerToasrt('Failed to copy family code');
        }
        document.body.removeChild(textArea);
    }

    /**
     * Share QR code via native share or fallback toast
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

    private fallbackShare(): void {
        this.core.triggerToasrt('Share functionality not available on this device');
    }

    /**
     * Figma child-linking action: ask a parent to create their account and
     * return the Family Code or QR Code.
     */
    shareFamilyCodeRequest(): void {
        const text = `Hi! 👋
Can you help me join our family on SuperMe?
Create your Parent account and send me the Family Code or QR Code.
Please download the app: ${window.location.origin}

Thank you!`;

        if (navigator.share) {
            navigator.share({
                title: 'Join my family on SuperMe',
                text
            }).catch(() => {
                // Closing the native share sheet is not an application error.
            });
            return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.core.triggerToasrt('Message copied. Share it with your parent!', 'success');
            }).catch(() => this.fallbackShare());
            return;
        }

        this.fallbackShare();
    }

    toggleFamilyCodeFaq(index: number): void {
        this.expandedFamilyCodeFaq = this.expandedFamilyCodeFaq === index ? null : index;
    }

    /**
     * Child completed setup - redirect or register parent
     */
    childCompleted(): void {
        // After join family completes, navigate to pet selection (step 4) for signup flow
        // This allows child/self users to select a pet before registration
        const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || this.userRole;

        if (role === 'child' || role === 'self') {
            // Navigate to pet selection in signup flow
            this.router.navigate(['home/sign-up'], { queryParams: { step: 4 } });
            return;
        }

        if (this.isParentRegistered || (!this.showRegisterButton && this.familyCreated)) {
            // If parent is registered, perform auto-login before navigating
            if (this.isParentRegistered) {
                const loginCredentials = this.signupCredentialState.getPendingLogin();

                if (loginCredentials?.password && (loginCredentials.email || loginCredentials.phone)) {
                    this.authService.login(loginCredentials).subscribe({
                        next: () => {
                            const identifier = loginCredentials.email || loginCredentials.phone || '';
                            void this.credentialSaverService.save({
                                identifier,
                                password: loginCredentials.password,
                                mode: loginCredentials.email ? 'email' : 'phone'
                            }).finally(() => {
                                this.clearSignupSession();
                                this.signupCredentialState.clear();
                                const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                                this.router.navigate([route]);
                            });
                        },
                        error: (loginErr) => {
                            console.error('Auto-login failed', loginErr);
                            this.router.navigate(['/home/login']);
                        }
                    });
                } else {
                    this.router.navigate(['/home/login']);
                }
            } else {
                const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                this.router.navigate([route]);
            }
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        const password = this.signupCredentialState.getPassword();

        if (profileStr && password) {
            this.registerAccount();
        }
    }

    /**
     * Register parent account
     */
    registerAccount(): void {
        // Google OAuth signup: no password — use oauth2-login instead
        if (sessionStorage.getItem('signup_via_google') === 'true') {
            this.completeGoogleParentSignup();
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        const password = this.signupCredentialState.getPassword();

        if (!profileStr || !password) {
            this.redirectToLogin();
            return;
        }

        try {
            const profile = JSON.parse(profileStr);
            const familyCode = sessionStorage.getItem('familyCode') || '';
            const isCreator = sessionStorage.getItem('familyCreator') === 'true';

            this.isLoading = true;

            const payload: any = {
                name: profile.name || '',
                username: profile.username || undefined,
                gender: toApiGender(profile.gender),
                relationship: 'PARENT',
                password: password,
                familyCode: familyCode || '',
                familyName: sessionStorage.getItem('familyName') || this.createdFamilyName || ''
            };

            // Add date of birth from profile (required by register API)
            if (profile.dob) {
                // If dob is a timestamp (milliseconds), convert to date. Otherwise assume it's already a date string
                let dobDate: Date;
                if (typeof profile.dob === 'number') {
                    dobDate = new Date(profile.dob);
                } else {
                    dobDate = new Date(profile.dob);
                }
                // Format as YYYY-MM-DD
                if (!isNaN(dobDate.getTime())) {
                    payload.dateOfBirth = dobDate.toISOString().split('T')[0];
                }
            }

            // Retrieve email or phone from signup flow (stored during signup steps)
            const requestedIdentifier = sessionStorage.getItem('requestedIdentifier');
            const loginMode = sessionStorage.getItem('loginMode') as 'email' | 'phone';
            const countryCode = sessionStorage.getItem('countryCode');

            // Add email or phone to payload (required by register API)
            if (loginMode === 'email' || (requestedIdentifier && requestedIdentifier.includes('@'))) {
                payload.email = requestedIdentifier || '';
                // Contact number collected on the profile step (separate from
                // the login identifier) — only relevant for email signups.
                if (profile.phone) {
                    payload.phone = (countryCode ? countryCode : '') + profile.phone;
                }
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
                    this.maxParentsErrorMessage = null; // Clear any previous error

                    this.signupCredentialState.setPendingLogin({
                        ...(payload.email ? { email: payload.email } : {}),
                        ...(payload.phone ? { phone: payload.phone } : {}),
                        password
                    });

                    this.isLoading = false;
                    this.navigateToParentWelcome();
                },
                error: (error) => {
                    this.isLoading = false;
                    this.isParentRegistered = false;
                    const errorMessage = error.error?.message || 'Registration failed. Please try again.';
                    
                    // Check if error is about maximum parents
                    if (errorMessage && errorMessage.includes('maximum number of parents')) {
                        this.maxParentsErrorMessage = errorMessage;
                        this.core.triggerToasrt(errorMessage);
                    } else {
                        this.maxParentsErrorMessage = null;
                        this.core.triggerToasrt(errorMessage);
                    }
                }
            });
        } catch (error) {
            this.core.triggerToasrt('Error processing registration data');
            this.redirectToLogin();
        }
    }

    /**
     * Complete OAuth signup for parent: calls oauth2-login with all collected profile + family data.
     *
     * Case A (creator):  sends familyName only  → backend creates the family in the same call
     * Case B (joiner):   sends familyCode only  → backend links to existing family
     */
    private completeGoogleParentSignup(): void {
        const profileStr = sessionStorage.getItem('signup_profile');
        let profile: any = {};
        try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) {}

        const provider   = (sessionStorage.getItem('oauth_signup_provider') || 'google') as 'google' | 'apple';
        const email      = sessionStorage.getItem('google_signup_email') || '';
        const providerId = sessionStorage.getItem('google_signup_provider_id') || '';
        const avatarUrl  = sessionStorage.getItem('google_signup_avatar') || '';
        const isCreator  = sessionStorage.getItem('familyCreator') === 'true';
        const familyCode = sessionStorage.getItem('familyCode') || this.familyCode || '';
        const familyName = sessionStorage.getItem('familyName') || this.createdFamilyName || '';

        const googlePayload: any = {
            provider,
            providerId,
            email,
            name:         profile.name || sessionStorage.getItem('google_signup_name') || '',
            avatarUrl,
            role:         'PARENT',              // backend uses "role", not "relationship"
            gender:       toApiGender(profile.gender),
            referralCode: sessionStorage.getItem('referralCode') || null
        };

        // Case A: creating new family — send familyName, backend creates family + user in one call
        // Case B: joining existing family — send familyCode only
        if (isCreator && familyName) {
            googlePayload.familyName = familyName;
        } else if (familyCode) {
            googlePayload.familyCode = familyCode;
        }

        if (profile.dob) {
            const dobDate = new Date(profile.dob);
            if (!isNaN(dobDate.getTime())) {
                googlePayload.dob = dobDate.toISOString().split('T')[0];
            }
        }

        console.log('[OAuth parent signup] payload:', JSON.stringify(googlePayload));

        this.isLoading = true;
        this.authService.googleOAuthLogin(googlePayload).subscribe({
            next: (response) => {
                this.isLoading = false;
                const userId = response.user?.id;
                if (response.token && userId) {
                    this.authService.setSession(
                        { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
                        false
                    );
                }
                try { localStorage.setItem('onboardingComplete', 'true'); } catch (e) {}
                try { sessionStorage.setItem('family_connected_ack', 'Parent'); } catch (e) {}
                ['oauth_signup_provider', 'google_signup_email', 'google_signup_name',
                 'google_signup_avatar', 'google_signup_provider_id', 'signup_profile',
                 'signup_role', 'signup_avatar', 'requestedIdentifier',
                 'familyCode', 'familyName', 'familyCreator', 'referralCode', 'referralCodeLocked'].forEach(k => {
                    try { sessionStorage.removeItem(k); } catch (e) {}
                });
                this.router.navigate(['/home/sign-up'], {
                    queryParams: { step: 5 },
                    replaceUrl: true
                });
            },
            error: (err) => {
                this.isLoading = false;
                const msg = err?.error?.message || 'Sign-up failed. Please try again.';
                this.core.triggerToasrt(msg);
            }
        });
    }

    /**
     * Redirect to login
     */
    private clearSignupSession(): void {
        try {
            [
                'signup_profile',
                'signup_role',
                'requestedIdentifier',
                'loginMode',
                'countryCode',
                'familyCode',
                'familyName',
                'familyCreator'
            ].forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to clear signup session metadata', error);
        }
    }

    private navigateToParentWelcome(): void {
        try {
            sessionStorage.setItem('family_connected_ack', 'Parent');
            localStorage.setItem('onboardingComplete', 'true');
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to persist completed onboarding state', error);
        }

        this.clearSignupSession();
        this.router.navigate(['/home/sign-up'], {
            queryParams: { step: 5 },
            replaceUrl: true
        });
    }

    private redirectToLogin(): void {
        this.signupCredentialState.clear();
        this.router.navigate(['/home/login'], { queryParams: { role: this.userRole } });
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
     * Camera permission checks and scanner lifecycle
     */
    private async checkCameraPermissions(): Promise<boolean> {
        try {
            const { camera } = await BarcodeScanner.checkPermissions();

            if (camera === 'granted') {
                return true;
            }

            if (camera === 'denied') {
                const alert = await this.alertController.create({
                    header: 'Permission Denied',
                    message: 'Camera permission is required to scan QR codes. Please enable it in your device settings.',
                    buttons: ['OK']
                });
                await alert.present();
                return false;
            }

            const { camera: newStatus } = await BarcodeScanner.requestPermissions();
            if (newStatus === 'granted') {
                return true;
            } else {
                const alert = await this.alertController.create({
                    header: 'Permission Required',
                    message: 'Camera permission is required to scan QR codes.',
                    buttons: ['OK']
                });
                await alert.present();
                return false;
            }
        } catch (error) {
            console.error('Error checking camera permissions:', error);
            this.core.triggerToasrt('Failed to check camera permissions');
            return false;
        }
    }

    private async startScanner(): Promise<void> {
        if (this.isScanning) {
            return;
        }

        try {
            document.body.classList.add('barcode-scanner-active');
            this.isScanning = true;

            const listener = await BarcodeScanner.addListener('barcodesScanned', async (result: BarcodesScannedEvent) => {
                if (result.barcodes && result.barcodes.length > 0) {
                    const barcode = result.barcodes[0];
                    const scannedValue = barcode.displayValue || barcode.rawValue || '';

                    await this.stopScanner();
                    await this.processScannedQRCode(scannedValue);
                }
            });

            await BarcodeScanner.startScan();
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.isScanning = false;
            document.body.classList.remove('barcode-scanner-active');
            this.core.triggerToasrt('Failed to start the camera scanner. Please try again.');
        }
    }

    private async stopScanner(): Promise<void> {
        if (!this.isScanning) {
            return;
        }

        try {
            await BarcodeScanner.stopScan();
            await BarcodeScanner.removeAllListeners();
            this.isScanning = false;
            document.body.classList.remove('barcode-scanner-active');
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }

    private async processScannedQRCode(scannedValue: string): Promise<void> {
        if (!scannedValue || !scannedValue.startsWith('GROUP:')) {
            const alert = await this.alertController.create({
                header: 'Invalid QR Code',
                message: 'The scanned QR code is not a valid family code. Please scan a family QR code.',
                buttons: ['OK']
            });
            await alert.present();
            return;
        }

        const familyCode = scannedValue.substring(6).trim();

        if (!familyCode || familyCode.length < 6 || familyCode.length > 8) {
            const alert = await this.alertController.create({
                header: 'Invalid Code',
                message: 'The family code must be between 6-8 characters.',
                buttons: ['OK']
            });
            await alert.present();
            return;
        }

        this.joinFamilyForm.patchValue({ familyCode: familyCode });
        this.core.triggerToasrt(`Family code scanned: ${familyCode}`);

        setTimeout(() => {
            try { sessionStorage.removeItem('familyCreator'); } catch (e) { }
            this.joinFamily();
        }, 500);
    }

    /**
     * Demo: Scan code button (for testing)
     */
    scanCode(): void {
        const scanned = '12345678';
        this.codeForm.patchValue({ code: scanned });
    }
}
