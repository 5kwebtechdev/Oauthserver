import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';

export interface AcademyCardData {
  id?: number | string;
  image?: string | null;
  title: string;
  lessons?: number | null;
  duration?: string;
  coins?: number | null;
  description?: string;
  level?: string;
  isCompleted?: boolean;
  completionPercentage?: number;
}

@Component({
  selector: 'app-academy-card',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  templateUrl: './academy-card.component.html',
  styleUrls: ['./academy-card.component.scss']
})
export class AcademyCardComponent {
  @Input() image: string | null = null;
  @Input() title: string = '';
  @Input() lessons: number | null = null;
  @Input() duration: string = '';
  @Input() coins: number | null = null;
  @Input() description: string = '';
  @Input() level: string = 'Beginner';
  @Input() isCompleted: boolean = false;
  @Input() completionPercentage: number = 0;
  @Input() disabled: boolean = false;

  @Output() start = new EventEmitter<void>();
  @Output() cardClick = new EventEmitter<void>();

  /**
   * Emit start event
   */
  onStart(event: Event): void {
    event.stopPropagation();
    if (!this.disabled) {
      this.start.emit();
    }
  }

  /**
   * Emit card click event
   */
  onCardClick(): void {
    if (!this.disabled) {
      this.cardClick.emit();
    }
  }

  /**
   * Get level badge class
   */
  get levelClass(): string {
    const levelMap: Record<string, string> = {
      'Beginner': 'beginner',
      'Intermediate': 'intermediate',
      'Advanced': 'advanced',
      'Pro': 'pro'
    };
    return levelMap[this.level] || 'beginner';
  }

  /**
   * Get button text based on completion status
   */
  get buttonText(): string {
    if (this.isCompleted) return 'Review';
    if (this.completionPercentage > 0) return 'Continue';
    return 'Start';
  }

  /**
   * Format meta text (lessons • duration)
   */
  get metaText(): string {
    const parts: string[] = [];
    if (this.lessons !== null) {
      parts.push(`${this.lessons} lesson${this.lessons !== 1 ? 's' : ''}`);
    }
    if (this.duration) {
      parts.push(this.duration);
    }
    return parts.join(' • ');
  }
}
