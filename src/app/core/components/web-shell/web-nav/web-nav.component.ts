import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
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
    link: '/app/content',
    children: [
      { label: 'Quiz', link: '/app/quiz' },
      { label: 'Puzzle', link: '/app/puzzle' },
      { label: 'Article', link: '/app/article' },
      { label: 'Master Class', link: '/app/master-class' },
      { label: 'Reels', link: '/app/reels' },
    ],
  },
  {
    label: 'Quick Tools',
    link: '/app/activity-page',
    children: [
      { label: 'Journal', link: '/app/journal' },
      { label: 'Notes', link: '/app/notes' },
      { label: 'Calendar', link: '/app/productivity-calendar' },
    ],
  },
  {
    label: 'EduHub Listings',
    link: '/app/education',
    children: [
      { label: 'Tutor', link: '/app/find-a-tutor' },
      { label: 'Academy', link: '/app/academy' },
      { label: 'Stationery Shop', link: '/app/stationery-shop' },
      { label: 'Book Store', link: '/app/book-store' },
      { label: 'Second-hand Book', link: '/app/second-hand-books' },
      { label: 'Sports Shop', link: '/app/sports-shop' },
      { label: 'Counselors', link: '/app/counselor' },
      { label: 'Events', link: '/app/event' },
      { label: 'Workshops', link: '/workshops' },
    ],
  },
  {
    label: 'Shop',
    link: '/app/school-store',
    children: [
      { label: 'School Uniforms', link: '/app/school-uniform' },
      { label: 'Textbook', link: '/app/textbook' },
      { label: 'Stationery', link: '/app/stationery' },
      { label: 'Entrance Exam Books', link: '/app/entrance-exam-books' },
      { label: 'General Books', link: '/app/general-books' },
    ],
  },
  { label: 'Insights', link: '/app/analytics' },
];

const PARENT_NAV_ITEMS: WebNavItem[] = [
  {
    label: 'Parenting',
    link: '/app/parent-learning',
    children: [
      { label: 'Blogs', link: '/app/parent-learning', queryParams: { category: 'blogs' } },
      { label: 'Quizzes', link: '/app/parent-learning', queryParams: { category: 'quizzes' } },
    ],
  },
  {
    label: 'Shop',
    link: '/app/school-store',
    children: [
      { label: 'School Uniforms', link: '/app/school-uniform' },
      { label: 'Textbook', link: '/app/textbook' },
      { label: 'Stationery', link: '/app/stationery' },
      { label: 'Entrance Exam Books', link: '/app/entrance-exam-books' },
      { label: 'General Books', link: '/app/general-books' },
    ],
  },
  {
    label: 'EduHub Listings',
    link: '/app/education',
    children: [
      { label: 'Tutor', link: '/app/find-a-tutor' },
      { label: 'Academy', link: '/app/academy' },
      { label: 'Stationery Shop', link: '/app/stationery-shop' },
      { label: 'Book Store', link: '/app/book-store' },
      { label: 'Second-hand Book', link: '/app/second-hand-books' },
      { label: 'Sports Shop', link: '/app/sports-shop' },
      { label: 'Counselors', link: '/app/counselor' },
      { label: 'Events', link: '/app/event' },
      { label: 'Workshops', link: '/workshops' },
    ],
  },
];

@Component({
  selector: 'web-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './web-nav.component.html',
  styleUrls: ['./web-nav.component.scss'],
})
export class WebNavComponent implements OnInit {
  readonly navigationAssetRoot = 'assets/Navigation/figma-logged-in';
  // This wordmark has a tightly cropped transparent canvas. The previous
  // square asset contained substantial empty space, so the logo looked tiny
  // even though its image element was already 48px tall.
  readonly logoSrc = 'assets/Images-Transparent/SuperMeLogoFinal3.webp';
  readonly chevronSrc = `${this.navigationAssetRoot}/chevron.svg`;

  isParent = false;
  navItems: WebNavItem[] = CHILD_SELF_NAV_ITEMS;
  openMenu: string | null = null;
  @ViewChild('mobileMenu') mobileMenu?: ElementRef<HTMLDialogElement>;

  openMobileMenu(): void {
    this.mobileMenu?.nativeElement.showModal();
  }

  closeMobileMenu(): void {
    this.mobileMenu?.nativeElement.close();
  }

  onMobileMenuBackdropClick(event: MouseEvent): void {
    // Returning false from an Angular click binding cancels native link and
    // summary actions. Only close for the backdrop; let row clicks proceed.
    if (event.target === this.mobileMenu?.nativeElement) {
      this.closeMobileMenu();
    }
  }

  openMobileSection(item: WebNavItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (item.link) {
      this.closeMobileMenu();
      void this.router.navigateByUrl(item.link);
    }
  }

  markMobileMenuNavigation(): void {
    this.closeMobileMenu();
  }

  toggleMobileSection(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget as HTMLElement | null;
    const details = button?.closest('details') as HTMLDetailsElement | null;
    if (details) {
      details.open = !details.open;
    }
  }

  constructor(
    readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isParent = this.authService.isParentUser();
    this.navItems = this.isParent ? PARENT_NAV_ITEMS : CHILD_SELF_NAV_ITEMS;
  }

  get dashboardLink(): string {
    return this.isParent ? '/app/parent-account' : '/app/home';
  }

  goHome(event: Event): void {
    event.preventDefault();
    this.closeMobileMenu();
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
