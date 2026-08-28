import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface WebNavLink {
  label: string;
  link: string;
  queryParams?: Record<string, string>;
}

interface WebNavItem {
  label: string;
  link?: string;
  children?: WebNavLink[];
}

const CHILD_SELF_NAV_ITEMS: WebNavItem[] = [
  {
    label: 'Learning',
    link: '/authed/content',
    children: [
      { label: 'Quiz', link: '/authed/content', queryParams: { type: 'QUIZ' } },
      { label: 'Puzzle', link: '/authed/content', queryParams: { type: 'PUZZLE' } },
      { label: 'Article', link: '/authed/content', queryParams: { type: 'ARTICLE' } },
      { label: 'Master Class', link: '/authed/content', queryParams: { type: 'MASTERCLASS' } },
      { label: 'Reels', link: '/authed/reels' },
    ],
  },
  {
    label: 'Quick Tools',
    link: '/authed/activity-page',
    children: [
      { label: 'Journal', link: '/authed/journal-input' },
      { label: 'Notes', link: '/authed/notes' },
      { label: 'Calendar', link: '/authed/activity-calendar' },
    ],
  },
  {
    label: 'EduHub Listings',
    link: '/authed/education',
    children: [
      { label: 'Tutor', link: '/authed/tutors' },
      { label: 'Academy', link: '/authed/academies' },
      { label: 'Stationery Shop', link: '/authed/education/shops', queryParams: { label: 'Stationery' } },
      { label: 'Book Store', link: '/authed/education/shops', queryParams: { label: 'Book Store' } },
      { label: 'Second-hand Book', link: '/authed/second-hand-books' },
      { label: 'Sports Shop', link: '/authed/education/shops', queryParams: { label: 'Sports' } },
      { label: 'Counselors', link: '/authed/counselors' },
      { label: 'Events', link: '/authed/education/events' },
      { label: 'Workshops', link: '/authed/education/workshops' },
    ],
  },
  {
    label: 'Shop',
    link: '/authed/school-store',
    children: [
      { label: 'School Uniforms', link: '/authed/school-store', queryParams: { category: 'School Uniforms' } },
      { label: 'Textbook', link: '/authed/school-store', queryParams: { category: 'Textbook' } },
      { label: 'Stationery', link: '/authed/school-store', queryParams: { category: 'Stationery' } },
      { label: 'Entrance Exam Books', link: '/authed/school-store', queryParams: { category: 'Entrance Exam Books' } },
      { label: 'General Books', link: '/authed/school-store', queryParams: { category: 'General Books' } },
    ],
  },
  { label: 'Insights', link: '/authed/analytics' },
];

const PARENT_NAV_ITEMS: WebNavItem[] = [
  {
    label: 'Parenting',
    link: '/authed/parent-learning',
    children: [
      { label: 'Blogs', link: '/authed/content', queryParams: { type: 'ARTICLE' } },
      { label: 'Quizzes', link: '/authed/content', queryParams: { type: 'QUIZ' } },
    ],
  },
  {
    label: 'Shop',
    link: '/authed/school-store',
    children: [
      { label: 'School Uniforms', link: '/authed/school-store', queryParams: { category: 'School Uniforms' } },
      { label: 'Textbook', link: '/authed/school-store', queryParams: { category: 'Textbook' } },
      { label: 'Stationery', link: '/authed/school-store', queryParams: { category: 'Stationery' } },
      { label: 'Entrance Exam Books', link: '/authed/school-store', queryParams: { category: 'Entrance Exam Books' } },
      { label: 'General Books', link: '/authed/school-store', queryParams: { category: 'General Books' } },
    ],
  },
  {
    label: 'EduHub Listings',
    link: '/authed/education',
    children: [
      { label: 'Tutor', link: '/authed/tutors' },
      { label: 'Academy', link: '/authed/academies' },
      { label: 'Stationery Shop', link: '/authed/education/shops', queryParams: { label: 'Stationery' } },
      { label: 'Book Store', link: '/authed/education/shops', queryParams: { label: 'Book Store' } },
      { label: 'Second-hand Book', link: '/authed/second-hand-books' },
      { label: 'Sports Shop', link: '/authed/education/shops', queryParams: { label: 'Sports' } },
      { label: 'Counselors', link: '/authed/counselors' },
      { label: 'Events', link: '/authed/education/events' },
      { label: 'Workshops', link: '/authed/education/workshops' },
    ],
  },
];

@Component({
  selector: 'web-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './web-nav.component.html',
  styleUrls: ['./web-nav.component.scss'],
})
export class WebNavComponent implements OnInit {
  readonly navigationAssetRoot = 'assets/Navigation/figma-logged-in';
  // This wordmark has a tightly cropped transparent canvas. The previous
  // square asset contained substantial empty space, so the logo looked tiny
  // even though its image element was already 48px tall.
  readonly logoSrc = 'assets/Images-Transparent/SuperMeLogoFinal3.png';
  readonly chevronSrc = `${this.navigationAssetRoot}/chevron.svg`;

  isParent = false;
  navItems: WebNavItem[] = CHILD_SELF_NAV_ITEMS;
  openMenu: string | null = null;

  constructor(
    readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isParent = this.authService.isParentUser();
    this.navItems = this.isParent ? PARENT_NAV_ITEMS : CHILD_SELF_NAV_ITEMS;
  }

  get dashboardLink(): string {
    return this.isParent ? '/authed/parent-account' : '/authed/user-dashboard';
  }

  openMenuOn(label: string): void {
    this.openMenu = label;
  }

  toggleMenu(label: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openMenu = this.openMenu === label ? null : label;
  }

  openPrimaryNav(item: WebNavItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!item.link) {
      this.toggleMenu(item.label, event);
      return;
    }

    this.closeMenu();
    void this.router.navigateByUrl(item.link);
  }

  closeMenu(): void {
    this.openMenu = null;
  }

  isNavActive(item: WebNavItem): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    const directMatch = Boolean(
      item.link && (path === item.link || path.startsWith(`${item.link}/`)),
    );
    const childMatch = Boolean(
      item.children?.some(
        (child) => path === child.link || path.startsWith(`${child.link}/`),
      ),
    );
    return directMatch || childMatch;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
