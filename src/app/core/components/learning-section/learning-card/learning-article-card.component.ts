import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';
import { LearningCardData } from 'src/app/core/models/learning.models';

@Component({
    selector: 'learning-article-card',
    templateUrl: './learning-article-card.component.html',
    styleUrls: ['./learning-article-card.component.scss'],
    standalone: true,
    imports: [MindfulButtonComponent]
})
export class LearningArticleCardComponent {
    @Input() item!: LearningCardData;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ item: LearningCardData; index: number }>();

    constructor(private router: Router) { }

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
        // Navigate with the article ID
        this.router.navigate(['/authed/content/article', this.item.id]);
    }
}