import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../../../core/constants/external-links';
import { StoreDownloadDialogService } from '../../../core/services/store-download-dialog.service';

interface NavLink {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  items: NavLink[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Grow',
    href: '/habit-tracker',
    items: [
      { label: 'Habit', href: '/habit-tracker' },
      { label: 'Task', href: '/task-manager' },
      { label: 'Journal', href: '/daily-journal' },
    ],
  },
  {
    label: 'Plan',
    href: '/routine-planner',
    items: [
      { label: 'Planner', href: '/routine-planner' },
      { label: 'Calendar', href: '/productivity-calendar' },
      { label: 'Notes', href: '/note-taking-app' },
    ],
  },
  {
    label: 'Learn',
    href: '/quiz',
    items: [
      { label: 'Quiz', href: '/quiz' },
      { label: 'Puzzle', href: '/puzzle' },
      { label: 'MasterClass', href: '/master-class' },
      { label: 'Reels', href: '/reels' },
    ],
  },
  {
    label: 'Parenting',
    href: '/blogs',
    items: [
      { label: 'Blogs', href: '/blogs' },
      { label: 'Insights', href: '/insights' },
    ],
  },
  {
    label: 'EduHub',
    href: '/find-a-tutor',
    items: [
      { label: 'Find a Tutor', href: '/find-a-tutor' },
      { label: 'Find an Academy', href: '/find-an-academy' },
      { label: 'Find Events / Workshops', href: '/find-events' },
      { label: 'Find Second-hand Books', href: '/find-second-hand-book' },
      { label: 'Find a Counselor', href: '/find-a-counselor' },
      { label: 'Find a Stationery Shop', href: '/find-a-stationery-shop' },
      { label: 'Find a Book Store', href: '/find-a-book-store' },
      { label: 'Find a Sports Shop', href: '/find-a-sport-shop' },
      { label: 'Find PG / Hostel', href: '/find-pg-hostel' },
    ],
  },
  {
    label: 'Shop',
    href: '/school-uniforms',
    items: [
      { label: 'School Uniforms', href: '/school-uniforms' },
      { label: 'School Books', href: '/find-a-book-store' },
      { label: 'Stationery', href: '/stationery' },
      { label: 'Entrance Exam Books', href: '/entrance-exam-books' },
      { label: 'General Books', href: '/general-books' },
    ],
  },
];

const GET_LISTED_ITEMS: NavLink[] = [
  { label: 'Become a Tutor', href: '/become-a-tutor' },
  { label: 'List Your Academy', href: '/list-your-academy' },

  { label: 'List Your Stationery Shop', href: '/list-your-stationery-shop' },
  { label: 'List Your Bookstore', href: '/list-your-bookstore' },
  { label: 'List Second-Hand Books', href: '/list-second-hand-books' },
  { label: 'List Your Sports Shop', href: '/list-your-sports-shop' },

  { label: 'Become a Counsellor', href: '/become-a-counsellor' },

  { label: 'List an Event', href: '/list-an-event' },
  { label: 'List a Workshop', href: '/list-a-workshop' },
  { label: 'List Your PG / Hostel', href: '/list-your-pg-hostel' },

  { label: 'Advertise with Us', href: '/advertise-with-us' },
];

