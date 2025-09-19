import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { IonicModule, ModalController } from '@ionic/angular';
import { MindfulCoinsStatsComponent } from '../mindful-coins-stats/mindful-coins-stats.component';
import { ProfileContentCardComponent } from './profile-content-card/profile-content-card.component';
import { SocialMediaComponent } from '../social-media/social-media.component';
import { ChangePetComponent } from './change-pet/change-pet.component';

@Component({
  selector: 'user-profile',
  standalone: true,
  imports: [CommonModule, MindfulNavigatorComponent, IonicModule, MindfulCoinsStatsComponent, ProfileContentCardComponent, SocialMediaComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnChanges {
  @Input() user: any = {};

  @Input() userCoins: number | string = 0;
  @Input() userStreaks: number | string = 0;
  @Input() userDays: number | string = 0;
  @Input() userBadges: number | string = 0;

  @Output() edit = new EventEmitter<void>();

  @Output() logout = new EventEmitter<void>();

  constructor(private router: Router, private modalCtrl: ModalController) {}

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
      // TODO: persist pet selection to user profile / backend
      console.log('Selected pet from modal:', selectedPet);
      // Example: set a user property locally
      if (this.user) this.user.pet = selectedPet;
    }
  }

  onEdit() {
    this.edit.emit();
    this.router.navigate(['/authed/edit-profile']).catch(() => {});
  }

  onPassword() {
    this.router.navigate(['/authed/reset-pasword']).catch(() => {});
  }

  onLogout() {
    this.logout.emit();
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
