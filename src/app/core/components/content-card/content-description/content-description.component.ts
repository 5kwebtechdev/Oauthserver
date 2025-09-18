import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'app-content-description',
  standalone: true,
  imports: [CommonModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './content-description.component.html',
  styleUrls: ['./content-description.component.scss']
})
export class ContentDescriptionComponent {
  heading: string = 'Apple Orchard Math Challenge';
  constructor(private router: Router) {}

  startJourney() {
    // navigate to the existing quizzes route
    this.router.navigate(['/quizzes']);
  }
}
