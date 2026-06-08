import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulCoinsStatsComponent } from '../mindful-coins-stats/mindful-coins-stats.component';
import { ProfileContentCardComponent } from './profile-content-card/profile-content-card.component';
import { SocialMediaComponent } from '../social-media/social-media.component';
import { ChangePetComponent } from './change-pet/change-pet.component';
import { MindfulPopupComponent } from '../mindful-popup/mindful-popup.component';
import { AuthService as CoreAuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { MoodService } from '../../services/mood.service';
import { VibesDisplayResponse } from '../../models/mood.model';
import { AuthService, FamilyMember, FamilyDetailsResponse } from '../../../../package/api/auth.service';
import { ParentImageService } from '../../services/parent-image.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';

@Component({
  selector: 'user-profile',
  standalone: true,
  imports: [CommonModule, MindfulNavigatorComponent, IonicModule, MindfulCoinsStatsComponent, ProfileContentCardComponent, SocialMediaComponent, MindfulPopupComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnChanges {
  @Input() user: any = {};

  // Local user avatar URL
  userAvatarUrl: string = '/assets/app-assets/Default-avatar-home.svg';
  // Avatar image name (e.g., "Avatar 3") coming from login response
  avatarImageName: string | null = null;

  @Input() userCoins: number | string = 0;
  @Input() userStreaks: number | string = 0;
  @Input() userDays: number | string = 0;
  @Input() userBadges: number | string = 0;

  @Output() edit = new EventEmitter<void>();

  @Output() logout = new EventEmitter<void>();

  // popup state for confirming logout
  showLogoutPopup: boolean = false;

  // Family data
  creator: FamilyMember | null = null;
  members: FamilyMember[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private modalCtrl: ModalController,
    private coreAuthService: CoreAuthService,
    private authService: AuthService,
    private userService: UserService,
    private moodService: MoodService,
    private childSelfImageService: ChildSelfImageService,
    public parentImageService: ParentImageService
  ) {
    // Subscribe to user profile changes
    this.userService.getUserProfile$().subscribe(profile => {
      if (profile) {
        this.userAvatarUrl = this.userService.getUserAvatarUrl();

        // Also resolve avatar from service for child/self users
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const parsedData = JSON.parse(userData);
            const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
            if (resolved.url) this.userAvatarUrl = resolved.url;
            if (resolved.alt) this.avatarImageName = resolved.alt;
          } catch (e) {
            // ignore
          }
        }

        // Merge service-provided avatar into local `user` object.
        // If `user` wasn't provided as an Input, create it from the profile.
        if (!this.user || Object.keys(this.user).length === 0) {
          this.user = {
            name: profile.name,
            age: profile.age,
            avatarUrl: this.userAvatarUrl
          };
        } else {
          // If the consumer did not supply an avatarUrl (or it's empty), populate it
          if (!this.user.avatarUrl || this.user.avatarUrl === '') {
            this.user = { ...this.user, avatarUrl: this.userAvatarUrl };
          }
        }
      }
    });
  }

  ngOnInit() {
    // Load user data from localStorage (set during login)
    this.loadUserDataFromStorage();
    // Load user stats from localStorage first, then API if not available
    this.loadUserStatsFromStorage();
    // Load family details if user is a parent
    if (this.user?.relationship === 'PARENT') {
      this.loadFamilyDetails();
    }

    // Subscribe to user data changes from CoreAuthService (primary source of truth)
    // This will reactively update the UI when user data changes (e.g., from edit-profile)
    this.coreAuthService.userData$.subscribe(userData => {
      if (userData) {
        console.log('[UserProfile] User data updated from CoreAuthService:', userData.name);
        
        // Update user object with new data
        this.user = {
          ...this.user,
          name: userData.name || this.user?.name || 'User',
          email: userData.email || this.user?.email,
          phone: userData.phone || this.user?.phone,
          age: userData.age || this.user?.age,
          gender: userData.gender || this.user?.gender,
          relationship: userData.relationship || this.user?.relationship
        };

        // Update avatar using shared resolver
        const resolved = this.childSelfImageService.resolveAvatarFromUser(userData);
        if (resolved.url) this.userAvatarUrl = resolved.url;
        if (resolved.alt) this.avatarImageName = resolved.alt;
      }
    });

    this.userService.getUserProfile$().subscribe(profile => {
      if (profile && this.user) {
        // Only update if not already set from CoreAuthService
        if (!this.user.name || this.user.name === 'User') {
          this.user.name = profile.name || 'User';
        }
      }
    });
  }

  // Return the uppercase initial for a given name
  getInitial(name?: string): string {
    try {
      if (!name) return '?';
      return name.trim().charAt(0).toUpperCase();
    } catch {
      return '?';
    }
  }

  isFemale(member?: any): boolean {
    try {
      return !!(member && (member as any).gender === 'female');
    } catch {
      return false;
    }
  }

  /**
   * Resolve avatar URL+alt for a family member.
   * Use ChildSelfImageService only for members whose relationship is Child.
   */
  getMemberAvatar(member: FamilyMember | null): { url: string | null; alt: string | null } | null {
    if (!member) return null;

    try {
      // Always attempt to resolve via ChildSelfImageService using `avatarImageName`.
      // We intentionally ignore any `avatar.url` values coming from the server.
      const resolved = this.childSelfImageService.resolveAvatarForMember(member as any);
      return resolved || { url: null, alt: null };
    } catch (e) {
      console.error('[UserProfile] getMemberAvatar error', e);
      return null;
    }
  }

  /**
   * Load user data from localStorage and map to component properties
   */
  private loadUserDataFromStorage(): void {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsedData = JSON.parse(userData);
        console.log('[UserProfile] Loaded user_data from localStorage:', parsedData);

        // Map user basic info
        // Map basic user info but do NOT trust server-provided `avatar.url` for image display.
        // We will resolve avatar URL from `avatarImageName` using our resolver below.
        this.user = {
          name: parsedData.name || 'User',
          email: parsedData.email,
          phone: parsedData.phone,
          age: parsedData.age,
          gender: parsedData.gender,
          avatarUrl: this.userAvatarUrl,
          relationship: parsedData.relationship
        };

        // Resolve avatar using avatarImageName (ignore parsedData.avatar?.url)
        const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
        if (resolved.url) this.userAvatarUrl = resolved.url;
        if (resolved.alt) this.avatarImageName = resolved.alt;

        console.log('[UserProfile] Mapped user info:', {
          name: this.user.name,
          age: this.user.age,
          avatarUrl: this.userAvatarUrl,
          avatarImageName: this.avatarImageName,
          resolvedUrl: resolved.url,
          resolvedAlt: resolved.alt
        });
      }
    } catch (e) {
      console.error('[UserProfile] Error loading user_data from localStorage:', e);
    }
  }

  /**
   * Load user statistics from localStorage first, then fetch from API if not available
   */
  private loadUserStatsFromStorage(): void {
    // Try to load from localStorage first
    const cachedStats = this.userService.getUserStats();

    if (cachedStats) {
      // Use cached stats
      this.userCoins = cachedStats.coins;
      this.userStreaks = cachedStats.streaks;
      this.userDays = cachedStats.days;
      this.userBadges = cachedStats.badges;

      console.log('[UserProfile] Loaded stats from localStorage:', cachedStats);
    } else {
      // No cached stats, fetch from API
      console.log('[UserProfile] No cached stats, fetching from API...');
      this.loadUserStatsFromAPI();
    }
  }

  /**
   * Load user statistics from the vibes/display endpoint and cache them
   */
  private loadUserStatsFromAPI(): void {
    this.moodService.getVibesDisplay().subscribe({
      next: (data: VibesDisplayResponse[]) => {
        // The API returns an array, get the first item (current user's data)
        if (data && data.length > 0) {
          const userStats = data[0];
          this.userCoins = userStats.coins || 0;
          this.userStreaks = userStats.streak || 0;
          this.userDays = userStats.trophies || 0;
          this.userBadges = userStats.badges || 0;

          // Cache the stats in localStorage
          this.userService.saveUserStats({
            coins: this.userCoins as number,
            streaks: this.userStreaks as number,
            days: this.userDays as number,
            badges: this.userBadges as number
          });

          console.log('[UserProfile] Loaded and cached stats from API:', {
            coins: this.userCoins,
            streaks: this.userStreaks,
            days: this.userDays,
            badges: this.userBadges
          });
        }
      },
      error: (error) => {
        console.error('[UserProfile] Failed to load user stats:', error);
        // Keep default values (0) on error
      }
    });
  }

  /**
   * Load family details from API
   */
  private loadFamilyDetails(): void {
    this.authService.getFamilyDetails().subscribe({
      next: (response: FamilyDetailsResponse) => {
        if (response.family) {
          this.creator = response.family.creator;
          this.members = response.family.members;
          console.log('[UserProfile] Loaded family details:', {
            creator: this.creator,
            members: this.members
          });
        }
      },
      error: (error: any) => {
        console.error('[UserProfile] Failed to load family details:', error);
      }
    });
  }

  async onChangePet() {
    const slides = [
      { image: '/assets/app-assets/pet1.png', title: 'Pet 1', subtitle: ['Friendly', 'Playful'], color: '#fff', next_color: '#512100', background: 'linear-gradient(to top right,#ffb974,#ffe3c8)' },
      { image: '/assets/app-assets/pet2.png', title: 'Pet 2', subtitle: ['Calm', 'Loyal'], color: '#fff', next_color: '#512100', background: 'linear-gradient(to top right,#a1c4fd,#c2e9fb)' }
    ];

    const modal = await this.modalCtrl.create({
      component: ChangePetComponent,
      componentProps: { slides }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.selected) {
      const selectedPet = data.selected;
      console.log('Selected pet from modal:', selectedPet);
      if (this.user) this.user.pet = selectedPet;
    }
  }

  onEdit() {
    this.edit.emit();
    this.router.navigate(['/authed/edit-profile']).catch(() => { });
  }

  onPassword() {
    this.router.navigate(['/authed/reset-pasword']).catch(() => { });
  }

  onNotifications() {
    this.router.navigate(['/authed/notifications']).catch(() => { });
  }

  onRefer() {
    this.router.navigate(['/authed/refer-friend']).catch(() => { });
  }

  onMyFamily() {
    this.router.navigate(['/authed/family-connection']).catch(() => { });
  }

  onParentalControl() {
    this.router.navigate(['/authed/parental-control']).catch(() => { });
  }

  onManageMembership() {
    this.router.navigate(['/authed/membership']).catch(() => { });
  }

  onFeedback() {
    // navigate to the feedback suggestion page
    this.router.navigate(['/authed/feedback-suggestion']).catch(() => { });
  }

  onHelpSupport() {
    // navigate to the help & support page
    this.router.navigate(['/authed/help-support']).catch(() => { });
  }

  onOurPolicies() {
    // navigate to the Our Policies page
    this.router.navigate(['/authed/our-policies']).catch(() => { });
  }

  onDeleteMyData() {
    this.router.navigate(['/authed/delete-account']).catch(() => { });
  }

  onBack() {
    try {
      // Determine target route based on user relationship (parent -> parent-account, otherwise user-dashboard)
      const target = this.coreAuthService.getDashboardRoute ? this.coreAuthService.getDashboardRoute() : null;
      if (target) {
        this.router.navigateByUrl(target).catch(err => {
          console.warn('[UserProfile] navigateByUrl failed, falling back to location.back()', err);
          this.location.back();
        });
      } else {
        // Fallback to history back if route can't be determined
        this.location.back();
      }
    } catch (e) {
      console.error('[UserProfile] onBack error, falling back to location.back()', e);
      this.location.back();
    }
  }

  onLogout() {
    this.logout.emit();
  }

  openLogoutPopup() {
    this.showLogoutPopup = true;
  }

  async confirmLogout() {
    // Close the popup first for smooth transition
    this.showLogoutPopup = false;

    await this.coreAuthService.logout(true);

    // Emit logout event for parent components if needed
    this.onLogout();
  }

  closeLogoutPopup() {
    this.showLogoutPopup = false;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user'] && this.user) {
      const u = this.user || {};
      if (u.coins != null) this.userCoins = u.coins;
      if (u.streaks != null) this.userStreaks = u.streaks;
      if (u.days != null) this.userDays = u.days;
      if (u.badges != null) this.userBadges = u.badges;
    }
  }

  onMemberActiveChange(userId: number, you: boolean) {
    const m = this.members.find(x => x.userId === userId);
    if (m) m.you = you;
  }

  toggleMemberActive(member: FamilyMember) {
    member.you = !member.you;
    this.onMemberActiveChange(member.userId, member.you);
  }

  getBadgeText(member: FamilyMember): string {
    const rel = String(member.relationship || '').toLowerCase();
    const isParentLike = rel === 'parent' || rel === 'co-parent';

    if (member.you) {
      return isParentLike ? 'Parent / You' : 'Child / You';
    }
    return isParentLike ? 'Parent' : 'Child';
  }


}
