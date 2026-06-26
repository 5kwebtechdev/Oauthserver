import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { SupermeCardHeaderComponent } from '../superme-navigator/superme-card-header/superme-card-header.component';
import { ViewAllComponent } from '../superme-navigator/view-all/view-all.component';
import { AcademyService, AcademyFeedCourse, AcademyFeedLesson } from '../../services/academy.service';
import { AuthService } from '../../services/auth.service';

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

const FALLBACK_IMAGES = [
  'assets/Images-Transparent/Academy-Course-Thubmnail1.png',
  'assets/Images-Transparent/Academy-Course-Thubmnail2.png',
  'assets/Images-Transparent/Academy-Course-Thubmnail3.png',
  'assets/Images-Transparent/Academy-Course-Thubmnail4.png',
  'assets/Images-Transparent/Academy-Course-Thubmnail5.png',
];

@Component({
  selector: 'academy-section',
  templateUrl: './academy-section.component.html',
  styleUrls: ['./academy-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeButtonComponent, SupermeCardHeaderComponent, ViewAllComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AcademySectionComponent implements OnInit {
  loading = true;
  state: 1 | 2 | 3 = 1;
  headerTitle = 'Begin Your Life Skills Quest!';

  // State 1 — courses
  courses: AcademyFeedCourse[] = [];

  // State 2 — lessons
  lessons: AcademyFeedLesson[] = [];

  constructor(
    private router: Router,
    private academyService: AcademyService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const age = this.authService.getCurrentUserAge() ?? undefined;
    this.academyService.getAcademyFeed(age).subscribe({
      next: (res) => {
        this.state = (Number(res.state) as 1 | 2 | 3) || 1;
        this.headerTitle = res.headerTitle || this.headerTitle;
        this.courses = res.courses ?? [];
        this.lessons = res.lessons ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onViewAll(): void {
    this.router.navigate(['/authed/academy']);
  }

  onStartCourse(course: AcademyFeedCourse): void {
    this.router.navigate(['/authed/academy/course', course.id]);
  }

  onLessonCta(lesson: AcademyFeedLesson): void {
    if (lesson.courseId) {
      this.router.navigate(['/authed/academy/course', lesson.courseId]);
    }
  }

  getCourseImage(course: AcademyFeedCourse, index: number): string {
    return this.normalizeImageUrl(course.thumbnailUrl || '', FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]);
  }

  getLessonImage(lesson: AcademyFeedLesson, index: number): string {
    const url = lesson.thumbnailUrl || lesson.courseThumbnailUrl || '';
    return this.normalizeImageUrl(url, FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]);
  }

  onCourseImageError(event: Event, index: number): void {
    (event.target as HTMLImageElement).src = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  }

  onLessonImageError(event: Event, index: number): void {
    (event.target as HTMLImageElement).src = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  }

  private normalizeImageUrl(url: string, fallback: string): string {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return fallback;
    if (/^data:image\//i.test(trimmedUrl) || /^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
    if (trimmedUrl.startsWith('//')) return `https:${trimmedUrl}`;
    if (/^\/?assets\//i.test(trimmedUrl)) return trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    return `/${trimmedUrl.replace(/^\/+/, '')}`;
  }
}
