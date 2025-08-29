import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-join-family',
  templateUrl: './join-family.component.html',
  styleUrls: ['./join-family.component.scss'],
  standalone: false
})
export class JoinFamilyComponent {
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private router: Router) {
    // require exactly 8 numeric digits for the family code
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]]
    });
  }

  goBack() {
    this.router.navigate(['/home/instructions']);
  }

  get f(): any {
    return this.form.controls as any;
  }

  // Stub for QR scan — in a real app you'd call a camera/QR plugin
  scanCode() {
    // simulate a scanned 8-digit numeric code result
    const scanned = '12345678';
    this.form.patchValue({ code: scanned });
  }

  openScanner() {
    this.router.navigate(['/home/scan-qr']);
  }

  submit() {
    this.submitted = true;
    // mark all controls as touched to show validation messages
    Object.keys(this.form.controls).forEach(k => this.form.controls[k].markAsTouched());
    if (this.form.invalid) {
      return;
    }

    const code = this.form.value.code;
    // TODO: call API to join family using `code`. For now navigate or log.
    console.log('Joining family with code:', code);
  // Navigate to signup step 4 after successful join
  this.router.navigate(['home', 'sign-up'], { queryParams: { step: 4 } });
  }
}
