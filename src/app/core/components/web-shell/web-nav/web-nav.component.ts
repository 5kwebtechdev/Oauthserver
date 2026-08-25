import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ChildSelfImageService } from '../../../services/child-self-image.service';

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
    children: [
      { label: 'Journal', link: '/authed/journal-input' },
      { label: 'Notes', link: '/authed/notes' },
      { label: 'Calendar', link: '/authed/activity-calendar' },
    ],
  },
  {
    label: 'EduHub Listings',
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
    children: [
      { label: 'Blogs', link: '/authed/content', queryParams: { type: 'ARTICLE' } },
      { label: 'Quizzes', link: '/authed/content', queryParams: { type: 'QUIZ' } },
    ],
  },
  {
    label: 'Shop',
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
  imports: [CommonModule, RouterModule, SkeletonImageComponent],
  templateUrl: './web-nav.component.html',
  styleUrls: ['./web-nav.component.scss'],
})
export class WebNavComponent implements OnInit, OnDestroy {
  readonly navigationAssetRoot = 'assets/Navigation/figma-logged-in';
  // This wordmark has a tightly cropped transparent canvas. The previous
  // square asset contained substantial empty space, so the logo looked tiny
  // even though its image element was already 48px tall.
  readonly logoSrc = 'assets/Images-Transparent/SuperMeLogoFinal3.png';
  readonly chevronSrc = `${this.navigationAssetRoot}/chevron.svg`;
  readonly notificationSrc = `${this.navigationAssetRoot}/notification.svg`;
  readonly coinSrc = `${this.navigationAssetRoot}/coin.png`;

  isParent = false;
  navItems: WebNavItem[] = CHILD_SELF_NAV_ITEMS;
  userName = '';
  userAvatarUrl: string | null = null;
  avatarImageName: string | null = null;
  coins = 0;
  openMenu: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    readonly router: Router,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly childSelfImageService: ChildSelfImageService,
  ) {}

  ngOnInit(): void {
    this.isParent = this.authService.isParentUser();
    this.navItems = this.isParent ? PARENT_NAV_ITEMS : CHILD_SELF_NAV_ITEMS;

    this.authService.userData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((userData) => {
        if (!userData) return;
        this.userName = this.resolveProfileUsername(userData);
        const resolved =
          this.childSelfImageService.resolveAvatarFromUser(userData);
        this.userAvatarUrl = resolved.url || null;
        this.avatarImageName = resolved.alt || null;
        const profileCoins = Number(
          (userData as any).coins ?? (userData as any).coinBalance,
        );
        if (Number.isFinite(profileCoins)) this.coins = profileCoins;
      });

    this.userService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => {
        if (!stats) return;
        if (Number.isFinite(Number(stats.coins)))
          this.coins = Number(stats.coins);
      });
    this.userService.refreshStats().subscribe({ error: () => undefined });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get userInitial(): string {
    return (this.userName || (this.isParent ? 'Parent' : 'User'))
      .charAt(0)
      .toUpperCase();
  }

  private resolveProfileUsername(user: any): string {
    return String(user?.username ?? user?.userName ?? user?.name ?? '').trim();
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

  closeMenu(): void {
    this.openMenu = null;
  }

  isNavActive(item: WebNavItem): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    if (item.link)
      return path === item.link || path.startsWith(`${item.link}/`);
    return Boolean(
      item.children?.some(
        (child) => path === child.link || path.startsWith(`${child.link}/`),
      ),
    );
  }

  goToNotifications(): void {
    this.closeMenu();
    void this.router.navigate(['/authed/notifications']);
  }

  goToCoins(): void {
    this.closeMenu();
    void this.router.navigate(['/authed/coin']);
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
