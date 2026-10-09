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
  readonly logoSrc = `${this.assetRoot}/superme-logo.webp`;
  readonly googlePlaySrc =
    'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.webp';
  readonly appleStoreSrc = `${this.assetRoot}/store-apple.svg`;
  readonly desktopStoreSrc = `${this.assetRoot}/store-desktop.svg`;
  readonly qrSrc = 'assets/download-app-qr.svg';
  readonly trustedShieldSrc = `${this.assetRoot}/trusted-shield.webp`;
  readonly featureDividerSrc = `${this.assetRoot}/feature-divider.svg`;

  readonly googlePlayUrl =
    'https://play.google.com/store/apps/details?id=com.superme.app';
  readonly appleStoreUrl = APP_STORE_URL;
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
      { label: 'About Us', href: 'https://supermeapp.com/about' },
      { label: 'Meet the team', href: 'https://supermeapp.com/about#team' },
    ],
  };

  readonly supportSection: FooterSection = {
    title: 'SUPPORT',
    links: [
      { label: "FAQ's", routerLink: '/help-support' },
      { label: 'Contact Us', routerLink: '/bot-helpline' },
    ],
  };

  readonly footerSections: FooterSection[] = [
    {
      title: 'SHOP',
      links: [
        { label: 'School Uniforms', href: '/shop/uniforms', sameTab: true },
        { label: 'Textbook', href: '/shop/school-books', sameTab: true },
        { label: 'Stationery', href: '/shop/stationery', sameTab: true },
        { label: 'Entrance Exam Books', href: '/shop/books/competitive-exams', sameTab: true },
        { label: 'General Books', href: '/shop/books/story-books', sameTab: true },
      ],
    },
    {
      title: 'EDUHUB',
      links: [
        { label: 'Find a Tutor', routerLink: '/find-a-tutor' },
        { label: 'Find an Academy', routerLink: '/academies' },
        { label: 'Find a Stationery Shop', routerLink: '/stationery-shop' },
        { label: 'Find a Book Store', routerLink: '/book-store' },
        { label: 'Find a Second-hand Book', routerLink: '/second-hand-books' },
        { label: 'Find a Sports Shop', routerLink: '/sports-shop' },
        { label: 'Find a Counselor', routerLink: '/counselor' },
        { label: 'Find an Event', routerLink: '/event' },
        { label: 'Find a Workshop', routerLink: '/workshops' },
      ],
    },
    {
      title: 'GET LISTED',
      links: [
        { label: 'Become a Tutor', href: 'https://supermeapp.com/become-a-tutor' },
        { label: 'List your Business', href: 'https://supermeapp.com/submit-an-ad' },
        { label: 'Advertise your Event/Workshop', href: 'https://supermeapp.com/submit-an-ad' },
        { label: 'Advertise with Us', href: 'https://supermeapp.com/submit-an-ad' },
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
  ];

  readonly legalLinks: FooterLink[] = [
    {
      label: 'Privacy Policy',
      routerLink: '/our-policies',
      queryParams: { tab: 'privacy' },
    },
    {
      label: 'Terms of Use',
      href: 'https://supermeapp.com/terms-of-use',
      sameTab: true,
    },
    { label: 'Child Safety', routerLink: '/privacy-policy' },
    {
      label: 'Refund & Cancellation',
      routerLink: '/our-policies',
      queryParams: { tab: 'refund' },
    },
  ];

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.isParent = this.authService.isParentUser();
  }
}
