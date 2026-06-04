import { Component } from '@angular/core';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: string;
  image: string;
}

@Component({
  selector: 'app-lesson-list',
  templateUrl: './lesson-list.component.html',
  styleUrls: ['./lesson-list.component.scss']
})
export class LessonListComponent {
  // Sample data for lessons. This would usually come from a service.
  lessons: Lesson[] = [
    {
      id: 'lesson-1',
      title: 'What Is a Budget?',
      description: 'Discover what a budget is and why it matters.',
      duration: '3 mins',
      type: 'Text-based',
      image: 'assets/img/lesson-binder.png'
    },
    {
      id: 'lesson-2',
      title: 'Saving Smart',
      description: 'Learn practical saving strategies.',
      duration: '5 mins',
      type: 'Interactive',
      image: 'assets/img/lesson-binder.png'
    }
  ];
}
