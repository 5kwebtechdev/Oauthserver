import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AcademyService, Course } from '../../../services/academy.service';
import { AuthService } from '../../../services/auth.service';
import { ProfileStoreService } from '../../../services/profile-store.service';
import { selectedChildAge } from '../../../models/selected-child-age';
import { ChildInfo } from '../../../models/child-info.model';
import { combineLatest, Subject, takeUntil } from 'rxjs';

interface AcademyLessonCard {
  title: string;
  meta: string;
  coins: number;
  assignedByParent: boolean;
  badge: string;
  thumb: string;
  fallbackThumb: string;
  coinIcon: string;
  courseId?: string;
  rawCourse?: Course;
}

@Component({
  selector: 'app-academy-subject',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './academy-subject.component.html',
  styleUrls: ['./academy-subject.component.scss']
})
export class AcademySubjectComponent implements OnInit, OnDestroy {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  category: string = '';
  categoryTitle: string = '';
  categorySubtitle: string = '';
  age: number | null = null;
  isLoading: boolean = false;
  private readonly destroy$ = new Subject<void>();
  private readonly childRequestCancel$ = new Subject<void>();
  private selectedChild: ChildInfo | null = null;

  private readonly defaultCourseThumbnail = 'assets/Images-Transparent/Academy-Course-Thubmnail1.webp';
  private readonly fallbackCourseThumbnails = [
    'assets/Images-Transparent/Academy-Course-Thubmnail1.webp',
    'assets/Images-Transparent/Academy-Course-Thubmnail2.webp',
    'assets/Images-Transparent/Academy-Course-Thubmnail3.webp',
    'assets/Images-Transparent/Academy-Course-Thubmnail4.webp',
    'assets/Images-Transparent/Academy-Course-Thubmnail5.webp',
  ];

  // Course model from API
  lessons: AcademyLessonCard[] = [];

  // Category title mapping
  private categoryTitles: { [key: string]: { title: string; subtitle: string } } = {
    'MANAGING_MONEY': { title: 'Managing Money', subtitle: 'Spend smart • Save more • Use it well' },
    'COMMUNICATION': { title: 'Communication', subtitle: 'Express yourself • Listen well • Connect better' },
    'MEDITATION': { title: 'Meditation', subtitle: 'Breathe deep • Stay calm • Find peace' },
    'CULTURAL_VALUES': { title: 'Cultural Values', subtitle: 'Respect all • Embrace diversity • Grow together' }
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private academyService: AcademyService,
    private authService: AuthService,
    private navigation: NavigationService,
    private profileStore: ProfileStoreService
  ) { }

  ngOnInit() {
    // Get category from query params
    combineLatest([this.route.queryParams, this.profileStore.selectionChanged$])
      .pipe(takeUntil(this.destroy$)).subscribe(([params, child]) => {
      this.childRequestCancel$.next();
      this.selectedChild = child;
      this.category = params['category'] || 'MANAGING_MONEY';
      const categoryInfo = this.categoryTitles[this.normalizeCategoryKey(this.category)];
      this.categoryTitle = params['title'] || categoryInfo?.title || this.formatCategoryTitle(this.category);
      this.categorySubtitle = params['subtitle'] || categoryInfo?.subtitle || '';
      this.age = this.authService.isParentUser()
        ? selectedChildAge(child)
        : this.parseAge(params['age']);
      this.lessons = [];
      if (!this.authService.isParentUser() || child?.id != null) this.loadCourses();
    });
  }

