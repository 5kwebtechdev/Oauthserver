import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bookmark-reels',
  templateUrl: './bookmark-reels.component.html',
  styleUrls: ['./bookmark-reels.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class BookmarkReelsComponent {
  @Input() items: any[] = [];
}
