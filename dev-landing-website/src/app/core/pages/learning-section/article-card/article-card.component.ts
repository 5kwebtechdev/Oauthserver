import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { LearningCardData } from '../learning.models';

@Component({
  selector: 'learning-article-card',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  templateUrl: './article-card.component.html',
  styleUrls: ['./article-card.component.scss']
})
export class LearningArticleCardComponent {
  @Input() item!: LearningCardData;
  @Input() index: number = 0;
  @Output() cardClick = new EventEmitter<{ item: LearningCardData; index: number }>();

  readonly defaultImage = '/assets/Images-Thumbnails/Image-Content-ThumbnailRandom.jpg';

  constructor(private router: Router) { }

  /**
   * Handle card click - navigate to article page
   */
  onCardClick(): void {
    if (!this.item) return;
    this.cardClick.emit({ item: this.item, index: this.index });
    this.router.navigate(this.item.slug
      ? ['/article', this.item.slug]
      : ['/home/learning/articles', this.item.id]);
  }

  /**
   * Get image URL with fallback
   */
  get imageUrl(): string {
    return this.item?.image || this.defaultImage;
  }

  /**
   * Handle image load error
   */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.endsWith(this.defaultImage)) {
      img.src = this.defaultImage;
    }
  }

  /**
   * Get read time display text
   */
  get readTimeText(): string {
    return this.item?.timeDuration || 'Read in 5 min';
  }
}
