import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reels-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reels-card.component.html',
  styleUrls: ['./reels-card.component.scss']
})
export class ReelsCardComponent {
  @Input() reel: any = {};
  @Output() reelClick = new EventEmitter<any>();

  /**
   * Joined hashtags for display, with a safe fallback when none are provided.
   */
  get hashtagsDisplay(): string {
    const tags = this.reel && this.reel.hashtags;
    if (Array.isArray(tags) && tags.length > 0) {
      return tags.join(', ');
    }
    // Dummy/default hashtags
    return '#science, #kids, #learning';
  }

  /**
   * Handle card click to open reel in expanded view
   */
  onCardClick(event: Event): void {
    // Don't trigger if clicking on bookmark button
    const target = event.target as HTMLElement;
    if (target.closest('.bookmark')) {
      return;
    }
    this.reelClick.emit(this.reel);
  }

  /**
   * Handle bookmark click (prevent event bubbling)
   */
  onBookmarkClick(event: Event): void {
    event.stopPropagation();
    // TODO: Implement bookmark functionality
    console.log('Bookmark clicked for reel:', this.reel.id);
  }
}
