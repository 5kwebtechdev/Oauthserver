import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';
import { MindfulBadgeComponent } from 'src/app/core/components/mindful-badge/mindful-badge.component';

@Component({
    selector: 'learning-article-card',
    templateUrl: './learning-article-card.component.html',
    styleUrls: ['./learning-article-card.component.scss'],
    standalone: true,
    imports: [MindfulButtonComponent, MindfulBadgeComponent]
})
export class LearningArticleCardComponent {
    @Input() item: any;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ item: any; index: number }>();

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
    }
}
