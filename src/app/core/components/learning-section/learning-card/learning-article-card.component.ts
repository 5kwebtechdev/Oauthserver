import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
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

    constructor(private router: Router) { }

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
        // Navigate to the article page instead of the general description page
        this.router.navigate(['/authed/content/article']);
    }
}