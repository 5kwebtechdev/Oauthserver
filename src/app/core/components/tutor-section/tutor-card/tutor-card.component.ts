import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from "@ionic/angular";
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { TutorListComponent, Tutor } from '../tutor-list/tutor-list.component';

@Component({
  selector: 'tutor-card',
  templateUrl: './tutor-card.component.html',
  styleUrls: ['./tutor-card.component.scss'],
  imports: [IonicModule, ViewAllComponent, TutorListComponent, MindfulCardHeaderComponent],
  standalone: true
})
export class TutorCardComponent {
  constructor(private router: Router) { }
  @Input() name: string = '';
  @Input() avatar: string = '';
  @Input() description: string = '';
  @Input() rating: number = 0;
  @Input() experience: string = '';
  @Input() isOnline: boolean = false;

  @Input() tutors: Tutor[] = [];

  ngOnInit(): void {
    if (!this.tutors || this.tutors.length === 0) {
      this.tutors = [
        { name: this.name || 'Mr. Sharma', avatar: this.avatar, description: this.description, rating: this.rating || 400, experience: this.experience || '8+ yrs' },
        { name: 'Ms. Aarthi Sharma', avatar: '/assets/images/Avatar-female.png', description: 'Math & Science Wizard', rating: 400, experience: '8+ yrs' },
        { name: this.name || 'Mr. Sharma', avatar: this.avatar, description: this.description, rating: this.rating || 400, experience: this.experience || '8+ yrs' }
      ];
    }
  }

  onViewAll() {
    // navigate to the tutors homepage
    this.router.navigate(['/authed', 'tutors']);
  }
  onViewProfile(tutor: Tutor) {
    console.log('View profile clicked for', tutor);
  }
}