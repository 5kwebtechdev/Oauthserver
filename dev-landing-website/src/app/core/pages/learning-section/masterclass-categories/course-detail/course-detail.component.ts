import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { AcademyService, CourseDisplay, LessonDisplay } from 'src/app/core/services/academy.service';

/**
 * Masterclass course detail (lesson list) page. Mirrors AcademyLessonPageComponent's
 * UI, but reuses AcademyService directly rather than duplicating its API/mapping
 * logic - GET /courses/:id is the same endpoint the Academy section already calls.
 */
@Component({
  selector: 'app-masterclass-course-detail',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, FooterComponent],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private academyService = inject(AcademyService);
  private destroy$ = new Subject<void>();

  selectedCourse: CourseDisplay | null = null;
  lessons: LessonDisplay[] = [];
  expandedLessonId: number | null = null;
  errorMessage: string | null = null;

  get isLoading(): boolean {
    return this.academyService.isLoadingCourse();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Course not found.';
      return;
    }
    this.loadCourse(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Loads the course + its lessons. Bound to the retry button too. */
  loadCourse(courseId: string): void {
    this.errorMessage = null;

    this.academyService.getCourseWithLessons(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result) {
            this.errorMessage = 'Unable to load course.';
            return;
          }

          this.selectedCourse = result.course;
          this.lessons = result.lessons;

          const firstExpandable = this.lessons.find(l => !l.isCompleted && l.canStart);
          this.expandedLessonId = firstExpandable?.id ?? this.lessons[0]?.id ?? null;
        },
        error: () => {
          this.errorMessage = 'Unable to load course.';
        }
      });
  }

  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadCourse(id);
  }

  goBack(): void {
    this.location.back();
  }

  toggleLesson(id: number): void {
    this.expandedLessonId = this.expandedLessonId === id ? null : id;
  }

  startLesson(lesson: LessonDisplay): void {
    if (!lesson.canStart) return;

    this.academyService.startLesson(lesson.id, lesson.status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.navigateToLesson(lesson),
        error: () => this.navigateToLesson(lesson)
      });
  }

  getLessonButtonText(lesson: LessonDisplay): string {
    if (lesson.isCompleted) return 'Read Again';
    if (lesson.status === 'ONGOING') return 'Continue';
    return 'Start Lesson';
  }

  private navigateToLesson(lesson: LessonDisplay): void {
    // courseId is intentionally left out of the router state here: the shared
    // full-lesson page uses it to route "back" into the Academy section
    // (/home/academy/lesson/:id). Omitting it makes that page's own fallback
    // (browser history) return here instead, keeping the user inside the
    // Masterclass flow they started in.
    this.router.navigate(['/home/academy/fulllesson', lesson.id], {
      state: {
        courseTitle: this.selectedCourse?.title,
        lessonOrder: lesson.order,
        totalLessons: this.lessons.length
      }
    });
  }
}
