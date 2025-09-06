import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';
import { IonicModule } from '@ionic/angular';

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
  imports: [NgFor, IonicModule]
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
    }
  ];

  onViewAll(): void {
    console.log('View all courses');
  }

  onStart(course: CourseCard): void {
    console.log('Start course', course.id);
  }
}
