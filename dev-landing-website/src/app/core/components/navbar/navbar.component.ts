import { Component, Input, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MoodService } from '../../services/mood.service';
import { UserService } from '../../services/user.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly navigationAssetRoot = 'assets/Navigation/figma-logged-in';
  readonly logoSrc = `${this.navigationAssetRoot}/superme-logo.png`;
  readonly chevronSrc = `${this.navigationAssetRoot}/chevron.svg`;
  readonly notificationSrc = `${this.navigationAssetRoot}/notification.svg`;
  readonly coinSrc = `${this.navigationAssetRoot}/coin.png`;
  readonly streakSrc = 'assets/Icons-Neutral/Icon-Streak.png';
  readonly badgeSrc = 'assets/Icons-Neutral/Icon-Badge.png';
  readonly leaderboardSrc = 'assets/Icons-Neutral/Icon-Trophy.png';
  readonly calendarSrc = 'assets/Icons-Neutral/Icon-Calendar.png';

  @Input() userData = {
    name: 'Still Panda',
    coins: 15000,
    trophies: 129,
    streaks: 21,
    gems: 5,
    avatar: 'assets/Icons-Neutral/Child Avatar.png',
  };

  userAvatar: string | null = null;

  get avatarSrc(): string {
    if (this.userAvatar) return this.userAvatar;
    const a = this.userData?.avatar;
    if (!a || typeof a !== 'string') return 'assets/icon/child-avatar.png';
    const trimmed = a.trim();
    if (
      /^(https?:)?\/\//i.test(trimmed) ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('assets/')
    ) {
      return trimmed;
    }
    return 'assets/icon/child-avatar.png';
  }

  get navItems(): {
    label: string;
    route?: string;
    children?: { label: string; route?: string | null; state?: any }[];
  }[] {
    return [
      {
        label: 'Learning',
        children: [
          { label: 'Quiz', route: '/home/content', state: { type: 'quiz' } },
          { label: 'Puzzle', route: '/home/content', state: { type: 'puzzle' } },
          { label: 'Article', route: '/home/content', state: { type: 'article' } },
          { label: 'Master Class', route: '/home/content', state: { type: 'masterclass' } },
        ],
      },
      {
        label: 'Quick Tools',
        children: [
          { label: 'Habits', route: '/home/habits' },
          { label: 'Tasks', route: '/home/tasks' },
          { label: 'Day View', route: null },
          { label: 'Month View', route: null },
          { label: 'Notes', route: '/home/notes' },
          { label: 'Journal', route: '/home/journal-input' },
        ],
      },
      {
        label: 'EduHub',
        children: [
          { label: 'Find a Tutor', route: '/tutors' },
          { label: 'Academy', route: '/home/academy' },
          { label: 'Education', route: '/home/education' },
          { label: 'Become a Tutor', route: '/become-a-tutor' },
        ],
      },
      {
        label: 'Shop',
        children: [
          { label: 'School Store', route: '/shop' },
          { label: 'Books', route: '/shop/books' },
          { label: 'Stationery', route: '/shop/stationery' },
          { label: 'My Orders', route: '/shop/orders' },
        ],
      },
      { label: 'Insights', route: '/home/coin' },
    ];
  }

  stats = [
    {
      icon: 'assets/Icons-Neutral/Icons-Coins.png',
      value: 15000,
      label: 'Coins',
    },
    {
      icon: 'assets/Icons-Neutral/Icon-Trophy.png',
      value: 129,
      label: 'Trophies',
    },
    {
      icon: 'assets/Icons-Neutral/Icon-Streak.png',
      value: 21,
      label: 'Streaks',
    },
    {
      icon: 'assets/Icons-Neutral/Icon-Badge.png',
      value: 5,
      label: 'Badges',
    },
  ];

  showProfileMenu = false;
  openDropdownLabel: string | null = null;
  showMobileMenu = false;

  readonly chevronPath =
    'M14.3536 17.6464C14.1583 17.8417 13.8417 17.8417 13.6465 17.6464L8.35357 12.3536C8.15831 12.1583 8.15831 11.8417 8.35357 11.6464L13.6465 6.35355C13.8417 6.15829 14.1583 6.15829 14.3536 6.35355L15.0465 7.04645C15.2417 7.24171 15.2417 7.55829 15.0465 7.75355L11.1536 11.6464C10.9583 11.8417 10.9583 12.1583 11.1536 12.3536L15.0465 16.2464C15.2417 16.4417 15.2417 16.7583 15.0465 16.9536L14.3536 17.6464Z';

  // Reward stats from API
  userCoins: number = 0;
  userStreaks: number = 0;
  userDays: number = 0;
  userBadges: number = 0;
  successPercentage: number = 0;
  totalStreaks: number = 0;

  private vibesSub?: Subscription;
  private profileSub?: Subscription;

  userName = 'User';

  constructor(
    private router: Router,
    private authService: AuthService,
    private moodService: MoodService,
    private userService: UserService,
    private childSelfImageService: ChildSelfImageService,
  ) {}

  ngOnInit() {
    this.loadRewardStats();

    // Resolve avatar from user_data immediately so no stale S3 URL shows
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const parsedData = JSON.parse(raw);
        if (parsedData?.name) this.userName = parsedData.name;
        const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
        if (resolved.url) this.userAvatar = resolved.url;
      }
    } catch (_) {}

    this.profileSub = this.userService.getUserProfile$().subscribe((profile) => {
      this.userName = profile?.name || 'User';
      if (profile?.avatarUrl) {
        this.userAvatar = profile.avatarUrl;
      }
    });
    this.userService.fetchUserFromApi().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const name = data?.name;
        if (name) this.userService.updateUserProfile({ name });
        const resolved = this.childSelfImageService.resolveAvatarFromUser(data);
        if (resolved.url) {
          this.userAvatar = resolved.url;
          this.userService.updateUserProfile({ avatarUrl: resolved.url });
        }
      },
      error: () => {},
    });
  }

  private loadRewardStats(): void {
    this.moodService.getVibesDisplay().subscribe();

    this.vibesSub = this.moodService.vibesDisplay$.subscribe({
      next: (vibes) => {
        if (vibes && vibes.length > 0) {
          const vibe = vibes[0];
          this.userCoins = vibe.coins || 0;
          this.userStreaks = vibe.trophies || 0;
          this.userDays = vibe.streak || 0;
          this.userBadges = vibe.badges || 0;
          this.successPercentage = vibe.completionRate || 0;
          this.totalStreaks = vibe.streak || 0;
        }
      },
    });
  }

  ngOnDestroy() {
    this.vibesSub?.unsubscribe();
    this.profileSub?.unsubscribe();
    this.closeMobileMenu();
  }

  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Close profile menu if clicking outside
    if (this.showProfileMenu && !target.closest('.profile-section')) {
      this.showProfileMenu = false;
    }

    // Close open dropdown if clicking outside
    if (this.openDropdownLabel && !target.closest('.nav-item-dropdown')) {
      this.openDropdownLabel = null;
    }
  }

  // Close mobile menu on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }

  // Prevent body scroll when mobile menu is open
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768 && this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }

  get isParent(): boolean {
    return this.authService.isParentUser();
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToNotifications(): void {
    this.closeAllMenus();
    this.router.navigate(['/profile'], { state: { section: 'notifications' } });
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    if (this.showProfileMenu) {
      this.openDropdownLabel = null;
    }
  }

  openDropdown(label: string): void {
    this.openDropdownLabel = label;
    this.showProfileMenu = false;
  }

  closeDropdown(): void {
    this.openDropdownLabel = null;
  }

  getChevronRotation(isOpen: boolean): string {
    return isOpen ? 'rotate(90deg)' : 'rotate(-90deg)';
  }

  isNavItemActive(label: string): boolean {
    const item = this.navItems.find((n) => n.label === label);
    if (!item) return false;
    if (item.route && this.router.url.includes(item.route)) return true;
    return item.children?.some((c) => !!c.route && this.router.url.includes(c.route)) ?? false;
  }

  toggleDropdown(label: string, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openDropdownLabel = this.openDropdownLabel === label ? null : label;
    if (this.openDropdownLabel) {
      this.showProfileMenu = false;
    }
  }

  handleChildClick(child: { label: string; route?: string | null }, parentLabel: string) {
    this.openDropdownLabel = null;
    if (parentLabel === 'Quick Tools') {
      if (child.label === 'Day View') this.navigateToDay();
      else if (child.label === 'Month View') this.navigateToMonth();
    }
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;

    // Prevent body scroll when mobile menu is open
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
    this.openDropdownLabel = null;
  }

  closeAllMenus() {
    this.showProfileMenu = false;
    this.openDropdownLabel = null;
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  navigateChild(child: { route?: string | null; state?: any }, closeFn: () => void) {
    closeFn();
    if (!child.route) return;
    this.router.navigate([child.route], child.state ? { state: child.state } : {});
  }

  logout() {
    console.log('[Navbar] Logout clicked');
    this.closeAllMenus();
    // Call auth service logout which will clear session and redirect to login
    this.authService.logout(false);
    // Navigate to landing page
    this.router.navigate(['/']);
  }

  goToCoins() {
    this.router.navigate(['/home/coin']);
  }

  goToBadges() {
    this.router.navigate(['/home/badges']);
  }

  goToTrophies() {
    this.router.navigate(['/home/trophies']);
  }

  goToStreaks() {
    this.router.navigate(['/home/streaks']);
  }

  goToLeaderboard() {
    this.closeAllMenus();
    this.router.navigate(['/home/streaks'], { queryParams: { view: 'leaderboard' } });
  }

  goToCalendar() {
    this.closeAllMenus();
    this.router.navigate(['/home/activity-calendar']);
  }

  goHome() {
    this.closeAllMenus();
    this.router.navigate(['/home']);
  }

  navigateToDay() {
    this.openDropdownLabel = null;
    this.router.navigate(['/home'], { queryParams: { view: 'day' } });
  }

  navigateToMonth() {
    this.openDropdownLabel = null;
    this.router.navigate(['/home'], { queryParams: { view: 'month' } });
  }

  handleMobileStatClick(label: string) {
    switch (label) {
      case 'Coins':
        this.goToCoins();
        break;
      case 'Badges':
        this.goToBadges();
        break;
      case 'Trophies':
        this.goToTrophies();
        break;
      case 'Streaks':
        this.goToStreaks();
        break;
    }
    this.closeMobileMenu();
  }
}
