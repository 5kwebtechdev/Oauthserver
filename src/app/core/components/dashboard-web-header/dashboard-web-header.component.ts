import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SkeletonImageComponent } from '../skeleton-image/skeleton-image.component';

interface WebNavLink {
  label: string;
  link?: string;
  href?: string;
}

interface WebNavItem {
  label: string;
  link?: string;
  children?: WebNavLink[];
}

@Component({
  selector: 'dashboard-web-header',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule, SkeletonImageComponent],
  templateUrl: './dashboard-web-header.component.html',
  styleUrls: ['./dashboard-web-header.component.scss']
})
export class DashboardWebHeaderComponent {
  @Input() userName = '';
  @Input() userInitial = '';
  @Input() userAvatarUrl: string | null = null;
  @Input() avatarImageName: string | null = null;
  @Input() coins = 0;
  @Input() streaks = 0;
  @Input() trophies = 0;
  @Input() badges = 0;

  readonly navItems: WebNavItem[] = [
    { label: 'Shop', link: '/authed/school-store' },
    {
      label: 'Learning',
      children: [
        { label: 'Content Library', link: '/authed/content' },
        { label: 'Academy', link: '/authed/academy' },
        { label: 'Education Hub', link: '/authed/education' }
      ]
    },
    {
      label: 'Tutor',
      children: [
        { label: 'Find a Tutor', link: '/authed/tutors' },
        { label: 'Become a Tutor', href: 'https://supermeapp.com/become-a-tutor' }
      ]
    },
    {
      label: 'Calendar',
      children: [
        { label: 'Timetable', link: '/authed/activity-timeline' },
        { label: 'Calendar View', link: '/authed/activity-calendar' }
      ]
    },
    { label: 'Notes', link: '/authed/notes' }
  ];

  openMenu: string | null = null;

  toggleMenu(label: string, event: Event): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === label ? null : label;
  }

  closeMenu(): void {
    this.openMenu = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenu();
  }
}
