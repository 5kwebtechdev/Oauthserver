import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoreService } from '../../core/services/core.service';
import { FamilyService } from '../../core/services/family.service';

@Component({
  selector: 'app-join-family2',
  templateUrl: './join-family2.component.html',
  styleUrls: ['./join-family2.component.scss'],
  standalone: false
})
export class JoinFamily2Component implements OnInit {
  userRole: 'child' | 'parent' | 'self' = 'parent';
  selectedMode: 'create' | 'join' = 'create';
  familyForm: FormGroup;
  joinFamilyForm: FormGroup;
  isLoading = false;
  familyCreated = false;
  familyCode = '';
  qrCodeData = '';
  createdFamilyName = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private core: CoreService,
    private familyService: FamilyService
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

    this.isLoading = true;
    const familyCode = this.joinFamilyForm.get('familyCode')?.value;

    this.familyService.joinFamily(familyCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.core.triggerToasrt('Successfully joined family!');
        this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
      },
      error: (error) => {
        this.isLoading = false;
        this.core.triggerToasrt(error.error?.message || 'Failed to join family. Please try again.');
      }
    });

    setTimeout(() => {
      this.isLoading = false;
      this.core.triggerToasrt(`Successfully joined family with code: ${familyCode}`);
      this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
    }, 2000);
  }

  openQRScanner() {
    console.log('QR Scanner button clicked - join-family2 component');
    console.log('User role:', this.userRole);

    this.router.navigate(['/home/scan-qr'], {
      queryParams: {
        role: this.userRole,
        returnTo: 'join-family2'
      }
    }).then(success => {
      console.log('Navigation to scan-qr successful:', success);
    }).catch(error => {
      console.error('Navigation to scan-qr failed:', error);
    });
  }

  createFamily() {
    if (this.familyForm.invalid) {
      this.familyForm.markAllAsTouched();
      this.core.triggerToasrt('Please enter a valid family name (2-30 characters)');
      return;
    }

    this.isLoading = true;
    const familyName = this.familyForm.get('familyName')?.value;
    this.createdFamilyName = familyName;

    this.familyService.createFamily(familyName).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.familyCreated = true;
        this.familyCode = response.familyCode || this.generateFamilyCode();
        this.qrCodeData = this.familyCode;
        this.core.triggerToasrt('Family created successfully!');
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
    this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
  }

  continueWithoutFamily() {
    this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
  }

  get familyName() {
    return this.familyForm.get('familyName');
  }

  get familyCodeControl() {
    return this.joinFamilyForm.get('familyCode');
  }
}