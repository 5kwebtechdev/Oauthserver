import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { CoinService } from '../../services/coin.service';
import { ParentDataService } from '../../services/parent-data.service';
import { MoodService } from '../../services/mood.service';
import { VibesDisplayResponse } from '../../models/mood.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-parent-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './parent-navbar.component.html',
  styleUrls: ['./parent-navbar.component.scss'],
})
export class ParentNavbarComponent implements OnInit, OnDestroy {
  readonly navigationAssetRoot = 'assets/Navigation/figma-logged-in';
  readonly logoSrc = `${this.navigationAssetRoot}/superme-logo.png`;
  readonly chevronSrc = `${this.navigationAssetRoot}/chevron.svg`;
  readonly notificationSrc = `${this.navigationAssetRoot}/notification.svg`;
  readonly coinSrc = `${this.navigationAssetRoot}/coin.png`;

  readonly navItems: {
    label: string;
    children: { label: string; route?: string | null; action?: 'day' | 'month' }[];
  }[] = [
    {
      label: 'Parenting',
      children: [
        { label: 'Parent Dashboard', route: '/parent' },
        { label: 'Day View', action: 'day' },
        { label: 'Month View', action: 'month' },
      ],
    },
    {
      label: 'Shop',
      children: [
        { label: 'School Store', route: '/shop' },
        { label: 'Products', route: '/shop/products' },
        { label: 'Books', route: '/shop/books' },
        { label: 'My Orders', route: '/shop/orders' },
      ],
    },
    {
      label: 'EduHub',
      children: [
        { label: 'Find a Tutor', route: '/tutors' },
        { label: 'Academy', route: '/academy' },
        { label: 'Become a Tutor', route: '/become-a-tutor' },
        { label: 'Get Listed', route: '/submit-an-ad' },
      ],
    },
  ];

  @Input() parentData: any = {
    name: 'Parent Name',
    avatar: 'assets/Icons-Neutral/Child Avatar.png',
    coins: 15000,
  };

  dynamicName = '';
  dynamicAvatar: string | null = null;
  totalCoins = 0;
  apiChildren: VibesDisplayResponse[] = [];
  selectedApiChild: VibesDisplayResponse | null = null;
  private profileSub?: Subscription;
  private coinsSub?: Subscription;
  private childrenSub?: Subscription;
  private selectedChildSub?: Subscription;

  @Input() children: Array<any> = [
    { id: 1, name: 'Child 1', avatar: 'assets/icon/child-avatar.png' },
    { id: 2, name: 'Child 2', avatar: 'assets/icon/child-avatar.png' },
  ];

  @Output() childSelected = new EventEmitter<any>();
  @Output() coinsClick = new EventEmitter<void>();

  selectedChild: any = null;

  openMenu: string | null = null;
  showMobileMenu = false;

  // kept for back-compat with any existing template references
  get showCalendarDropdown(): boolean {
    return this.openMenu === 'calendar';
  }
  get showProfileMenu(): boolean {
    return this.openMenu === 'profile';
  }
  get showChildMenu(): boolean {
    return this.openMenu === 'child';
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private childSelfImageService: ChildSelfImageService,
    private coinService: CoinService,
    private parentDataService: ParentDataService,
    private moodService: MoodService,
  ) {
    if (this.children && this.children.length > 0) {
      this.selectedChild = this.children[0];
    }
  }

