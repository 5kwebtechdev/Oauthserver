import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../mindful-navigator/view-all/view-all.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

export interface CourseCard {
  id: string;
  title: string;
  lessons: number;
  duration: string;
  level: string;
  description: string;
  image?: string;
}

@Component({
  selector: 'academy-section',
  templateUrl: './academy-section.component.html',
  styleUrls: ['./academy-section.component.scss'],
  standalone: true,
  imports: [NgFor, IonicModule, MindfulButtonComponent, MindfulCardHeaderComponent, ViewAllComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AcademySectionComponent {
  @Input() courses: CourseCard[] = [
    {
      id: 'budget-1',
      title: 'Budgeting Basics',
      lessons: 10,
      duration: '20 min',
      level: 'Beginner',
      description: 'Learn simple steps to plan, track, and adjust your money so you can reach your goals with confidence.',
      image: '/assets/app-assets/Budget-basic.svg'
    },
    {
      id: 'communication-1',
      title: 'Communication Skills',
      lessons: 8,
      duration: '15 min',
      level: 'Intermediate',
      description: 'Master the art of clear communication and build stronger relationships in all areas of life.',
      image: '/assets/app-assets/Communication.svg'
    },
    {
      id: 'time-management-1',
      title: 'Time Management',
      lessons: 12,
      duration: '25 min',
      level: 'Beginner',
      description: 'Discover effective strategies to organize your time and boost productivity while maintaining balance.',
      image: '/assets/app-assets/Time-management.svg'
    }
  ];

  constructor(private router: Router) { }

  onViewAll(): void {
    // Navigate to the academy home page
    this.router.navigate(['/academy']);
  }

  onStart(course: CourseCard): void {
    console.log('Start course', course.id);
  }
}
