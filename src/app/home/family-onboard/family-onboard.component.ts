import { Component, OnInit, OnDestroy, Input, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FamilyService } from '../../core/services/family.service';
import { CoreService } from '../../core/services/core.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CredentialSaverService } from '../../core/services/credential-saver.service';
import { SignupCredentialStateService } from '../../core/services/signup-credential-state.service';
import { BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';
import { AlertController, IonicModule, IonRouterOutlet, NavController, Platform } from '@ionic/angular';
import { FaqItem, PROFILE_FAQS } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { SupermeNavigatorComponent } from '../../core/components/superme-navigator/superme-navigator.component';
import { ProfileFactsComponent } from '../../core/components/user-profile/profile-facts/profile-facts.component';
import { QRCodeComponent } from 'angularx-qrcode';
import { toApiGender } from '../../core/models/gender.model';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { AuthBackButtonComponent } from '../../core/components/auth-back-button/auth-back-button.component';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';
import { NavigationService } from '../../core/services/navigation.service';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

type ViewMode = 'instructions-parent' | 'join-family-child' | 'join-family-parent';
type FamilyMode = 'create' | 'join';
type UserRole = 'child' | 'parent' | 'self';

@Component({
    selector: 'app-family-onboard',
    standalone: true,
    imports: [CommonModule, IonicModule, ReactiveFormsModule, SupermeNavigatorComponent, ProfileFactsComponent, QRCodeComponent, AuthBackButtonComponent],
    templateUrl: './family-onboard.component.html',
    styleUrls: ['./family-onboard.component.scss']
})
export class FamilyOnboardComponent implements OnInit, OnDestroy {
    private static readonly CHILD_POST_FAMILY_WELCOME_KEY = 'show_child_welcome_after_family';
    private static readonly CREATE_CHILD_AFTER_FAMILY_KEY = 'create_child_after_family';
    private static readonly MANAGED_CHILD_SIGNUP_KEY = 'managed_child_signup';
    private static readonly MANAGED_CHILD_FAMILY_CODE_KEY = 'managed_child_family_code';
    private static readonly MANAGED_CHILD_PARENT_WELCOME_PENDING_KEY = 'managed_child_parent_welcome_pending';
    private readonly appDownloadUrl = environment.firebase.remoteConfig.defaults.android_store_url;
    @Input() viewMode: ViewMode = 'join-family-child';

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
    private backButtonSubscription?: Subscription;
    private previousSwipeGesture: boolean | null = null;

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
    expandedSuccessFaq: number | null = null;
    private pendingFamilyRegistration: {
        response: any;
        payload: any;
        password: string;
        onboardingStep: number;
    } | null = null;
    private pendingOAuthFamilyCompletion = false;
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
    readonly familySuccessFaqs = [
        {
            question: 'Does the family code expire or stop working?',
            answer: 'No. Your family code stays active while the family exists. If it ever changes, the latest code will be available in your family profile.'
        },
        {
            question: 'Can multiple children use the same family code?',
            answer: 'Yes. Each child can use this same code to request access to your family.'
        },
        {
            question: 'Is this code private or can anyone with it join my family?',
            answer: 'Keep the code private and share it only with trusted family members. Anyone with the code may be able to request access.'
        },
        {
            question: `What if my child enters the wrong code or it doesn't work?`,
            answer: 'Ask them to check every letter and number, or scan the QR code instead. You can copy and share the code again from this screen.'
        }
    ];

    constructor(
        private fb: FormBuilder,
        public router: Router,
        private route: ActivatedRoute,
        private familyService: FamilyService,
        private core: CoreService,
        private alertController: AlertController,
        private navCtrl: NavController,
        private authService: AuthService,
        private userService: UserService,
        private credentialSaverService: CredentialSaverService,
        private signupCredentialState: SignupCredentialStateService,
        private onboardingState: OnboardingStateService,
        private platform: Platform,
        private navigation: NavigationService,
        @Optional() private routerOutlet?: IonRouterOutlet
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
        // Family onboarding owns its responsive content widths. Opt this route
        // out of the generic narrow desktop Ionic page cap so wider cards are
        // not rendered past (and clipped by) the routed page boundary.
        document.body.classList.add('family-onboard-web-view');

        // Detect viewMode from current route URL if not set as @Input
        const currentUrl = this.router.url;
        if (currentUrl.includes('instructions-for-parent')) {
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
            const savedFamilyCode = (
                sessionStorage.getItem('familyCode')
                || this.onboardingState.getRegistrationState()?.savedData?.familyCode
                || ''
            ).trim().toUpperCase();

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
        this.configureChildBackHandling();

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
        document.body.classList.remove('family-onboard-web-view');
        this.releaseChildBackHandling();
        // Clear any pending timeouts
        if (this.codeCheckTimeout) {
            clearTimeout(this.codeCheckTimeout);
        }
        if (this.joinFamilyCodeCheckTimeout) {
            clearTimeout(this.joinFamilyCodeCheckTimeout);
        }
        this.stopScanner().catch(e => console.error('Error stopping scanner:', e));
    }

    ionViewDidEnter(): void {
        document.body.classList.add('family-onboard-web-view');
        this.configureChildBackHandling();
    }

    ionViewWillLeave(): void {
        document.body.classList.remove('family-onboard-web-view');
        this.releaseChildBackHandling();
    }

    /**
     * Initialize FAQs based on view mode
     */
    private initializeFaqs(): void {
        const baseFilter = (screen: string) =>
            (f: FaqItem) => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes(screen);

        switch (this.viewMode) {
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
    get codeControl(): FormControl { return this.codeForm.get('code') as FormControl; }
    get familyNameControl(): FormControl { return this.familyForm.get('familyName') as FormControl; }
    get familyCodeControl(): FormControl { return this.joinFamilyForm.get('familyCode') as FormControl; }
    get formattedFamilyCode(): string {
        return this.familyCode.split('').join(' ');
    }
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
    private navigateWithoutHistory(url: string, queryParams?: Record<string, any>): void {
        void this.navCtrl.navigateRoot(url, {
            animated: false,
            ...(queryParams ? { queryParams } : {})
        });
    }

    goBack(): void {
        if (this.viewMode === 'join-family-parent' && this.familyCreated) {
            this.familyCreated = false;
            this.selectedMode = 'create';
            this.familyForm.reset();
            return;
        }

        if (this.viewMode === 'join-family-child') {
            const isChildOnboarding = this.authService.isPendingChild()
                || sessionStorage.getItem(FamilyOnboardComponent.CHILD_POST_FAMILY_WELCOME_KEY) === 'true';
            if (this.authService.isLoggedIn() && !isChildOnboarding) {
                this.navigateWithoutHistory(this.authService.getDashboardRoute());
                return;
            }

            const enteredCode = String(this.codeForm.get('code')?.value || '').trim().toUpperCase();
            if (enteredCode) {
                this.onboardingState.updateRegistrationDraft({ familyCode: enteredCode }, 5);
            }

            const targetUrl = '/signup?step=2&role=child&editOnboarding=true';
            this.navigation.replaceHistory(targetUrl);
            this.navigateWithoutHistory('/signup', {
                step: 2,
                role: 'child',
                editOnboarding: 'true'
            });
            return;
        }

        const backRoutes: Record<ViewMode, string> = {
            'instructions-parent': '/signup',
            'join-family-child': '/signup',
            'join-family-parent': '/home/instructions-for-parent'
        };
        const route = backRoutes[this.viewMode];
        // If user arrived from sign-up, back should return them to the profile/details entry (step 2)
        const queryParams = this.viewMode.startsWith('join-family') ? { role: this.userRole } : { step: 2 };
        this.navigateWithoutHistory(route, queryParams);
    }

    private configureChildBackHandling(): void {
        if (this.viewMode !== 'join-family-child') return;

        if (!this.backButtonSubscription) {
            // Higher priority than the app-wide handler so Android Back follows
            // the same deterministic route as the header button.
            this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(100, () => {
                this.goBack();
            });
        }

        if (this.routerOutlet && this.previousSwipeGesture === null) {
            this.previousSwipeGesture = this.routerOutlet.swipeGesture;
            this.routerOutlet.swipeGesture = false;
        }
    }

    private releaseChildBackHandling(): void {
        this.backButtonSubscription?.unsubscribe();
        this.backButtonSubscription = undefined;

        if (this.routerOutlet && this.previousSwipeGesture !== null) {
            this.routerOutlet.swipeGesture = this.previousSwipeGesture;
            this.previousSwipeGesture = null;
        }
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
        this.navigateWithoutHistory('/home/join-family2', { role: 'parent', mode });
    }

    toggleCreateFamilyFaq(index: number): void {
        this.expandedCreateFamilyFaq = this.expandedCreateFamilyFaq === index ? null : index;
    }

    toggleParentJoinFamilyFaq(index: number): void {
        this.expandedParentJoinFamilyFaq = this.expandedParentJoinFamilyFaq === index ? null : index;
    }

    toggleSuccessFaq(index: number): void {
        this.expandedSuccessFaq = this.expandedSuccessFaq === index ? null : index;
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
        this.onboardingState.updateRegistrationDraft({
            familyCode,
            relationship: 'CHILD',
            asChild: true,
            onboardingStep: 5
        }, 5);

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
                const onboardingStep = Number(response?.onboardingStep) || 5;
                this.onboardingState.saveRegistrationDraft({
                    ...(response || {}),
                    familyCode: response?.familyCode || familyCode,
                    relationship: response?.relationship || 'CHILD',
                    asChild: false,
                    onboardingStep
                }, onboardingStep);
                try {
                    localStorage.removeItem('familyLinkSkipped');
                    sessionStorage.removeItem(FamilyOnboardComponent.MANAGED_CHILD_SIGNUP_KEY);
                    sessionStorage.removeItem(FamilyOnboardComponent.MANAGED_CHILD_FAMILY_CODE_KEY);
                } catch (e) { }

                this.core.triggerToasrt(response?.message || 'Joined your family!', 'success');

                if (sessionStorage.getItem(FamilyOnboardComponent.CHILD_POST_FAMILY_WELCOME_KEY) === 'true') {
                    this.navigateWithoutHistory('/signup', { step: 4, role: 'child' });
                    return;
                }

                const route = this.authService.getDashboardRoute() || '/home';
                this.navigateWithoutHistory(route);
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
        try {
            sessionStorage.removeItem(FamilyOnboardComponent.CHILD_POST_FAMILY_WELCOME_KEY);
            sessionStorage.removeItem(FamilyOnboardComponent.MANAGED_CHILD_SIGNUP_KEY);
            sessionStorage.removeItem(FamilyOnboardComponent.MANAGED_CHILD_FAMILY_CODE_KEY);
        } catch (e) {}
        const route = this.authService.getDashboardRoute() || '/home';
        this.navigateWithoutHistory(route);
    }

    /**
     * CREATE FAMILY (Parent role)
     */
    createFamily(): void {
        if (this.isLoading) return;

        if (this.familyForm.invalid) {
            this.familyForm.markAllAsTouched();
            this.core.triggerToasrt('Please enter a valid family name (2-30 characters)');
            return;
        }

        const familyName = this.familyForm.get('familyName')?.value;
        sessionStorage.setItem('familyName', familyName);
        this.createdFamilyName = familyName;
        this.onboardingState.updateRegistrationDraft({
            familyName,
            familyCode: null,
            relationship: 'PARENT',
            familyRole: 'CREATOR',
            onboardingStep: 4
        }, 4);

        // Google OAuth signup: backend creates the family via oauth2-login (familyName param).
        // Do NOT pre-create the family here — it would create a duplicate.
        if (sessionStorage.getItem('signup_via_oauth') === 'true'
            || sessionStorage.getItem('signup_via_google') === 'true') {
            sessionStorage.setItem('familyCreator', 'true');
            sessionStorage.removeItem('familyCode');
            this.completeGoogleParentSignup();
            return;
        }

        // Fresh signup (no account/token yet): /family/convert-to-parent is an
        // authenticated endpoint and would 401 here. The /auth/register call
        // itself creates the family via familyName + familyRole=CREATOR, so
        // defer straight to registration instead — same pattern joinFamily()
        // already uses below.
        const profileStr = sessionStorage.getItem('signup_profile');
        if (profileStr) {
            sessionStorage.setItem('familyCreator', 'true');
            sessionStorage.removeItem('familyCode');
            this.registerAccount();
            return;
        }

        this.isLoading = true;
        this.familyService.createFamily(familyName).subscribe({
            next: (response) => {
                this.isLoading = false;
                try { sessionStorage.setItem('familyCreator', 'true'); } catch (e) { }
                this.showRegisterButton = false;
                this.showFamilyCreationSuccess(response);
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
        if (this.isLoading) return;

        if (this.joinFamilyForm.invalid) {
            this.joinFamilyForm.markAllAsTouched();
            this.core.triggerToasrt('Please enter a valid family code (6-8 characters)');
            return;
        }

        const familyCode = (this.joinFamilyForm.get('familyCode')?.value || '').trim().toUpperCase();
        sessionStorage.setItem('familyCode', familyCode);
        this.onboardingState.updateRegistrationDraft({
            familyCode,
            relationship: 'PARENT',
            familyRole: 'CO_PARENT',
            onboardingStep: 4
        }, 4);
        try { sessionStorage.removeItem('familyCreator'); } catch (e) { }

        // Google OAuth signup: no password available — use oauth2-login instead
        if (sessionStorage.getItem('signup_via_oauth') === 'true'
            || sessionStorage.getItem('signup_via_google') === 'true') {
            this.completeGoogleParentSignup();
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        if (profileStr) {
            this.registerAccount();
            return;
        }

        // If user is in signup flow (has signup_role), navigate back to signup step 2 to complete profile
        const signupRole = sessionStorage.getItem('signup_role');
        if (signupRole === 'parent') {
            // Navigate to signup step 2 (profile information) to continue parent signup
            this.navigateWithoutHistory('/signup', { step: 2 });
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

    /** Share the family-link message through the iOS/Android share sheet. */
    async shareQRCode(): Promise<void> {
        if (!this.familyCode) return;

        const text = [
            `Join my family on SuperMe with code: ${this.familyCode}`,
            this.appDownloadUrl ? `Download SuperMe: ${this.appDownloadUrl}` : ''
        ].filter(Boolean).join('\n\n');

        try {
            const canShare = await Share.canShare();
            if (canShare.value) {
                // Keep the URL in the text payload. Passing it separately can
                // make iOS reject the share request for an unavailable/empty
                // store destination, even though the family code is shareable.
                await Share.share({ title: 'Family Code', text });
                return;
            }
        } catch (error) {
            const message = String((error as any)?.message || error || '').toLowerCase();
            if (message.includes('cancel') || message.includes('dismiss')) return;
            console.warn('[FamilyOnboard] Native family share unavailable:', message);
        }

        // iOS WebViews may expose the web share sheet even when the native
        // bridge is temporarily unavailable (for example, after a hot reload).
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: 'Family Code', text });
                return;
            } catch (error) {
                const message = String((error as any)?.message || error || '').toLowerCase();
                if (message.includes('cancel') || message.includes('abort')) return;
            }
        }

        // Capacitor Clipboard works in native iOS apps where the browser
        // clipboard API is not considered a secure context.
        try {
            await Clipboard.write({ string: text });
            this.core.triggerToasrt('Family code copied. You can share it now!', 'success');
        } catch (error) {
            this.fallbackCopyTextToClipboard(text);
        }
    }

    private fallbackShare(): void {
        this.core.triggerToasrt('Unable to open sharing. The family code was copied instead.');
    }

    /**
     * Figma child-linking action: ask a parent to create their account and
     * return the Family Code or QR Code.
     */
    shareFamilyCodeRequest(): void {
        const text = `Hi! 👋
Can you help me join our family on SuperMe?
Create your Parent account and send me the Family Code or QR Code.
Please download the app: ${this.appDownloadUrl}

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

    completeFamilySuccess(): void {
        if (this.isLoading) return;

        if (this.pendingOAuthFamilyCompletion) {
            this.pendingOAuthFamilyCompletion = false;

            // Create Child Account explicitly sets the handoff flag. The Done
            // button does not, so it must continue the authenticated Parent's
            // own onboarding instead of treating a missing child handoff as
            // an error (most visible after native Sign in with Apple).
            if (this.shouldStartManagedChildSignup()) {
                if (this.beginManagedChildSignup()) {
                    return;
                }
                this.pendingOAuthFamilyCompletion = true;
                this.core.triggerToasrt('Your parent session is still being prepared. Please try again.');
                return;
            }

            this.onboardingState.markExistingUser();
            try { sessionStorage.setItem('family_connected_ack', 'Parent'); } catch (e) {}
            this.navigateWithoutHistory('/signup', { step: 5, role: 'parent' });
            return;
        }

        if (this.pendingFamilyRegistration) {
            const pending = this.pendingFamilyRegistration;
            this.pendingFamilyRegistration = null;
            if (pending.onboardingStep >= 6) {
                this.isLoading = true;
                this.finishCompletedParentRegistration(
                    pending.response,
                    pending.payload,
                    pending.password
                );
                return;
            }
            if (this.shouldStartManagedChildSignup()) {
                this.completeParentBeforeManagedChild(pending);
                return;
            }
            this.navigateToParentWelcome();
            return;
        }

        this.childCompleted();
    }

    /**
     * Complete the parent account first, then start the existing Child signup
     * wizard on the same device with this family's code ready for linking.
     */
    startChildAccountCreation(): void {
        if (this.isLoading) return;

        const familyCode = (this.familyCode || '').trim().toUpperCase();
        if (!familyCode) {
            this.core.triggerToasrt('Family code is not available yet. Please try again.');
            return;
        }

        try {
            sessionStorage.setItem(FamilyOnboardComponent.CREATE_CHILD_AFTER_FAMILY_KEY, 'true');
            sessionStorage.setItem(FamilyOnboardComponent.MANAGED_CHILD_FAMILY_CODE_KEY, familyCode);
            sessionStorage.setItem(FamilyOnboardComponent.MANAGED_CHILD_PARENT_WELCOME_PENDING_KEY, 'true');
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to prepare child account creation', error);
        }

        // When the Parent session already exists, enter the managed Child
        // wizard immediately. No Parent completion/welcome route is needed.
        if (this.authService.isLoggedIn() && this.beginManagedChildSignup()) {
            return;
        }

        this.completeFamilySuccess();
    }

    /**
     * Finish the parent's existing final onboarding update without displaying
     * the welcome screen yet. The same welcome screen is shown after the
     * managed child account flow finishes.
     */
    private completeParentBeforeManagedChild(
        pending: { response: any; payload: any; password: string; onboardingStep: number }
    ): void {
        this.isLoading = true;
        const completionPayload = {
            ...pending.payload,
            unlockPotential: true
        };

        this.authService.register(completionPayload).subscribe({
            next: (response) => {
                this.finishCompletedParentRegistration(
                    response,
                    completionPayload,
                    pending.password
                );
            },
            error: (error) => {
                this.isLoading = false;
                this.pendingFamilyRegistration = pending;
                this.core.triggerToasrt(
                    error?.error?.message
                    || 'We could not continue to child account creation. Please try again.'
                );
            }
        });
    }

    private shouldStartManagedChildSignup(): boolean {
        try {
            return sessionStorage.getItem(
                FamilyOnboardComponent.CREATE_CHILD_AFTER_FAMILY_KEY
            ) === 'true';
        } catch {
            return false;
        }
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
            this.navigateWithoutHistory('/signup', { step: 4 });
            return;
        }

        if (this.isParentRegistered || (!this.showRegisterButton && this.familyCreated)) {
            // If parent is registered, perform auto-login before navigating
            if (this.isParentRegistered) {
                const loginCredentials = this.signupCredentialState.getPendingLogin();

                if (loginCredentials?.password && (loginCredentials.email || loginCredentials.phone)) {
                    this.authService.login(loginCredentials).subscribe({
                        next: (loginResponse) => {
                            const identifier = loginCredentials.email || loginCredentials.phone || '';
                            void this.credentialSaverService.save({
                                identifier,
                                password: loginCredentials.password,
                                mode: loginCredentials.email ? 'email' : 'phone'
                            }).finally(() => {
                                // The Create Child Account action must win over
                                // the normal Parent onboarding resume route.
                                // That resume route is the Unlock screen and
                                // would otherwise appear before child signup.
                                if (this.shouldStartManagedChildSignup() && this.beginManagedChildSignup()) {
                                    return;
                                }
                                const resume = this.onboardingState.getResumeNavigation(loginResponse.user);
                                if (resume) {
                                    this.navigateWithoutHistory(resume.url, resume.queryParams);
                                    return;
                                }
                                this.clearSignupSession();
                                this.signupCredentialState.clear();
                                const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                                this.navigateWithoutHistory(route);
                            });
                        },
                        error: (loginErr) => {
                            console.error('Auto-login failed', loginErr);
                            this.navigateWithoutHistory('/login');
                        }
                    });
                } else {
                    this.navigateWithoutHistory('/login');
                }
            } else {
                if (this.beginManagedChildSignup()) {
                    return;
                }
                const route = this.authService.getDashboardRoute() || '/authed/parent-account';
                this.navigateWithoutHistory(route);
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
        if (this.isLoading) return;

        // Google OAuth signup: no password — use oauth2-login instead
        if (sessionStorage.getItem('signup_via_oauth') === 'true'
            || sessionStorage.getItem('signup_via_google') === 'true') {
            this.completeGoogleParentSignup();
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        const password = this.signupCredentialState.getPassword();

        if (!profileStr) {
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
                relationship: 'PARENT',
                familyCode: familyCode || '',
                familyName: sessionStorage.getItem('familyName') || this.createdFamilyName || '',
                referralCode: sessionStorage.getItem('referralCode') || null,
                unlockPotential: false
            };
            // Parents aren't shown the avatar picker during signup, so
            // profile.avatar is almost never a real 1-12 pick — fall back to
            // a sensible default so the dashboard always has a real picture
            // instead of showing just their name's initial forever.
            const parsedAvatarKey = Number(profile.avatar);
            const avatarKey = (Number.isInteger(parsedAvatarKey) && parsedAvatarKey >= 1 && parsedAvatarKey <= 12)
                ? parsedAvatarKey
                : this.resolveParentAvatarKey(profile);
            payload.avatarName = `avatar_${avatarKey}`;
            payload.avatarImageName = `avatars/avatar${avatarKey}.webp`;
            // Optional — omit entirely rather than defaulting to a value the
            // user never actually chose (toApiGender() always resolves to a
            // real enum, which would falsely look like an explicit choice).
            if (profile.gender) {
                payload.gender = toApiGender(profile.gender);
            }
            if (password) payload.password = password;

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

            this.onboardingState.saveRegistrationDraft(payload, 4, payload.email ? 'EMAIL' : 'PHONE');
            this.authService.register(payload).subscribe({
                next: (response) => {
                    this.isParentRegistered = true;
                    this.maxParentsErrorMessage = null; // Clear any previous error
                    const onboardingStep = Number(
                        response?.savedData?.onboardingStep
                        ?? response?.user?.onboardingStep
                        ?? response?.onboardingStep
                        ?? response?.nextStep
                    );
                    if (Number.isInteger(onboardingStep) && onboardingStep >= 1 && onboardingStep <= 6) {
                        this.onboardingState.saveRegistrationDraft({
                            ...payload,
                            ...(response?.savedData || {}),
                            ...(response?.user || {}),
                            onboardingStep
                        }, onboardingStep, payload.email ? 'EMAIL' : 'PHONE');
                    }

                    if (password) {
                        this.signupCredentialState.setPendingLogin({
                            ...(payload.email ? { email: payload.email } : {}),
                            ...(payload.phone ? { phone: payload.phone } : {}),
                            password
                        });
                    }

                    this.isLoading = false;
                    if (isCreator && this.showFamilyCreationSuccess(response)) {
                        this.pendingFamilyRegistration = {
                            response,
                            payload,
                            password: password || '',
                            onboardingStep: Number.isInteger(onboardingStep) ? onboardingStep : 5
                        };
                        return;
                    }
                    if (onboardingStep >= 6) {
                        this.finishCompletedParentRegistration(response, payload, password);
                        return;
                    }
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
        if (
            !environment.production
            && sessionStorage.getItem('oauth_signup_is_development_mock') === 'true'
        ) {
            this.isLoading = false;
            this.core.triggerToasrt(
                'Apple development mock completed the UI flow. Backend submission was safely blocked.'
            );
            return;
        }

        const profileStr = sessionStorage.getItem('signup_profile');
        let profile: any = {};
        try { profile = profileStr ? JSON.parse(profileStr) : {}; } catch (e) {}

        const provider   = (sessionStorage.getItem('oauth_signup_provider') || 'google') as 'google' | 'apple';
        const email      = sessionStorage.getItem('google_signup_email') || '';
        const providerId = sessionStorage.getItem('google_signup_provider_id') || '';
        const avatarUrl  = sessionStorage.getItem('google_signup_avatar') || '';
        const idToken    = sessionStorage.getItem('oauth_signup_id_token') || '';
        const accessToken = sessionStorage.getItem('oauth_signup_access_token') || '';
        const serverAuthCode = sessionStorage.getItem('oauth_signup_server_auth_code') || '';
        const identityToken = sessionStorage.getItem('oauth_signup_identity_token') || '';
        const authorizationCode = sessionStorage.getItem('oauth_signup_authorization_code') || '';
        const rawNonce = sessionStorage.getItem('oauth_signup_raw_nonce') || '';
        const clientId = sessionStorage.getItem('oauth_signup_client_id') || '';
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
            referralCode: sessionStorage.getItem('referralCode') || null
        };
        if (profile.gender) {
            googlePayload.gender = toApiGender(profile.gender);
        }
        const parsedAvatarKey = Number(profile.avatar);
        if (Number.isInteger(parsedAvatarKey) && parsedAvatarKey >= 1 && parsedAvatarKey <= 12) {
            googlePayload.avatarName = `avatar_${parsedAvatarKey}`;
            googlePayload.avatarImageName = `avatars/avatar${parsedAvatarKey}.webp`;
        } else if (!avatarUrl) {
            // No preset avatar chosen and no real Google/Apple photo either
            // (e.g. Apple never provides one, or photo access was denied) —
            // assign a default so the dashboard has a real picture instead
            // of falling back to just their name's initial.
            const fallbackKey = this.resolveParentAvatarKey(profile);
            googlePayload.avatarName = `avatar_${fallbackKey}`;
            googlePayload.avatarImageName = `avatars/avatar${fallbackKey}.webp`;
        }

        if (idToken) {
            googlePayload.idToken = idToken;
        }
        if (accessToken) {
            googlePayload.accessToken = accessToken;
        }
        if (serverAuthCode) {
            googlePayload.serverAuthCode = serverAuthCode;
        }
        if (identityToken) {
            googlePayload.identityToken = identityToken;
        }
        if (authorizationCode) {
            googlePayload.authorizationCode = authorizationCode;
        }
        if (rawNonce) {
            googlePayload.rawNonce = rawNonce;
        }
        if (clientId) {
            googlePayload.clientId = clientId;
        }

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

        if (!environment.production) {
            console.info('[OAuth parent signup] Submitting provider profile', {
                provider,
                providerId,
                hasEmail: !!email,
                hasName: !!googlePayload.name,
                hasIdentityToken: !!(googlePayload.identityToken || googlePayload.idToken),
                hasAuthorizationCode: !!googlePayload.authorizationCode,
                familyMode: isCreator ? 'create' : 'join'
            });
        }

        this.isLoading = true;
        // Submit family details for the same OAuth provider identity.
        const request = this.authService.googleOAuthLogin(googlePayload);
        request.subscribe({
            next: (response) => {
                this.isLoading = false;
                const userId = response.user?.id;
                if (response.token && userId) {
                    this.authService.setSession(
                        { token: response.token, userId, expiresIn: response.expiresIn, user: response.user },
                        false
                    );
                }
                this.onboardingState.markExistingUser();
                // Family setup is saved, but activation is still pending.
                // Keep the shared draft and provider identity for refresh and
                // the final action, for both Google and Apple.
                this.onboardingState.updateRegistrationDraft({
                    ...(response.user || {}),
                    authProvider: provider,
                    socialProviderId: providerId,
                    selectedSignupRole: 'parent',
                    socialOnboarding: true,
                    socialDetailsCompleted: true,
                    socialFamilyCompleted: true
                });
                try { sessionStorage.setItem('family_connected_ack', 'Parent'); } catch (e) {}
                if (isCreator && this.showFamilyCreationSuccess(response)) {
                    this.pendingOAuthFamilyCompletion = true;
                    return;
                }

                this.navigateWithoutHistory('/signup', { step: 5, role: 'parent' });
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
    private showFamilyCreationSuccess(response: any): boolean {
        const familyCode = this.extractFamilyCode(response);
        if (!familyCode) {
            this.core.triggerToasrt('Your family was created, but the family code could not be loaded. Please try again.');
            return false;
        }

        this.familyCode = familyCode;
        this.qrCodeData = `GROUP:${familyCode}`;
        this.familyCreated = true;
        this.showRegisterButton = false;
        this.expandedSuccessFaq = null;
        sessionStorage.setItem('familyCode', familyCode);
        this.updateParentFaqs();
        return true;
    }

    private extractFamilyCode(response: any): string {
        let currentUser: any = null;
        try { currentUser = this.authService.getUserData(); } catch (e) {}

        const candidates = [
            response?.familyCode,
            response?.family?.familyCode,
            response?.user?.familyCode,
            response?.user?.family?.familyCode,
            response?.savedData?.familyCode,
            response?.savedData?.family?.familyCode,
            response?.data?.familyCode,
            response?.data?.family?.familyCode,
            currentUser?.familyCode,
            currentUser?.family?.familyCode,
            sessionStorage.getItem('familyCode')
        ];

        const familyCode = candidates.find(value => typeof value === 'string' && value.trim());
        return familyCode ? familyCode.trim().toUpperCase() : '';
    }

    /**
     * Parents never see the avatar picker during signup, so pick a sensible
     * default preset avatar (1-6 female, 7-12 male, otherwise any of the 12)
     * rather than leaving them with no picture at all.
     */
    private resolveParentAvatarKey(profile: any): number {
        const gender = String(profile?.gender || '').trim().toLowerCase();
        if (gender === 'female') return Math.floor(Math.random() * 6) + 1;
        if (gender === 'male') return Math.floor(Math.random() * 6) + 7;
        return Math.floor(Math.random() * 12) + 1;
    }

    private clearOAuthSignupSession(): void {
        [
            'signup_via_google', 'signup_via_oauth', 'oauth_signup_provider',
            'google_signup_email', 'google_signup_name', 'google_signup_avatar',
            'google_signup_provider_id', 'oauth_signup_id_token',
            'oauth_signup_access_token', 'oauth_signup_server_auth_code',
            'oauth_signup_identity_token', 'oauth_signup_authorization_code',
            'oauth_signup_raw_nonce', 'oauth_signup_client_id',
            'oauth_signup_is_development_mock', 'oauth_signup_pending_submission',
            'signup_profile', 'signup_role', 'signup_avatar',
            'requestedIdentifier', 'familyCode', 'familyName', 'familyCreator',
            'referralCode', 'referralCodeLocked'
        ].forEach(key => {
            try { sessionStorage.removeItem(key); } catch (e) {}
        });
    }

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
        // Central safeguard: while Create Child Account is pending, no caller
        // may replace the Child credential flow with Parent step 5.
        if (this.shouldStartManagedChildSignup()) {
            if (this.beginManagedChildSignup()) {
                return;
            }
            this.core.triggerToasrt('Your parent session is still being prepared. Please tap Create Child Account again.');
            return;
        }

        try {
            const draft = this.onboardingState.getRegistrationState()?.savedData || {};
            const existingCredentials = this.signupCredentialState.getPendingLogin();
            const password = existingCredentials?.password || this.signupCredentialState.getPassword();
            const email = existingCredentials?.email || String(draft.email || '').trim();
            const phone = existingCredentials?.phone || String(draft.phone || '').trim();

            if (password && (email || phone)) {
                this.signupCredentialState.setPendingLogin({
                    ...(email ? { email } : {}),
                    ...(!email && phone ? { phone } : {}),
                    password
                });
            }

            sessionStorage.setItem('family_connected_ack', 'Parent');
            this.onboardingState.markExistingUser();
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to persist completed onboarding state', error);
        }

        this.clearSignupSession();
        this.navigateWithoutHistory('/signup', { step: 5 });
    }

    private finishCompletedParentRegistration(response: any, payload: any, password: string): void {
        const completeNavigation = () => {
            this.onboardingState.clearRegistrationDraft();
            this.onboardingState.markExistingUser();
            this.clearSignupSession();
            this.signupCredentialState.clear();
            this.isLoading = false;
            if (this.beginManagedChildSignup()) {
                return;
            }
            this.navigateWithoutHistory(this.authService.getDashboardRoute() || '/authed/parent-account');
        };

        const responseUserId = response?.user?.id;
        if (response?.token && responseUserId) {
            this.authService.setSession({
                token: response.token,
                userId: responseUserId,
                expiresIn: response.expiresIn,
                user: response.user
            });
        }

        if (this.authService.isLoggedIn()) {
            completeNavigation();
            return;
        }

        if (!password || (!payload.email && !payload.phone)) {
            this.onboardingState.clearRegistrationDraft();
            this.clearSignupSession();
            this.navigateWithoutHistory('/login');
            return;
        }

        const credentials = {
            ...(payload.email ? { email: payload.email } : {}),
            ...(payload.phone ? { phone: payload.phone } : {}),
            password
        };
        this.authService.login(credentials).subscribe({
            next: (loginResponse) => {
                if (this.shouldStartManagedChildSignup()) {
                    completeNavigation();
                    return;
                }
                const resume = this.onboardingState.getResumeNavigation(loginResponse.user);
                if (resume) {
                    this.navigateWithoutHistory(resume.url, resume.queryParams);
                    return;
                }
                completeNavigation();
            },
            error: () => {
                this.onboardingState.clearRegistrationDraft();
                this.clearSignupSession();
                this.navigateWithoutHistory('/login');
            }
        });
    }

    private beginManagedChildSignup(): boolean {
        let shouldStart = false;
        let familyCode = this.familyCode.trim().toUpperCase();

        try {
            shouldStart = sessionStorage.getItem(FamilyOnboardComponent.CREATE_CHILD_AFTER_FAMILY_KEY) === 'true';
            familyCode = (
                sessionStorage.getItem(FamilyOnboardComponent.MANAGED_CHILD_FAMILY_CODE_KEY)
                || familyCode
            ).trim().toUpperCase();
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to read child account handoff state', error);
        }

        if (!shouldStart || !familyCode) {
            return false;
        }

        // Preserve the authenticated Parent before clearing the temporary
        // onboarding data. The child wizard must be able to return to this
        // Parent after child registration completes.
        if (!this.authService.beginManagedChildParentSession()) {
            return false;
        }

        this.onboardingState.clearRegistrationDraft();
        this.signupCredentialState.clear();
        this.clearSignupSession();
        this.clearParentOAuthDraftForManagedChild();

        try {
            sessionStorage.removeItem(FamilyOnboardComponent.CREATE_CHILD_AFTER_FAMILY_KEY);
            sessionStorage.setItem(FamilyOnboardComponent.MANAGED_CHILD_SIGNUP_KEY, 'true');
            sessionStorage.setItem(FamilyOnboardComponent.MANAGED_CHILD_FAMILY_CODE_KEY, familyCode);
            sessionStorage.setItem('signup_role', 'child');
            sessionStorage.setItem('familyCode', familyCode);
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to persist child account handoff state', error);
        }

        this.navigateWithoutHistory('/signup', {
            step: 0.1,
            role: 'child',
            managedChild: true
        });
        return true;
    }

    /**
     * Apple keeps its signup identity in session storage after the Parent is
     * authenticated. Remove only that temporary OAuth onboarding identity so
     * a newly-created Child starts with a blank email form. The authenticated
     * Parent session itself is preserved by beginManagedChildParentSession().
     */
    private clearParentOAuthDraftForManagedChild(): void {
        try {
            [
                'signup_via_oauth',
                'signup_via_google',
                'oauth_signup_provider',
                'google_signup_email',
                'google_signup_name',
                'google_signup_avatar',
                'google_signup_provider_id',
                'oauth_signup_id_token',
                'oauth_signup_access_token',
                'oauth_signup_server_auth_code',
                'oauth_signup_identity_token',
                'oauth_signup_authorization_code',
                'oauth_signup_raw_nonce',
                'oauth_signup_client_id',
                'oauth_signup_is_development_mock'
            ].forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            console.warn('[FamilyOnboard] Unable to clear Parent OAuth child-signup draft', error);
        }
    }

    private redirectToLogin(): void {
        this.signupCredentialState.clear();
        this.navigateWithoutHistory('/login', { role: this.userRole });
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
