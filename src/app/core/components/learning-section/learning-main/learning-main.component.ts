import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { MindfulPetComponent } from 'src/app/core/components/mindful-pet/mindful-pet.component';
import { MindfulSpeechBubbleComponent } from 'src/app/core/components/mindful-speech-bubble/mindful-speech-bubble.component';
import { LearningChallengeCardComponent } from '../learning-card/learning-challenge-card.component';
import { LearningArticleCardComponent } from '../learning-card/learning-article-card.component';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FooterComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, LearningChallengeCardComponent, LearningArticleCardComponent]
})
export class LearningMainComponent {
  @Input() title: string = '';
  @Input() body: string = '';

  selectedCategory: 'for-you' | 'puzzles' | 'quizzes' | 'articles' | null = 'for-you';

  puzzleCards = [
    { title: 'Word Search Challenge', description: 'Find hidden words in the grid', image: '/assets/placeholder-puzzle.jpg', coins: 50, trophy: 10, difficulty: 'Easy', buttonText: 'Start Puzzle', type: 'puzzle' },
    { title: 'Logic Grid Puzzle', description: 'Solve the logic grid', image: '/assets/placeholder-puzzle.jpg', coins: 75, trophy: 15, difficulty: 'Medium', buttonText: 'Start Puzzle', type: 'puzzle' }
  ];

  quizCards = [
    { title: 'Mindfulness Quiz', description: 'Test your mindfulness knowledge', image: '/assets/placeholder-quiz.jpg', coins: 40, trophy: 8, difficulty: 'Easy', buttonText: 'Take Quiz', type: 'quiz' },
    { title: 'Memory Challenge', description: 'How good is your memory?', image: '/assets/placeholder-quiz.jpg', coins: 60, trophy: 12, difficulty: 'Hard', buttonText: 'Take Quiz', type: 'quiz' }
  ];

  articleCards = [
    { title: 'Benefits of Meditation', description: 'Learn how meditation can improve your life', image: '/assets/placeholder-article.jpg', coins: 30 },
    { title: 'Stress Management Tips', description: 'Practical tips for managing daily stress', image: '/assets/placeholder-article.jpg', coins: 25 }
  ];

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes' | 'articles') {
    this.selectedCategory = cat;
  }

  constructor() { }

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
