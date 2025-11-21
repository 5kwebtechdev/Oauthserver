import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'app-learning-description',
  standalone: true,
  imports: [CommonModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './learning-description.component.html',
  styleUrls: ['./learning-description.component.scss']
})
export class LearningDescriptionComponent {
  heading: string = 'Apple Orchard Math Challenge';
  constructor(private router: Router) { }

  startJourney() {
    // navigate to the existing quizzes route
    this.router.navigate(['/quizzes']);
  }
}
