import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FamilyService } from '../../core/services/family.service';
import { CoreService } from '../../core/services/core.service';
import { FaqItem, PROFILE_FAQS } from '../../core/components/user-profile/profile-facts/profile-facts.component';

@Component({
  selector: 'app-join-family',
  templateUrl: './join-family.component.html',
  styleUrls: ['./join-family.component.scss'],
  standalone: false
})
export class JoinFamilyComponent implements OnInit {
  form: FormGroup;
  submitted = false;
  isLoading = false;
  userRole: 'child' | 'parent' | 'self' = 'child';
  codeEntryFaqs: FaqItem[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private familyService: FamilyService,
    private core: CoreService
  ) {
    // Start with no validators; validators are applied dynamically based on selected role
    this.form = this.fb.group({
      code: ['']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const scannedCode = params['scannedCode'];

      if (role && ['child', 'parent', 'self'].includes(role)) {
        this.userRole = role;
        // Apply validators based on role
        this.updateCodeValidators();
      }

      if (scannedCode) {
        this.form.patchValue({ code: scannedCode });
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { role: this.userRole },
          queryParamsHandling: 'replace'
        });
      }
    });

    // prepare Code Entry FAQs
    this.codeEntryFaqs = PROFILE_FAQS.filter(f => (f.section || '').toLowerCase() === 'onboarding' && (f.screen || '').toLowerCase().includes('code entry'));
  }

  goBack() {
    this.router.navigate(['/home/instructions-for-child']);
  }

  get f(): any {
    return this.form.controls as any;
  }

  scanCode() {
    const scanned = '12345678';
    this.form.patchValue({ code: scanned });
  }

  private codePattern() {
    return /^[A-Za-z0-9]{8}$/;
  }

  private isValidCode(code?: string | null): boolean {
    if (!code) return false;
    return this.codePattern().test(code);
  }

  private updateCodeValidators(): void {
    const control = this.form.get('code');
    if (!control) return;

    // Child role requires a family code; other roles may provide it optionally
    if (this.userRole === 'child') {
      control.setValidators([Validators.required, Validators.pattern(this.codePattern())]);
    } else {
      // optional, but if provided must match pattern — we'll validate on submit
      control.clearValidators();
    }
    control.updateValueAndValidity({ onlySelf: true });
  }

  openScanner() {
    console.log('QR Scanner button clicked - join-family component');
    console.log('User role:', this.userRole);

    this.router.navigate(['/home/scan-qr'], {
      queryParams: {
        role: this.userRole,
        returnTo: 'join-family'
      }
    }).then(success => {
      console.log('Navigation to scan-qr successful:', success);
    }).catch(error => {
      console.error('Navigation to scan-qr failed:', error);
    });
  }

  submit() {
    this.submitted = true;
    Object.keys(this.form.controls).forEach(k => this.form.controls[k].markAsTouched());

    // Enforce required form validity for child role
    if (this.userRole === 'child' && this.form.invalid) {
      return;
    }

    // this.isLoading = true;
    const familyCode = this.form.get('code')?.value;
    console.log('Joining family with code:', familyCode);

    // If a family code was provided, validate it and persist only if valid
    if (familyCode) {
      if (!this.isValidCode(familyCode)) {
        this.core.triggerToasrt('Please enter a valid 8-character family code');
        return;
      }
      sessionStorage.setItem('familyCode', familyCode);
    } else {
      // If user is child, family code is mandatory — ensure it's present (extra guard)
      if (this.userRole === 'child') {
        this.core.triggerToasrt('Family code is required to join as a child');
        return;
      }
    }

    // Store the role for use after login / during signup
    sessionStorage.setItem('signup_role', this.userRole);

    // If family code is provided, navigate to pet selection (step 4) for onboarding
    if (familyCode) {
      const queryParams: any = { step: 4, role: this.userRole };
      queryParams.familyCode = familyCode;
      this.router.navigate(['/home/sign-up'], { queryParams });
      return;
    }

    // Default: navigate to login for flows without family code
    this.router.navigate(['/home/login'], { queryParams: { role: this.userRole } });
    // this.familyService.joinFamily(familyCode).subscribe({
    //   next: (response) => {
    //     this.isLoading = false;
    //     this.core.triggerToasrt('Successfully joined family!');
    //     this.router.navigate(['home', 'sign-up'], { queryParams: { step: 4 } });
    //   },
    //   error: (error) => {
    //     this.isLoading = false;
    //     this.core.triggerToasrt(error.error?.message || 'Failed to join family. Please try again.');
    //   }
    // });


  }
}
