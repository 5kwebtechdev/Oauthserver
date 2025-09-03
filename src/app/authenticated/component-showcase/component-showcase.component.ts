import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Only standalone Core Components
import { ChallengeCardComponent } from '../../core/components/challenge-card/challenge-card.component';
import { ContentCardComponent } from '../../core/components/content-card/content-card.component';
import { CourseCardComponent } from '../../core/components/course-card/course-card.component';
import { FooterComponent } from '../../core/components/footer/footer.component';
import { HabitCardComponent } from '../../core/components/habit-card/habit-card.component';
import { MindfulBadgeComponent } from '../../core/components/mindful-badge/mindful-badge.component';
import { MindfulButtonComponent } from '../../core/components/mindful-button/mindful-button.component';
import { MindfulDropdownComponent } from '../../core/components/mindful-dropdown/mindful-dropdown.component';
import { MindfulSelectorsComponent } from '../../core/components/mindful-selectors/mindful-selectors.component';
import { TutorCardComponent } from '../../core/components/tutor-card/tutor-card.component';

// Only standalone Authenticated Components
import { UserDashboardComponent } from '../user-dashboard/user-dashboard.component';

@Component({
  selector: 'app-component-showcase',
  templateUrl: './component-showcase.component.html',
  styleUrls: ['./component-showcase.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule,
    // Only standalone Core Components
    ChallengeCardComponent,
    ContentCardComponent,
    CourseCardComponent,
    FooterComponent,
    HabitCardComponent,
    MindfulBadgeComponent,
    MindfulButtonComponent,
    MindfulDropdownComponent,
    MindfulSelectorsComponent,
    TutorCardComponent,
    // Only standalone Authenticated Components
    UserDashboardComponent
  ]
})
export class ComponentShowcaseComponent {
  
  // Sample data for components
  sampleContentCard = {
    title: 'Sample Science Project',
    imageUrl: '/assets/app-assets/Digital-pet-panda.svg',
    difficulty: 'Easy',
    likes: 42,
    views: 120,
    isNew: true
  };

  sampleCourseCard = {
    title: 'Life Skills Course',
    description: 'Learn important life skills',
    imageUrl: '/assets/app-assets/Digital-pet-panda.svg',
    duration: '30 min',
    progress: 65,
    isNew: false
  };

  sampleTutor = {
    name: 'John Doe',
    avatar: '/assets/app-assets/Default-avatar-home.svg',
    description: 'Math Tutor',
    rating: 4.8,
    experience: '5 years',
    isOnline: true
  };

  sampleHabit = {
    startTime: new Date().getTime() - 3600000, // 1 hour ago
    endTime: new Date().getTime() + 3600000 // 1 hour from now
  };

  sampleDropdownOptions = [
    { key: 'opt1', value: 'Option 1' },
    { key: 'opt2', value: 'Option 2' },
    { key: 'opt3', value: 'Option 3' }
  ];

  selectedDate = new Date();
  selectedTime = '10:00';
  completionPercentage = 75;

  constructor() {}

  onButtonClick() {
    console.log('Sample button clicked');
  }


}