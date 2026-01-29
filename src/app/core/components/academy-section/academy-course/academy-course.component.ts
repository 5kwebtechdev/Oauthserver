import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { IonicModule, ModalController } from '@ionic/angular';
import { CourseCard } from '../academy-section.component';
import { AcademyLessonsComponent } from '../academy-lessons/academy-lessons.component';
import { AcademyService, CourseDetailResponse, CourseLesson } from '../../../services/academy.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-academy-course',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './academy-course.component.html',
  styleUrls: ['./academy-course.component.scss'],
})
export class AcademyCourseComponent implements OnChanges, OnInit {
  @Input() course: CourseCard | null = null;

  @Output() courseOpen = new EventEmitter<CourseCard>();
  @Output() lessonStart = new EventEmitter<{ courseId: string; lessonIndex: number }>();

  lessons: Array<{ title: string; desc: string; time: string; image?: string; coins?: number; lessonId?: number; isCompleted?: boolean; lessonStatus?: string | null; status?: string | null }> = [];

  // If the user has an in-progress lesson, index of that lesson in `lessons`; null when none
  resumeLessonIndex: number | null = null;
  // API response data
  courseDetail: CourseDetailResponse | null = null;
  isLoadingCourse = false;
  loadError: string | null = null;

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
        { title: '1. What is a Budget?', desc: 'Discover what a budget is and why it matters.', time: 'Text-based • 3 mins', image: '/assets/app-assets/notebook-labeled.svg', isCompleted: false },
        { title: '2. Track Your Spending', desc: 'Learn how to track your everyday spending.', time: 'Text-based • 4 mins', image: '/assets/app-assets/child-lesson.svg', isCompleted: false },
        { title: '3. Set Spending Limits', desc: 'Find out how to set and stick to spending limits.', time: 'Text-based • 3 mins', image: '/assets/app-assets/timer-lesson.svg', isCompleted: false },
        { title: '4. Save for Your Goals', desc: 'See how to save money toward your goals.', time: 'Text-based • 4 mins', image: '/assets/app-assets/piggy-lesson.svg', isCompleted: false },
      ];
      // demo/static content: no resume index by default
      this.resumeLessonIndex = null;
      return;
    }

    const count = Math.max(0, this.course.lessons || 0);
    this.lessons = Array.from({ length: count }, (_, i) => ({
      title: `${i + 1}. Lesson ${i + 1}`,
      desc: this.course?.description || 'Lesson description',
      time: 'Text-based • 3 mins',
      image: '/assets/img/lesson-binder.png',
      isCompleted: false,
      lessonId: undefined
    }));
    this.resumeLessonIndex = null;
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
      image: this.convertGoogleDriveUrl(apiResponse.thumbnailUrl)
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
      image: this.convertGoogleDriveUrl(lesson.thumbnailUrl) || '/assets/app-assets/notebook-labeled.svg',
      coins: typeof lesson.coins === 'number' ? lesson.coins : fallbackPerLesson,
      lessonId: lesson.id,
      isCompleted: !!lesson.isCompleted,
      // API recently moved the status field to `lessonStatus` — preserve either
      lessonStatus: (lesson as any).lessonStatus ?? lesson.status ?? null,
      status: lesson.status ?? (lesson as any).lessonStatus ?? null
    }));
    // Find a lesson that has been started but not completed: prefer time spent or lastAccessedAt
    const inProgressIndex = apiLessons.findIndex(l => !l.isCompleted && (!!l.timeSpentMinutes || !!l.lastAccessedAt));
    this.resumeLessonIndex = inProgressIndex >= 0 ? inProgressIndex : null;
  }

  /**
   * Convert Google Drive share URL to direct image URL
   * @param url The Google Drive share URL
   * @returns Direct image URL or original URL if not a Google Drive link
   */
  private convertGoogleDriveUrl(url: string): string {
    if (!url) return '';

    // Check if it's a Google Drive URL in format: https://drive.google.com/file/d/{id}/view
    const match = url.match(/\/file\/d\/([^\/]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    return url;
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

  onStartLesson(index: number): void {
    if (!this.course) return;

    const lesson = this.lessons[index];
    const lessonId = lesson?.lessonId;

    if (!lessonId) {
      console.error('Lesson ID not found for index:', index);
      return;
    }

    // determine current status: prefer `lessonStatus` then `status`
    const currentStatus = lesson.lessonStatus ?? lesson.status ?? null;

    // If lesson status is PENDING, update it to ONGOING before opening
    if (currentStatus === 'PENDING') {
      this.academyService.updateLessonStatus(lessonId, 'ONGOING')
        .pipe(
          catchError(error => {
            // Log and return null so subscription still runs
            console.warn('Error updating lesson status:', error);
            return of(null);
          })
        )
        .subscribe((res) => {
          // If API responded (res not null), assume update succeeded and update local status
          if (res !== null) {
            lesson.lessonStatus = 'ONGOING';
            lesson.status = 'ONGOING';
          } else {
            // If the API returned an error (e.g. 400 "Lesson progress not found"), log and continue
            console.warn('Lesson status update returned no response — opening lesson without local status change');
          }

          // Open the lessons modal regardless of update result
          this.openChaptersModal(index).catch(err => console.error('Failed opening lessons modal', err));
        });
    } else {
      // Open the lessons modal directly if status is not PENDING
      this.openChaptersModal(index).catch(err => console.error('Failed opening lessons modal', err));
    }
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
