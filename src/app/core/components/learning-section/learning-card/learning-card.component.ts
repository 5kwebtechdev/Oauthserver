import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';

@Component({
    selector: 'learning-card',
    templateUrl: './learning-card.component.html',
    styleUrls: ['./learning-card.component.scss'],
    imports: [MindfulButtonComponent],
    standalone: true
})
export class LearningCardComponent {
    @Input() item: any;
    @Input() index: number = 0;
    @Output() cardClick = new EventEmitter<{ item: any; index: number }>();

    onCardClick() {
        this.cardClick.emit({ item: this.item, index: this.index });
    }
}
