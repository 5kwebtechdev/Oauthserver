import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LandingNavbarComponent } from '../../components/navbar/navbar.component';
import { CommonFooterComponent } from '../../components/common-footer/common-footer.component';
import { environment } from '../../../../environments/environment';

const S = (min: number, base: number): string =>
  `clamp(${min}px, ${(base / 14.4).toFixed(3)}vw, ${base}px)`;

@Component({
  selector: 'app-submit-ad-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LandingNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './submit-ad.component.html',
  styleUrls: ['./submit-ad.component.scss'],
})
export class SubmitAdPageComponent {
  submitted = false;
  sending = false;
  sendError: string | null = null;

  gradientButton = 'linear-gradient(-73deg, rgb(144, 33, 77) 0%, rgb(205, 53, 120) 100%)';
  successImg = 'assets/Landing/73a711940e417f5e1d7fb30d71eee4a717b752f8.png';
  readonly assetRoot = 'assets/Landing/submit-ad';

  form = {
    name: '',
    email: '',
    phone: '',
    website: '',
    socialMedia: '',
    adDescription: '',
  };

  touched: Record<string, boolean> = {};

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  fileError: string | null = null;
  isDragging = false;

  // Proportional scaling helpers
  s(min: number, base: number): string { return S(min, base); }

  constructor(private cdr: ChangeDetectorRef, private route: ActivatedRoute) {}

  get isAdvertisingPage(): boolean {
    return this.route.snapshot.routeConfig?.path === 'advertise-with-us';
  }

  get nameError(): string {
    if (!this.touched['name']) return '';
    const v = this.form.name.trim();
    if (!v) return 'Please enter your name';
    if (v.length < 2) return 'Minimum 2 characters';
    if (v.length > 50) return 'Maximum character limit is 50 characters';
    if (!/^[a-zA-Z\s'\-]+$/.test(v)) return 'Name contains invalid characters';
    return '';
  }

  get emailError(): string {
    if (!this.touched['email']) return '';
    const v = this.form.email.trim();
    if (!v) return 'Please enter your email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid Email';
    return '';
  }

  get phoneError(): string {
    if (!this.touched['phone']) return '';
    const v = this.form.phone.trim();
    if (!v) return 'Please enter your phone number';
    if (!/^\d+$/.test(v)) return 'Only digits are allowed';
    if (!/^\d{10}$/.test(v)) return 'Invalid Number';
    return '';
  }

  get websiteError(): string {
    if (!this.touched['website']) return '';
    const v = this.form.website.trim();
    if (!v) return '';
    if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(v)) return 'Please enter a valid website URL';
    return '';
  }

  get socialMediaError(): string {
    if (!this.touched['socialMedia']) return '';
    const v = this.form.socialMedia.trim();
    if (!v) return '';
    if (!/^(https?:\/\/)?(www\.)?(instagram\.com|facebook\.com)\/[\w.]+\/?$/i.test(v)) return 'Please enter a valid social media URL';
    return '';
  }

  get adDescriptionError(): string {
    if (!this.touched['adDescription']) return '';
    const v = this.form.adDescription.trim();
    if (!v) return 'Please tell us about your ad';
    if (v.length < 50) return 'Minimum character limit is 50 characters';
    if (v.length > 300) return 'Maximum character limit is 300 characters';
    return '';
  }

  get isFormValid(): boolean {
    const nameOk = this.form.name.trim().length >= 2 && this.form.name.trim().length <= 50 && /^[a-zA-Z\s'\-]+$/.test(this.form.name);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim());
    const phoneOk = /^\d{10}$/.test(this.form.phone.trim());
    const websiteOk = this.form.website.trim().length === 0 || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(this.form.website.trim());
    const adDescOk = this.form.adDescription.trim().length >= 50 && this.form.adDescription.length <= 300;
    const socialOk = this.form.socialMedia.trim().length === 0 || /^(https?:\/\/)?(www\.)?(instagram\.com|facebook\.com)\/[\w.]+\/?$/i.test(this.form.socialMedia.trim());
    const fileOk = !this.fileError;
    return nameOk && emailOk && phoneOk && websiteOk && adDescOk && socialOk && fileOk;
  }

  touch(field: string) {
    this.touched[field] = true;
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.cdr.markForCheck();
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.handleFileSelect(file);
    this.cdr.markForCheck();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.handleFileSelect(file);
  }

  handleFileSelect(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.selectedFile = null;
      this.previewUrl = null;
      this.fileError = 'Invalid file format';
      this.cdr.markForCheck();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.selectedFile = null;
      this.previewUrl = null;
      this.fileError = 'File is too large. Maximum size is 5MB.';
      this.cdr.markForCheck();
      return;
    }
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.selectedFile = file;
    this.fileError = null;
    this.previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    this.cdr.markForCheck();
  }

  removeFile(e: Event): void {
    e.stopPropagation();
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.selectedFile = null;
    this.previewUrl = null;
    this.fileError = null;
    this.cdr.markForCheck();
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid || this.sending) return;
    this.sending = true;
    this.sendError = null;
    this.cdr.markForCheck();

    try {
      const payload = new FormData();
      payload.append('name', this.form.name.trim());
      payload.append('email', this.form.email.trim());
      payload.append('phone', this.form.phone.trim());
      payload.append('adDescription', this.form.adDescription.trim());
      if (this.form.website.trim()) payload.append('website', this.form.website.trim());
      if (this.form.socialMedia.trim()) payload.append('socialMedia', this.form.socialMedia.trim());
      if (this.selectedFile) payload.append('ad_banner', this.selectedFile, this.selectedFile.name);

      const response = await fetch(`${environment.apiUrl.replace(/\/$/, '')}/public/request-ad-register`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload,
      });

      if (!response.ok) throw new Error('Failed to send');
      this.submitted = true;
      window.scrollTo(0, 0);
    } catch {
      this.sendError = 'Something went wrong. Please try again.';
    } finally {
      this.sending = false;
      this.cdr.markForCheck();
    }
  }

  goBack(): void {
    this.submitted = false;
    this.form = { name: '', email: '', phone: '', website: '', socialMedia: '', adDescription: '' };
    this.touched = {};
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.selectedFile = null;
    this.previewUrl = null;
    this.fileError = null;
    this.sendError = null;
    window.scrollTo(0, 0);
    this.cdr.markForCheck();
  }
}
