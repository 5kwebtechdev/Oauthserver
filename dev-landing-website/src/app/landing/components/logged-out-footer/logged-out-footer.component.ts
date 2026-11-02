import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ReferralService } from '../../../core/services/referral.service';
import { environment } from '../../../../environments/environment';
import { APP_STORE_URL } from '../../../core/constants/external-links';

interface FooterLink {
  label: string;
  href: string;
  fragment?: string;
  state?: Record<string, unknown>;
}

interface FooterSection {
  title: string;
  items: FooterLink[];
}

const ABOUT_SECTION: FooterSection = {
  title: 'ABOUT SUPERMEAPP',
  items: [
    { label: 'About Us', href: '/about' },
  ],
};

const COMPANY_SECTION: FooterSection = {
  title: 'COMPANY',
  items: [
    { label: 'About Us', href: '/about' },
  ],
};

const SUPPORT_SECTION: FooterSection = {
  title: 'SUPPORT',
  items: [
    { label: "FAQ's", href: '/faq' },
    { label: 'Contact Us', href: '/contact-us' },
  ],
};

const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'SHOP',
    items: [
      { label: 'School Uniforms', href: '/school-uniforms' },
      { label: 'Textbook', href: '/find-a-book-store' },
      { label: 'Stationery', href: '/stationery' },
      { label: 'Entrance Exam Books', href: '/entrance-exam-books' },
      { label: 'General Books', href: '/general-books' },
    ],
  },
  {
    title: 'GET LISTED',
    items: [
      { label: 'Become a Tutor', href: '/become-a-tutor' },
      { label: 'List your Business', href: '/advertise-with-us' },
      { label: 'Advertise your Event/Workshop', href: '/advertise-your-event' },
      { label: 'Advertise with Us', href: '/advertise-with-us' },
    ],
  },
  {
    title: 'EDUHUB',
    items: [
      { label: 'Find a Tutor', href: '/find-a-tutor' },
      { label: 'Find an Academy', href: '/find-an-academy' },
      { label: 'Find a Stationery Shop', href: '/find-a-stationery-shop' },
      { label: 'Find a Book Store', href: '/find-a-book-store' },
      { label: 'Find a Second-hand Book', href: '/find-second-hand-book' },
      { label: 'Find a Sports Shop', href: '/find-a-sport-shop' },
      { label: 'Find a Counselor', href: '/find-a-counselor' },
      { label: 'Find Events / Workshops', href: '/find-events' },
      { label: 'Find PG / Hostel', href: '/find-pg-hostel' },
    ],
  },
];

const LOGGED_IN_FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Learning',
    items: [
      { label: 'Quiz', href: '/home/content', state: { type: 'quiz' } },
      { label: 'Puzzles', href: '/home/content', state: { type: 'puzzle' } },
      { label: 'Articles', href: '/home/content', state: { type: 'article' } },
      { label: 'MasterClass', href: '/home/content', state: { type: 'masterclass' } },
    ],
  },
  {
    title: 'Quick Links',
    items: [
      { label: 'Notes', href: '/home/notes' },
      { label: 'EduHub', href: '/home/education' },
      { label: 'Find a Tutor', href: '/tutors' },
      { label: 'Become a Tutor', href: '/become-a-tutor' },
      { label: 'Submit an ad / event', href: '/advertise-your-event' },
    ],
  },
  {
    title: 'Shop',
    items: [
      { label: 'Books', href: '/find-a-book-store' },
      { label: 'Uniforms', href: '/school-uniforms' },
      { label: 'Stationery', href: '/stationery' },
      { label: 'Accessories', href: '/find-a-sport-shop' },
    ],
  },
];

const PARENT_LOGGED_IN_FOOTER_SECTIONS: FooterSection[] = FOOTER_SECTIONS.map((section) => ({
  ...section,
  title:
    section.title === 'SHOP'
      ? 'Shop'
      : section.title === 'GET LISTED'
        ? 'Get Listed'
        : section.title === 'EDUHUB'
          ? 'EduHub'
          : section.title,
}));

@Component({
  selector: 'app-logged-out-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logged-out-footer.component.html',
  styleUrls: ['./logged-out-footer.component.scss'],
})
export class LoggedOutFooterComponent implements OnInit, OnDestroy {
  @Input() variant: 'logged-out' | 'logged-in' | 'logged-in-parent' = 'logged-out';

  private readonly referralService = inject(ReferralService);
  private readonly assetRoot = 'assets/Landing/figma-logged-out';

