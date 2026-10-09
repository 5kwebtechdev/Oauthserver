import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-coins-stats',
  templateUrl: './superme-coins-stats.component.html',
  styleUrls: ['./superme-coins-stats.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class SupermeCoinsStatsComponent {
  constructor(private router: Router) { }
  @Input() userCoins: number | string = 0;
  @Input() userStreaks: number | string = 0;
  @Input() userDays: number | string = 0;
  @Input() userBadges: number | string = 0;

  @Input() successPercentage: number | string = 0; // e.g. 85 (percent)
  @Input() totalStreaks: number | string = 0; // total historical streaks count

  @Input() coinsIcon: string = 'assets/icons/superme-coin.webp';
  @Input() streakIcon: string = 'assets/Icons-Neutral/Icon-Streak.webp';
  @Input() badgesIcon: string = 'assets/Icons-Neutral/Icon-Badge.webp';
  @Input() successIcon: string = 'assets/Icons-Neutral/Icon-SuccessRate.webp';
  @Input() totalStreaksIcon: string = 'assets/Icons-Neutral/Icon-BestStreak.webp';


  @Input() slot1: string = 'coins';
  @Input() slot3: string = 'streak';
  @Input() slot4: string = 'badges';

  getStatValue(slot: string): string | number {
    switch (slot) {
      case 'coins':
        return this.userCoins ?? 0;
      case 'streak':
        return this.userStreaks ?? 0;
      case 'current-streak':
        return this.userStreaks ?? 0;
      case 'badges':
        return this.userBadges ?? 0;
      case 'success':
        return typeof this.successPercentage === 'number' ? `${this.successPercentage}%` : this.successPercentage;
      case 'total-streaks':
        return this.totalStreaks ?? 0;
      case 'highest-streak':
        return this.totalStreaks ?? 0;
      default:
        return '';
    }
  }

  getStatIcon(slot: string): string {
    switch (slot) {
      case 'coins':
        return this.coinsIcon;
      case 'streak':
        return this.streakIcon;
      case 'current-streak':
        return this.streakIcon;
      case 'badges':
        return this.badgesIcon;
      case 'success':
        return this.successIcon;
      case 'total-streaks':
        return this.totalStreaksIcon;
      case 'highest-streak':
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

  async openStreakPageIf(slot: string) {
    if (slot === 'streak' || slot === 'current-streak') {
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
