import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    MindfulNavigatorComponent,
    MindfulPetComponent,
    MindfulButtonComponent
  ],
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.scss']
})
export class ResultPageComponent implements OnInit {
  quizAceBadge: any = {
    name: 'Quiz Ace',
    description: 'You answered 5 quizzes correctly in a row!',
    iconUrl: 'assets/Icons-Neutral/Icon-Badge-QuizAce.png'
  };

  puzzleMasterBadge: any = {
    name: 'Puzzle Master',
    description: 'You solved 10 puzzles correctly!',
    iconUrl: 'assets/Icons-Neutral/Icon-Badge-PuzzleMaster.png'
  };

  constructor(private router: Router) { }

  ngOnInit(): void {
    // In a real implementation, you would fetch the actual badge data here
  }

  onCancel(): void {
    // Navigate back to the previous page or home
    this.router.navigate(['/']);
  }

  onPetClick(): void {
    // Handle pet click event
    console.log('Pet clicked!');
  }

  onContinue(): void {
    // Navigate to the next page or home
    this.router.navigate(['/']);
  }
}