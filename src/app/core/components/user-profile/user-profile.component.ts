import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulCoinsStatsComponent } from '../mindful-coins-stats/mindful-coins-stats.component';
import { ProfileContentCardComponent } from './profile-content-card/profile-content-card.component';
import { SocialMediaComponent } from '../social-media/social-media.component';
import { ChangePetComponent } from './change-pet/change-pet.component';
import { MindfulPopupComponent } from '../mindful-popup/mindful-popup.component';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'user-profile',
  standalone: true,
  imports: [CommonModule, MindfulNavigatorComponent, IonicModule, MindfulCoinsStatsComponent, ProfileContentCardComponent, SocialMediaComponent, MindfulPopupComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnChanges {
  @Input() user: any = {};

  // Local user avatar URL
  userAvatarUrl: string = '/assets/app-assets/Default-avatar-home.svg';

  @Input() userCoins: number | string = 0;
  @Input() userStreaks: number | string = 0;
  @Input() userDays: number | string = 0;
  @Input() userBadges: number | string = 0;

  @Output() edit = new EventEmitter<void>();

  @Output() logout = new EventEmitter<void>();

  // popup state for confirming logout
  showLogoutPopup: boolean = false;

  // avatar picker popup state
  showAvatarPicker: boolean = false;

  // Avatars (reuse same assets as signup)
  public avatars = [
    { key: 1, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png' },
    { key: 2, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png' },
    { key: 3, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png' },
    { key: 4, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png' },
    { key: 5, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png' },
    { key: 6, gender: 'female', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png' },
    { key: 7, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png' },
    { key: 8, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png' },
    { key: 9, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png' },
    { key: 10, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png' },
    { key: 11, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png' },
    { key: 12, gender: 'male', value: 'assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png' },
  ];

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private authService: AuthService,
    private userService: UserService
  ) {
    // Subscribe to user profile changes
    this.userService.getUserProfile$().subscribe(profile => {
      if (profile) {
        this.userAvatarUrl = this.userService.getUserAvatarUrl();
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
    this.router.navigate(['/authed/user-dashboard']).catch(() => { });
  }

  onLogout() {
    this.logout.emit();
  }

  openLogoutPopup() {
    this.showLogoutPopup = true;
  }

  confirmLogout() {
    // Close the popup first for smooth transition
    this.showLogoutPopup = false;

    // Clear authentication data
    this.authService.logout();

    // Navigate to login page with animation
    this.router.navigate(['/home/login'], {
      replaceUrl: true // Replace history so user can't go back to authenticated pages
    }).catch((err) => {
      console.error('Navigation error:', err);
    });

    // Emit logout event for parent components if needed
    this.onLogout();
  }

  closeLogoutPopup() {
    this.showLogoutPopup = false;
  }

  /** Avatar picker methods */
  openAvatarPicker(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.showAvatarPicker = true;
  }

  closeAvatarPicker() {
    this.showAvatarPicker = false;
  }

  get avatarsToShow() {
    const gender = (this.user && this.user.gender) ? this.user.gender : 'male';
    return this.avatars.filter(a => a.gender === gender).slice(0, 6);
  }

  selectAvatar(avatar: any) {
    if (!avatar) return;
    // Update local view
    if (!this.user) this.user = {};
    this.user.avatarUrl = avatar.value;

    // Persist using UserService so other parts of app update
    try {
      this.userService.updateUserAvatar(avatar.value, `avatar${avatar.key}`);
    } catch (e) {
      console.error('Failed to update avatar in UserService', e);
    }

    this.closeAvatarPicker();
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
}
