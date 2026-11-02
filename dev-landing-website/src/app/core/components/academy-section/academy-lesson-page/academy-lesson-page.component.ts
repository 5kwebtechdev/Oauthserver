import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FooterComponent } from '../../footer/footer.component';
import { AcademyService, CourseDisplay, LessonDisplay, CourseDetailResponse } from '../../../services/academy.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'academy-lesson-page',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './academy-lesson-page.component.html',
  styleUrls: ['./academy-lesson-page.component.scss']
})
export class AcademyLessonPageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private academyService = inject(AcademyService);
  private destroy$ = new Subject<void>();

  // Course data
  selectedCourse: CourseDisplay | null = null;
  courseDetail: CourseDetailResponse | null = null;

  // Lessons from API
  lessons: LessonDisplay[] = [];

  // Resume lesson index
  resumeLessonIndex: number | null = null;

  // UI state
  expandedLessonId: number | null = null;

  // Loading/error states
  get isLoading() {
    return this.academyService.isLoadingCourse();
  }

  get error() {
    return this.academyService.error();
  }

  ngOnInit(): void {
    // Get course ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/home/academy']);
      return;
    }

    // Check for course passed via navigation state
    const navState = history.state?.course;
    if (navState) {
      this.selectedCourse = {
        id: navState.id,
        title: navState.courseName || navState.title,
        description: navState.description || '',
        image: this.academyService.convertDriveUrl(navState.thumbnailUrl || navState.image || ''),
        lessons: navState.noOfLessons || navState.lessons || 0,
        duration: navState.duration ? `${navState.duration} min` : '0 min',
        coins: navState.totalCoins || navState.coins || 0,
        level: this.academyService.formatDifficulty(navState.difficulty || navState.level || 'BEGINNER'),
        category: navState.category || '',
        completedLessons: 0,
        completionPercentage: 0,
        isCompleted: false,
        resumeLessonIndex: null
      };
    }

    this.loadCourse(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load course with lessons from API
   */
  private loadCourse(courseId: string): void {
    this.academyService.getCourseWithLessons(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result) {
            this.selectedCourse = result.course;
            this.lessons = result.lessons;
            this.resumeLessonIndex = result.resumeIndex;

            // Auto-expand first non-completed lesson or first lesson
            const firstExpandable = this.lessons.find(l => !l.isCompleted && l.canStart);
            this.expandedLessonId = firstExpandable?.id || this.lessons[0]?.id || null;
          }
        },
        error: (err) => {
          console.error('Failed to load course:', err);
        }
      });
  }

  /**
   * Navigate back to course list
   */
  goBack(): void {
    // Navigate back with category if available
    if (this.selectedCourse?.category) {
      this.router.navigate(['/home/academy/course'], {
        queryParams: { category: this.selectedCourse.category }
      });
    } else {
      this.router.navigate(['/home/academy/course']);
    }
  }

  /**
   * Toggle lesson expansion
   */
  toggleLesson(id: number): void {
    this.expandedLessonId = this.expandedLessonId === id ? null : id;
  }

  /**
   * Start a lesson
   */
  startLesson(lesson: LessonDisplay): void {
    if (!lesson.canStart) {
      console.warn('Lesson is locked');
      return;
    }

    // Update status to ONGOING if PENDING
    this.academyService.startLesson(lesson.id, lesson.status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Navigate to full lesson page
          this.router.navigate(['/home/academy/fulllesson', lesson.id], {
            state: {
              courseId: this.selectedCourse?.id,
              courseTitle: this.selectedCourse?.title,
              lessonOrder: lesson.order,
              totalLessons: this.lessons.length
            }
          });
        },
        error: (err) => {
          console.error('Failed to start lesson:', err);
          // Navigate anyway
          this.router.navigate(['/home/academy/fulllesson', lesson.id]);
        }
      });
  }

  /**
   * Get button text based on lesson status
   */
  getLessonButtonText(lesson: LessonDisplay): string {
    if (lesson.isCompleted) return 'Read Again';
    if (lesson.status === 'ONGOING') return 'Continue';
    return 'Start Lesson';
  }

  /**
   * Check if this is the resume lesson
   */
  isResumeLesson(index: number): boolean {
    return this.resumeLessonIndex === index;
  }

  /**
   * Continue with resume lesson
   */
  continueLesson(): void {
    if (this.resumeLessonIndex !== null && this.lessons[this.resumeLessonIndex]) {
      this.startLesson(this.lessons[this.resumeLessonIndex]);
    }
  }

  /**
   * Retry loading on error
   */
  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.academyService.invalidateCache();
      this.loadCourse(id);
    }
  }
}
