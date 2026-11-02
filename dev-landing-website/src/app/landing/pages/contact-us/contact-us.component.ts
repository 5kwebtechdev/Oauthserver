import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PublicNavbarComponent } from '../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../components/common-footer/common-footer.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-contact-us-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PublicNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-us.component.html',
})
export class ContactUsPageComponent {
  form: FormGroup;
  submitted = false;
  sending = false;
  sendError: string | null = null;
  submittedName = '';
  submittedEmail = '';
  gradientButton = 'linear-gradient(-73deg, rgb(144, 33, 77) 0%, rgb(205, 53, 120) 100%)';
  successImg = 'assets/Landing/73a711940e417f5e1d7fb30d71eee4a717b752f8.png';
  private readonly namePattern = /^[a-zA-Z\s'-]+$/;

  constructor(private fb: FormBuilder, private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(this.namePattern)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(300)]],
    });
  }

  get nameError(): string {
    const c = this.form.get('name');
    if (c?.touched && c?.errors) {
      if (c.errors['required']) return 'Please enter your name';
      if (c.errors['minlength']) return 'Minimum 2 characters required';
      if (c.errors['maxlength']) return 'Maximum character limit is 50 characters';
      if (c.errors['pattern']) return 'Only letters, spaces, apostrophe, and hyphen are allowed';
    }
    return '';
  }

  get emailError(): string {
    const c = this.form.get('email');
    if (c?.touched && c?.errors) {
      if (c.errors['required']) return 'Please enter your email';
      if (c.errors['email']) return 'Invalid Email';
    }
    return '';
  }

  get messageError(): string {
    const c = this.form.get('message');
    if (c?.touched && c?.errors) {
      if (c.errors['required']) return 'Please enter your message';
      if (c.errors['minlength']) return 'Minimum character limit is 50 characters';
      if (c.errors['maxlength']) return 'Maximum character limit is 300 characters';
    }
    return '';
  }

  get messageLength(): number {
    return this.form.get('message')?.value?.length || 0;
  }

  get isFormValid(): boolean {
    return this.form.valid;
  }

  onSubmit(): void {
    if (!this.form.valid || this.sending) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending = true;
    this.sendError = null;
    this.cdr.markForCheck();

    const name = String(this.form.get('name')?.value || '').trim();
    const email = String(this.form.get('email')?.value || '').trim();
    const message = String(this.form.get('message')?.value || '').trim();

    this.http.post(`${environment.apiUrl}/contact`, { name, email, message }).subscribe({
      next: () => {
        this.submittedName = name.split(' ')[0] || name;
        this.submittedEmail = email;
        this.submitted = true;
        this.sending = false;
        window.scrollTo(0, 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.sendError = 'Something went wrong. Please try again.';
        this.sending = false;
        this.cdr.markForCheck();
      },
    });
  }

  goBack(): void {
    this.submitted = false;
    this.sendError = null;
    this.submittedName = '';
    this.submittedEmail = '';
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    window.scrollTo(0, 0);
  }
}
