import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-join-family',
  templateUrl: './join-family.component.html',
  styleUrls: ['./join-family.component.scss'],
  standalone: false
})
export class JoinFamilyComponent implements OnInit {
  form: FormGroup;
  submitted = false;
  userRole: 'child' | 'parent' | 'self' = 'child';

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const scannedCode = params['scannedCode'];
      
      if (role && ['child', 'parent', 'self'].includes(role)) {
        this.userRole = role;
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
    if (this.form.invalid) {
      return;
    }

    const code = this.form.value.code;
    console.log('Joining family with code:', code);
    this.router.navigate(['home', 'sign-up'], { queryParams: { step: 4 } });
  }
}
