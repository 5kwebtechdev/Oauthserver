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
      { label: 'Content Library', link: '/authed/content' },
      { label: 'Academy', link: '/authed/academy' },
      { label: 'Education Hub', link: '/authed/education' },
    ],
  },
  {
    label: 'Quick Tools',
    children: [
      { label: 'Timetable', link: '/authed/activity-timeline' },
      { label: 'Calendar View', link: '/authed/activity-calendar' },
      { label: 'Notes', link: '/authed/notes' },
      { label: 'Journal', link: '/authed/journal-input' },
    ],
  },
  {
    label: 'EduHub',
    children: [
      { label: 'EduHub Home', link: '/authed/education' },
      { label: 'Tutors', link: '/authed/tutors' },
      { label: 'Academies', link: '/authed/academies' },
      { label: 'Events', link: '/authed/education/events' },
    ],
  },
  {
    label: 'Shop',
    children: [
      { label: 'School Store', link: '/authed/school-store' },
      { label: 'Second-hand Books', link: '/authed/second-hand-books' },
      { label: 'My Orders', link: '/authed/school-store/my-orders' },
    ],
  },
  { label: 'Insights', link: '/authed/analytics' },
];

const PARENT_NAV_ITEMS: WebNavItem[] = [
  {
    label: 'Parenting',
    children: [
      { label: 'Parent Dashboard', link: '/authed/parent-account' },
      { label: 'Child Learning', link: '/authed/parent-learning' },
      { label: 'Insights', link: '/authed/analytics' },
    ],
  },
  {
    label: 'Shop',
    children: [
      { label: 'School Store', link: '/authed/school-store' },
      { label: 'Second-hand Books', link: '/authed/second-hand-books' },
      { label: 'My Orders', link: '/authed/school-store/my-orders' },
    ],
  },
  {
    label: 'EduHub',
    children: [
      { label: 'EduHub Home', link: '/authed/education' },
      { label: 'Tutors', link: '/authed/tutors' },
      { label: 'Academies', link: '/authed/academies' },
      { label: 'Events', link: '/authed/education/events' },
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
  readonly streakSrc = 'assets/Icons-Neutral/Icon-Streak.png';
  readonly badgeSrc = 'assets/Icons-Neutral/Icon-Badge.png';
  readonly leaderboardSrc = 'assets/Icons-Neutral/Icon-Trophy.png';
  readonly calendarSrc = 'assets/Icons-Neutral/Icon-Calendar.png';

  isParent = false;
  navItems: WebNavItem[] = CHILD_SELF_NAV_ITEMS;
  userName = '';
  userAvatarUrl: string | null = null;
  avatarImageName: string | null = null;
  coins = 0;
  streaks = 0;
  badges = 0;
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
        this.userName = String(userData.name || '').trim();
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
        if (Number.isFinite(Number(stats.streaks)))
          this.streaks = Number(stats.streaks);
        if (Number.isFinite(Number(stats.badges)))
          this.badges = Number(stats.badges);
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

  goToStreaks(): void {
    this.closeMenu();
    void this.router.navigate(['/authed/streaks']);
  }

  goToBadges(): void {
    this.closeMenu();
    void this.router.navigate(['/authed/badges']);
  }

  goToLeaderboard(): void {
    this.closeMenu();
    void this.router.navigate(['/authed/streaks'], {
      queryParams: { view: 'leaderboard' },
    });
  }

  goToCalendar(): void {
    this.closeMenu();
    void this.router.navigate(['/authed/activity-calendar']);
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
