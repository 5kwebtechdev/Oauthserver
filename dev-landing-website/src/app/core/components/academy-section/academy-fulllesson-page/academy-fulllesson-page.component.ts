import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AcademyService, LessonDetailResponse } from '../../../services/academy.service';
import { MoodService } from '../../../services/mood.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-academy-fulllesson-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './academy-fulllesson-page.component.html',
  styleUrls: ['./academy-fulllesson-page.component.scss']
})
export class AcademyFulllessonPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private academyService = inject(AcademyService);
  private moodService = inject(MoodService);
  private destroy$ = new Subject<void>();

  // Lesson data
  lessonId: number | null = null;
  lesson: LessonDetailResponse | null = null;

  // Navigation context from previous page
  courseId: number | string | null = null;
  courseTitle: string = '';
  lessonOrder: number = 1;
  totalLessons: number = 1;

  // Parsed content
  learningOutcomes: string[] = [];
  contentSections: Array<{ heading: string; body: string; isFunFact: boolean }> = [];

  // UI state
  isCompleting = false;

  // Loading/error from service
  get isLoading() {
    return this.academyService.isLoadingLesson();
  }

  get error() {
    return this.academyService.error();
  }

  ngOnInit(): void {
    // Get lesson ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.lessonId = +id;

    // Get navigation context
    const navState = history.state;
    if (navState) {
      this.courseId = navState.courseId || null;
      this.courseTitle = navState.courseTitle || '';
      this.lessonOrder = navState.lessonOrder || 1;
      this.totalLessons = navState.totalLessons || 1;
    }

    this.loadLesson(this.lessonId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load lesson from API
   */
  private loadLesson(lessonId: number): void {
    this.academyService.getLessonById(lessonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lesson) => {
          if (lesson) {
            this.lesson = lesson;
            this.lessonOrder = lesson.order;

            // Parse content
            const parsed = this.academyService.parseContent(lesson.content);
            this.learningOutcomes = parsed.learningOutcomes;
            this.contentSections = parsed.sections;
          }
        },
        error: (err) => {
          console.error('Failed to load lesson:', err);
        }
      });
  }

  /**
   * Navigate back to course page
   */
  goBack(): void {
    if (this.courseId) {
      this.router.navigate(['/home/academy/lesson', this.courseId]);
    } else {
      this.location.back();
    }
  }

  /**
   * Mark lesson as done
   */
  done(): void {
    if (!this.lesson || this.lesson.isCompleted || this.isCompleting) {
      this.goBack();
      return;
    }

    this.isCompleting = true;

    this.academyService.completeLesson(this.lesson.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result) {
            this.lesson = { ...this.lesson!, isCompleted: true };
          }
          this.moodService.refreshRewardStats();
          this.isCompleting = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to complete lesson:', err);
          this.isCompleting = false;
          // Go back anyway
          this.goBack();
        }
      });
  }

  /**
   * Go to next lesson
   */
  goToNextLesson(): void {
    if (!this.lesson) return;

    // Must complete current lesson first
    if (!this.lesson.isCompleted) {
      this.completeAndGoNext();
      return;
    }

    this.navigateToNext();
  }

  /**
   * Complete lesson then navigate to next
   */
  private completeAndGoNext(): void {
    if (!this.lesson || this.isCompleting) return;

    this.isCompleting = true;

    this.academyService.completeLesson(this.lesson.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.lesson = { ...this.lesson!, isCompleted: true };
          this.moodService.refreshRewardStats();
          this.isCompleting = false;
          this.navigateToNext();
        },
        error: (err) => {
          console.error('Failed to complete lesson:', err);
          this.isCompleting = false;
          // Try navigating anyway
          this.navigateToNext();
        }
      });
  }

  /**
   * Navigate to next lesson
   */
  private navigateToNext(): void {
    if (!this.lesson || !this.courseId) {
      this.goBack();
      return;
    }

    // Load course to get next lesson ID
    this.academyService.getCourseWithLessons(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result) {
            this.goBack();
            return;
          }

          // Find current lesson index and get next
          const currentIndex = result.lessons.findIndex(l => l.id === this.lesson?.id);
          const nextLesson = result.lessons[currentIndex + 1];

          if (nextLesson && nextLesson.canStart) {
            // Navigate to next lesson
            this.router.navigate(['/home/academy/fulllesson', nextLesson.id], {
              state: {
                courseId: this.courseId,
                courseTitle: this.courseTitle,
                lessonOrder: nextLesson.order,
                totalLessons: result.lessons.length
              }
            });
          } else {
            // No more lessons or next is locked - go back to course
            this.goBack();
          }
        },
        error: () => {
          this.goBack();
        }
      });
  }

  /**
   * Check if next lesson is available
   */
  get hasNextLesson(): boolean {
    return this.lessonOrder < this.totalLessons;
  }

  /**
   * Check if can proceed to next
   */
  get canGoNext(): boolean {
    return this.hasNextLesson && (this.lesson?.isCompleted || false);
  }

  /**
   * Get thumbnail URL
   */
  getLessonImage(): string {
    if (!this.lesson?.thumbnailUrl) {
      return '/assets/images/lesson-icons/default.png';
    }
    return this.academyService.convertDriveUrl(this.lesson.thumbnailUrl);
  }

  /**
   * Retry loading on error
   */
  retry(): void {
    if (this.lessonId) {
      this.loadLesson(this.lessonId);
    }
  }
}