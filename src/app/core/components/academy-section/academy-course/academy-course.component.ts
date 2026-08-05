import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { IonicModule, ModalController } from '@ionic/angular';
import { CourseCard } from '../academy-section.component';
import { AcademyLessonsComponent } from '../academy-lessons/academy-lessons.component';
import { AcademyService, CourseDetailResponse, CourseLesson } from '../../../services/academy.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

type CourseLessonView = {
  title: string;
  desc: string;
  time: string;
  image?: string;
  coins?: number;
  lessonId?: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  lessonStatus?: string | null;
  status?: string | null;
};

@Component({
  selector: 'app-academy-course',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './academy-course.component.html',
  styleUrls: ['./academy-course.component.scss'],
})
export class AcademyCourseComponent implements OnChanges, OnInit, OnDestroy {
  @Input() course: CourseCard | null = null;

  @Output() courseOpen = new EventEmitter<CourseCard>();
  @Output() lessonStart = new EventEmitter<{ courseId: string; lessonIndex: number }>();

  lessons: CourseLessonView[] = [];

  // If the user has an in-progress lesson, index of that lesson in `lessons`; null when none
  resumeLessonIndex: number | null = null;
  // Accordion: which lesson row is currently expanded (shows CTA button)
  expandedLessonIndex: number | null = null;
  // Which locked lesson is currently showing the "complete previous" banner
  lockedBannerIndex: number | null = null;
  private lockedBannerTimeout: any;
  // Tracks lessons the user explicitly started in this session (guards against backend ONGOING side-effect on GET)
  private sessionStartedIds = new Set<number>();
  // API response data
  courseDetail: CourseDetailResponse | null = null;
  isLoadingCourse = false;
  loadError: string | null = null;
  readonly fallbackCourseImage = 'assets/Images-Transparent/Academy-Course-Thubmnail1.png';
  readonly fallbackLessonImage = 'assets/Images-Transparent/Academy-Course-Thubmnail2.png';
  private readonly fallbackLessonImages = [
    'assets/Images-Transparent/Academy-Course-Thubmnail1.png',
    'assets/Images-Transparent/Academy-Course-Thubmnail2.png',
    'assets/Images-Transparent/Academy-Course-Thubmnail3.png',
    'assets/Images-Transparent/Academy-Course-Thubmnail4.png',
    'assets/Images-Transparent/Academy-Course-Thubmnail5.png',
  ];

