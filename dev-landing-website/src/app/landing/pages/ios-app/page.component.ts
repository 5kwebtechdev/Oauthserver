import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PublicNavbarComponent } from '../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../components/common-footer/common-footer.component';
import { environment } from '../../../../environments/environment';
import { APP_STORE_URL } from '../../../core/constants/external-links';

@Component({
  selector: 'app-ios-app-fallback-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PublicNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
})
export class IosAppFallbackPageComponent implements OnInit {
  readonly assetRoot = 'assets/Landing/ios-fallback';
  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  isSubmitting = false;
  notificationMessage = '';
  notificationError = '';

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    window.location.replace(APP_STORE_URL);
  }

  notifyMe(): void {
    if (this.isSubmitting) return;

    if (this.emailControl.invalid) {
      this.emailControl.markAsTouched();
      return;
    }

    const email = this.emailControl.value.trim();
    this.isSubmitting = true;
    this.notificationMessage = '';
    this.notificationError = '';

    this.http
      .post(`${environment.apiUrl}/contact`, {
        name: 'App Store launch notification',
        email,
        message:
          'Please notify me when the SuperMeApp becomes available to download from the Apple App Store.',
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notificationMessage = 'You’re on the list! We’ll let you know when the iOS app launches.';
          this.emailControl.reset();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSubmitting = false;
          this.notificationError = 'We couldn’t save your email right now. Please try again.';
          this.cdr.markForCheck();
        },
      });
  }
}
