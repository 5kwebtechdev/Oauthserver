import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoreService } from '../../core/services/core.service';
import { FamilyService } from '../../core/services/family.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';
import { FaqItem, PROFILE_FAQS } from '../../core/components/user-profile/profile-facts/profile-facts.component';

@Component({
  selector: 'app-join-family2',
  templateUrl: './join-family2.component.html',
  styleUrls: ['./join-family2.component.scss'],
  standalone: false
})
export class JoinFamily2Component implements OnInit, OnDestroy {
  userRole: 'child' | 'parent' | 'self' = 'parent';
  selectedMode: 'create' | 'join' = 'create';
  familyForm: FormGroup;
  joinFamilyForm: FormGroup;
  isLoading = false;
  familyCreated = false;
  familyCode = '';
  qrCodeData = '';
  createdFamilyName = '';
  isScanning = false;
  createFaqs: FaqItem[] = [];
  joinFaqs: FaqItem[] = [];
  createdFaqs: FaqItem[] = [];
  isParentRegistered = false;
  showRegisterButton = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private core: CoreService,
    private familyService: FamilyService,
    private alertController: AlertController,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.familyForm = this.fb.group({
      familyName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(30)
      ]]
    });

    this.joinFamilyForm = this.fb.group({
      familyCode: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(10)
      ]]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const scannedCode = params['scannedCode'];

      if (role && ['child', 'parent', 'self'].includes(role)) {
        this.userRole = role;
      } else {
        this.userRole = 'parent'; // Default fallback
      }

      if (scannedCode) {
        this.selectedMode = 'join';
        this.joinFamilyForm.patchValue({
          familyCode: scannedCode
        });
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { role: this.userRole },
          queryParamsHandling: 'replace'
        });
      }
    });

    // prepare FAQ subsets per requested mapping
    this.createFaqs = PROFILE_FAQS.filter(f => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes('join/create'));
    this.joinFaqs = PROFILE_FAQS.filter(f => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes('join family') && !(f.screen || '').toLowerCase().includes('create'));
    this.createdFaqs = PROFILE_FAQS.filter(f => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes('create family code'));
  }

  async ngOnDestroy() {
    await this.stopScanner();
  }

  goBack() {
    if (this.familyCreated) {
      this.familyCreated = false;
      this.selectedMode = 'create';
      this.familyForm.reset();
    } else {
      this.router.navigate(['/home/instructions-for-parent'], { queryParams: { role: this.userRole } });
    }
  }

  selectMode(mode: 'create' | 'join') {
    this.selectedMode = mode;
    if (mode === 'join') {
      this.joinFamilyForm.reset();
    } else {
      this.familyForm.reset();
      this.familyCreated = false;
    }
  }

  joinFamily() {
    if (this.joinFamilyForm.invalid) {
      this.joinFamilyForm.markAllAsTouched();
      this.core.triggerToasrt('Please enter a valid family code (6-10 characters)');
      return;
    }

    // this.isLoading = true;
    const familyCode = this.joinFamilyForm.get('familyCode')?.value;
    sessionStorage.setItem('familyCode', familyCode);
    // This is a join flow, not create — ensure creator flag is cleared
    try { sessionStorage.removeItem('familyCreator'); } catch (e) { }

    // If signup data already present, attempt to register the parent immediately
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password');
    if (profileStr && password) {
      // Use existing register flow which will auto-login on success
      this.registerAccount();
      return;
    }

    // Otherwise redirect to login/signup so the user can complete signup
    this.redirectToLogin();

    // this.familyService.joinFamily(familyCode).subscribe({
    //   next: (response) => {
    //     this.isLoading = false;
    //     this.core.triggerToasrt('Successfully joined family!');
    //     this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
    //   },
    //   error: (error) => {
    //     this.isLoading = false;
    //     this.core.triggerToasrt(error.error?.message || 'Failed to join family. Please try again.');
    //   }
    // });

    // setTimeout(() => {
    //   this.isLoading = false;
    //   this.core.triggerToasrt(`Successfully joined family with code: ${familyCode}`);
    //   this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
    // }, 2000);
  }

  async openQRScanner() {
    try {
      // Navigate to the centralized scan-qr page which handles camera/permissions/scan
      this.router.navigate(['/home/scan-qr'], { queryParams: { role: this.userRole, returnTo: 'join-family2' } }).catch((err) => {
        console.error('Navigation to scan-qr failed:', err);
        this.core.triggerToasrt('Failed to open scanner. Please try again.');
      });
    } catch (error) {
      console.error('Error navigating to scanner:', error);
      this.core.triggerToasrt('Failed to open scanner. Please try again.');
    }
  }

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

      // Request permission
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

  private async startScanner() {
    if (this.isScanning) {
      return;
    }

    try {
      // Hide background behind scanner
      document.body.classList.add('barcode-scanner-active');
      this.isScanning = true;

      // Add listener for scanned barcodes
      const listener = await BarcodeScanner.addListener('barcodesScanned', async (result: BarcodesScannedEvent) => {
        if (result.barcodes && result.barcodes.length > 0) {
          const barcode = result.barcodes[0];
          const scannedValue = barcode.displayValue || barcode.rawValue || '';

          // Stop scanning immediately
          await this.stopScanner();

          // Process the scanned QR code
          await this.processScannedQRCode(scannedValue);
        }
      });

      // Start the scanner
      await BarcodeScanner.startScan();
    } catch (error) {
      console.error('Error starting scanner:', error);
      this.isScanning = false;
      document.body.classList.remove('barcode-scanner-active');
      this.core.triggerToasrt('Failed to start the camera scanner. Please try again.');
    }
  }

  private async stopScanner() {
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

  private async processScannedQRCode(scannedValue: string) {
    // Validate the QR code format: "GROUP:<code>"
    if (!scannedValue || !scannedValue.startsWith('GROUP:')) {
      const alert = await this.alertController.create({
        header: 'Invalid QR Code',
        message: 'The scanned QR code is not a valid family code. Please scan a family QR code.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Extract the family code after "GROUP:"
    const familyCode = scannedValue.substring(6).trim();

    if (!familyCode || familyCode.length < 6 || familyCode.length > 10) {
      const alert = await this.alertController.create({
        header: 'Invalid Code',
        message: 'The family code must be between 6-10 characters.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Auto-fill the family code in the form
    this.joinFamilyForm.patchValue({ familyCode: familyCode });

    // Show success feedback
    this.core.triggerToasrt(`Family code scanned: ${familyCode}`);

    // Automatically trigger the join family API
    setTimeout(() => {
      // ensure this is treated as a join, not a create
      try { sessionStorage.removeItem('familyCreator'); } catch (e) { }
      this.joinFamily();
    }, 500);
  }

  createFamily() {
    if (this.familyForm.invalid) {
      this.familyForm.markAllAsTouched();
      this.core.triggerToasrt('Please enter a valid family name (2-30 characters)');
      return;
    }

    this.isLoading = true;
    const familyName = this.familyForm.get('familyName')?.value;
    sessionStorage.setItem('familyName', familyName);
    this.createdFamilyName = familyName;
    sessionStorage.setItem('familyName', familyName);

    this.familyService.createFamily(familyName).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.familyCreated = true;
        this.familyCode = response.familyCode || this.generateFamilyCode();
        this.qrCodeData = 'GROUP:' + this.familyCode; // Prefixed for QR scanning validation
        sessionStorage.setItem('familyCode', this.familyCode);
        // Mark that current user created this family so registration knows they're the creator
        try { sessionStorage.setItem('familyCreator', 'true'); } catch (e) { }
        this.showRegisterButton = true;
      },
      error: (error) => {
        this.isLoading = false;
        this.core.triggerToasrt(error.error?.message || 'Failed to create family. Please try again.');
      }
    });
  }

  private generateFamilyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  copyFamilyCode() {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(this.familyCode).then(() => {
        this.core.triggerToasrt('Family code copied to clipboard!');
        this.redirectToLogin();
      }).catch(() => {
        this.fallbackCopyTextToClipboard(this.familyCode);
      });
    } else {
      this.fallbackCopyTextToClipboard(this.familyCode);
    }
  }

  private fallbackCopyTextToClipboard(text: string) {
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
      this.core.triggerToasrt('Family code copied to clipboard!');
      this.redirectToLogin();
    } catch (err) {
      this.core.triggerToasrt('Failed to copy family code');
    }
    document.body.removeChild(textArea);
  }

  shareQRCode() {
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

  private fallbackShare() {
    this.core.triggerToasrt('Share functionality not available on this device');
  }

  childCompleted() {
    // If parent is already registered, navigate to dashboard directly
    if (this.isParentRegistered || (!this.showRegisterButton && this.familyCreated)) {
      // Navigate to parent's authenticated area
      const route = this.authService.getDashboardRoute() || '/authed/parent-account';
      this.router.navigate([route]);
      return;
    }

    // Otherwise, register parent using data collected during signup flow, then auto-login and redirect
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password');
    const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || 'parent';
    const identifier = sessionStorage.getItem('requestedIdentifier');
    const loginMode = sessionStorage.getItem('loginMode');
    const familyCode = sessionStorage.getItem('familyCode') || this.familyCode || '';
    const familyName = sessionStorage.getItem('familyName') || this.createdFamilyName || '';

    if (!profileStr || !password) {
      this.core.triggerToasrt('Please complete sign up before continuing');
      this.router.navigate(['home', 'sign-up']);
      return;
    }

    let profile: any = {};
    try { profile = JSON.parse(profileStr); } catch (e) { profile = {}; }

    const payload: any = {
      name: profile.name || '',
      gender: (profile.gender || '').toUpperCase(),
      relationship: 'PARENT',
      password: password,
      familyCode: familyCode || '',
      familyName: familyName || ''
    };

    // Indicate whether this registration is for a created family (creator) or a join (co-parent)
    try {
      const createdFlag = sessionStorage.getItem('familyCreator');
      if (createdFlag === 'true') payload.familyRole = 'CREATOR';
      else if (payload.familyCode) payload.familyRole = 'CO_PARENT';
    } catch (e) { }

    // include contact
    if (loginMode === 'email' || (identifier && identifier.includes && identifier.includes('@'))) {
      payload.email = identifier;
    } else if (identifier) {
      const countryCode = sessionStorage.getItem('countryCode') || '';
      payload.phone = `${countryCode || ''}${identifier}`;
    }

    // dateOfBirth (prefer session-stored profile dob)
    const dobValue = profile.dob;
    if (dobValue) {
      const dobDate = new Date(dobValue);
      if (!isNaN(dobDate.getTime())) {
        payload.dateOfBirth = dobDate.toISOString().split('T')[0];
      }
    }

    this.isLoading = true;
    this.authService.register(payload).subscribe({
      next: (resp) => {
        // After successful registration, attempt to login using provided credentials
        const credentials: any = { password };
        if (payload.email) credentials.email = payload.email;
        else if (payload.phone) credentials.phone = payload.phone;

        this.authService.login(credentials).subscribe({
          next: (loginResp) => {
            // Ensure user profile stored in UserService
            try {
              this.userService.setUserProfile({
                name: loginResp.user?.name || payload.name,
                email: loginResp.user?.email || payload.email,
                phone: loginResp.user?.phone || payload.phone,
                gender: (loginResp.user?.gender || payload.gender || '').toLowerCase(),
                dob: loginResp.user?.dateOfBirth || payload.dateOfBirth,
                avatarName: loginResp.user?.avatar?.avatarName,
                avatarUrl: loginResp.user?.avatar?.url || undefined,
                relationship: loginResp.user?.relationship || 'PARENT',
                pet: loginResp.user?.pet?.petName || undefined
              });
            } catch (e) { }

            this.isLoading = false;
            // Clear signup session storage used for onboarding
            try {
              sessionStorage.removeItem('signup_profile');
              sessionStorage.removeItem('signup_password');
              sessionStorage.removeItem('signup_role');
              sessionStorage.removeItem('signup_avatar');
              sessionStorage.removeItem('requestedIdentifier');
              sessionStorage.removeItem('familyCode');
              sessionStorage.removeItem('familyName');
              sessionStorage.removeItem('familyCreator');
            } catch (e) { }

            // Update button state to reflect registration is complete
            this.showRegisterButton = false;
            this.isParentRegistered = true;

            // Navigate to parent's authenticated area
            const route = this.authService.getDashboardRoute() || '/authed/parent-account';
            this.router.navigate([route]);
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Auto-login failed after registration', err);
            this.core.triggerToasrt('Account created but automatic login failed. Please login manually.');
            this.router.navigate(['/home/login']);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Registration failed', err);
        const msg = err?.error?.message || err?.error || 'Failed to create account. Please try again.';
        this.core.triggerToasrt(msg);
      }
    });
  }

  continueWithoutFamily() {
    this.router.navigate(['home', 'sign-up'], { queryParams: { step: 4 } });
  }

  private redirectToLogin(): void {
    // Store the role for use after login
    sessionStorage.setItem('signup_role', this.userRole);
    this.router.navigate(['/home/login'], {
      queryParams: { role: this.userRole }
    });
  }

  registerAccount() {
    // Use actual signup data from session storage, similar to childCompleted method
    const profileStr = sessionStorage.getItem('signup_profile');
    const password = sessionStorage.getItem('signup_password');
    const role = (sessionStorage.getItem('signup_role') as 'child' | 'parent' | 'self') || 'parent';
    const identifier = sessionStorage.getItem('requestedIdentifier');
    const loginMode = sessionStorage.getItem('loginMode');
    const familyCode = sessionStorage.getItem('familyCode') || this.familyCode || '';
    const familyName = sessionStorage.getItem('familyName') || this.createdFamilyName || '';

    if (!profileStr || !password) {
      this.core.triggerToasrt('Please complete sign up before continuing');
      this.router.navigate(['home', 'sign-up']);
      return;
    }

    let profile: any = {};
    try { profile = JSON.parse(profileStr); } catch (e) { profile = {}; }

    const registerPayload: any = {
      name: profile.name || '',
      gender: (profile.gender || '').toUpperCase(),
      relationship: 'PARENT',
      password: password,
      familyCode: familyCode || '',
      familyName: familyName || ''
    };

    // Mark whether this registration is for a created family (creator) or a join (co-parent)
    try {
      const createdFlag = sessionStorage.getItem('familyCreator');
      if (createdFlag === 'true') registerPayload.familyRole = 'CREATOR';
      else if (registerPayload.familyCode) registerPayload.familyRole = 'CO_PARENT';
    } catch (e) { }

    // include contact
    if (loginMode === 'email' || (identifier && identifier.includes && identifier.includes('@'))) {
      registerPayload.email = identifier;
    } else if (identifier) {
      const countryCode = sessionStorage.getItem('countryCode') || '';
      registerPayload.phone = `${countryCode || ''}${identifier}`;
    }

    // dateOfBirth (prefer session-stored profile dob)
    const dobValue = profile.dob;
    if (dobValue) {
      const dobDate = new Date(dobValue);
      if (!isNaN(dobDate.getTime())) {
        registerPayload.dateOfBirth = dobDate.toISOString().split('T')[0];
      }
    }

    this.isLoading = true;
    this.authService.register(registerPayload).subscribe({
      next: (resp) => {
        this.isLoading = false;
        this.showRegisterButton = false; // Hide the register button
        this.isParentRegistered = true; // Mark parent as registered
        // Show the original button after successful registration
        // this.core.triggerToasrt('Account registered successfully!');

        // After successful registration, attempt to login using provided credentials
        const credentials: any = { password };
        if (registerPayload.email) credentials.email = registerPayload.email;
        else if (registerPayload.phone) credentials.phone = registerPayload.phone;

        this.authService.login(credentials).subscribe({
          next: (loginResp) => {
            // Ensure user profile stored in UserService
            try {
              this.userService.setUserProfile({
                name: loginResp.user?.name || registerPayload.name,
                email: loginResp.user?.email || registerPayload.email,
                phone: loginResp.user?.phone || registerPayload.phone,
                gender: (loginResp.user?.gender || registerPayload.gender || '').toLowerCase() as 'male' | 'female',
                dob: loginResp.user?.dateOfBirth || registerPayload.dateOfBirth,
                avatarName: loginResp.user?.avatar?.avatarName,
                avatarUrl: loginResp.user?.avatar?.url || undefined,
                relationship: loginResp.user?.relationship || 'PARENT',
                pet: loginResp.user?.pet?.petName || undefined
              });
            } catch (e) { }

            // Clear signup session storage used for onboarding
            try {
              sessionStorage.removeItem('signup_profile');
              sessionStorage.removeItem('signup_password');
              sessionStorage.removeItem('signup_role');
              sessionStorage.removeItem('signup_avatar');
              sessionStorage.removeItem('requestedIdentifier');
              sessionStorage.removeItem('familyCode');
              sessionStorage.removeItem('familyName');
              sessionStorage.removeItem('familyCreator');
            } catch (e) { }

            // Instead of navigating, just update the button state to show the original button
            this.showRegisterButton = false;
            this.isParentRegistered = true;
            // this.core.triggerToasrt('Registration and login successful!');
            // The original button will now appear due to the updated state
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Auto-login failed after registration', err);
            this.core.triggerToasrt('Account created but automatic login failed. Please login manually.');
            this.router.navigate(['/home/login']);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Registration failed', err);
        const msg = err?.error?.message || err?.error || 'Failed to create account. Please try again.';
        this.core.triggerToasrt(msg);
      }
    });
  }

  get familyName() {
    return this.familyForm.get('familyName');
  }

  get familyCodeControl() {
    return this.joinFamilyForm.get('familyCode');
  }
}