function getActiveParent(pathname: string): string | null {
  const routePath = pathname.split(/[?#]/)[0];

  for (const nav of NAV_ITEMS) {
    if (nav.items.some((item) => routePath.startsWith(item.href))) {
      return nav.label;
    }
  }

  return null;
}

function isGetListedRoute(pathname: string): boolean {
  const routePath = pathname.split(/[?#]/)[0];

  return GET_LISTED_ITEMS.some(
    (item) =>
      routePath === item.href ||
      routePath.startsWith(`${item.href}/`),
  );
}

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class LandingNavbarComponent implements OnInit, OnDestroy {
  readonly storeDialog = inject(StoreDownloadDialogService);
  readonly googlePlayUrl = GOOGLE_PLAY_URL;
  readonly appStoreUrl = APP_STORE_URL;
  readonly googlePlayIcon = 'assets/Landing/a545087c920a7aa3d0b8e311d8b60b7ded2efb74.png';
  readonly appStoreIcon = 'assets/Landing/figma-logged-out/store-apple.svg';
  readonly navItems = NAV_ITEMS;
  readonly getListedItems = GET_LISTED_ITEMS;

  readonly logoSrc =
    'assets/Landing/figma-logged-out/superme-logo.png';

  readonly chevronSrc =
    'assets/Landing/figma-logged-out/chevron-left.svg';

  readonly mobileAppLoginUrl =
    this.buildMobileAppUrl('/login');

  readonly mobileAppSignupUrl =
    this.buildMobileAppUrl('/signup');

  scrolled = false;
  menuOpen = false;
  getListedOpen = false;

  openDropdownIndex: number | null = null;
  openMobileIndex: number | null = null;

  activeParent: string | null = null;
  getListedActive = false;

  showAccountPrompt = false;

  private routerSub?: Subscription;
  private savedScrollY = 0;
  private accountPromptTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.updateActiveNavigation(
      this.router.url,
    );

    this.routerSub = this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd,
        ),
      )
      .subscribe(
        (event) => {
          const navigationEnd =
            event as NavigationEnd;

          this.updateActiveNavigation(
            navigationEnd.urlAfterRedirects,
          );

          this.closeNavigation();
          this.cdr.markForCheck();
        },
      );

    if (typeof window !== 'undefined') {
      this.accountPromptTimer =
        setTimeout(() => {
          if (!this.storeDialog.isOpen()) {
            this.showAccountPrompt = true;
            this.cdr.markForCheck();
          }
        }, 120000);
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();

    if (this.accountPromptTimer) {
      clearTimeout(
        this.accountPromptTimer,
      );
    }

    this.restoreBodyScroll();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const nextScrolled =
      window.scrollY >= 5;

    if (
      this.scrolled !==
      nextScrolled
    ) {
      this.scrolled = nextScrolled;
      this.cdr.markForCheck();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth < 1200) {
      this.closeDesktopDropdowns();
    }
    if (
      window.innerWidth >= 1200 &&
      this.menuOpen
    ) {
      this.closeNavigation();
      this.cdr.markForCheck();
    }
  }

  @HostListener(
    'document:keydown.escape',
  )
  onEscape(): void {
    this.closeDesktopDropdowns();
    this.storeDialog.close();
    if (this.showAccountPrompt) {
      this.closeAccountPrompt();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest('.desktop-navigation, .desktop-actions .navigation-group')) {
      this.closeDesktopDropdowns();
    }
  }

  closeAccountPrompt(): void {
    this.showAccountPrompt = false;
    this.cdr.markForCheck();
  }

  openStoreDialog(): void {
    this.closeMenu();
    this.closeDesktopDropdowns();
    this.closeAccountPrompt();
    this.storeDialog.open();
  }

  closeStoreDialog(): void {
    this.storeDialog.close();
  }

  openLogin(
    event: Event,
  ): void {
    event.preventDefault();

    this.closeMenu();
    this.closeAccountPrompt();

    window.location.assign(
      this.mobileAppLoginUrl,
    );
  }

  toggleMenu(): void {
    this.menuOpen =
      !this.menuOpen;

    this.openMobileIndex = null;

    if (this.menuOpen) {
      this.savedScrollY =
        window.scrollY;

      document.body.style.position =
        'fixed';

      document.body.style.top =
        `-${this.savedScrollY}px`;

      document.body.style.left = '0';
      document.body.style.right = '0';

      document.body.style.overflow =
        'hidden';
    } else {
      this.restoreBodyScroll();
    }

    this.cdr.markForCheck();
  }

  toggleDropdown(index: number): void {
    this.getListedOpen = false;
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  toggleGetListed(): void {
    this.openDropdownIndex = null;
    this.getListedOpen = !this.getListedOpen;
  }

  closeDesktopDropdowns(): void {
    this.openDropdownIndex = null;
    this.getListedOpen = false;
    this.cdr.markForCheck();
  }

  toggleMobileItem(
    index: number,
  ): void {
    this.openMobileIndex =
      this.openMobileIndex === index
        ? null
        : index;
  }

  closeMenu(): void {
    if (!this.menuOpen) {
      return;
    }

    this.menuOpen = false;
    this.openMobileIndex = null;

    this.restoreBodyScroll();
  }

  isActive(
    label: string,
  ): boolean {
    return this.activeParent === label;
  }

  getMobileItemMaxHeight(
    items: NavLink[],
    isOpen: boolean,
  ): string {
    /*
     * Slightly larger than the old value because Get Listed
     * now contains more entries.
     */
    return isOpen
      ? `${items.length * 52 + 16}px`
      : '0px';
  }

  private updateActiveNavigation(
    url: string,
  ): void {
    this.activeParent =
      getActiveParent(url);

    this.getListedActive =
      isGetListedRoute(url);
  }

  private closeNavigation(): void {
    this.storeDialog.close();
    this.menuOpen = false;
    this.openDropdownIndex = null;
    this.openMobileIndex = null;
    this.getListedOpen = false;

    this.restoreBodyScroll();
  }

  private restoreBodyScroll(): void {
    if (typeof document === 'undefined') return;
    if (
      document.body.style.position !==
      'fixed'
    ) {
      return;
    }

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';

    window.scrollTo(
      0,
      this.savedScrollY,
    );
  }

  private buildMobileAppUrl(
    path: string,
  ): string {
    return `${environment.mobileAppUrl.replace(/\/$/, '')}${path}`;
  }
}
