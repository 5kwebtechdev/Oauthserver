import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { MindfulPetComponent } from 'src/app/core/components/mindful-pet/mindful-pet.component';
import { MindfulSpeechBubbleComponent } from 'src/app/core/components/mindful-speech-bubble/mindful-speech-bubble.component';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FooterComponent, MindfulSpeechBubbleComponent, MindfulPetComponent]
})
export class LearningMainComponent {
  @Input() title: string = '';
  @Input() body: string = '';


  // track which category is selected so we can show the bottom border only on the selected one
  selectedCategory: 'for-you' | 'puzzles' | 'quizzes' | null = null;

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes') {
    this.selectedCategory = cat;
  }

  // inject Router to navigate within the app
  constructor(private router: Router) { }

  openForYou() {
    // open the For You page in a new tab, same behavior as the previous anchor
    window.open('/for-you', '_blank', 'noopener');
  }

  openPuzzles() {
    // puzzles is an external page in this app; open in new tab to preserve previous behavior
    window.open('/puzzles', '_blank', 'noopener');
  }

  openQuizzes() {
    // quizzes route lives under content/description; navigate internally
    this.router.navigate(['/content', 'description']);
  }
}
