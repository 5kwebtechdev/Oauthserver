import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sm-coin-helpline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coin-helpline.component.html',
  styleUrls: ['./coin-helpline.component.scss']
})
export class CoinHelplineComponent {
  @Output() close = new EventEmitter<void>();
}
