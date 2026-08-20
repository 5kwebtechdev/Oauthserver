import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ChildSelfImageService } from '../../../services/child-self-image.service';
import { ParentImageService } from '../../../services/parent-image.service';
import { ProfileStoreService } from '../../../services/profile-store.service';
import { ChildInfo } from '../../../models/child-info.model';

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

const CHILD_NAV_ITEMS: WebNavItem[] = [
  {
    label: 'Learning',
    children: [
      { label: 'Content Library', link: '/authed/content' },
      { label: 'Academy', link: '/authed/academy' },
      { label: 'Education Hub', link: '/authed/education' }
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

// Parent accounts get no primary nav links in the web header — just the
// child selector / coins / profile on the right (see web-nav.component.html).
const PARENT_NAV_ITEMS: WebNavItem[] = [];

@Component({
  selector: 'web-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule, SkeletonImageComponent],
  templateUrl: './web-nav.component.html',
  styleUrls: ['./web-nav.component.scss']
})
export class WebNavComponent implements OnInit, OnDestroy {
  isParent = false;
  navItems: WebNavItem[] = CHILD_NAV_ITEMS;

  userName = '';
  userAvatarUrl: string | null = null;
  avatarImageName: string | null = null;

  coins = 0;
  streaks = 0;
  trophies = 0;
  badges = 0;

  // Parent-only
  parentAvatarStyle: Record<string, string> = {};
  parentInitial = 'P';
  children: ChildInfo[] = [];
  selectedChild: ChildInfo | null = null;

  openMenu: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private childSelfImageService: ChildSelfImageService,
    private parentImageService: ParentImageService,
    private profileStore: ProfileStoreService
  ) {}

  ngOnInit(): void {
    this.isParent = this.authService.isParentUser();
    this.navItems = this.isParent ? PARENT_NAV_ITEMS : CHILD_NAV_ITEMS;

    this.authService.userData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userData => {
        if (userData) {
          this.userName = userData.name || '';
          this.parentInitial = this.userName.charAt(0).toUpperCase() || 'P';
          if (this.isParent) {
            this.parentAvatarStyle = this.parentImageService.getAvatarStyle(
              this.parentInitial,
              String(userData.gender || '').toLowerCase() === 'female',
              48
            );
          }
          const resolved = this.childSelfImageService.resolveAvatarFromUser(userData);
          this.userAvatarUrl = resolved.url || null;
          this.avatarImageName = resolved.alt || null;
        }
      });

    if (this.isParent) {
      this.profileStore.children$
        .pipe(takeUntil(this.destroy$))
        .subscribe(children => (this.children = children));
      this.profileStore.selectedChild$
        .pipe(takeUntil(this.destroy$))
        .subscribe(child => (this.selectedChild = child));
    } else {
      this.userService.stats$
        .pipe(takeUntil(this.destroy$))
        .subscribe(stats => {
          if (stats) {
            this.coins = stats.coins;
            this.streaks = stats.streaks;
            this.trophies = stats.days;
            this.badges = stats.badges;
          }
        });
      // Ensure stats are populated even if the current page never fetches
      // them itself (UserService dedupes against any in-flight request).
      this.userService.refreshStats().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get userInitial(): string {
    return (this.userName || '').trim().charAt(0).toUpperCase();
  }

  get selectedChildAvatarUrl(): string {
    return this.selectedChild?.avatarUrl || 'assets/figma/avatars/below-11-male-1.webp';
  }

  get selectedChildName(): string {
    return this.selectedChild?.name || this.children[0]?.name || 'Child';
  }

  get selectedChildCoins(): number {
    return this.selectedChild?.coins ?? 0;
  }

  openMenuOn(label: string): void {
    this.openMenu = label;
  }

  toggleMenu(label: string, event: Event): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === label ? null : label;
  }

  closeMenu(): void {
    this.openMenu = null;
  }

  selectChild(child: ChildInfo): void {
    this.profileStore.select(child);
    this.closeMenu();
  }

  goToCoins(): void {
    this.router.navigate(['/authed/coin']);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenu();
  }
}
