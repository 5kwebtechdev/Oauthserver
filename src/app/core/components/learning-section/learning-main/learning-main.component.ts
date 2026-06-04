import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { MindfulPetComponent } from 'src/app/core/components/mindful-pet/mindful-pet.component';
import { MindfulSpeechBubbleComponent } from 'src/app/core/components/mindful-speech-bubble/mindful-speech-bubble.component';
import { LearningChallengeCardComponent } from '../learning-card/learning-challenge-card.component';
import { LearningArticleCardComponent } from '../learning-card/learning-article-card.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { LearningCardData } from 'src/app/core/models/learning.models';
import { EmptyStateComponent } from 'src/app/core/components/empty-state/empty-state.component';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, HttpClientModule, FooterComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, LearningChallengeCardComponent, LearningArticleCardComponent, EmptyStateComponent],
  providers: [LearningService]
})
export class LearningMainComponent implements OnInit, OnDestroy, ViewWillEnter {
  @Input() title: string = '';
  @Input() body: string = '';

  selectedCategory: 'for-you' | 'puzzles' | 'quizzes' | 'articles' | null = 'for-you';

  // Plain arrays — bound directly in the template
  forYouItems: LearningCardData[] = [];
  puzzleItems: LearningCardData[] = [];
  quizItems: LearningCardData[] = [];
  articleItems: LearningCardData[] = [];
  searchItems: LearningCardData[] = [];

  isLoading = false;
  searchKeyword = '';
  isSearching = false;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private learningService: LearningService) { }

  ngOnInit(): void {
    this.loadData();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(keyword => {
      if (keyword.trim()) {
        this.performSearch();
      } else {
        this.clearSearch();
      }
    });
  }

  ionViewWillEnter(): void { this.loadData(); }

  private loadData(): void {
    this.isLoading = true;
    this.forYouItems = [];
    this.puzzleItems = [];
    this.quizItems = [];
    this.articleItems = [];

    // Single call fetches GET /challenges + GET /articles, then filter per tab
    this.learningService.getAllContent()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          const all = items || [];
          this.forYouItems = all;
          this.puzzleItems  = all.filter(c => c.type === 'puzzle');
          this.quizItems    = all.filter(c => c.type === 'quiz');
          this.articleItems = all.filter(c => c.type === 'article');
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes' | 'articles') {
    this.selectedCategory = cat;
    if (this.isSearching && this.searchKeyword.trim()) {
      this.performSearch();
    }
  }

  openForYou() { this.selectCategory('for-you'); }
  openPuzzles() { this.selectCategory('puzzles'); }
  openQuizzes() { this.selectCategory('quizzes'); }
  openArticles() { this.selectCategory('articles'); }

  onSearchInput(): void {
    this.searchSubject.next(this.searchKeyword);
  }

  onSearch(): void {
    this.searchSubject.next(this.searchKeyword);
  }

  performSearch(): void {
    const keyword = this.searchKeyword.trim();
    if (!keyword) { this.clearSearch(); return; }

    this.isSearching = true;
    this.isLoading = true;
    this.searchItems = [];

    const categoryMap: Record<string, string | undefined> = {
      'for-you': undefined,
      'puzzles': 'puzzle',
      'quizzes': 'quiz',
      'articles': 'article'
    };
    const category = categoryMap[this.selectedCategory || 'for-you'];

    this.learningService.search(keyword, category)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: LearningCardData[]) => { this.searchItems = res || []; this.isLoading = false; },
        error: () => { this.isLoading = false; }
      });
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.isSearching = false;
    this.searchItems = [];
  }

  onCardClick(event: any) { }
}
