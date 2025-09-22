import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { CourseCard } from '../academy-section.component';
import { AcademyChaptersComponent } from '../academy-chapters/academy-chapters.component';

@Component({
  selector: 'app-academy-course',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './academy-course.component.html',
  styleUrls: ['./academy-course.component.scss'],
})
export class AcademyCourseComponent implements OnChanges, OnInit {
  @Input() course: CourseCard | null = null;

  @Output() courseOpen = new EventEmitter<CourseCard>();
  @Output() lessonStart = new EventEmitter<{ courseId: string; lessonIndex: number }>();

  lessons: Array<{ title: string; desc: string; time: string; image?: string }> = [];

  // route-driven mode: if component is loaded via route we populate `course` from the id
  constructor(private route: ActivatedRoute, private router: Router, private modalCtrl: ModalController) {}

  // navigate back to the academy home
  goBack(): void {
    this.router.navigate(['/academy']);
  }

  ngOnInit(): void {
    if (this.course) return; // input provided by parent
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCourseById(id);
    }
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.buildLessons();
  }

  private buildLessons(): void {
    if (!this.course) {
      this.lessons = [];
      return;
    }

    if (this.course.id === 'budget-1') {
      this.lessons = [
        { title: '1. What is a Budget?', desc: 'Discover what a budget is and why it matters.', time: 'Text-based • 3 mins', image: '/assets/app-assets/notebook-labeled.svg' },
        { title: '2. Track Your Spending', desc: 'Learn how to track your everyday spending.', time: 'Text-based • 4 mins', image: '/assets/app-assets/child-lesson.svg' },
        { title: '3. Set Spending Limits', desc: 'Find out how to set and stick to spending limits.', time: 'Text-based • 3 mins', image: '/assets/app-assets/timer-lesson.svg' },
        { title: '4. Save for Your Goals', desc: 'See how to save money toward your goals.', time: 'Text-based • 4 mins', image: '/assets/app-assets/piggy-lesson.svg' },
      ];
      return;
    }

    const count = Math.max(0, this.course.lessons || 0);
    this.lessons = Array.from({ length: count }, (_, i) => ({
      title: `${i + 1}. Lesson ${i + 1}`,
      desc: this.course?.description || 'Lesson description',
      time: 'Text-based • 3 mins',
      image: '/assets/img/lesson-binder.png'
    }));
  }

  onStartLesson(index: number): void {
    if (!this.course) return;
    // Open the chapters modal for the course (lessonIndex currently unused here but kept for compatibility)
    this.openChaptersModal(index).catch(err => console.error('Failed opening chapters modal', err));
  }

  private async openChaptersModal(_lessonIndex: number): Promise<void> {
    if (!this.course) return;
    const modal = await this.modalCtrl.create({
      component: AcademyChaptersComponent,
      componentProps: {
        courseId: this.course.id,
        courseTitle: this.course.title
      }
    });
    await modal.present();
  }

  onOpenCourse(): void {
    if (!this.course) return;
    this.courseOpen.emit(this.course);
  }

  private loadCourseById(id: string): void {
    // Minimal mapping - expand as needed. Keep descriptions in sync with AcademySectionComponent
    if (id === 'budget-1') {
      this.course = {
        id: 'budget-1',
        title: 'Budgeting Basics',
        lessons: 10,
        duration: '20 min',
        level: 'Beginner',
        description: 'Learn simple steps to plan, track, and adjust your money so you can reach your goals with confidence.',
        image: '/assets/app-assets/Budget-basic.svg'
      };
    } else {
      // fallback: create a simple course from id
      this.course = {
        id,
        title: id.replace(/-/g, ' '),
        lessons: 4,
        duration: '10 min',
        level: 'Beginner',
        description: 'Course details coming soon.'
      };
    }
    this.buildLessons();
  }
}
