import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ReferralService } from '../../../core/services/referral.service';
import { AuthService } from '../../../core/services/auth.service';

import svgPaths from '../../imports/svg-4oq16jk07d';
import svgPathsMobile from '../../imports/svg-jrog29xzrm';

interface FooterColumn {
  title: string;
  items: { label: string; href: string }[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'TUTOR',
    items: [
      { label: 'Find a Tutor', href: '/find-a-tutor' },
      { label: 'Become a Tutor', href: '/become-a-tutor' },
      { label: 'Submit an Ad', href: '/advertise-with-us' },
    ],
  },
  {
    title: 'COMPANY',
    items: [
      { label: 'About Us', href: '/about' },
      { label: 'Child Safety', href: '/child-safety' },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { label: "FAQ's", href: '/faq' },
      { label: 'Contact Us', href: '/contact-us' },
    ],
  },
  {
    title: 'LEGAL',
    items: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'Terms of Use', href: '/terms-of-use' },
    ],
  },
];

// SVG paths for social icons
const FB_PATH_D = svgPaths.p2dd1bd00;
const FB_PATH_D2 = svgPaths.p82b9d00;
const IG_PATH = svgPaths.p16b3fc00;
const YT_PATH1 = svgPaths.p21f2fc00;
const YT_PATH2 = svgPaths.p3e045ec0;
const YT_PATH3 = svgPaths.p194ac400;
const X_PATH = svgPaths.p3882a280;
const APPLE_CLIP_PATH = svgPaths.p2e129580;

const FB_PATH_M = svgPathsMobile.pb48e100;
const FB_PATH_M2 = svgPathsMobile.p1b59e500;
const IG_PATH_M = svgPathsMobile.p1a15adb2;
const YT_PATH_M1 = svgPathsMobile.p4294680;
const YT_PATH_M2 = svgPathsMobile.p1167a880;
const YT_PATH_M3 = svgPathsMobile.p3fee4f80;
const X_PATH_M = svgPathsMobile.p8fb79a0;
const APPLE_PATH_M = svgPathsMobile.p2b65e000;

const X_MASK_24 = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20id%3D%22clip0_84_15698%22%3E%3Cpath%20id%3D%22Vector%22%20d%3D%22M24%200H0V24H24V0Z%22%20fill%3D%22var(--fill-0%2C%20black)%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E%0A";
const X_MASK_20 = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20id%3D%22clip0_84_15698%22%3E%3Cpath%20id%3D%22Vector%22%20d%3D%22M20%200H0V20H20V0Z%22%20fill%3D%22var(--fill-0%2C%20black)%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E%0A";

@Component({
  selector: 'app-legacy-common-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legacy-common-footer.component.html',
})
export class LegacyCommonFooterComponent implements OnInit, OnDestroy {
  private referralService = inject(ReferralService);
  private authService = inject(AuthService);
  footerColumns: FooterColumn[] = [];
  currentPath = '';
  googlePlayUrl = this.referralService.getGooglePlayUrl();

  logoSrc = 'assets/Landing/SuperMe Logo Final.png';
  googlePlaySrc = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';
  qrSrc = 'assets/download-app-qr.svg';

  gradientButton = 'linear-gradient(-85.76deg, rgb(144, 33, 77) 0%, rgb(205, 53, 120) 99.93%)';
  gradientBorderImage = 'linear-gradient(90deg, #8B8DCB 0%, #89B3B6 25%, #E1527C 50%, #F6AC72 100%) 1';

  // SVG paths
  fbPathD = FB_PATH_D;
  fbPathD2 = FB_PATH_D2;
  igPath = IG_PATH;
  ytPath1 = YT_PATH1;
  ytPath2 = YT_PATH2;
  ytPath3 = YT_PATH3;
  xPath = X_PATH;
  applePath = APPLE_CLIP_PATH;
  fbPathM = FB_PATH_M;
  fbPathM2 = FB_PATH_M2;
  igPathM = IG_PATH_M;
  ytPathM1 = YT_PATH_M1;
  ytPathM2 = YT_PATH_M2;
  ytPathM3 = YT_PATH_M3;
  xPathM = X_PATH_M;
  applePathM = APPLE_PATH_M;
  xMask24 = X_MASK_24;
  xMask20 = X_MASK_20;

  private routerSub!: Subscription;
  private authSub!: Subscription;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.currentPath = this.router.url;
    this.syncFooterLinks();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentPath = e.url;
        this.cdr.markForCheck();
      });
    this.authSub = this.authService.isAuthenticated$.subscribe(() => {
      this.syncFooterLinks();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.authSub?.unsubscribe();
  }

  isActiveLink(href: string): boolean {
    if (href === '#') return false;
    const currentBasePath = this.currentPath.split(/[?#]/)[0];
    return currentBasePath === href;
  }

  s(min: number, base: number): string {
    return `clamp(${min}px, ${(base / 14.4).toFixed(3)}vw, ${base}px)`;
  }

  private syncFooterLinks(): void {
    const findTutorHref = this.authService.isLoggedIn() ? '/tutors' : '/find-a-tutor';
    this.footerColumns = FOOTER_COLUMNS.map(column => ({
      ...column,
      items: column.items.map(item => ({
        ...item,
        href: item.label === 'Find a Tutor' ? findTutorHref : item.href,
      })),
    }));
  }

  getXMaskStyle24(): any {
    return {
      'mask-image': `url('${this.xMask24}')`,
      'mask-size': '100% 100%',
      '-webkit-mask-image': `url('${this.xMask24}')`,
      '-webkit-mask-size': '100% 100%',
    };
  }

  getXMaskStyle20(): any {
    return {
      'mask-image': `url('${this.xMask20}')`,
      'mask-size': '20px 20px',
      '-webkit-mask-image': `url('${this.xMask20}')`,
      '-webkit-mask-size': '20px 20px',
    };
  }
}
