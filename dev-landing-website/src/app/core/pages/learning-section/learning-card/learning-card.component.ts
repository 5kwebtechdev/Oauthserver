import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningChallengeCardComponent, Challenge } from './learning-challenge-card.component';
import { LearningArticleCardComponent, Article } from './learning-article-card.component';

export interface LearningCardItem {
  id: string | number;
  type: 'article' | 'puzzle' | 'quiz' | 'challenge';
  name?: string;
  title?: string;
  description: string;
  thumbnailImageUrl?: string;
  thumbnailUrl?: string;
  timeDuration: string;
  category?: string;
  tags?: string;
  difficulty?: string;
  coins?: number;
  trophies?: number;
}

@Component({
  selector: 'learning-card',
  standalone: true,
  imports: [CommonModule, LearningChallengeCardComponent, LearningArticleCardComponent],
  template: `
    <ng-container *ngIf="item.type === 'article'; else challenge">
      <learning-article-card [article]="mapToArticle(item)" [index]="index" (cardClick)="cardClick.emit($event)"></learning-article-card>
    </ng-container>
    <ng-template #challenge>
      <learning-challenge-card [challenge]="mapToChallenge(item)" [index]="index" (cardClick)="cardClick.emit($event)"></learning-challenge-card>
    </ng-template>
  `,
  host: { class: 'slide' }
})
export class LearningCardComponent {
  @Input() item!: LearningCardItem;
  @Input() index = 0;
  @Output() cardClick = new EventEmitter<any>();

  mapToArticle(item: LearningCardItem): Article {
    return {
      title: item.title || '',
      description: item.description,
      tags: item.tags,
      thumbnailUrl: item.thumbnailUrl || item.thumbnailImageUrl || '',
      timeDuration: item.timeDuration,
      coins: item.coins,
      id: item.id
    };
  }

  mapToChallenge(item: LearningCardItem): Challenge {
    return {
      name: item.name || item.title || '',
      description: item.description,
      category: item.category || item.type.toUpperCase(),
      difficulty: item.difficulty || 'EASY',
      coins: item.coins,
      trophies: item.trophies,
      timeDuration: item.timeDuration,
      thumbnailImageUrl: item.thumbnailImageUrl || item.thumbnailUrl || '',
      id: item.id
    };
  }
}
