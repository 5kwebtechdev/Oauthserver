import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FamilyService } from '../../core/services/family.service';
import { CoreService } from '../../core/services/core.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';
import { AlertController, IonicModule } from '@ionic/angular';
import { FaqItem, PROFILE_FAQS } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { SupermeNavigatorComponent } from '../../core/components/superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../core/components/superme-button/superme-button.component';
import { ProfileFactsComponent } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { QRCodeComponent } from 'angularx-qrcode';

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

    constructor(
        private fb: FormBuilder,
        public router: Router,
        private route: ActivatedRoute,
        private familyService: FamilyService,
        private core: CoreService,
        private alertController: AlertController,
        private authService: AuthService,
        private userService: UserService
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
                Validators.maxLength(10)
            ]]
        });

        // Join family form (exactly 8 alphanumeric characters)
        this.joinFamilyForm = this.fb.group({
            familyCode: ['', [
                Validators.required,
                Validators.pattern(/^[A-Za-z0-9]{8}$/)
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
            const savedFamilyCode = (sessionStorage.getItem('familyCode') || '').trim().toUpperCase();

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

        // Also watch parent join-family input for exact-8 validation and auto-check
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
                    // trigger check for truncated value
                    if (truncated.length === 8) {
                        this.onJoinFamilyCodeInputChange(truncated);
                    } else {
                        this.joinFamilyCodeValidationStatus = null;
                    }
                    return;
                }

                if (trimmed.length === 8) {
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
            control.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{8}$/)]);
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
     * Auto-check when 8 characters are entered
     */
    private onCodeInputChange(code: string): void {
        // Clear previous timeout
        if (this.codeCheckTimeout) {
            clearTimeout(this.codeCheckTimeout);
        }

        const trimmedCode = code.trim().toUpperCase();

        // Reset validation if code is not 8 characters
        if (trimmedCode.length !== 8) {
            this.codeValidationStatus = null;
            return;
        }

        // Auto-check when exactly 8 characters
        this.checkFamilyCodeValidity(trimmedCode, 'child');
    }

    /**
     * Handle family code input change for parent joining family
     * Auto-check when 8 characters are entered
     */
    private onJoinFamilyCodeInputChange(code: string): void {
        // Clear previous timeout
        if (this.joinFamilyCodeCheckTimeout) {
            clearTimeout(this.joinFamilyCodeCheckTimeout);
        }

        const trimmedCode = code.trim().toUpperCase();

        // Reset validation if code is not 8 characters
        if (trimmedCode.length !== 8) {
            this.joinFamilyCodeValidationStatus = null;
            return;
        }

        // Clear any previous max parents error when user changes the code
        this.maxParentsErrorMessage = null;

        // Auto-check when exactly 8 characters
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

    /**
     * JOIN FAMILY (Child role): validate and store code
     */
    submitJoinFamily(): void {
        this.submitted = true;
        Object.keys(this.codeForm.controls).forEach(k => this.codeForm.controls[k].markAsTouched());

        if (this.userRole === 'child' && this.codeForm.invalid) {
            return;
        }

        const familyCode = this.codeForm.get('code')?.value;

        if (familyCode) {
            if (!this.isValidCode(familyCode)) {
                this.core.triggerToasrt('Please enter a valid 8-character family code');
                return;
            }
            sessionStorage.setItem('familyCode', familyCode);
        } else {
            if (this.userRole === 'child') {
                this.core.triggerToasrt('Family code is required to join as a child');
                return;
            }
        }

        sessionStorage.setItem('signup_role', this.userRole);

        if (familyCode) {
            const queryParams: any = { step: 4, role: this.userRole, familyCode };
            this.router.navigate(['/home/sign-up'], { queryParams });
            return;
        }

        this.router.navigate(['/home/login'], { queryParams: { role: this.userRole } });
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

        const familyCode = this.joinFamilyForm.get('familyCode')?.value;
        sessionStorage.setItem('familyCode', familyCode);
        try { sessionStorage.removeItem('familyCreator'); } catch (e) { }

        // Google OAuth signup: no password available — use oauth2-login instead
        if (sessionStorage.getItem('signup_via_google') === 'true') {
            this.completeGoogleParentSignup();
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        const password = sessionStorage.getItem('signup_password');
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
                const email = sessionStorage.getItem('login_email');
                const phone = sessionStorage.getItem('login_phone');
                const password = sessionStorage.getItem('login_password');

                const loginCredentials: any = { password: password };
                if (email) {
                    loginCredentials.email = email;
                } else if (phone) {
                    loginCredentials.phone = phone;
                }

                if (loginCredentials.email || loginCredentials.phone) {
                    this.authService.login(loginCredentials).subscribe({
                        next: () => {
                            // Clear signup session data after successful login
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
                                sessionStorage.removeItem('login_email');
                                sessionStorage.removeItem('login_phone');
                                sessionStorage.removeItem('login_password');
                            } catch (e) { }

                            // Navigate to parent dashboard
                            const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                            this.router.navigate([route]);
                        },
                        error: (loginErr) => {
                            console.error('Auto-login failed', loginErr);
                            // If auto-login fails, still navigate to dashboard
                            const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                            this.router.navigate([route]);
                        }
                    });
                } else {
                    // No credentials, just navigate
                    const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                    this.router.navigate([route]);
                }
            } else {
                const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                this.router.navigate([route]);
            }
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
        // Google OAuth signup: no password — use oauth2-login instead
        if (sessionStorage.getItem('signup_via_google') === 'true') {
            this.completeGoogleParentSignup();
            return;
        }

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

            const payload: any = {
                name: profile.name || '',
                gender: (profile.gender || '').toUpperCase(),
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
                    this.core.triggerToasrt('Account registered successfully!');
                    
                    // Store credentials for later auto-login
                    try {
                        if (payload.email) sessionStorage.setItem('login_email', payload.email);
                        if (payload.phone) sessionStorage.setItem('login_phone', payload.phone);
                        sessionStorage.setItem('login_password', password);
                    } catch (e) { }

                    this.isLoading = false;
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
     * Complete Google signup for parent: calls oauth2-login with all collected profile + family data.
     *
     * Case A (creator):  sends familyName only  → backend creates the family in the same call
     * Case B (joiner):   sends familyCode only  → backend links to existing family
     */
    private completeGoogleParentSignup(): void {
        const profileStr = sessionStorage.getItem('signup_profile');
        let profile: any = {};
        try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) {}

        const email      = sessionStorage.getItem('google_signup_email') || '';
        const providerId = sessionStorage.getItem('google_signup_provider_id') || '';
        const avatarUrl  = sessionStorage.getItem('google_signup_avatar') || '';
        const isCreator  = sessionStorage.getItem('familyCreator') === 'true';
        const familyCode = sessionStorage.getItem('familyCode') || this.familyCode || '';
        const familyName = sessionStorage.getItem('familyName') || this.createdFamilyName || '';

        const googlePayload: any = {
            provider:     'google',
            providerId,
            email,
            name:         profile.name || sessionStorage.getItem('google_signup_name') || '',
            avatarUrl,
            role:         'PARENT',              // backend uses "role", not "relationship"
            gender:       (profile.gender || '').toUpperCase(),
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

        console.log('[Google parent signup] payload:', JSON.stringify(googlePayload));

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
                ['signup_via_google', 'google_signup_email', 'google_signup_name',
                 'google_signup_avatar', 'google_signup_provider_id', 'signup_profile',
                 'signup_role', 'signup_avatar', 'requestedIdentifier',
                 'familyCode', 'familyName', 'familyCreator', 'referralCode'].forEach(k => {
                    try { sessionStorage.removeItem(k); } catch (e) {}
                });
                this.router.navigate(['/authed/parent-account'], { replaceUrl: true });
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
    private redirectToLogin(): void {
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
