import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomToastService } from '../../services/custom-toast.service';

interface FooterLink {
  label: string;
  link?: string;
  queryParams?: Record<string, string>;
  href?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'dashboard-web-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-web-footer.component.html',
  styleUrls: ['./dashboard-web-footer.component.scss']
})
export class DashboardWebFooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=com.superme.app';

  readonly logoSrc = 'assets/Landing/SuperMe Logo Final.png';
  readonly googlePlaySrc = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';
  readonly qrSrc = 'assets/Landing/2f248945e515f53a46e556ed5d49f6415934d59a.png';

  readonly socialLinks = [
    { name: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/SuperMeAppOfficial' },
    { name: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/supermeappofficial' },
    { name: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@SuperMeApp' },
    { name: 'x', label: 'X', url: 'https://x.com/GetSuperMeApp' }
  ];

  readonly columns: FooterColumn[] = [
    {
      title: 'TUTOR',
      links: [
        { label: 'Find a Tutor', link: '/authed/tutors' },
        { label: 'Become a Tutor', href: 'https://supermeapp.com/become-a-tutor' },
        { label: 'Submit an Ad', href: 'https://supermeapp.com/advertise' }
      ]
    },
    {
      title: 'COMPANY',
      links: [
        { label: 'About Us', href: 'https://supermeapp.com/about' },
        { label: 'Child Safety', href: 'https://supermeapp.com/child-safety' }
      ]
    },
    {
      title: 'SUPPORT',
      links: [
        { label: "FAQ's", link: '/authed/help-support' },
        { label: 'Contact Us', link: '/authed/bot-helpline' }
      ]
    },
    {
      title: 'LEGAL',
      links: [
        { label: 'Privacy Policy', link: '/authed/our-policies', queryParams: { tab: 'privacy' } },
        { label: 'Terms of Use', link: '/authed/our-policies', queryParams: { tab: 'terms' } }
      ]
    }
  ];

  constructor(private toastService: CustomToastService) {}

  notifyIosComingSoon(): void {
    this.toastService.show('SuperMe for iOS is coming soon!', 'info');
  }
}
