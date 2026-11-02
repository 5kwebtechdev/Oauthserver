import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';

export interface Article {
    title: string;
    description: string;
    tags?: string | string[];
    thumbnailUrl: string;
    timeDuration: string;
    coins?: number;
    id?: string | number;
    slug?: string;
}

@Component({
    selector: 'learning-article-card',
    templateUrl: './learning-article-card.component.html',
    styleUrls: ['./learning-article-card.component.scss'],
    standalone: true,
    imports: [CommonModule, SupermeButtonComponent]
})
export class LearningArticleCardComponent {
    @Input() article!: Article;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ article: Article; index: number }>();

    readonly defaultThumbnail = '/assets/Images-Thumbnails/Image-Content-ThumbnailRandom.jpg';

    constructor(private router: Router) { }

    get imageUrl(): string {
        return this.article?.thumbnailUrl || this.defaultThumbnail;
    }

    get buttonText(): string {
        const d = this.article?.timeDuration;
        return d ? `Read in ${d} mins` : 'Read';
    }

    get tagLabel(): string {
        const tags = this.article?.tags;
        if (Array.isArray(tags)) {
            return tags.filter(Boolean).join(', ');
        }
        return (tags || '').trim();
    }

    openDescription() {
        this.cardClick.emit({ article: this.article, index: this.index });
        if (this.article.slug) {
            this.router.navigate(['/article', this.article.slug]);
        } else if (this.article.id) {
            this.router.navigate(['/home/learning/article', this.article.id]);
        }
    }

    onImgError(event: Event) {
        const img = event.target as HTMLImageElement | null;
        if (img && !img.src.endsWith(this.defaultThumbnail)) {
            img.src = this.defaultThumbnail;
        }
    }
}
