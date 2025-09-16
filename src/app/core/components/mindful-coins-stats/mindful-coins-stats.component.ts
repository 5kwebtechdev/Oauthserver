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

  // Optional icon overrides
  @Input() coinsIcon: string = '/assets/app-assets/Coins-icon-common.svg';
  @Input() streaksIcon: string = '/assets/app-assets/Trophies-icon-common.svg';
  @Input() daysIcon: string = '/assets/app-assets/Steaks-icon-common.svg';
  @Input() badgesIcon: string = '/assets/app-assets/Badge.svg';
}