  // route-driven mode: if component is loaded via route we populate `course` from the id
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalCtrl: ModalController,
    private academyService: AcademyService,
    private navigation: NavigationService
  ) { }

  // navigate back using history-aware NavigationService
  goBack(): void {
    this.navigation.back();
  }

  ngOnInit(): void {
    // If parent provided the course via `@Input()` or navigation state, use it
    if (this.course) {
      // If we have course with numeric id, fetch from API
      if (this.course.id && !isNaN(Number(this.course.id))) {
        this.fetchCourseFromApi(Number(this.course.id));
      } else {
        this.buildLessons();
      }
      return;
    }

    // Check navigation state (router.navigate state) for passed course object
    const navStateCourse = (history && (history.state as any) && (history.state as any).course) || null;
    if (navStateCourse) {
      this.course = navStateCourse as CourseCard;
      if (this.course.id && !isNaN(Number(this.course.id))) {
        this.fetchCourseFromApi(Number(this.course.id));
      } else {
        this.buildLessons();
      }
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Try to fetch from API if id is numeric
      if (!isNaN(Number(id))) {
        this.fetchCourseFromApi(Number(id));
      } else {
        this.loadCourseById(id);
      }
    }
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.buildLessons();
  }

  private buildLessons(): void {
    if (!this.course) {
      this.lessons = [];
      this.resumeLessonIndex = null;
      return;
    }

    if (this.course.id === 'budget-1') {
      this.lessons = [
        { title: '1. What is a Budget?', desc: 'Discover what a budget is and why it matters.', time: 'Text-based • 3 mins', image: this.fallbackLessonImages[0], isCompleted: false, isLocked: false },
        { title: '2. Track Your Spending', desc: 'Learn how to track your everyday spending.', time: 'Text-based • 4 mins', image: this.fallbackLessonImages[1], isCompleted: false, isLocked: true },
        { title: '3. Set Spending Limits', desc: 'Find out how to set and stick to spending limits.', time: 'Text-based • 3 mins', image: this.fallbackLessonImages[2], isCompleted: false, isLocked: true },
        { title: '4. Save for Your Goals', desc: 'See how to save money toward your goals.', time: 'Text-based • 4 mins', image: this.fallbackLessonImages[3], isCompleted: false, isLocked: true },
      ];
      // demo/static content: auto-expand first lesson
      this.resumeLessonIndex = null;
      this.expandedLessonIndex = 0;
      return;
    }

    const count = Math.max(0, this.course.lessons || 0);
    this.lessons = Array.from({ length: count }, (_, i) => ({
      title: `${i + 1}. Lesson ${i + 1}`,
      desc: this.course?.description || 'Lesson description',
      time: 'Text-based • 3 mins',
      image: this.getFallbackLessonImage(i),
      isCompleted: false,
      isLocked: i > 0,
      lessonId: undefined
    }));
    this.resumeLessonIndex = null;
    this.expandedLessonIndex = 0;
  }

  /**
   * Fetch course details from the API
   * @param courseId The numeric course ID
   */
  private fetchCourseFromApi(courseId: number): void {
    this.isLoadingCourse = true;
    this.loadError = null;

    this.academyService.getCourseById(courseId)
      .pipe(
        catchError(error => {
          console.error('Error fetching course:', error);
          this.loadError = 'Failed to load course details. Please try again.';
          return of(null);
        }),
        finalize(() => {
          this.isLoadingCourse = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.courseDetail = response;
          this.mapApiResponseToCourse(response);
          this.buildLessonsFromApi(response.lessons);
        }
      });
  }

  /**
   * Map API response to CourseCard interface for template compatibility
   * @param apiResponse The course detail response from API
   */
  private mapApiResponseToCourse(apiResponse: CourseDetailResponse): void {
    this.course = {
      id: apiResponse.id.toString(),
      title: apiResponse.courseName,
      lessons: apiResponse.noOfLessons,
      duration: `${apiResponse.duration} min`,
      level: this.formatDifficulty(apiResponse.difficulty),
      description: apiResponse.description,
      image: this.convertGoogleDriveUrl(apiResponse.thumbnailUrl, this.fallbackCourseImage)
    };
  }

  /**
   * Build lessons array from API response
   * @param apiLessons Array of lessons from API
   */
  private buildLessonsFromApi(apiLessons: CourseLesson[]): void {
    // Determine a sensible fallback coin value if per-lesson coins are not provided
    const fallbackPerLesson = this.courseDetail && this.courseDetail.totalCoins && apiLessons.length
      ? Math.floor(this.courseDetail.totalCoins / Math.max(1, apiLessons.length))
      : 0;

    this.lessons = apiLessons.map((lesson, index) => ({
      title: `${lesson.order}. ${lesson.title}`,
      desc: lesson.description,
      time: `${lesson.videoUrl ? 'Video' : 'Text-based'} • ${lesson.duration} min${lesson.duration > 1 ? 's' : ''}`,
      image: this.convertGoogleDriveUrl(lesson.thumbnailUrl, this.getFallbackLessonImage(index)),
      coins: typeof lesson.coins === 'number' ? lesson.coins : fallbackPerLesson,
      lessonId: lesson.id,
      // Derive completion from lessonStatus ('COMPLETED') or the isCompleted boolean — whichever is set
      isCompleted: !!lesson.isCompleted || lesson.lessonStatus === 'COMPLETED' || lesson.status === 'COMPLETED',
      isLocked: !!lesson.isLocked,
      lessonStatus: lesson.lessonStatus ?? lesson.status ?? null,
      status: lesson.status ?? lesson.lessonStatus ?? null
    }));
    // Use continueLessonId from API for accurate resume position.
    // "Continue" banner only shows when the course has been actively started.
    if (this.courseDetail?.isCourseCompleted) {
      this.resumeLessonIndex = null;
    } else if (this.courseDetail?.progressStatus === 'NOT_STARTED') {
      // Fresh course — all lessonStatus values are 'NOT_STARTED', no banner needed
      this.resumeLessonIndex = null;
    } else if (this.courseDetail?.continueLessonId != null) {
      const idx = this.lessons.findIndex(l => l.lessonId === this.courseDetail!.continueLessonId);
      this.resumeLessonIndex = idx >= 0 ? idx : null;
    } else {
      this.resumeLessonIndex = null;
    }

    // Auto-expand: resume lesson if set, otherwise first lesson
    this.expandedLessonIndex = this.resumeLessonIndex ?? 0;
  }

  /**
   * Convert Google Drive share URL to direct image URL
   * @param url The Google Drive share URL
   * @returns Direct image URL or original URL if not a Google Drive link
   */
  private convertGoogleDriveUrl(url: string, fallback: string): string {
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

  onImageError(event: Event, fallback: string = this.fallbackCourseImage): void {
    const image = event.target as HTMLImageElement | null;
    if (image && image.getAttribute('src') !== fallback) {
      image.src = fallback;
    }
  }

  private getFallbackLessonImage(index: number): string {
    return this.fallbackLessonImages[index % this.fallbackLessonImages.length];
  }

  private getGoogleDriveFileId(url: string): string | null {
    const viewMatch = url.match(/\/file\/d\/([^\/?]+)/);
    if (viewMatch?.[1]) return viewMatch[1];

    const openMatch = url.match(/[?&]id=([^&]+)/);
    if (openMatch?.[1]) return openMatch[1];

    const lh3Match = url.match(/googleusercontent\.com\/d\/([^\/?]+)/);
    return lh3Match?.[1] || null;
  }

  /**
   * Format difficulty level for display
   * @param difficulty The difficulty string from API
   * @returns Formatted difficulty string
   */
  private formatDifficulty(difficulty: string): string {
    if (!difficulty) return 'Beginner';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  }

  isLessonInProgress(lesson: { lessonId?: number; lessonStatus?: string | null; status?: string | null }): boolean {
    // User explicitly started this lesson in the current session → show "Continue" immediately
    // (covers the window before the API reflects the new status)
    if (lesson.lessonId != null && this.sessionStartedIds.has(lesson.lessonId)) {
      return true;
    }
    const s = lesson.lessonStatus ?? lesson.status ?? null;
    // Backend statuses: 'NOT_STARTED' → Start Lesson, 'ONGOING' → Continue, 'COMPLETED' → Read Again
    return s === 'ONGOING';
  }

  toggleLesson(index: number): void {
    const lesson = this.lessons[index];
    if (!lesson) return;

    if (lesson.isLocked) {
      // Show the locked notice banner; auto-dismiss after 3 s
      clearTimeout(this.lockedBannerTimeout);
      this.lockedBannerIndex = index;
      this.lockedBannerTimeout = setTimeout(() => { this.lockedBannerIndex = null; }, 3000);
      return;
    }

    this.lockedBannerIndex = null;
    clearTimeout(this.lockedBannerTimeout);
    // Toggle — collapse if already open, otherwise expand
    this.expandedLessonIndex = this.expandedLessonIndex === index ? null : index;
  }

  ngOnDestroy(): void {
    clearTimeout(this.lockedBannerTimeout);
  }

  onStartLesson(index: number): void {
    if (!this.course) return;
    const lesson = this.lessons[index];
    if (!lesson?.lessonId) return;
    // Record that the user explicitly started this lesson so we can show "Continue" on return
    this.sessionStartedIds.add(lesson.lessonId);
    this.openChaptersModal(index).catch(err => console.error('Failed opening lessons modal', err));
  }

  getProgressStatusLabel(): string {
    switch (this.courseDetail?.progressStatus) {
      case 'NOT_STARTED': return 'Not Started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return '';
    }
  }

  getProgressStatusClass(): string {
    switch (this.courseDetail?.progressStatus) {
      case 'NOT_STARTED': return 'status-not-started';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      default: return '';
    }
  }

  get courseCategory(): string {
    return this.courseDetail?.category || this.course?.level || 'MasterClass';
  }

  get courseCoins(): number {
    const total = Number(this.courseDetail?.totalCoins);
    if (Number.isFinite(total) && total > 0) {
      return total;
    }

    return this.lessons.reduce((sum, lesson) => sum + (Number(lesson.coins) || 0), 0);
  }

  get averageLessonCoins(): number {
    if (!this.lessons.length || !this.courseCoins) {
      return 0;
    }
    return Math.max(1, Math.round(this.courseCoins / this.lessons.length));
  }

  getLessonOrder(lesson: CourseLessonView, index: number): number {
    const match = String(lesson.title || '').match(/^\s*(\d+)\s*[.)-]/);
    return match ? Number(match[1]) : index + 1;
  }

  getLessonTitle(lesson: CourseLessonView): string {
    return String(lesson.title || 'Lesson').replace(/^\s*\d+\s*[.)-]\s*/, '');
  }

  getLessonFormat(lesson: CourseLessonView): string {
    const [format] = String(lesson.time || 'Text-based').split(/[•·]/);
    return format.trim() || 'Text-based';
  }

  getLessonDuration(lesson: CourseLessonView): string {
    const parts = String(lesson.time || '').split(/[•·]/).map(part => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private async openChaptersModal(lessonIndex: number): Promise<void> {
    if (!this.course) return;

    // Get the lesson ID from the lessons array
    const lesson = this.lessons[lessonIndex];
    const lessonId = lesson?.lessonId;

    if (!lessonId) {
      console.error('Lesson ID not found for index:', lessonIndex);
      return;
    }

    const modal = await this.modalCtrl.create({
      component: AcademyLessonsComponent,
      componentProps: {
        lessonId: lessonId,
        courseId: this.course.id,
        courseTitle: this.course.title,
        courseLessons: this.courseDetail?.lessons || [],
        currentLessonIndex: lessonIndex,
        readOnly: !!lesson.isCompleted
      }
    });

    modal.onDidDismiss().then(() => {
      // Re-fetch course data to update button states (Continue, Read Again, etc.)
      if (this.courseDetail) {
        this.fetchCourseFromApi(this.courseDetail.id);
      }
    });

    await modal.present();
  }

  onHeroCta(): void {
    const targetIndex = this.resumeLessonIndex ?? 0;
    this.onStartLesson(targetIndex);
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
        image: this.fallbackCourseImage
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
