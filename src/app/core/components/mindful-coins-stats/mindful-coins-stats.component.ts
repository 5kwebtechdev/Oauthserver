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

  // New stat inputs
  @Input() successPercentage: number | string = 0; // e.g. 85 (percent)
  @Input() totalStreaks: number | string = 0; // total historical streaks count

  // Optional icon overrides
  @Input() coinsIcon: string = '/assets/app-assets/Coins-icon-common.svg';
  @Input() streaksIcon: string = '/assets/app-assets/Trophies-icon-common.svg';
  @Input() daysIcon: string = '/assets/app-assets/Steaks-icon-common.svg';
  @Input() badgesIcon: string = '/assets/app-assets/Badge.svg';
  @Input() successIcon: string = '/assets/app-assets/habit-success-percentage-icon.svg';
  @Input() totalStreaksIcon: string = '/assets/app-assets/habit-total-streak-icon.svg';

  /**
   * slot types allow the caller to decide which stat appears in each column.
   * Allowed values: 'coins' | 'streaks' | 'days' | 'badges' | 'success' | 'total-streaks'
   * Example: <mindful-coins-stats [slot1]="'coins'" [slot2]="'success'" ...>
   */
  @Input() slot1: string = 'coins';
  @Input() slot2: string = 'streaks';
  @Input() slot3: string = 'days';
  @Input() slot4: string = 'badges';

  // Helper to format value for display in template
  getStatValue(slot: string): string | number {
    switch (slot) {
      case 'coins':
        return this.userCoins ?? 0;
      case 'streaks':
        return this.userStreaks ?? 0;
      case 'days':
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
      case 'streaks':
        return this.streaksIcon;
      case 'days':
        return this.daysIcon;
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
