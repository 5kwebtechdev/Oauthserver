import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sm-coin-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coin-card.component.html',
  styleUrls: ['./coin-card.component.scss']
})
export class CoinCardComponent {
  @Input() title: string = 'Panda Superhero Cape';
  @Input() date: string = 'April 11, 2025';
  @Input() changeValue: number = -120;
  @Input() imageSrc: string = '';
  @Input() contentType: string = '';
  readonly fallbackIcon = '/assets/Icons-Neutral/Icons-Coins.png';

  get changeLabel(): string {
    return (this.changeValue > 0 ? '+' : '') + String(this.changeValue);
  }

  get changeClass(): string {
    return this.changeValue >= 0 ? 'positive' : 'negative';
  }

  get isDailyBonus(): boolean {
    return this.contentType.toLowerCase() === 'daily bonus';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.fallbackIcon;
  }
}