  ngOnDestroy(): void {
    this.childRequestCancel$.next();
    this.childRequestCancel$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourses() {
    this.isLoading = true;

    // The category endpoint returns `assignedToChild` only when the current
    // child's id is supplied. This keeps parent assignments visible to the
    // right child without changing normal course navigation.
    const forUserId = this.authService.isParentUser()
      ? this.selectedChild?.id ?? null
      : this.authService.getUserRelationship() === 'CHILD'
        ? this.authService.getUserId()
        : null;
    const courses$ = this.academyService.getCoursesByCategory(
      this.category,
      this.age,
      forUserId,
    );

    courses$.pipe(takeUntil(this.destroy$), takeUntil(this.childRequestCancel$)).subscribe({
      next: (courses: Course[]) => {
        console.log(`Courses from by-category API for ${this.category}:`, courses);
        console.log('Current category:', this.category);

        // Filter courses by category only (removed enabled filter for testing)
        const selectedCategoryKey = this.normalizeCategoryKey(this.category);
        const filteredCourses = courses.filter(
          course => this.normalizeCategoryKey(course.category || '') === selectedCategoryKey
        );

        console.log('Filtered courses:', filteredCourses);

        // Map courses to lesson display format
        this.lessons = filteredCourses.map((course, index) => {
          const fallbackThumb = this.getFallbackThumbnail(course, index);

          return {
            title: course.courseName,
            meta: `${course.noOfLessons} ${course.noOfLessons === 1 ? 'lesson' : 'lessons'} • ${course.duration} min`,
            coins: course.totalCoins || 0,
            assignedByParent: course.assignedToChild === true,
            badge: this.formatDifficulty(course.difficulty || 'BEGINNER'),
            thumb: this.convertDriveLink(course.thumbnailUrl || '', fallbackThumb),
            fallbackThumb,
            coinIcon: 'assets/icons/superme-coin.webp',
            courseId: course.id?.toString(),
            rawCourse: course
          };
        });

        console.log('Mapped lessons:', this.lessons);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.lessons = [];
        this.isLoading = false;
      }
    });
  }

  formatDifficulty(difficulty: string): string {
    const difficultyMap: { [key: string]: string } = {
      'BEGINNER': 'Beginner',
      'INTERMEDIATE': 'Intermediate',
      'ADVANCED': 'Advanced',
      'PRO': 'Pro'
    };
    return difficultyMap[difficulty] || difficulty;
  }

  // Convert Google Drive sharing link to direct image URL
  convertDriveLink(url: string, fallback: string = this.defaultCourseThumbnail): string {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return fallback;

    const driveFileId = this.getGoogleDriveFileId(trimmedUrl);
    if (driveFileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w512`;
    }

    if (/^data:image\//i.test(trimmedUrl) || /^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }

    if (trimmedUrl.startsWith('//')) {
      return `https:${trimmedUrl}`;
    }

    if (/^\/?assets\//i.test(trimmedUrl)) {
      return trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    }

    if (/^Academy-Course-Thubmnail/i.test(trimmedUrl)) {
      return `/assets/Images-Transparent/${trimmedUrl}`;
    }

    if (/^Images-/i.test(trimmedUrl)) {
      return `/assets/${trimmedUrl}`;
    }

    return `/${trimmedUrl.replace(/^\/+/, '')}`;
  }

  onCourseImageError(event: Event, lesson: AcademyLessonCard): void {
    const fallbackThumb = lesson.fallbackThumb || this.defaultCourseThumbnail;
    lesson.thumb = fallbackThumb;

    const image = event.target as HTMLImageElement | null;
    if (image && image.getAttribute('src') !== fallbackThumb) {
      image.src = fallbackThumb;
    }
  }

  private getFallbackThumbnail(course: Course, index: number): string {
    const title = (course.courseName || '').toLowerCase();

    if (this.normalizeCategoryKey(course.category || '') === 'MANAGING_MONEY' || title.includes('money') || title.includes('budget')) {
      return this.fallbackCourseThumbnails[0];
    }

    return this.fallbackCourseThumbnails[index % this.fallbackCourseThumbnails.length];
  }

  private getGoogleDriveFileId(url: string): string | null {
    const viewMatch = url.match(/\/file\/d\/([^\/?]+)/);
    if (viewMatch?.[1]) return viewMatch[1];

    const openMatch = url.match(/[?&]id=([^&]+)/);
    if (openMatch?.[1]) return openMatch[1];

    const lh3Match = url.match(/googleusercontent\.com\/d\/([^\/?]+)/);
    return lh3Match?.[1] || null;
  }

  private normalizeCategoryKey(category: string): string {
    return (category || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private formatCategoryTitle(category: string): string {
    const title = (category || '').trim().replace(/_/g, ' ');
    const isAllCaps = title === title.toUpperCase();

    if (!isAllCaps) {
      return title || 'Academy';
    }

    return title
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Academy';
  }

  private parseAge(value: unknown): number | null {
    const age = Number(value);
    return Number.isFinite(age) && age > 0 ? Math.floor(age) : null;
  }

  goBack() {
    this.navigation.back();
  }

  // currently selected course to show in the course detail component
  selectedCourse: { id: string; title: string; lessons: number; duration: string; level: string; description: string; image?: string } | null = null;

  openCourseByTitle(title: string) {
    const match = this.lessons.find(l => l.title === title);
    if (!match) return;

    // prefer to use courseId from API if available, otherwise fallback to title-based id
    const id = match.courseId || (match.title === 'Budgeting Basics' ? 'budget-1' : match.title.toLowerCase().replace(/\s+/g, '-'));

    // navigate to the course route and pass the full course object in navigation state so
    // the `AcademyCourseComponent` can use it directly (avoids re-fetch)
    this.router.navigate(['/authed/academy/course', id], { state: { course: match.rawCourse } });
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
