import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-coins-stats',
  templateUrl: './mindful-coins-stats.component.html',
  styleUrls: ['./mindful-coins-stats.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class MindfulCoinsStatsComponent {
  constructor(private router: Router) { }
  @Input() userCoins: number | string = 0;
  @Input() userStreaks: number | string = 0;
  @Input() userDays: number | string = 0;
  @Input() userBadges: number | string = 0;

  @Input() successPercentage: number | string = 0; // e.g. 85 (percent)
  @Input() totalStreaks: number | string = 0; // total historical streaks count

  @Input() coinsIcon: string = '/assets/Icons-Neutral/Icons-Coins.png';
  @Input() trophyIcon: string = '/assets/Icons-Neutral/Icon-Trophy.png';
  @Input() streakIcon: string = '/assets/Icons-Neutral/Icon-Streak.png';
  @Input() badgesIcon: string = '/assets/Icons-Neutral/Icon-Badge.png';
  @Input() successIcon: string = '/assets/Icons-Neutral/Icon-SuccessRate.png';
  @Input() totalStreaksIcon: string = '/assets/Icons-Neutral/Icon-BestStreak.png';


  @Input() slot1: string = 'coins';
  @Input() slot2: string = 'trophy';
  @Input() slot3: string = 'streak';
  @Input() slot4: string = 'badges';

  getStatValue(slot: string): string | number {
    switch (slot) {
      case 'coins':
        return this.userCoins ?? 0;
      case 'trophy':
        return this.userStreaks ?? 0;
      case 'streak':
        return this.userDays ?? 0;
      case 'badges':
        return this.userBadges ?? 0;
      case 'success':
        return typeof this.successPercentage === 'number' ? `${this.successPercentage}%` : this.successPercentage;
      case 'total-streaks':
        return this.totalStreaks ?? 0;
      default:
        return '';
    }
  }

  getStatIcon(slot: string): string {
    switch (slot) {
      case 'coins':
        return this.coinsIcon;
      case 'trophy':
        return this.trophyIcon;
      case 'streak':
        return this.streakIcon;
      case 'badges':
        return this.badgesIcon;
      case 'success':
        return this.successIcon;
      case 'total-streaks':
        return this.totalStreaksIcon;
      default:
        return '';
    }
  }

  async openCoinPageIf(slot: string) {
    if (slot === 'coins') {
      // Navigate to the coin page inside the authenticated area
      await this.router.navigateByUrl('/authed/coin', { state: { coins: this.userCoins } } as any);
    }
  }

  async openTrophyPageIf(slot: string) {
    if (slot === 'trophy') {
      // Navigate to the trophies page inside the authenticated area
      await this.router.navigateByUrl('/authed/trophies');
    }
  }

  async openStreakPageIf(slot: string) {
    if (slot === 'streak') {
      // Navigate to the streaks leaderboard inside the authenticated area
      await this.router.navigateByUrl('/authed/streaks');
    }
  }

  async openBadgesPageIf(slot: string) {
    if (slot === 'badges') {
      // Navigate to the badges page inside the authenticated area
      await this.router.navigateByUrl('/authed/badges');
    }
  }
}
