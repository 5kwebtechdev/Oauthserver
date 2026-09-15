import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { SupermeNavigatorComponent } from '../superme-navigator/superme-navigator.component';
import { IonicModule, ModalController } from '@ionic/angular';
import { SupermeCoinsStatsComponent } from '../superme-coins-stats/superme-coins-stats.component';
import { ProfileContentCardComponent } from './profile-content-card/profile-content-card.component';
import { SocialMediaComponent } from '../social-media/social-media.component';
import { ChangePetComponent } from './change-pet/change-pet.component';
import { SupermePopupComponent } from '../superme-popup/superme-popup.component';
import { AuthService as CoreAuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { MoodService } from '../../services/mood.service';
import { VibesDisplayResponse } from '../../models/mood.model';
import { AuthService, FamilyMember, FamilyDetailsResponse } from '../../../../package/api/auth.service';
import { ParentImageService } from '../../services/parent-image.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { SkeletonImageComponent } from '../skeleton-image/skeleton-image.component';
import { PetAgeService } from '../../services/pet-age.service';

@Component({
  selector: 'user-profile',
  standalone: true,
  imports: [CommonModule, SupermeNavigatorComponent, IonicModule, SupermeCoinsStatsComponent, ProfileContentCardComponent, SocialMediaComponent, SupermePopupComponent, SkeletonImageComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnChanges {
  @Input() user: any = {};

  // Local user avatar URL
  // This is a real bundled asset. The previous fallback path no longer
  // exists, which caused a broken-image/question-mark icon in child view.
  userAvatarUrl: string = 'assets/figma/avatars/18-plus-male-1.webp';
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
    public parentImageService: ParentImageService,
    private petAgeService: PetAgeService
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
            name: profile.avatarName || profile.name,
            avatarName: profile.avatarName,
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
    // Subscribe to user data changes from CoreAuthService (primary source of truth)
    // This will reactively update the UI when user data changes (e.g., from edit-profile)
    this.coreAuthService.userData$.subscribe(userData => {
      if (userData) {
        console.log('[UserProfile] User data updated from CoreAuthService:', userData.name);
        
        // Update user object with new data
        this.user = {
          ...this.user,
          name: userData.avatarName || userData.avatar?.avatarName || userData.name || this.user?.name || 'User',
          avatarName: userData.avatarName || userData.avatar?.avatarName || this.user?.avatarName,
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

        const parentCoins = this.getAuthenticatedParentCoins();
        if (parentCoins !== null) this.userCoins = parentCoins;
      }
    });

    // Ionic keeps this page in the navigation stack. Update its existing
    // member list as soon as My Family confirms a removal, rather than
    // waiting for the user to recreate the Profile page.
    this.coreAuthService.familyMemberRemoved$.subscribe(memberId => {
      this.members = this.coreAuthService.excludeRemovedFamilyMembers(this.members);
    });

    this.userService.getUserProfile$().subscribe(profile => {
      if (profile && this.user) {
        // Only update if not already set from CoreAuthService
        if (!this.user.name || this.user.name === 'User') {
          this.user.name = profile.avatarName || profile.name || 'User';
          this.user.avatarName = profile.avatarName || this.user.avatarName;
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
          name: parsedData.avatarName || parsedData.avatar?.avatarName || parsedData.name || 'User',
          avatarName: parsedData.avatarName || parsedData.avatar?.avatarName || '',
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
    // The shared stats cache may belong to the child selected on the parent
    // dashboard. Profile must always represent the authenticated account, so
    // avoid rendering that cache and fetch the account-scoped balance below.
    const cachedStats = this.userService.getUserStats();
    console.log('[UserProfile] Ignoring shared stats cache for account-scoped profile stats:', cachedStats);
    const parentCoins = this.getAuthenticatedParentCoins();
    if (parentCoins !== null) this.userCoins = parentCoins;
    this.loadUserStatsFromAPI();
  }

  /**
   * Parent Home reads its wallet from the authenticated session. Reuse that
   * exact source here because vibes/display can remain child-scoped after the
   * parent has selected a child on the dashboard.
   */
  private getAuthenticatedParentCoins(): number | null {
    if (!this.coreAuthService.isParentUser()) return null;

    const session = this.coreAuthService.getUserData();
    const parent = session?.user ?? session?.data?.user ?? session?.data ?? session;
    const candidates = [
      parent?.coins,
      parent?.totalCoins,
      parent?.coinBalance,
      parent?.availableCoins,
      parent?.wallet?.coins,
      parent?.wallet?.balance,
      session?.coins,
      session?.totalCoins
    ];
    const resolved = candidates
      .map(value => value === null || value === undefined || value === '' ? Number.NaN : Number(value))
      .find(value => Number.isFinite(value));

    return resolved === undefined ? null : Math.max(0, resolved);
  }

  /**
   * Load user statistics from the vibes/display endpoint and cache them
   */
  private loadUserStatsFromAPI(): void {
    this.moodService.getVibesDisplay(undefined, true).subscribe({
      next: (data: VibesDisplayResponse[]) => {
        // The API returns an array, get the first item (current user's data)
        if (data && data.length > 0) {
          const userStats = data[0];
          this.userCoins = this.getAuthenticatedParentCoins() ?? userStats.coins ?? 0;
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
          // The backend's family read model can be briefly stale right after
          // a removal. Never allow that response to re-add a confirmed
          // removed child to the cached My Profile screen.
          this.members = this.coreAuthService.excludeRemovedFamilyMembers(response.family.members);
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
    const modal = await this.modalCtrl.create({
      component: ChangePetComponent,
      componentProps: { currentPetType: this.petAgeService.getCurrentPetType() },
      cssClass: 'change-pet-modal'
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.selected) {
      const selectedPet = data.selected;
      console.log('Selected pet from modal:', selectedPet);
      const petName = selectedPet.apiName || `${selectedPet.name}-Age1-Happy.webp`;

      this.coreAuthService.updatePetSelection(petName).subscribe({
        next: () => {
          if (this.user) {
            const currentPet = (
              this.user.pet && typeof this.user.pet === 'object' && !Array.isArray(this.user.pet)
            )
              ? this.user.pet
              : {};
            this.user = {
              ...this.user,
              pet: {
                ...currentPet,
                petName
              }
            };
          }
          this.userService.updateUserProfile({ pet: petName });
          // Push the new pet into the shared, live pet state so every
          // `superme-pet` instance across the app (home, EduHub, coins, etc.)
          // updates immediately — without this, only the next login/profile
          // refresh would pick up the change since PetAgeService is a
          // singleton seeded once from localStorage at app start.
          this.petAgeService.syncFromUserPet(petName);
        },
        error: error => {
          console.error('[UserProfile] Failed to update selected pet:', error);
        }
      });
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
