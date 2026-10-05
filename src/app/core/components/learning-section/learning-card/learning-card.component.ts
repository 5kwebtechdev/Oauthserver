import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { LearningChallengeCardComponent } from './learning-challenge-card.component';
import { LearningArticleCardComponent } from './learning-article-card.component';

@Component({
    selector: 'learning-card',
    host: { 'class': 'slide' },
    templateUrl: './learning-card.component.html',
    styleUrls: ['./learning-card.component.scss'],
    imports: [NgIf, LearningChallengeCardComponent, LearningArticleCardComponent],
    standalone: true
})
export class LearningCardComponent {
    @Input() item: any;
    @Input() index: number = 0;
    @Input() forUserId: string | number | null = null;
    @Input() parentPreviewOnly = false;
    /** Optional source route for back navigation from description page */
    @Input() source?: string;
    @Output() cardClick = new EventEmitter<{ item: any; index: number }>();

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
    }
}
