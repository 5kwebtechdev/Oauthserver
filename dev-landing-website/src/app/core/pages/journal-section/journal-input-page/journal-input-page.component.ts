import {
  Component,
  ElementRef,
  ViewChildren,
  ViewChild,
  QueryList,
  AfterViewInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SupermeCardHeaderComponent } from '../../../components/superme-navigator/superme-card-header/superme-card-header.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { JournalService, JournalPayload } from '../../../services/journal.service';
import { S3UploadService } from '../../../services/s3-upload.service';
import { AuthService } from '../../../services/auth.service';

interface JournalOption {
  id: string;
  label: string;
  image: string;
  selected: boolean;
}

interface JournalCategory {
  name: string;
  key: string;
  options: JournalOption[];
}

@Component({
  selector: 'app-journal-input-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicNavbarComponent, FooterComponent, SupermeCardHeaderComponent, SupermeButtonComponent],
  templateUrl: './journal-input-page.component.html',
  styleUrls: ['./journal-input-page.component.scss']
})
export class JournalInputPageComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('timelineSection')
  private timelineSectionRefs!: QueryList<ElementRef<HTMLElement>>;

  journalCategories: JournalCategory[] = [
    {
      name: 'Emotions',
      key: 'emotions',
      options: [
        { id: 'happy', label: 'Happy', image: 'assets/Images-Thumbnails/Image-Journal-Emotions1.jpg', selected: false },
        { id: 'excited', label: 'Excited', image: 'assets/Images-Thumbnails/Image-Journal-Emotions2.jpg', selected: false },
        { id: 'angry', label: 'Angry', image: 'assets/Images-Thumbnails/Image-Journal-Emotions3.jpg', selected: false },
        { id: 'sad', label: 'Sad', image: 'assets/Images-Thumbnails/Image-Journal-Emotions4.jpg', selected: false }
      ]
    },
    {
      name: 'Sleep',
      key: 'sleep',
      options: [
        { id: 'good', label: 'Good', image: 'assets/Images-Thumbnails/Image-Journal-Sleep1.jpg', selected: false },
        { id: 'bad', label: 'Bad', image: 'assets/Images-Thumbnails/Image-Journal-Sleep2.jpg', selected: false },
        { id: 'medium', label: 'Medium', image: 'assets/Images-Thumbnails/Image-Journal-Sleep3.jpg', selected: false },
        { id: 'early', label: 'Early', image: 'assets/Images-Thumbnails/Image-Journal-Sleep4.jpg', selected: false }
      ]
    },
    {
      name: 'Health',
      key: 'health',
      options: [
        { id: 'good', label: 'Good', image: 'assets/Images-Thumbnails/Image-Journal-Health1.jpg', selected: false },
        { id: 'bad', label: 'Bad', image: 'assets/Images-Thumbnails/Image-Journal-Health2.jpg', selected: false },
        { id: 'sick', label: 'Sick', image: 'assets/Images-Thumbnails/Image-Journal-Health3.jpg', selected: false },
        { id: 'healthy', label: 'Healthy', image: 'assets/Images-Thumbnails/Image-Journal-Health4.jpg', selected: false }
      ]
    },
    {
      name: 'Hobbies',
      key: 'hobbies',
      options: [
        { id: 'reading', label: 'Reading', image: 'assets/Images-Thumbnails/Image-Journal-Hobbies1.jpg', selected: false },
        { id: 'sports', label: 'Sports', image: 'assets/Images-Thumbnails/Image-Journal-Hobbies2.jpg', selected: false },
        { id: 'music', label: 'Music', image: 'assets/Images-Thumbnails/Image-Journal-Hobbies3.jpg', selected: false },
        { id: 'travel', label: 'Travel', image: 'assets/Images-Thumbnails/Image-Journal-Hobbies4.jpg', selected: false }
      ]
    },
    {
      name: 'Food',
      key: 'food',
      options: [
        { id: 'healthy', label: 'Healthy', image: 'assets/Images-Thumbnails/Image-Journal-Food1.jpg', selected: false },
        { id: 'unhealthy', label: 'Unhealthy', image: 'assets/Images-Thumbnails/Image-Journal-Food2.jpg', selected: false },
        { id: 'home', label: 'Home cooked', image: 'assets/Images-Thumbnails/Image-Journal-Food3.jpg', selected: false },
        { id: 'fast', label: 'Fast Food', image: 'assets/Images-Thumbnails/Image-Journal-Food4.jpg', selected: false }
      ]
    },
    {
      name: 'Social',
      key: 'social',
      options: [
        { id: 'friends', label: 'Friends', image: 'assets/Images-Thumbnails/Image-Journal-Social1.jpg', selected: false },
        { id: 'family', label: 'Family', image: 'assets/Images-Thumbnails/Image-Journal-Social2.jpg', selected: false },
        { id: 'alone', label: 'Alone', image: 'assets/Images-Thumbnails/Image-Journal-Social3.jpg', selected: false },
        { id: 'party', label: 'Party', image: 'assets/Images-Thumbnails/Image-Journal-Social4.jpg', selected: false }
      ]
    },
    {
      name: 'School',
      key: 'school',
      options: [
        { id: 'good', label: 'Good', image: 'assets/Images-Thumbnails/Image-Journal-School1.jpg', selected: false },
        { id: 'bad', label: 'Bad', image: 'assets/Images-Thumbnails/Image-Journal-School2.jpg', selected: false },
        { id: 'study', label: 'Study', image: 'assets/Images-Thumbnails/Image-Journal-School3.jpg', selected: false },
        { id: 'exam', label: 'Exam', image: 'assets/Images-Thumbnails/Image-Journal-School4.jpg', selected: false }
      ]
    }
  ];

  noteText: string = '';
  selectedFile: File | null = null;
  fileName: string = '';
  // Multi-image upload support (max 3)
  private static readonly MAX_IMAGES = 3;
  public uploadedImages: Array<{ file: File; previewUrl: string; uploadedUrl: string | null; uploading: boolean; progress: number }> = [];
  public imageUploadError: string = '';
  public currentUploadIndex = -1;
  timelineSegments: number[] = [];
  private timelineUpdateHandle: ReturnType<typeof setTimeout> | null = null;
  private timelineSectionsChangeSub?: Subscription;

  // Upload state
  imagePreviewUrl: string | null = null;
  uploadedImageUrl: string | null = null;
  uploadProgress = 0;
  isUploading = false;
  isSubmitting = false;
  errorMessage = '';
  public emotionError: string | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Harmless reference so the imported SupermeButtonComponent is considered "used"
  // by the Angular language service / editor. No runtime effect.
  readonly _SupermeButtonRef = SupermeButtonComponent;

  constructor(
    private router: Router,
    private journalService: JournalService,
    private s3UploadService: S3UploadService,
    private authService: AuthService
  ) {
    this.timelineSegments = new Array(this.journalCategories.length + 3).fill(160);
  }

  ngAfterViewInit(): void {
    this.timelineSectionsChangeSub = this.timelineSectionRefs.changes.subscribe(() => {
      this.scheduleTimelineUpdate();
    });
    this.scheduleTimelineUpdate();
  }

  ngOnDestroy(): void {
    if (this.timelineUpdateHandle !== null) {
      clearTimeout(this.timelineUpdateHandle);
      this.timelineUpdateHandle = null;
    }
    this.timelineSectionsChangeSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleTimelineUpdate();
  }

  // Select one option per category (radio behaviour)
  toggleOption(categoryKey: string, optionId: string): void {
    const category = this.journalCategories.find(c => c.key === categoryKey);
    if (category) {
      category.options.forEach(o => {
        o.selected = o.id === optionId ? !o.selected : false;
      });
    }
    this.scheduleTimelineUpdate();
  }

  // Handle file selection (supports multi-slot uploads)
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    try {
      if (input.files && input.files.length > 0) {
        const f = input.files[0];

        // Validate file
        const validation = this.journalService.validateFile(f);
        if (!validation.valid) {
          this.imageUploadError = validation.error || 'Invalid file';
          input.value = '';
          return;
        }

        // Generate preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          const idx = this.currentUploadIndex >= 0 ? this.currentUploadIndex : this.uploadedImages.length;
          if (idx < JournalInputPageComponent.MAX_IMAGES) {
            const imgObj = { file: f, previewUrl: preview, uploadedUrl: null as string | null, uploading: false, progress: 0 };
            if (idx < this.uploadedImages.length) {
              this.uploadedImages[idx] = imgObj;
            } else {
              this.uploadedImages.push(imgObj);
            }
            this.imageUploadError = '';
          }
        };
        reader.readAsDataURL(f);
      }
    } finally {
      try { if (input) input.value = ''; } catch (_) {}
      this.currentUploadIndex = -1;
    }
    this.scheduleTimelineUpdate();
  }

  private uploadImageToS3ForIndex(index: number): void {
    if (index < 0 || index >= this.uploadedImages.length) return;
    const imgData = this.uploadedImages[index];
    if (!imgData?.file) return;

    const userIdStr = this.authService.getUserId();
    if (!userIdStr) {
      this.imageUploadError = 'Please log in to upload images';
      return;
    }

    (async () => {
      try {
        imgData.uploading = true;
        imgData.progress = 10;

        const uploadedUrl = await this.s3UploadService.uploadFileComplete(
          imgData.file,
          parseInt(userIdStr, 10),
          this.authService.getToken() || undefined,
          (percent) => imgData.progress = 10 + Math.floor(percent * 0.85),
          60000
        );

        imgData.uploadedUrl = uploadedUrl;
        imgData.progress = 100;
        imgData.uploading = false;
        this.imageUploadError = '';
      } catch (error) {
        console.error(`Upload failed for slot ${index}:`, error);
        imgData.uploading = false;
        imgData.progress = 0;
        imgData.uploadedUrl = null;
        const msg = error instanceof Error ? error.message : 'Upload failed';
        this.imageUploadError = `Image upload failed — it will be skipped when saving.`;
      }
    })();
  }

  // clear single-image legacy values
  removeImage(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.imagePreviewUrl = null;
    this.uploadedImageUrl = null;
    this.uploadProgress = 0;
    this.imageUploadError = '';
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  // remove a specific uploaded image slot
  removeImageSlot(index: number): void {
    if (index >= 0 && index < this.uploadedImages.length) {
      this.uploadedImages.splice(index, 1);
    }
    if (this.uploadedImages.length === 0) {
      // clear legacy single-image fields
      this.removeImage();
    }
    this.scheduleTimelineUpdate();
  }

  triggerFileInput(slotIndex: number): void {
    if (slotIndex >= JournalInputPageComponent.MAX_IMAGES) return;
    this.currentUploadIndex = slotIndex;
    try { this.fileInput?.nativeElement?.click(); } catch (e) { console.warn('Failed to open file picker', e); }
  }

  get canAddMoreImages(): boolean {
    return this.uploadedImages.length < JournalInputPageComponent.MAX_IMAGES;
  }

  getEmptySlotArray(): number[] {
    return Array.from({ length: Math.max(0, JournalInputPageComponent.MAX_IMAGES - this.uploadedImages.length) }, (_, i) => i);
  }

  isAnyImageUploading(): boolean {
    return this.uploadedImages.some(img => img.uploading);
  }

  getAverageProgress(): number {
    const uploadingImages = this.uploadedImages.filter(img => img.uploading);
    if (uploadingImages.length === 0) return 0;
    const totalProgress = uploadingImages.reduce((sum, img) => sum + img.progress, 0);
    return Math.round(totalProgress / uploadingImages.length);
  }

  onSectionContentChange(): void {
    this.scheduleTimelineUpdate();
  }

  // Submit journal entry
  submitJournal(): void {
    // Require emotion selection
    const emotionSelected = this.journalCategories.find(c => c.key === 'emotions')?.options.some(o => o.selected);
    if (!emotionSelected) {
      this.emotionError = 'How are you feeling? Pick an emotion to continue.';
      return;
    }

    // Build payload from selections and notes
    const payload: JournalPayload = { notes: this.noteText || '' };

    this.journalCategories.forEach(category => {
      const selected = category.options.filter(o => o.selected).map(o => o.label);
      if (selected.length > 0) {
        (payload as any)[category.key] = selected.join(', ');
      }
    });

    try {
      // Wait for any ongoing uploads to complete
      const uploading = this.isUploading || this.uploadedImages.some(img => img.uploading);
      if (uploading) {
        this.errorMessage = 'Please wait for all image uploads to complete.';
        return;
      }

      // Validate
      const validation = this.journalService.validatePayload(payload);
      if (!validation.valid) {
        this.errorMessage = validation.errors.join(', ');
        return;
      }

      // Collect the actual File objects to send as multipart
      const files = this.uploadedImages.map(img => img.file).filter(Boolean);

      this.isSubmitting = true;
      this.errorMessage = '';
      this.emotionError = null;

      this.journalService.addEntry(payload, files).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.resetForm();
          this.router.navigate(['/home/journal-output']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.message || 'Failed to save journal entry';
          console.error('Journal save failed:', err);
        }
      });
    } catch (error) {
      console.error('Submit failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save journal. Please try again.';
      this.errorMessage = errorMsg;
    }
  }

  get isEmotionSelected(): boolean {
    const selected = this.journalCategories.find(c => c.key === 'emotions')?.options.some(o => o.selected);
    if (selected) {
      this.emotionError = null;
    }
    return !!selected;
  }

  private resetForm(): void {
    this.noteText = '';
    this.journalCategories.forEach(c => c.options.forEach(o => o.selected = false));
    this.removeImage();
    this.uploadedImages = [];
    this.errorMessage = '';
    this.emotionError = null;
  }

  // Close the input and return to journal list
  closeInput(): void {
    this.router.navigate(['/home/journal-output']);
  }

  private scheduleTimelineUpdate(): void {
    if (this.timelineUpdateHandle !== null) {
      clearTimeout(this.timelineUpdateHandle);
    }

    this.timelineUpdateHandle = setTimeout(() => {
      this.timelineUpdateHandle = null;
      this.calculateTimelineSegments();
    }, 0);
  }

  private calculateTimelineSegments(): void {
    if (!this.timelineSectionRefs || this.timelineSectionRefs.length === 0) {
      return;
    }

    const sections = this.timelineSectionRefs.toArray().map(section => section.nativeElement);
    const segments = sections.map((section, index) => {
      const nextSection = sections[index + 1];
      if (nextSection) {
        const segmentHeight = nextSection.offsetTop - section.offsetTop;
        return Math.max(segmentHeight, 72);
      }
      return Math.max(section.offsetHeight, 72);
    });

    this.timelineSegments = segments;
  }
}
