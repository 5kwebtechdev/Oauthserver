import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'content-quiz',
  standalone: true,
  imports: [CommonModule, MindfulPetComponent, MindfulButtonComponent],
  templateUrl: './content-quiz.component.html',
  styleUrls: ['./content-quiz.component.scss']
})
export class ContentQuizComponent {
  question = 'If you have 3 apples and get 2 more, how many do you have?';
  answers = [
    { id: 1, text: '4 apples' },
    { id: 2, text: '5 apples' },
    { id: 3, text: '6 apples' },
    { id: 4, text: '5 apples (but one is hidden)' }
  ];
  selectedAnswerId?: number;

  onSelect(id: number) {
    this.selectedAnswerId = id;
  }

  onNext() {
    // placeholder: navigate to next question or close
    console.log('Next question');
  }

  onHint() {
    console.log('Request hint');
  }
}
