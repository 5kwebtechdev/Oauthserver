import { Component, Input, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { MindfulPetComponent } from 'src/app/core/components/mindful-pet/mindful-pet.component';
import { MindfulSpeechBubbleComponent } from 'src/app/core/components/mindful-speech-bubble/mindful-speech-bubble.component';
import { LearningChallengeCardComponent } from '../learning-card/learning-challenge-card.component';
import { LearningArticleCardComponent } from '../learning-card/learning-article-card.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { LearningCardData } from 'src/app/core/models/learning.models';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HttpClientModule, FooterComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, LearningChallengeCardComponent, LearningArticleCardComponent],
  providers: [LearningService]
})
export class LearningMainComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() body: string = '';

  selectedCategory: 'for-you' | 'puzzles' | 'quizzes' | 'articles' | null = 'for-you';

  puzzleCards$!: Observable<LearningCardData[]>;
  quizCards$!: Observable<LearningCardData[]>;
  articleCards$!: Observable<LearningCardData[]>;
  forYouContent$!: Observable<LearningCardData[]>;

  isLoading$!: Observable<boolean>;

  private destroy$ = new Subject<void>();

  constructor(private learningService: LearningService) { }

  ngOnInit(): void {
    console.log('Learning Main Component initialized');
    console.log('API URL:', 'http://ec2-13-126-1-142.ap-south-1.compute.amazonaws.com:3000/v1');

    // Initialize observables from the learning service
    this.puzzleCards$ = this.learningService.getPuzzleCards();
    this.quizCards$ = this.learningService.getQuizCards();
    this.articleCards$ = this.learningService.getArticleCards();
    this.forYouContent$ = this.learningService.getAllContent();

    // Combine loading states
    this.isLoading$ = this.learningService.isLoading$;

    console.log('Observables initialized');

    // Trigger initial data load by subscribing to the default category
    console.log('Triggering initial data load for For You category');
    this.forYouContent$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (content) => {
        console.log('For You content loaded:', content.length, 'items');
      },
      error: (error) => {
        console.error('Error loading For You content:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes' | 'articles') {
    this.selectedCategory = cat;
  }

  openForYou() {
    this.selectCategory('for-you');
  }

  openPuzzles() {
    this.selectCategory('puzzles');
  }

  openQuizzes() {
    this.selectCategory('quizzes');
  }

  openArticles() {
    this.selectCategory('articles');
  }

  onCardClick(event: any) {
    console.log('Card clicked:', event);
  }
}
