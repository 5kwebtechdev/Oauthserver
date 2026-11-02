import { Component, OnInit } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { FooterComponent } from '../../../components/footer/footer.component';
import { LearningChallengeCardComponent, Challenge, LearningArticleCardComponent, Article } from '../learning-card';
import { SupremePetBubbleComponent } from '../../../components/superme-pet-bubble/superme-pet-bubble.component';
import { LearningService } from '../learning.service';
import { LearningCardData } from '../learning.models';
import { AdSliderComponent } from '../../../components/ad-slider/ad-slider.component';
import { CategoryComponent } from '../masterclass-categories/category.component';

type CategoryType = 'for-you' | 'puzzles' | 'quizzes' | 'articles';

@Component({
  selector: 'sm-learning-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, FooterComponent, LearningChallengeCardComponent, LearningArticleCardComponent, SupremePetBubbleComponent, AdSliderComponent, CategoryComponent],
  templateUrl: './learning-page.component.html',
  styleUrls: ['./learning-page.component.scss']
})
export class LearningPageComponent implements OnInit {
  selectedCategory: CategoryType = 'for-you';
  searchQuery = '';

  puzzleCards$!: Observable<LearningCardData[]>;
  quizCards$!: Observable<LearningCardData[]>;
  articleCards$!: Observable<LearningCardData[]>;

  get adScreen(): 'ROCKS' | 'TUTOR' | 'ACCELERARY' | 'ARTICLES' {
    const screenMap: Record<CategoryType, 'ROCKS' | 'TUTOR' | 'ACCELERARY' | 'ARTICLES'> = {
      'for-you': 'ROCKS',
      quizzes: 'TUTOR',
      puzzles: 'ACCELERARY',
      articles: 'ARTICLES'
    };
    return screenMap[this.selectedCategory];
  }

  constructor(private learningService: LearningService) { }

  ngOnInit(): void {
    // Each tab's data is fetched lazily, independently, the first time its
    // section actually renders (see the template's async-pipe-driven *ngIf
    // blocks) - no shared loading flag, so tabs can't cancel one another.
    this.puzzleCards$ = this.learningService.getPuzzleCards();
    this.quizCards$ = this.learningService.getQuizCards();
    this.articleCards$ = this.learningService.getArticleCards();

    const typeMap: Record<string, CategoryType> = {
      quiz: 'quizzes',
      puzzle: 'puzzles',
      article: 'articles',
      masterclass: 'for-you'
    };
    const navType = (history.state as any)?.type;
    if (navType && typeMap[navType]) {
      this.selectedCategory = typeMap[navType];
    }
  }

  selectCategory(cat: CategoryType): void {
    this.selectedCategory = cat;
  }

  onSearchChange(e: Event): void {
    this.searchQuery = (e.target as HTMLInputElement).value;
  }

  mapToArticle(card: LearningCardData): Article {
    return {
      title: card.title || '',
      description: card.description || '',
      tags: card.tags,
      thumbnailUrl: card.image || '',
      timeDuration: card.timeDuration || '',
      coins: card.coins,
      id: card.id,
      slug: card.slug
    };
  }

  mapToChallenge(card: LearningCardData): Challenge {
    return {
      name: card.title || '',
      description: card.description || '',
      category: (card.type || 'puzzle').toUpperCase(),
      difficulty: (card.difficulty || 'EASY').toUpperCase(),
      coins: card.coins,
      trophies: card.trophy || 0,
      timeDuration: card.timeDuration || '',
      thumbnailImageUrl: card.image || '',
      id: card.id
    };
  }

  onCardClick(event: any): void {
    console.log('Card clicked:', event);
  }

  filterCards(cards: LearningCardData[]): LearningCardData[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(card =>
      (card.title || '').toLowerCase().includes(q) ||
      (card.description || '').toLowerCase().includes(q) ||
      ((card as any).tags || []).some((t: string) => t.toLowerCase().includes(q))
    );
  }
}
