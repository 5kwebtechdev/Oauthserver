import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Entry point to the Refer & Win contest, placed at the top of the referral
 * screen (8px under the back button). Emits `open` when tapped.
 */
@Component({
  selector: 'app-contest-banner',
  standalone: true,
  templateUrl: './contest-banner.component.html',
  styleUrls: ['./contest-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContestBannerComponent {
  @Input() months = 3;
  @Input() heroImage = 'assets/referral/contest/iphone-18-pro.png';
  @Output() open = new EventEmitter<void>();
}
