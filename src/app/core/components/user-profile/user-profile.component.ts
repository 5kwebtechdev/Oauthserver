import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { IonicModule } from '@ionic/angular';
import { MindfulCoinsStatsComponent } from '../mindful-coins-stats/mindful-coins-stats.component';
import { ProfileContentCardComponent } from './profile-content-card/profile-content-card.component';
// SocialMediaComponent intentionally omitted from imports when not used in template

@Component({
  selector: 'user-profile',
  standalone: true,
  imports: [CommonModule, MindfulNavigatorComponent, IonicModule, MindfulCoinsStatsComponent, ProfileContentCardComponent],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnChanges {
  /** Simple input expecting a user-like object: { name?: string, email?: string, avatarUrl?: string } */
  @Input() user: any = {};

  // Mirror the stats inputs so the template can bind to them
  @Input() userCoins: number | string = 0;
  @Input() userStreaks: number | string = 0;
  @Input() userDays: number | string = 0;
  @Input() userBadges: number | string = 0;

  /** Emitted when the user clicks edit */
  @Output() edit = new EventEmitter<void>();

  /** Emitted when the user clicks logout */
  @Output() logout = new EventEmitter<void>();

  constructor(private router: Router) {}

  onEdit() {
    this.edit.emit();
    // Navigate to the edit profile page within the authenticated area
    this.router.navigate(['/authed/edit-profile']).catch(() => {});
  }

  onLogout() {
    this.logout.emit();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user'] && this.user) {
      const u = this.user || {};
      // map known properties if present
      if (u.coins != null) this.userCoins = u.coins;
      if (u.streaks != null) this.userStreaks = u.streaks;
      if (u.days != null) this.userDays = u.days;
      if (u.badges != null) this.userBadges = u.badges;
    }
  }
}
