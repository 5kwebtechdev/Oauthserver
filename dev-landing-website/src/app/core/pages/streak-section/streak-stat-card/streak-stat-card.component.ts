import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'streak-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './streak-stat-card.component.html',
  styleUrls: ['./streak-stat-card.component.scss']
})
export class StreakStatCardComponent {
  @Input() title: string = 'Streak';
  @Input() icon: string | undefined; // can be emoji or image path
  @Input() value: number | string = 0;
  @Input() showLarge: boolean = false;

  get isImage(): boolean {
    if (!this.icon) return false;
    // treat strings that look like URLs or asset paths as images
    return /^(https?:)?\/\//i.test(this.icon) || this.icon.startsWith('/') || this.icon.startsWith('assets/');
  }
}
