import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-coins-stats',
  templateUrl: './mindful-coins-stats.component.html',
  styleUrls: ['./mindful-coins-stats.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class MindfulCoinsStatsComponent {
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
  @Input() successIcon: string = '/assets/Icons-Neutral/Icons-Habit-Success-Percentage.png';
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
}
