import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AcademyCourseComponent } from '../academy-course/academy-course.component';

@Component({
  selector: 'app-academy-managing-money',
  standalone: true,
  imports: [CommonModule, IonicModule, AcademyCourseComponent],
  templateUrl: './academy-managing-money.component.html',
  styleUrls: ['./academy-managing-money.component.scss']
})
export class AcademyManagingMoneyComponent {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  // Lesson model
  lessons: Array<{
    title: string;
    meta: string;
    points: number;
    badge: 'Beginner' | 'Pro' | string;
    thumb: string;
    pointsIcon?: string;
  }> = [
    {
      title: 'Spend Smart',
      meta: '15 lessons • 30 min',
      points: 10,
      badge: 'Beginner',
      thumb: '/assets/Images-Transparent/Academy-Course-Thubmnail1.png',
      pointsIcon: '/assets/images/Currency icon 2.png'
    },
    {
      title: 'Saving Smart',
      meta: '24 lessons • 45 min',
      points: 10,
      badge: 'Pro',
      thumb: '/assets/Images-Transparent/Academy-Course-Thubmnail2.png',
      pointsIcon: '/assets/images/Currency icon 2.png'
    },
    {
      title: 'Budgeting Basics',
      meta: '10 lessons • 20 min',
      points: 10,
      badge: 'Beginner',
      thumb: '/assets/Images-Transparent/Academy-Course-Thubmnail3.png',
      pointsIcon: '/assets/images/Currency icon 2.png'
    },
    {
      title: 'Spending Wisely',
      meta: '12 lessons • 35 min',
      points: 10,
      badge: 'Beginner',
      thumb: '/assets/Images-Transparent/Academy-Course-Thubmnail4.png',
      pointsIcon: '/assets/images/Currency icon 2.png'
    },
    {
      title: 'Making Money',
      meta: '18 lessons • 50 min',
      points: 10,
      badge: 'Pro',
      thumb: '/assets/Images-Transparent/Academy-Course-Thubmnail5.png',
      pointsIcon: '/assets/images/Currency icon 2.png'
    }
  ];

  constructor(private router: Router) {}

  goBack() {
    // navigate back to academy home (app routing uses '/academy')
    this.router.navigate(['/academy']);
  }

  // currently selected course to show in the course detail component
  selectedCourse: { id: string; title: string; lessons: number; duration: string; level: string; description: string; image?: string } | null = null;

  openCourseByTitle(title: string) {
    const match = this.lessons.find(l => l.title === title);
    if (!match) return;

    // map the lesson entry to CourseCard shape used by academy-course component
    const id = (match.title === 'Budgeting Basics') ? 'budget-1' : match.title.toLowerCase().replace(/\s+/g, '-');
    // navigate to the course route (new screen)
    this.router.navigate(['/academy', 'course', id]);
  }

  closeCourse() {
    this.selectedCourse = null;
  }

  onLessonStart(event: { courseId: string; lessonIndex: number }) {
    console.log('lessonStart', event);
    // Close the panel or navigate to the lesson page
    this.closeCourse();
    // e.g. this.router.navigate(['/academy', event.courseId, 'lesson', event.lessonIndex]);
  }

  startFirstLesson() {
    if (!this.selectedCourse) return;
    this.onLessonStart({ courseId: this.selectedCourse.id, lessonIndex: 0 });
  }
}
