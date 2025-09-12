import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'new-reels',
  templateUrl: './new-reels.component.html',
  styleUrls: ['./new-reels.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class NewReelsComponent {
  @Input() items: any[] = [];
}
