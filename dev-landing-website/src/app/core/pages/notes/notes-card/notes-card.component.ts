import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'notes-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes-card.component.html',
  styleUrls: ['./notes-card.component.scss']
})
export class NotesCardComponent {
  /**
   * Note data object containing all note information
   * @property {string} excerpt - Preview text of the note
   * @property {string} title - Title of the note
   * @property {string} date - Creation or modification date
   * @property {string} tag - Category or tag label
   */
  @Input() note!: {
    excerpt: string;
    title: string;
    date: string;
    tag: string;
  };

  @Output() cardClick = new EventEmitter<any>();

  onCardClick(): void {
    this.cardClick.emit(this.note);
  }

  /**
   * Handles keyboard accessibility (Enter key)
   * Triggers card click on Enter press
   * @param event - Keyboard event
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClick();
    }
  }

  get truncatedTitle(): string {
    return this.truncate(this.note?.title ?? '', 16);
  }

  get truncatedExcerpt(): string {
    return this.truncate(this.note?.excerpt ?? '', 48);
  }

  private truncate(text: string, limit: number): string {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit).trimEnd() + '…' : text;
  }
}
