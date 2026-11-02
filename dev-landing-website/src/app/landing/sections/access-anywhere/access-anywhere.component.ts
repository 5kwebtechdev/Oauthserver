import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReferralService } from '../../../core/services/referral.service';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';
import { APP_STORE_URL } from '../../../core/constants/external-links';

interface AccessOption {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
  external: boolean;
}

@Component({
  selector: 'app-access-anywhere-section',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-anywhere.component.html',
  styleUrls: ['./access-anywhere.component.scss'],
})
export class AccessAnywhereSectionComponent {
  private readonly referralService = inject(ReferralService);
  private readonly assetRoot = 'assets/Landing/figma-logged-out';

  readonly options: AccessOption[] = [
    {
      eyebrow: 'WEB APP',
      title: 'Continue on Desktop',
      description: 'Open SuperMeApp securely in your browser.',
      href: `${environment.mobileAppUrl.replace(/\/$/, '')}/login`,
      icon: `${this.assetRoot}/store-desktop.svg`,
      iconWidth: 28,
      iconHeight: 25,
      external: true,
    },
    {
      eyebrow: 'ANDROID',
      title: 'Get it on Google Play',
      description: 'Build habits and grow wherever you go.',
      href: this.referralService.getGooglePlayUrl(),
      icon: 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png',
      iconWidth: 876,
      iconHeight: 980,
      external: true,
    },
    {
      eyebrow: 'IOS',
      title: 'Download on App Store',
      description: 'Take your progress with you on iPhone and iPad.',
      href: APP_STORE_URL,
      icon: `${this.assetRoot}/store-apple.svg`,
      iconWidth: 26,
      iconHeight: 32,
      external: true,
    },
  ];
}
