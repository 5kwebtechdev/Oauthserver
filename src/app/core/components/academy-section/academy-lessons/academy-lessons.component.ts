import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { AdBannerComponent } from '../../ad-banner/ad-banner.component';
import { AcademyService, CourseLesson, LessonDetailResponse } from '../../../services/academy.service';
import { PetAgeService } from '../../../services/pet-age.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-academy-lessons',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermePetComponent, AdBannerComponent],
  templateUrl: './academy-lessons.component.html',
  styleUrls: ['./academy-lessons.component.scss']
})
export class AcademyLessonsComponent implements OnInit, OnDestroy {
  @Input() lessonId: number | string | undefined;
  @Input() courseId: string | undefined;
  @Input() courseTitle: string | undefined;
  @Input() courseLessons: CourseLesson[] = [];
  @Input() currentLessonIndex: number = 0;
  @Input() readOnly: boolean = false;

  lesson: LessonDetailResponse | null = null;
  isLoading = false;
  loadError: string | null = null;
  doneClicked = false;
  wasCompletedOnLoad = false;
  isCompleting = false;
  completionError = '';
  shareMessage = '';
  readonly focusDurationSeconds = 60;
  remainingFocusSeconds = this.focusDurationSeconds;
  private focusTimer?: ReturnType<typeof setInterval>;
  readonly fallbackLessonImage = 'assets/Images-Transparent/Academy-Course-Thubmnail2.webp';

  // Parsed content sections
  // learningOutcomes: string[] = [];
  // contentSections: Array<{ heading: string; body: string; isFunFact?: boolean }> = [];

  get isLastLesson(): boolean {
    return this.courseLessons.length === 0 || this.currentLessonIndex >= this.courseLessons.length - 1;
  }

  get nextLessonOrder(): number {
    if (this.currentLessonIndex < this.courseLessons.length - 1) {
      return this.courseLessons[this.currentLessonIndex + 1].order;
    }
    return this.currentLessonIndex + 2;
  }

  constructor(
    private modalCtrl: ModalController,
    private academyService: AcademyService,
    private petAgeService: PetAgeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (this.lessonId) {
      if (this.readOnly) {
        this.fetchLesson(this.lessonId);
      } else {
        this.startLesson(this.lessonId);
      }
    }
  }

  private startLesson(id: number | string): void {
    this.isLoading = true;
    this.loadError = null;

    this.academyService.startLessonById(id)
      .pipe(
        catchError(error => {
          console.error('Error starting lesson:', error);
          this.loadError = 'Failed to load lesson. Please try again.';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.lesson = response;
          this.wasCompletedOnLoad = response.isCompleted;
          this.startFocusTimer(response.isCompleted);
        }
      });
  }

  private fetchLesson(id: number | string): void {
    this.isLoading = true;
    this.loadError = null;

    this.academyService.getLessonById(id)
      .pipe(
        catchError(error => {
          console.error('Error fetching lesson:', error);
          this.loadError = 'Failed to load lesson. Please try again.';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.lesson = response;
          this.wasCompletedOnLoad = response.isCompleted;
          this.startFocusTimer(response.isCompleted);
        }
      });
  }

  // private parseContent(content: string): void {
  //   if (!content) return;

  //   const lines = content.split('\n').filter(line => line.trim());
  //   let currentSection: { heading: string; body: string; isFunFact?: boolean } | null = null;

  //   for (const line of lines) {
  //     const trimmed = line.trim();

  //     // Check for learning outcomes section
  //     if (trimmed === 'In this lesson you will learn' || trimmed.startsWith('By the end')) {
  //       continue;
  //     }

  //     // Parse numbered learning outcomes
  //     if (/^\d+\./.test(trimmed) && this.learningOutcomes.length < 5 && !currentSection) {
  //       this.learningOutcomes.push(trimmed);
  //       continue;
  //     }

  //     // Detect section headings (lines without periods, typically capitalized)
  //     if (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith(':') && !trimmed.match(/^\d+\./)) {
  //       // Save previous section
  //       if (currentSection) {
  //         this.contentSections.push(currentSection);
  //       }
  //       // Start new section
  //       const isFunFact = trimmed.toLowerCase().includes('fun fact');
  //       currentSection = { heading: trimmed, body: '', isFunFact };
  //       continue;
  //     }

  //     // Add to current section body
  //     if (currentSection) {
  //       currentSection.body += (currentSection.body ? ' ' : '') + trimmed;
  //     }
  //   }

  //   // Push last section
  //   if (currentSection) {
  //     this.contentSections.push(currentSection);
  //   }
  // }

  convertGoogleDriveUrl(url: string): string {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return this.fallbackLessonImage;

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

    return `/${trimmedUrl.replace(/^\/+/, '')}`;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (image && image.getAttribute('src') !== this.fallbackLessonImage) {
      image.src = this.fallbackLessonImage;
    }
  }

  private getGoogleDriveFileId(url: string): string | null {
    const viewMatch = url.match(/\/file\/d\/([^\/?]+)/);
    if (viewMatch?.[1]) return viewMatch[1];

    const openMatch = url.match(/[?&]id=([^&]+)/);
    if (openMatch?.[1]) return openMatch[1];

    const lh3Match = url.match(/googleusercontent\.com\/d\/([^\/?]+)/);
    return lh3Match?.[1] || null;
  }

  stripNumbering(text: string): string {
    return text.replace(/^\d+\.\s*/, '');
  }

  close(): void {
    this.clearFocusTimer();
    this.modalCtrl.dismiss({
      completed: this.doneClicked,
      lessonId: this.lesson?.id
    });
  }