  readonly supportSection = SUPPORT_SECTION;
  readonly googlePlayUrl = this.referralService.getGooglePlayUrl();
  readonly appleStoreUrl = APP_STORE_URL;
  readonly desktopAppUrl = environment.mobileAppUrl;

  readonly logoSrc = `${this.assetRoot}/superme-logo.png`;
  readonly googlePlaySrc = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';
  readonly appleStoreSrc = `${this.assetRoot}/store-apple.svg`;
  readonly desktopStoreSrc = `${this.assetRoot}/store-desktop.svg`;
  readonly qrSrc = 'assets/download-app-qr.svg';
  readonly trustedShieldSrc = `${this.assetRoot}/trusted-shield.webp`;
  readonly ageAppropriateSrc = `${this.assetRoot}/trust-age.svg`;
  readonly privacyFirstSrc = `${this.assetRoot}/trust-privacy.svg`;
  readonly secureSafeSrc = `${this.assetRoot}/trust-secure.svg`;
  readonly featureDividerSrc = `${this.assetRoot}/feature-divider.svg`;

  readonly socialLinks = [
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/SuperMeAppOfficial',
      icon: `${this.assetRoot}/social-facebook.svg`,
      iconWidth: 24,
      iconHeight: 24,
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/supermeappofficial',
      icon: `${this.assetRoot}/social-instagram.svg`,
      iconWidth: 24,
      iconHeight: 24,
    },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@SuperMeApp',
      icon: `${this.assetRoot}/social-youtube.svg`,
      iconWidth: 24,
      iconHeight: 17,
    },
    {
      label: 'X',
      href: 'https://x.com/GetSuperMeApp',
      icon: `${this.assetRoot}/social-x.svg`,
      iconWidth: 24,
      iconHeight: 24,
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/supermeapp',
      icon: `${this.assetRoot}/social-linkedin.svg`,
      iconWidth: 24,
      iconHeight: 24,
    },
  ];

  private readonly loggedOutTrustFeatures = [
    { title: 'Age Appropriate', subtitle: 'Content', icon: this.ageAppropriateSrc },
    { title: 'Privacy', subtitle: 'First', icon: this.privacyFirstSrc },
    { title: 'Secure & Safe', subtitle: 'Environment', icon: this.secureSafeSrc },
  ];

  private readonly loggedInTrustFeatures = [
    { title: 'Age‑Appropriate Content', subtitle: '', icon: this.ageAppropriateSrc },
    { title: 'Privacy first', subtitle: '', icon: this.privacyFirstSrc },
    { title: 'Secure & safe environment', subtitle: '', icon: this.secureSafeSrc },
  ];

  readonly legalLinks: FooterLink[] = [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Terms of Use', href: '/terms-of-use' },
    { label: 'Child Safety', href: '/child-safety' },
    { label: 'Refund & Cancellation', href: '/refund-cancellation' },
  ];

  currentPath = '';
  showScrollToTop = false;
  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  get isLoggedInVariant(): boolean {
    return this.variant === 'logged-in' || this.variant === 'logged-in-parent';
  }

  get isParentVariant(): boolean {
    return this.variant === 'logged-in-parent';
  }

  get footerSections(): FooterSection[] {
    if (this.isParentVariant) return PARENT_LOGGED_IN_FOOTER_SECTIONS;
    return this.isLoggedInVariant ? LOGGED_IN_FOOTER_SECTIONS : FOOTER_SECTIONS;
  }

  get aboutSection(): FooterSection {
    return this.isLoggedInVariant ? COMPANY_SECTION : ABOUT_SECTION;
  }

  get trustFeatures(): { title: string; subtitle: string; icon: string }[] {
    return this.isLoggedInVariant ? this.loggedInTrustFeatures : this.loggedOutTrustFeatures;
  }

  get trustTitle(): string {
    return this.isLoggedInVariant
      ? 'Trusted by parents and teachers'
      : 'Trusted By Parents And Teachers';
  }

  get trustSubtitle(): string {
    return this.isLoggedInVariant
      ? 'Designed with love. Built with responsibility.'
      : 'Designed With Love. Built With Responsibility.';
  }

  ngOnInit(): void {
    this.currentPath = this.router.url;
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPath = event.urlAfterRedirects;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  isActiveLink(href: string): boolean {
    return this.currentPath.split(/[?#]/)[0] === href.split(/[?#]/)[0];
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const shouldShow = window.scrollY > 560;
    if (this.showScrollToTop === shouldShow) return;
    this.showScrollToTop = shouldShow;
    this.cdr.markForCheck();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
