import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badges-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badges-card.component.html',
  styleUrls: ['./badges-card.component.scss']
})
export class BadgesCardComponent {
  /** Title shown under the ring */
  @Input() title = 'Coin Collector';
  /** Current value (e.g. collected coins) */
  @Input() current = 400;
  /** Total value to complete the badge */
  @Input() total = 500;
  /** URL to the badge image (place image in `src/assets/images/badges/` or provide a full URL) */
  @Input() imageUrl = 'assets/images/badges/coin-collector.png';
  /** Optional description line (can be multi-line). If not provided we calculate a default message. */
  @Input() description?: string;
  /** Level text (e.g. "Level 1 - Streak Keeper") */
  @Input() levelText = '';
  /** Achievement text (e.g. "Maintained 7-day streak!") */
  @Input() achievementText = '';
  /** Progress color for the ring */
  @Input() progressColor = '#4CAF50';

  get progress(): number {
    if (!this.total || this.total <= 0) { return 0; }
    return Math.min(1, Math.max(0, this.current / this.total));
  }

  get percentageText(): string {
    return `${this.current}/${this.total}`;
  }

  get computedDescription(): string {
    if (this.description) { return this.description; }
    const remaining = Math.max(0, this.total - this.current);
    if (remaining === 0) { return 'Badge earned!'; }
    return `${remaining} more to earn this badge`;
  }
}
