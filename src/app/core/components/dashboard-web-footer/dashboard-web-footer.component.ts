import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Capacitor } from '@capacitor/core';

interface FooterLink {
  label: string;
  routerLink?: string;
  queryParams?: Record<string, string>;
  href?: string;
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
    title: 'COMPANY',
    links: [
      { label: 'About Us', href: 'https://supermeapp.com/about' },
      { label: 'Meet the team', href: 'https://supermeapp.com/about' },
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
      title: 'LEARNING',
      links: [
        { label: 'Quiz', routerLink: '/authed/content', queryParams: { type: 'QUIZ' } },
        { label: 'Puzzles', routerLink: '/authed/content', queryParams: { type: 'PUZZLE' } },
        { label: 'Articles', routerLink: '/authed/content', queryParams: { type: 'ARTICLE' } },
        { label: 'MasterClass', routerLink: '/authed/content', queryParams: { type: 'MASTERCLASS' } },
      ],
    },
    {
      title: 'QUICK LINKS',
      links: [
        { label: 'Notes', routerLink: '/authed/notes' },
        { label: 'EduHub', routerLink: '/authed/education' },
        { label: 'Find a Tutor', routerLink: '/authed/tutors' },
        { label: 'Become a Tutor', href: 'https://supermeapp.com/become-a-tutor' },
        { label: 'Submit an ad/event', href: 'https://supermeapp.com/submit-an-ad' },
      ],
    },
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
      title: 'GET LISTED',
      links: [
        {
          label: 'Become a Tutor',
          href: 'https://supermeapp.com/become-a-tutor',
        },
        {
          label: 'List your Business',
          href: 'https://supermeapp.com/submit-an-ad',
        },
        {
          label: 'Advertise your Event/Workshop',
          href: 'https://supermeapp.com/submit-an-ad',
        },
        {
          label: 'Advertise with Us',
          href: 'https://supermeapp.com/submit-an-ad',
        },
      ],
    },
    {
      title: 'EDUHUB',
      links: [
        { label: 'Find a Tutor', routerLink: '/authed/tutors' },
        { label: 'Find an Academy', routerLink: '/authed/academies' },
        { label: 'Find a Stationery Shop', routerLink: '/authed/education' },
        { label: 'Find a Book Store', routerLink: '/authed/education' },
        {
          label: 'Find a Second-hand Book',
          routerLink: '/authed/second-hand-books',
        },
        { label: 'Find a Sports Shop', routerLink: '/authed/education' },
        {
          label: 'Find a Counselor',
          routerLink: '/authed/education/counselors',
        },
        { label: 'Find an Event', routerLink: '/authed/education/events' },
        { label: 'Find a Workshop', routerLink: '/authed/education/workshops' },
      ],
    },
  ];

  get visibleFooterSections(): FooterSection[] {
    return this.isParent
      ? this.footerSections.filter((section) => !['LEARNING', 'QUICK LINKS'].includes(section.title))
      : this.footerSections.filter((section) => ['LEARNING', 'QUICK LINKS', 'SHOP'].includes(section.title));
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
