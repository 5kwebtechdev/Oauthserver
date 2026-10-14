import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AcademyService, AcademyFeedCourse, AcademyFeedLesson } from '../../services/academy.service';
import { AuthService } from '../../services/auth.service';
import { LearningService } from '../../services/learning.service';
import { catchError, forkJoin, map, of } from 'rxjs';

// Kept for backward compatibility — academy-course.component imports this
export interface CourseCard {
  id: string;
  title: string;
  lessons: number;
  duration: string;
  level: string;
  description: string;
  image?: string;
  fallbackImage?: string;
}

@Component({
  selector: 'academy-section',
  templateUrl: './academy-section.component.html',
  styleUrls: ['./academy-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AcademySectionComponent implements OnInit, OnDestroy {
  loading = true;
  state: 1 | 2 | 3 = 1;
  headerTitle = 'Your Skills Quest';

  // State 1 — courses
  courses: AcademyFeedCourse[] = [];

  // State 2 — lessons
  lessons: AcademyFeedLesson[] = [];
  private readonly courseProgressById = new Map<number, number>();
  private feedRequestId = 0;
  articleCount = 0;

  get masterClassCount(): number {
    return this.state === 2 ? this.lessons.length : this.courses.length;
  }

  constructor(
    private router: Router,
    private academyService: AcademyService,
    private authService: AuthService,
    private learningService: LearningService
  ) {}

  ngOnInit(): void {
    this.refreshFromApi();

    this.learningService.getArticleCards().subscribe({
      next: (cards) => {
        this.articleCount = Array.isArray(cards) ? cards.length : 0;
      },
      error: () => {
        this.articleCount = 0;
      }
    });
  }

  ngOnDestroy(): void {
    this.feedRequestId++;
  }

  refreshFromApi(): void {
    const requestId = ++this.feedRequestId;
    const age = this.authService.getCurrentUserAge() ?? undefined;
    this.loading = true;
    this.courseProgressById.clear();
    this.academyService.getAcademyFeed(age).subscribe({
      next: (res) => {
        if (requestId !== this.feedRequestId) return;
        this.state = (Number(res.state) as 1 | 2 | 3) || 1;
        this.headerTitle = res.headerTitle || this.headerTitle;
        this.courses = res.courses ?? [];
        this.lessons = res.lessons ?? [];
        this.loading = false;
        if (this.state === 2) this.loadCourseProgress(requestId);
      },
      error: () => {
        if (requestId === this.feedRequestId) this.loading = false;
      }
    });
  }

  private loadCourseProgress(requestId: number): void {
    const courseIds = [...new Set(this.lessons.map(lesson => Number(lesson.courseId)))]
      .filter(id => Number.isSafeInteger(id) && id > 0);
    if (!courseIds.length) return;

    forkJoin(courseIds.map(id => this.academyService.getCourseById(id).pipe(
      map(course => ({ id, percentage: course.completionPercentage })),
      catchError(() => of({ id, percentage: null }))
    ))).subscribe({
      next: results => {
        if (requestId !== this.feedRequestId) return;
        for (const { id, percentage } of results) {
          const value = Number(percentage);
          if (percentage != null && Number.isFinite(value)) {
            this.courseProgressById.set(id, Math.min(100, Math.max(0, Math.round(value))));
          }
        }
      }
    });
  }

  openArticles(): void {
    this.router.navigate(['/authed/content'], {
      queryParams: { tab: 'articles' }
    });
  }

  onViewAll(): void {
    this.router.navigate(['/authed/content'], {
      queryParams: { tab: 'masterclass' }
    });
  }

  onStartCourse(course: AcademyFeedCourse): void {
    this.router.navigate(['/authed/academy/course', course.id]);
  }

  onLessonCta(lesson: AcademyFeedLesson): void {
    if (lesson.courseId) {
      this.router.navigate(['/authed/academy/course', lesson.courseId]);
    }
  }

  getCourseProgress(course: AcademyFeedCourse): number {
    const totalLessons = Number(course.noOfLessons) || 0;
    const completedLessons = Number(course.completedLessons) || 0;
    const derivedProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const progress = Number(course.completionPercentage ?? derivedProgress);
    return Math.min(100, Math.max(0, Math.round(Number.isFinite(progress) ? progress : 0)));
  }

  getLessonProgress(lesson: AcademyFeedLesson): number | null {
    return this.courseProgressById.get(Number(lesson.courseId)) ?? null;
  }

  getCourseImage(course: AcademyFeedCourse): string {
    return this.normalizeImageUrl(course.thumbnailUrl || '');
  }

  getLessonImage(lesson: AcademyFeedLesson): string {
    const url = lesson.thumbnailUrl || lesson.courseThumbnailUrl || '';
    return this.normalizeImageUrl(url);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  private normalizeImageUrl(url: string): string {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return '';
    if (/^data:image\//i.test(trimmedUrl) || /^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
    if (trimmedUrl.startsWith('//')) return `https:${trimmedUrl}`;
    if (/^\/?assets\//i.test(trimmedUrl)) return trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    return `/${trimmedUrl.replace(/^\/+/, '')}`;
  }
}
