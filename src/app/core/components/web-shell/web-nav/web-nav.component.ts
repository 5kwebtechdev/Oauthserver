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
    link: '/quiz',
    children: [
      { label: 'Quiz', link: '/quiz' },
      { label: 'Puzzle', link: '/puzzle' },
      { label: 'Article', link: '/article' },
      { label: 'Master Class', link: '/master-class' },
      { label: 'Reels', link: '/reels' },
    ],
  },
  {
    label: 'Quick Tools',
    link: '/authed/activity-page',
    children: [
      { label: 'Journal', link: '/journal' },
      { label: 'Notes', link: '/notes' },
      { label: 'Calendar', link: '/productivity-calendar' },
    ],
  },
  {
    label: 'EduHub Listings',
    link: '/authed/education',
    children: [
      { label: 'Tutor', link: '/find-a-tutor' },
      { label: 'Academy', link: '/academy' },
      { label: 'Stationery Shop', link: '/stationery-shop', queryParams: { label: 'Stationery' } },
      { label: 'Book Store', link: '/book-store', queryParams: { label: 'Book Store' } },
      { label: 'Second-hand Book', link: '/second-hand-books' },
      { label: 'Sports Shop', link: '/sports-shop', queryParams: { label: 'Sports' } },
      { label: 'Counselors', link: '/counselor' },
      { label: 'Events', link: '/event' },
      { label: 'Workshops', link: '/authed/education/workshops' },
    ],
  },
  {
    label: 'Shop',
    link: '/shop',
    children: [
      { label: 'School Uniforms', link: '/shop/uniforms' },
      { label: 'Textbook', link: '/shop/school-books' },
      { label: 'Stationery', link: '/shop/stationery' },
      { label: 'Entrance Exam Books', link: '/shop/books/competitive-exams' },
      { label: 'General Books', link: '/shop/books/story-books' },
    ],
  },
  { label: 'Insights', link: '/authed/analytics' },
];

const PARENT_NAV_ITEMS: WebNavItem[] = [
  {
    label: 'Parenting',
    link: '/authed/parent-learning',
    children: [
      { label: 'Blogs', link: '/article' },
      { label: 'Quizzes', link: '/quiz' },
    ],
  },
  {
    label: 'Shop',
    link: '/shop',
    children: [
      { label: 'School Uniforms', link: '/shop/uniforms' },
      { label: 'Textbook', link: '/shop/school-books' },
      { label: 'Stationery', link: '/shop/stationery' },
      { label: 'Entrance Exam Books', link: '/shop/books/competitive-exams' },
      { label: 'General Books', link: '/shop/books/story-books' },
    ],
  },
  {
    label: 'EduHub Listings',
    link: '/authed/education',
    children: [
      { label: 'Tutor', link: '/find-a-tutor' },
      { label: 'Academy', link: '/academy' },
      { label: 'Stationery Shop', link: '/stationery-shop', queryParams: { label: 'Stationery' } },
      { label: 'Book Store', link: '/book-store', queryParams: { label: 'Book Store' } },
      { label: 'Second-hand Book', link: '/second-hand-books' },
      { label: 'Sports Shop', link: '/sports-shop', queryParams: { label: 'Sports' } },
      { label: 'Counselors', link: '/counselor' },
      { label: 'Events', link: '/event' },
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

  goHome(event: Event): void {
    event.preventDefault();
    this.closeMenu();

    // A reel preview can be opened from the dashboard itself. Navigating to
    // the same dashboard URL is ignored by Angular, so explicitly close the
    // active full-screen player before leaving or returning home.
    window.dispatchEvent(new Event('closeReelExpanded'));
    void this.router.navigateByUrl(this.dashboardLink);
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
    if (item.link === '/shop') {
      window.location.assign('/shop');
      return;
    }
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
