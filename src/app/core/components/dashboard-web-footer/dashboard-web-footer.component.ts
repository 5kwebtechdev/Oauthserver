import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Capacitor } from '@capacitor/core';
import { APP_STORE_URL } from '../../constants/external-links';

interface FooterLink {
  label: string;
  routerLink?: string;
  queryParams?: Record<string, string>;
  href?: string;
  /** First-party website pages should remain in the current tab. */
  sameTab?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface TrustFeature {
  title: string;
  subtitle?: string;
  icon: string;
}

@Component({
  selector: 'dashboard-web-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-web-footer.component.html',
  styleUrls: ['./dashboard-web-footer.component.scss'],
})
export class DashboardWebFooterComponent implements OnInit {
  readonly isWebBrowser = !Capacitor.isNativePlatform();
  readonly currentYear = new Date().getFullYear();
  readonly assetRoot = 'assets/Landing/figma-logged-in-footer';
  readonly logoSrc = `${this.assetRoot}/superme-logo.png`;
  readonly googlePlaySrc =
    'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';
  readonly appleStoreSrc = `${this.assetRoot}/store-apple.svg`;
  readonly desktopStoreSrc = `${this.assetRoot}/store-desktop.svg`;
  readonly qrSrc = `${this.assetRoot}/download-qr.png`;
  readonly trustedShieldSrc = `${this.assetRoot}/trusted-shield.png`;
  readonly featureDividerSrc = `${this.assetRoot}/feature-divider.svg`;

  readonly googlePlayUrl =
    'https://play.google.com/store/apps/details?id=io.ionic.starter';
  readonly appleStoreUrl = APP_STORE_URL;
  readonly websiteUrl = 'https://supermeapp.com';
  isParent = false;

  readonly socialLinks = [
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/SuperMeAppOfficial',
      icon: `${this.assetRoot}/social-facebook.svg`,
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/supermeappofficial',
      icon: `${this.assetRoot}/social-instagram.svg`,
    },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@SuperMeApp',
      icon: `${this.assetRoot}/social-youtube.svg`,
    },
    {
      label: 'X',
      href: 'https://x.com/GetSuperMeApp',
      icon: `${this.assetRoot}/social-x.svg`,
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/supermeapp',
      icon: `${this.assetRoot}/social-linkedin.svg`,
    },
  ];

  readonly companySection: FooterSection = {
    title: 'ABOUT SUPERMEAPP',
    links: [
      { label: 'About Us', href: 'https://supermeapp.com/about', sameTab: true },
      { label: 'Meet the team', href: 'https://supermeapp.com/about#team', sameTab: true },
    ],
  };

  readonly supportSection: FooterSection = {
    title: 'SUPPORT',
    links: [
      { label: "FAQ's", routerLink: '/authed/help-support' },
      { label: 'Contact Us', routerLink: '/authed/bot-helpline' },
    ],
  };

  readonly footerSections: FooterSection[] = [
    {
      title: 'SHOP',
      links: [
        { label: 'School Uniforms', routerLink: '/authed/school-store' },
        { label: 'Textbook', routerLink: '/authed/school-store' },
        { label: 'Stationery', routerLink: '/authed/school-store' },
        { label: 'Entrance Exam Books', routerLink: '/authed/school-store' },
        { label: 'General Books', routerLink: '/authed/school-store' },
      ],
    },
    {
      title: 'EDUHUB',
      links: [
        { label: 'Find a Tutor', routerLink: '/authed/tutors' },
        { label: 'Find an Academy', routerLink: '/authed/academies' },
        { label: 'Find a Stationery Shop', routerLink: '/authed/education/shops', queryParams: { label: 'Stationery' } },
        { label: 'Find a Book Store', routerLink: '/authed/education/shops', queryParams: { label: 'Book Store' } },
        { label: 'Find a Second-hand Book', routerLink: '/authed/second-hand-books' },
        { label: 'Find a Sports Shop', routerLink: '/authed/education/shops', queryParams: { label: 'Sports' } },
        { label: 'Find a Counselor', routerLink: '/authed/counselors' },
        { label: 'Find an Event', routerLink: '/authed/education/events' },
        { label: 'Find a Workshop', routerLink: '/authed/education/workshops' },
      ],
    },
    {
      title: 'GET LISTED',
      links: [
        { label: 'Become a Tutor', href: 'https://supermeapp.com/become-a-tutor', sameTab: true },
        { label: 'List your Business', href: 'https://supermeapp.com/submit-an-ad', sameTab: true },
        { label: 'Advertise your Event/Workshop', href: 'https://supermeapp.com/submit-an-ad', sameTab: true },
        { label: 'Advertise with Us', href: 'https://supermeapp.com/submit-an-ad', sameTab: true },
      ],
    },
  ];

  get visibleFooterSections(): FooterSection[] {
    return this.footerSections;
  }

  readonly trustFeatures: TrustFeature[] = [
    {
      title: 'Age‑Appropriate Content',
      icon: `${this.assetRoot}/trust-age.svg`,
    },
    { title: 'Privacy First', icon: `${this.assetRoot}/trust-privacy.svg` },
    {
      title: 'Secure & Safe environment',
      icon: `${this.assetRoot}/trust-secure.svg`,
    },
    {
      title: 'No Ads',
      subtitle: 'For Kids',
      icon: `${this.assetRoot}/trust-no-ads.svg`,
    },
  ];

  readonly legalLinks: FooterLink[] = [
    {
      label: 'Privacy Policy',
      routerLink: '/authed/our-policies',
      queryParams: { tab: 'privacy' },
    },
    {
      label: 'Terms of Use',
      routerLink: '/authed/our-policies',
      queryParams: { tab: 'terms' },
    },
    { label: 'Child Safety', href: 'https://supermeapp.com/child-safety' },
    {
      label: 'Refund & Cancellation',
      routerLink: '/authed/our-policies',
      queryParams: { tab: 'refund' },
    },
  ];

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.isParent = this.authService.isParentUser();
  }
}
