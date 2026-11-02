import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { Router } from '@angular/router';

export interface Challenge {
    name: string;
    description: string;
    category: string;
    difficulty: string;
    coins?: number;
    trophies?: number;
    timeDuration: string;
    thumbnailImageUrl: string;
    id?: string | number;
}

@Component({
    selector: 'learning-challenge-card',
    standalone: true,
    imports: [CommonModule, SupermeButtonComponent],
    templateUrl: './learning-challenge-card.component.html',
    styleUrls: ['./learning-challenge-card.component.scss']
})
export class LearningChallengeCardComponent {
    @Input() challenge!: Challenge;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ challenge: Challenge; index: number }>();

    readonly defaultThumbnail = '/assets/Images-Thumbnails/Image-Content-ThumbnailRandom.jpg';

    constructor(private router: Router) { }

    openDescription() {
        this.cardClick.emit({ challenge: this.challenge, index: this.index });
        const id = this.challenge?.id ?? this.challenge?.name ?? '';
        this.router.navigate(['/learning/description', id]);
    }

    get imageUrl(): string {
        return this.challenge?.thumbnailImageUrl || this.defaultThumbnail;
    }

    get buttonText(): string {
        const d = this.challenge?.timeDuration;
        return d ? `Finish in ${d} mins` : 'Start';
    }

    onImgError(event: Event) {
        const img = event.target as HTMLImageElement;
        if (!img) return;
        const fallback = this.defaultThumbnail;
        if (!img.src.endsWith(fallback)) img.src = fallback;
    }
}
