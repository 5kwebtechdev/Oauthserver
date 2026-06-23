import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { AcademyService, CourseLesson, LessonDetailResponse } from '../../../services/academy.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-academy-lessons',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeButtonComponent, SupermeNavigatorComponent],
  templateUrl: './academy-lessons.component.html',
  styleUrls: ['./academy-lessons.component.scss']
})
export class AcademyLessonsComponent {
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
  readonly fallbackLessonImage = 'assets/Images-Transparent/Academy-Course-Thubmnail2.png';

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
    private academyService: AcademyService
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
    this.modalCtrl.dismiss({
      completed: this.doneClicked,
      lessonId: this.lesson?.id
    });
  }

  /**
   * Mark the current lesson as complete.
   * @param dismissAfter whether to dismiss the modal after marking complete
   */
  private markLessonComplete(dismissAfter = false): void {
    if (!this.lesson) return;

    this.academyService.completeLessonById(this.lesson.id)
      .pipe(
        catchError(error => {
          console.error('Error marking lesson as complete:', error);
          return of(null);
        }),
        finalize(() => {
          if (dismissAfter) {
            this.modalCtrl.dismiss({ completed: true, lessonId: this.lesson?.id });
          }
        })
      )
      .subscribe(response => {
        if (response) {
          console.log('Lesson marked as complete:', response);
        }
      });
  }

  /**
   * Handler for the Done button: mark lesson complete but keep modal open so user can go to next.
   */
  onDoneClick(): void {
    if (!this.lesson) return;
    if (this.wasCompletedOnLoad) return;

    // Optimistically mark completed locally so UI updates immediately
    this.lesson.isCompleted = true;
    this.doneClicked = true;

    // Unlock next lesson in local courseLessons array
    if (this.currentLessonIndex < this.courseLessons.length - 1) {
      this.courseLessons[this.currentLessonIndex + 1].isLocked = false;
    }
    if (this.courseLessons[this.currentLessonIndex]) {
      this.courseLessons[this.currentLessonIndex].isCompleted = true;
    }

    this.markLessonComplete(false);
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

    // Call /start for the next lesson
    this.startLesson(nextLesson.id);
  }
}