  get timerDisplay(): string {
    const minutes = Math.floor(this.remainingFocusSeconds / 60);
    const seconds = this.remainingFocusSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  get canMarkDone(): boolean {
    return this.wasCompletedOnLoad || this.doneClicked || this.remainingFocusSeconds <= 0;
  }

  get lessonCoins(): number | null {
    const courseLesson = this.courseLessons.find(item => item.id === this.lesson?.id);
    const coins = Number(courseLesson?.coins);
    return Number.isFinite(coins) && coins > 0 ? coins : null;
  }

  get lessonProgressDots(): number[] {
    return Array.from({ length: Math.min(6, Math.max(1, this.courseLessons.length)) }, (_, index) => index);
  }

  get activeProgressDot(): number {
    if (this.lessonProgressDots.length === 1 || this.courseLessons.length <= 1) return 0;
    return Math.round((this.currentLessonIndex / (this.courseLessons.length - 1)) * (this.lessonProgressDots.length - 1));
  }

  get hasQuiz(): boolean {
    return this.getQuizSource() != null;
  }

  get quizId(): number | string | null {
    const source = this.getQuizSource();
    if (!source) return null;
    const candidate = source.quizId ?? source.assessmentId ?? source.quiz?.challengeId ?? source.quiz?.id;
    return candidate === undefined || candidate === null || candidate === '' ? null : candidate;
  }

  private getQuizSource(): Partial<LessonDetailResponse> | null {
    const courseLesson = this.courseLessons.find(item => item.id === this.lesson?.id);
    const sources = [this.lesson, courseLesson];
    return sources.find(source => !!source && (
      source.hasQuiz === true ||
      source.quizId != null ||
      source.assessmentId != null ||
      source.quiz != null
    )) ?? null;
  }

  private startFocusTimer(isCompleted: boolean): void {
    this.clearFocusTimer();
    this.remainingFocusSeconds = isCompleted ? 0 : this.focusDurationSeconds;
    if (isCompleted) return;

    this.focusTimer = setInterval(() => {
      this.remainingFocusSeconds = Math.max(0, this.remainingFocusSeconds - 1);
      if (this.remainingFocusSeconds === 0) this.clearFocusTimer();
    }, 1000);
  }

  private clearFocusTimer(): void {
    if (this.focusTimer) {
      clearInterval(this.focusTimer);
      this.focusTimer = undefined;
    }
  }

  /**
   * Handler for the Done button: mark lesson complete but keep modal open so user can go to next.
   */
  onDoneClick(): void {
    if (!this.lesson || this.isCompleting || !this.canMarkDone) return;
    if (this.wasCompletedOnLoad || this.doneClicked) {
      if (this.isLastLesson) {
        this.close();
      } else {
        this.goToNext();
      }
      return;
    }

    this.isCompleting = true;
    this.completionError = '';
    this.academyService.completeLessonById(this.lesson.id)
      .pipe(
        catchError(() => {
          this.completionError = 'We could not save your progress. Please try again.';
          return of(null);
        }),
        finalize(() => this.isCompleting = false)
      )
      .subscribe(response => {
        if (!response || !this.lesson) return;

        this.lesson = { ...this.lesson, ...response, isCompleted: true };
        this.doneClicked = true;
        this.clearFocusTimer();
        this.petAgeService.recordActivity('lessons');
        if (this.currentLessonIndex < this.courseLessons.length - 1) {
          this.courseLessons[this.currentLessonIndex + 1].isLocked = false;
        }
        if (this.courseLessons[this.currentLessonIndex]) {
          this.courseLessons[this.currentLessonIndex].isCompleted = true;
        }

        if (this.isLastLesson) {
          this.close();
        } else {
          this.goToNext();
        }
      });
  }

  /**
   * Handler for the Next button: only allowed when lesson.isCompleted === true
   */
  goToNext(): void {
    if (this.isLastLesson || this.courseLessons.length === 0) return;

    const nextIndex = this.currentLessonIndex + 1;
    const nextLesson = this.courseLessons[nextIndex];
    if (!nextLesson) return;

    // Reset state for new lesson
    this.doneClicked = false;
    this.wasCompletedOnLoad = false;

    // Update tracking
    this.currentLessonIndex = nextIndex;
    this.lessonId = nextLesson.id;
    this.readOnly = false;
    this.completionError = '';

    // Call /start for the next lesson
    this.startLesson(nextLesson.id);
  }

  async shareLesson(): Promise<void> {
    const title = this.lesson?.title || 'A SuperMe lesson';
    const text = `I am learning ${title} on SuperMe!`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard?.writeText(text);
      this.shareMessage = 'Lesson link copied';
    } catch (error: any) {
      if (error?.name !== 'AbortError') this.shareMessage = 'Unable to share right now';
    }
  }

  startQuiz(): void {
    const quizId = this.quizId;
    if (quizId == null) {
      this.completionError = 'This quiz is not available yet. Please try again later.';
      return;
    }
    this.clearFocusTimer();
    this.modalCtrl.dismiss({ completed: this.doneClicked, lessonId: this.lesson?.id })
      .then(() => this.router.navigate(['/authed/content/questions', quizId]));
  }

  retryLoad(): void {
    if (!this.lessonId) return;
    if (this.readOnly) {
      this.fetchLesson(this.lessonId);
    } else {
      this.startLesson(this.lessonId);
    }
  }

  ngOnDestroy(): void {
    this.clearFocusTimer();
  }
}
