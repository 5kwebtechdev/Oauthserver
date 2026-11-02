import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { Router } from '@angular/router';

@Component({
  selector: 'activity-card',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss']
})
export class ActivityCardComponent {
  @Input() activity!: any;
  // Default thumbnail to use when activity.image is not provided
  readonly defaultThumbnail = '/assets/Images-Thumbnails/Image-Content-ThumbnailRandom.jpg';

  constructor(private router: Router) {}

  openDescription() {
    const id = this.activity?.id ?? '';
    if (this.activity?.type === 'Article') {
      this.router.navigate(this.activity?.slug ? ['/article', this.activity.slug] : ['/home/learning/article', id]);
    } else {
      this.router.navigate(['/home/learning/description', id]);
    }
  }

  get imageUrl(): string {
    return this.activity?.image || this.defaultThumbnail;
  }

  get buttonText(): string {
    const d = this.activity?.timeDuration;
    if (this.activity?.type === 'Article') {
      return d ? `Read in ${d} mins` : 'Read';
    }
    return d ? `Finish in ${d} mins` : 'Start';
  }

  get tagLabel(): string {
    const tags = this.activity?.tags;
    if (Array.isArray(tags)) {
      return tags
        .map((tag: any) => typeof tag === 'string' ? tag : (tag?.name || tag?.tagName || tag?.label || tag?.value || ''))
        .filter(Boolean)
        .join(', ');
    }
    if (tags && typeof tags === 'object') {
      return tags.name || tags.tagName || tags.label || tags.value || '';
    }
    return (tags || '').toString().trim();
  }

  get typeLabel(): string {
    return this.activity?.type === 'Article' && this.tagLabel ? this.tagLabel : this.activity?.type;
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    const fallback = this.defaultThumbnail;
    if (!img.src.endsWith(fallback)) img.src = fallback;
  }
}
