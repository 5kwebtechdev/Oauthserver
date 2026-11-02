import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { GOOGLE_PLAY_URL } from '../../../core/constants/external-links';
import { StoreDownloadDialogService } from '../../../core/services/store-download-dialog.service';

const APPLE_PATH =
  'M15.7899 12.685C15.7899 10.7072 16.8313 8.98188 18.3763 8.0681C17.5695 7.04054 16.356 6.11965 15.0182 5.84943C13.194 5.48054 12.1534 6.09476 11.4803 6.34099C10.8071 6.58721 9.91301 6.80854 9.91301 6.80854C9.91301 6.80854 9.01975 6.58721 8.34574 6.34099C7.67344 6.09476 6.63287 5.47965 4.80867 5.84854C2.98446 6.21743 1.39149 7.79699 0.744027 9.20499C-0.504654 11.9223 0.00920651 15.341 0.891334 17.7997C1.77261 20.2592 4.10296 23.6957 5.91004 23.9721C7.19555 24.1685 7.99118 23.2468 9.91301 23.013C11.8349 23.2468 12.6305 24.1685 13.916 23.9721C15.7231 23.6957 18.0534 20.2592 18.9347 17.7997C18.9561 17.7392 18.9784 17.677 18.9998 17.6148C17.1182 16.8308 15.7899 14.9188 15.7899 12.685ZM9.45654 5.39965C9.45654 5.39965 11.2439 5.64588 12.8669 3.73299C14.4898 1.8201 14.0282 0.0103203 14.0282 0.0103203C14.0282 0.0103203 12.2408 -0.235902 10.6179 1.67699C8.99492 3.58988 9.45654 5.39965 9.45654 5.39965Z';

@Component({
  selector: 'app-feature-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-page.component.html',
})
export class FeaturePageComponent {
  private readonly storeDialog = inject(StoreDownloadDialogService);
  readonly googlePlayUrl = GOOGLE_PLAY_URL;
  readonly loginUrl = `${environment.mobileAppUrl.replace(/\/$/, '')}/login`;
  openStoreDialog(): void { this.storeDialog.open(); }
  @Input() title = '';
  @Input() description = '';
  @Input() visualSrc = '';
  @Input() accentColor = '';
  @Input() visualAspectRatio = '752 / 403';
  @Input() badge = '';
  @Input() preCTAText = '';
  @Input() preCTAMobileText = '';
  @Input() relatedHref = '';
  @Input() relatedLabel = '';

  applePath = APPLE_PATH;
  gradientButton = 'linear-gradient(-86deg, rgb(144, 33, 77) 0%, rgb(205, 53, 120) 100%)';
  badgeGradient = 'linear-gradient(90deg, #8B8DCB 0%, #89B3B6 25%, #E1527C 50%, #F6AC72 100%)';
  googlePlaySrc = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';

  getMobileCTAText(): string {
    return this.preCTAMobileText || this.preCTAText;
  }
}
