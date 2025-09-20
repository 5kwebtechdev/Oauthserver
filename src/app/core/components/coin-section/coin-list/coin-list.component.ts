import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'coin-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coin-list.component.html',
  styleUrls: ['./coin-list.component.scss']
})
export class CoinListComponent {
  @Input() icon = '/assets/app-assets/Coins-icon-common.svg';
  @Input() label = 'Coins';
  @Input() count: string | number = 0;
  @Input() date: Date | string | null = null;
  @Input() coinIcon: string = '/assets/app-assets/Coins-icon-common.svg';
}
