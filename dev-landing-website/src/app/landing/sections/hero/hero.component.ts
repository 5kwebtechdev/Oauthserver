import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import svgPaths from '../../imports/svg-qkqaxwapz4';
import mobileBlobPaths from '../../imports/svg-qyz3id1pem';
import { ReferralService } from '../../../core/services/referral.service';
import { APP_STORE_URL } from '../../../core/constants/external-links';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
})
export class HeroSectionComponent {
  private referralService = inject(ReferralService);
  // Images
  imgHabit = 'assets/Landing/8fb8ab030b8e258f6eee7e1484e62edf3cd86e49.webp';
  imgTimeManagement = 'assets/Landing/ffa0cf404a4be44b7ccba080407e27086fbc60d0.webp';
  imgGooglePlay = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';
  imgTasks = 'assets/Landing/2658f208bf7474b768fe521f23e7aa2c7605a75f.webp';
  imgLearnings = 'assets/Landing/f4ccaff3fab394f004424033966deefe13cc8f00.webp';

  // SVG blob paths
  bgClipPath = svgPaths.p3e47e600;
  blueBlob = svgPaths.p182be400;
  pinkBlob = svgPaths.p12b14c00;
  greenBlob = svgPaths.p4ed3400;
  orangeBlob = svgPaths.p14812700;

  // Mobile blobs
  mobileBlueBlob = mobileBlobPaths.p3aebb270;
  mobilePinkBlob = mobileBlobPaths.p1e584e00;
  mobileGreenBlob = mobileBlobPaths.p28b75640;
  mobileOrangeBlob = mobileBlobPaths.p3dd6e380;

  // Apple SVG path
  applePath = svgPaths.p3c665500;

  gradientButton = 'linear-gradient(-87.4deg, rgb(144, 33, 77) 0%, rgb(205, 53, 120) 99.928%)';
  gradientText = 'linear-gradient(90deg, rgb(139,141,203) 0%, rgb(137,179,182) 33%, rgb(225,82,124) 66%, rgb(246,172,114) 100%)';
  googlePlayUrl = this.referralService.getGooglePlayUrl();
  appStoreUrl = APP_STORE_URL;
}
