import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupermeButtonComponent } from 'src/app/core/components/superme-button/superme-button.component';
import { LearningCardData } from 'src/app/core/models/learning.models';

@Component({
    selector: 'learning-article-card',
    templateUrl: './learning-article-card.component.html',
    styleUrls: ['./learning-article-card.component.scss'],
    standalone: true,
    imports: [CommonModule, SupermeButtonComponent]
})
export class LearningArticleCardComponent implements OnChanges {
    @Input() item!: LearningCardData;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ item: LearningCardData; index: number }>();

    constructor(private router: Router) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['item'] && this.item) {
            console.log('LearningArticleCard - item.id=', this.item.id, 'tags=', this.item.tags, 'coins=', this.item.coins);
        }
    }

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
        // Navigate with the article ID
        this.router.navigate(['/authed/content/article', this.item.id]);
    }
}