  ngOnInit() {
    // Resolve avatar from user_data immediately (before API call) so no stale S3 URL shows
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const parsedData = JSON.parse(raw);
        if (parsedData?.name) this.dynamicName = parsedData.name;
        const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
        if (resolved.url) this.dynamicAvatar = resolved.url;
      }
    } catch (_) {}

    this.profileSub = this.userService.getUserProfile$().subscribe((profile) => {
      if (profile?.name) this.dynamicName = profile.name;
      if (profile?.avatarUrl) {
        this.dynamicAvatar = profile.avatarUrl;
      }
    });
    this.userService.fetchUserFromApi().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        if (data?.name) {
          this.dynamicName = data.name;
          this.userService.updateUserProfile({ name: data.name });
        }
        const resolved = this.childSelfImageService.resolveAvatarFromUser(data);
        if (resolved.url) {
          this.dynamicAvatar = resolved.url;
          this.userService.updateUserProfile({ avatarUrl: resolved.url });
        }
      },
      error: () => {},
    });

    this.coinsSub = this.coinService.totalCoins$.subscribe((c) => (this.totalCoins = c));
    this.coinService.loadCoinHistory().subscribe();

    // Load children list — use existing data if already loaded by dashboard
    if (!this.parentDataService.children.length) {
      this.moodService.getParentVibesDisplay().subscribe({
        next: (vibes) => {
          if (vibes?.length) this.parentDataService.setChildren(vibes);
        },
        error: () => {},
      });
    }
    this.childrenSub = this.parentDataService.children$.subscribe((c) => (this.apiChildren = c));
    this.selectedChildSub = this.parentDataService.selectedChild$.subscribe(
      (c) => (this.selectedApiChild = c),
    );
  }

  ngOnDestroy() {
    this.profileSub?.unsubscribe();
    this.coinsSub?.unsubscribe();
    this.childrenSub?.unsubscribe();
    this.selectedChildSub?.unsubscribe();
    document.body.style.overflow = '';
  }

  // Check if Calendar route is active
  get isCalendarActive(): boolean {
    return this.router.url.includes('/home/calendar') || this.router.url.includes('view=');
  }

  // Safe avatar similar to NavbarComponent
  get parentAvatarSrc(): string | null {
    if (this.dynamicAvatar) return this.dynamicAvatar;
    const a = this.parentData?.avatar;
    if (!a || typeof a !== 'string') return null;
    const trimmed = a.trim();
    if (
      trimmed !== 'assets/Icons-Neutral/Child Avatar.png' &&
      (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('assets/'))
    )
      return trimmed;
    return null;
  }

  get displayName(): string {
    return this.dynamicName || this.parentData?.name || 'Parent';
  }

  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      this.openMenu &&
      !target.closest('.nav-item-dropdown') &&
      !target.closest('.parent-profile') &&
      !target.closest('.child-selector')
    ) {
      this.openMenu = null;
    }
  }

  // Close menus on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeAllMenus();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 767 && this.showMobileMenu) {
      this.closeAllMenus();
    }
  }

  toggleDropdown(menu: string, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  goToProfile(): void {
    this.closeAllMenus();
    this.router.navigate(['/profile']);
  }

  goToNotifications(): void {
    this.closeAllMenus();
    this.router.navigate(['/profile'], { state: { section: 'notifications' } });
  }

  isNavItemActive(label: string): boolean {
    const item = this.navItems.find((navItem) => navItem.label === label);
    if (!item) return false;
    if (label === 'Parenting' && (this.router.url.startsWith('/parent') || this.isCalendarActive)) {
      return true;
    }
    return item.children.some((child) => !!child.route && this.router.url.startsWith(child.route));
  }

  navigateChild(
    child: { route?: string | null; action?: 'day' | 'month' },
    closeMobile = false,
  ): void {
    if (child.action === 'day') {
      this.navigateToDay();
    } else if (child.action === 'month') {
      this.navigateToMonth();
    } else if (child.route) {
      this.router.navigate([child.route]);
    }

    this.openMenu = null;
    if (closeMobile) this.closeAllMenus();
  }

  // kept for back-compat
  toggleCalendar(event?: MouseEvent) {
    this.toggleDropdown('calendar', event);
  }

  navigateToDay() {
    this.openMenu = null;
    this.router.navigate(['/home'], { queryParams: { view: 'day' } });
  }

  navigateToMonth() {
    this.openMenu = null;
    this.router.navigate(['/home'], { queryParams: { view: 'month' } });
  }

  toggleChildMenu(event?: MouseEvent) {
    this.toggleDropdown('child', event);
  }

  // Select Child
  selectChild(child: any) {
    this.selectedChild = child;
    this.openMenu = null;
    this.childSelected.emit(child);
    console.log('[ParentNavbar] Child selected:', child);
  }

  selectApiChild(child: VibesDisplayResponse) {
    this.parentDataService.selectChild(child);
    this.openMenu = null;
  }

  getChildAvatarUrl(child: VibesDisplayResponse): string {
    const resolved = this.childSelfImageService.resolveAvatarFromUser(child);
    return resolved.url ?? 'assets/Icons-Neutral/Child Avatar.png';
  }

  toggleProfileMenu() {
    this.toggleDropdown('profile');
  }

  closeAllMenus() {
    this.openMenu = null;
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    this.openMenu = null;
    document.body.style.overflow = this.showMobileMenu ? 'hidden' : '';
  }

  // Navigate to Coins page
  goToCoins() {
    this.closeAllMenus();
    this.coinsClick.emit();
    this.router.navigate(['/parent/coins']);
  }

  // Navigate to Home
  goHome() {
    this.closeAllMenus();
    this.router.navigate(['/parent']);
  }

  // Logout
  logout() {
    console.log('[ParentNavbar] Logout clicked');
    this.closeAllMenus();
    this.authService.logout();
  }

  // Navigate to children management / add child page
  addChild() {
    this.closeAllMenus();
    try {
      this.router.navigate(['/parent/children']);
    } catch (e) {
      console.error('Failed to navigate to add child', e);
    }
  }
}
