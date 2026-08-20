import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupermeButtonComponent } from 'src/app/core/components/superme-button/superme-button.component';
import { SupermeBadgeComponent } from 'src/app/core/components/superme-badge/superme-badge.component';
import { LearningCardData } from 'src/app/core/models/learning.models';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';

@Component({
    selector: 'learning-challenge-card',
    templateUrl: './learning-challenge-card.component.html',
    styleUrls: ['./learning-challenge-card.component.scss'],
    standalone: true,
    imports: [CommonModule, SupermeButtonComponent, SupermeBadgeComponent, SkeletonImageComponent]
})
export class LearningChallengeCardComponent {
    @Input() item!: LearningCardData;
    @Input() index: number = 0;
    /** Optional source route to return to when the challenge is closed. */
    @Input() source?: string;
    @Output() cardClick = new EventEmitter<{ item: LearningCardData; index: number }>();

    constructor(private router: Router) { }

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
        // Quiz and puzzle cards start the challenge immediately. The questions
        // page loads the full challenge by ID and returns to the originating list.
        this.router.navigate(['/authed/content/questions', this.item.id], {
            state: this.source ? { source: this.source } : undefined
        });
    }

    onCardAction(event: Event): void {
        event.stopPropagation();
        this.onCardClick();
    }

    // Type-safe image error handler used by the template.
    // Ensures `src` is set on the actual HTMLImageElement and avoids template type errors.
    onImageError(event: Event) {
        const img = event.target as HTMLImageElement | null;
        if (img) {
            img.src = 'assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg';
        }
    }

    // Return the difficulty image path for known difficulty values,
    // or fall back to any provided `item.difficultyImage`.
    get difficultyImageSrc(): string | null {
        const diff = this.item?.difficulty?.toString().toLowerCase();
        if (!diff) {
            return this.item?.difficultyImage ?? null;
        }

        if (diff === 'easy') {
            return 'assets/Images-Transparent/Image-Content-Easy.png';
        }

        if (diff === 'hard') {
            return 'assets/Images-Transparent/Image-Content-Hard.png';
        }

        return this.item?.difficultyImage ?? null;
    }
}
