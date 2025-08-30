import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoreService } from '../../core/services/core.service';

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
    private core: CoreService
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
      
      // If there's a scanned code, populate the join family form
      if (scannedCode) {
        this.selectedMode = 'join'; // Switch to join mode
        this.joinFamilyForm.patchValue({
          familyCode: scannedCode
        });
        // Clear the scannedCode from URL to prevent reprocessing
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { role: this.userRole },
          queryParamsHandling: 'replace'
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/home/instructions-for-parent'], { queryParams: { role: this.userRole } });
  }

  selectMode(mode: 'create' | 'join') {
    this.selectedMode = mode;
    // Reset forms when switching modes
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

    // Simulate API call to join family
    setTimeout(() => {
      this.isLoading = false;
      // TODO: Implement actual family joining logic
      this.core.triggerToasrt(`Successfully joined family with code: ${familyCode}`);
      // Navigate to authenticated module after successful join
      this.router.navigate(['/home/auth'], { queryParams: { role: this.userRole } });
    }, 2000);
  }

  openQRScanner() {
    // Navigate to QR scanner component
    this.router.navigate(['/home/scan-qr'], { 
      queryParams: { 
        role: this.userRole,
        returnTo: 'join-family2'
      } 
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

    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      this.familyCreated = true;
      
      // Generate random family code (6-8 characters alphanumeric)
      this.familyCode = this.generateFamilyCode();
      
      // Generate QR code data (for now, just the family code)
      this.qrCodeData = this.familyCode;
      
      this.core.triggerToasrt(`Family "${familyName}" created successfully!`);
    }, 2000);
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
    // Navigate to authenticated module or dashboard
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