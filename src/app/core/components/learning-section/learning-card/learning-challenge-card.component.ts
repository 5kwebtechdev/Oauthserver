import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';
import { MindfulBadgeComponent } from 'src/app/core/components/mindful-badge/mindful-badge.component';

@Component({
    selector: 'learning-challenge-card',
    templateUrl: './learning-challenge-card.component.html',
    styleUrls: ['./learning-challenge-card.component.scss'],
    standalone: true,
    imports: [CommonModule, MindfulButtonComponent, MindfulBadgeComponent]
})
export class LearningChallengeCardComponent {
    @Input() item: any;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ item: any; index: number }>();

    constructor(private router: Router) { }

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
        this.router.navigate(['/learning-description']);
    }

    // Type-safe image error handler used by the template.
    // Ensures `src` is set on the actual HTMLImageElement and avoids template type errors.
    onImageError(event: Event) {
        const img = event.target as HTMLImageElement | null;
        if (img) {
            img.src = '/assets/icons/Flux_Dev_a_surreal_and_vibrant_cinematic_photo_of_A_minimal_ye_3%201.jpg';
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
            return '/assets/Images-Transparent/Image-Content-Easy.png';
        }

        if (diff === 'hard') {
            return '/assets/Images-Transparent/Image-Content-Hard.png';
        }

        return this.item?.difficultyImage ?? null;
    }
}
