import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
import { RefreshService } from '../../../services/refresh.service';
import { S3UploadService } from '../../../services/s3-upload/s3-upload.service';

interface JournalOption {
  label: string;
  image: string;
}

interface JournalSection {
  key: string;
  title: string;
  options: JournalOption[];
}

@Component({
  selector: 'app-journal-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupermeCardHeaderComponent,
    SupermeButtonComponent,
  ],
  templateUrl: './journal-input.component.html',
  styleUrls: ['./journal-input.component.scss'],
})
export class JournalInputComponent implements OnInit {
  @Input() initialText: string = '';
  @Input() placeholder: string = 'Write your thoughts...';
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  text: string = '';
  public selected: { [section: string]: number | null } = {};

  // // Multi-image upload (max 3)
  private static readonly MAX_IMAGES = 3;
  // public uploadedImages: Array<{
  //    file: File;
  //    previewUrl: string;
  //    uploadedUrl: string | null;
  //    uploading: boolean;
  //    progress: number
  //   } > = [];

  public uploadedImages: Array<{
    file: File;
    previewUrl: string;
  }> = [];
  public emotionError: string | null = null;
  public imageUploadError: string | null = null;
  public noteMaxLength = 160;
  public currentUploadIndex = -1;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Define all sections with their options
  sections: JournalSection[] = [
    {
      key: 'emotions',
      title: 'Emotions',
      options: [
        {
          label: 'Happy',
          image: 'assets/Images-Thumbnails/Image-Journal-Emotions1.jpg',
        },
        {
          label: 'Excited',
          image: 'assets/Images-Thumbnails/Image-Journal-Emotions2.jpg',
        },
        {
          label: 'Angry',
          image: 'assets/Images-Thumbnails/Image-Journal-Emotions3.jpg',
        },
        {
          label: 'Sad',
          image: 'assets/Images-Thumbnails/Image-Journal-Emotions4.jpg',
        },
      ],
    },
    {
      key: 'sleep',
      title: 'Sleep',
      options: [
        {
          label: 'Good',
          image: 'assets/Images-Thumbnails/Image-Journal-Sleep1.jpg',
        },
        {
          label: 'Bad',
          image: 'assets/Images-Thumbnails/Image-Journal-Sleep2.jpg',
        },
        {
          label: 'Medium',
          image: 'assets/Images-Thumbnails/Image-Journal-Sleep3.jpg',
        },
        {
          label: 'Early',
          image: 'assets/Images-Thumbnails/Image-Journal-Sleep4.jpg',
        },
      ],
    },
    {
      key: 'health',
      title: 'Health',
      options: [
        {
          label: 'Good',
          image: 'assets/Images-Thumbnails/Image-Journal-Health1.jpg',
        },
        {
          label: 'Bad',
          image: 'assets/Images-Thumbnails/Image-Journal-Health2.jpg',
        },
        {
          label: 'Sick',
          image: 'assets/Images-Thumbnails/Image-Journal-Health3.jpg',
        },
        {
          label: 'Healthy',
          image: 'assets/Images-Thumbnails/Image-Journal-Health4.jpg',
        },
      ],
    },
    {
      key: 'hobbies',
      title: 'Hobbies',
      options: [
        {
          label: 'Reading',
          image: 'assets/Images-Thumbnails/Image-Journal-Hobbies1.jpg',
        },
        {
          label: 'Sports',
          image: 'assets/Images-Thumbnails/Image-Journal-Hobbies2.jpg',
        },
        {
          label: 'Music',
          image: 'assets/Images-Thumbnails/Image-Journal-Hobbies3.jpg',
        },
        {
          label: 'Travel',
          image: 'assets/Images-Thumbnails/Image-Journal-Hobbies4.jpg',
        },
      ],
    },
    {
      key: 'food',
      title: 'Food',
      options: [
        {
          label: 'Healthy',
          image: 'assets/Images-Thumbnails/Image-Journal-Food1.jpg',
        },
        {
          label: 'Unhealthy',
          image: 'assets/Images-Thumbnails/Image-Journal-Food2.jpg',
        },
        {
          label: 'Home cooked',
          image: 'assets/Images-Thumbnails/Image-Journal-Food3.jpg',
        },
        {
          label: 'Fast Food',
          image: 'assets/Images-Thumbnails/Image-Journal-Food4.jpg',
        },
      ],
    },
    {
      key: 'social',
      title: 'Social',
      options: [
        {
          label: 'Friends',
          image: 'assets/Images-Thumbnails/Image-Journal-Social1.jpg',
        },
        {
          label: 'Family',
          image: 'assets/Images-Thumbnails/Image-Journal-Social2.jpg',
        },
        {
          label: 'Alone',
          image: 'assets/Images-Thumbnails/Image-Journal-Social3.jpg',
        },
        {
          label: 'Party',
          image: 'assets/Images-Thumbnails/Image-Journal-Social4.jpg',
        },
      ],
    },
    {
      key: 'school',
      title: 'School',
      options: [
        {
          label: 'Good',
          image: 'assets/Images-Thumbnails/Image-Journal-School1.jpg',
        },
        {
          label: 'Bad',
          image: 'assets/Images-Thumbnails/Image-Journal-School2.jpg',
        },
        {
          label: 'Study',
          image: 'assets/Images-Thumbnails/Image-Journal-School3.jpg',
        },
        {
          label: 'Exam',
          image: 'assets/Images-Thumbnails/Image-Journal-School4.jpg',
        },
      ],
    },
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private authApi: AuthApi,
    private refreshService: RefreshService,
    private s3UploadService: S3UploadService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.text = this.initialText || '';
  }

  // async submit(): Promise<void> {
  //   // Require emotion selection
  //   const emotionSelected = this.selected['emotions'];
  //   if (emotionSelected == null) {
  //     this.emotionError = 'How are you feeling? Pick an emotion to continue.';
  //     return;
  //   }

  //   // Build payload from selections and notes
  //   const payload: any = { notes: this.text || '' };

  //   // Add selected options for each section
  //   this.sections.forEach(section => {
  //     const selectedIndex = this.selected[section.key];
  //     payload[section.key] = selectedIndex != null ? section.options[selectedIndex].label : null;
  //   });

  //   try {
  //     // Wait for any ongoing uploads to complete
  //     const uploading = this.uploadedImages.some(img => img.uploading);
  //     if (uploading) {
  //       alert('Please wait for all image uploads to complete.');
  //       return;
  //     }

  //     // Build journal payload with uploaded image URLs
  //     const journalPayload: any = { ...payload };
  //     const uploadedUrls = this.uploadedImages
  //       .filter(img => img.uploadedUrl)
  //       .map(img => img.uploadedUrl);
  //     if (uploadedUrls.length > 0) {
  //       journalPayload.attachmentUrls = uploadedUrls;
  //     }

  //     const journalUrl = `${environment.apiUrl}/journal/add`;
  //     this.http.post(journalUrl, journalPayload, this.authHeaders(true)).subscribe({
  //       next: (res: any) => {
  //         this.save.emit(this.text);
  //         this.resetForm();

  //         // Navigate to the journal output page
  //         try {
  //           this.router.navigate(['/authed/journal-output']);
  //         } catch (e) {
  //           console.warn('Navigation to journal-output failed', e);
  //         }
  //       },
  //       error: (err) => {
  //         console.error('Failed to add journal:', err);
  //         alert('Failed to save journal entry. Please try again.');
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Submit failed:', error);
  //     const errorMsg = error instanceof Error ? error.message : 'Failed to save journal. Please try again.';
  //     alert(errorMsg);
  //   }
  // }

  async submit(): Promise<void> {
    // Require emotion selection
    const emotionSelected = this.selected['emotions'];
    if (emotionSelected == null) {
      this.emotionError = 'How are you feeling? Pick an emotion to continue.';
      return;
    }

    try {
      // 🚫 Prevent submit while uploading
      // const uploading = this.uploadedImages.some(img => img.uploading);
      // if (uploading) {
      //   alert('Please wait for all image uploads to complete.');
      //   return;
      // }

      // ✅ Create FormData instead of JSON
      const formData = new FormData();

      // ✅ Add notes
      formData.append('notes', this.text || '');

      // ✅ Add all section values
      this.sections.forEach((section) => {
        const selectedIndex = this.selected[section.key];
        if (selectedIndex != null) {
          // formData.append(section.key, section.options[selectedIndex].label);
          formData.append(
        section.key,
        section.options[selectedIndex].label.toLowerCase()
      );
        }
      });

      // ✅ IMPORTANT: attach FILES (not URLs)
      this.uploadedImages.forEach((img) => {
        if (img.file) {
          formData.append('files', img.file);
        }
      });

      const journalUrl = `${environment.apiUrl}/journal/add`;

      // ✅ DO NOT set Content-Type manually
      this.http.post(journalUrl, formData, this.authHeaders()).subscribe({
        next: (res: any) => {
          this.refreshService.notifyJournalAdded();
          this.save.emit(this.text);
          this.resetForm();

          try {
            this.router.navigate(['/authed/journal-output']);
          } catch (e) {
            console.warn('Navigation failed', e);
          }
        },
        error: (err) => {
          console.error('Failed to add journal:', err);
          alert('Failed to save journal entry.');
        },
      });
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Something went wrong.');
    }
  }

  /** Whether the post button should be enabled (requires an emotion selected) */
  get isPostEnabled(): boolean {
    return this.selected['emotions'] != null;
  }

  /** Guarded click handler for the post button */
  handleSubmit(): void {
    if (!this.isPostEnabled) {
      this.emotionError = 'How are you feeling? Pick an emotion to continue.';
      return;
    }
    // call submit and ignore returned promise
    void this.submit();
  }

  /** Handle user attempting to post (even when button disabled) */
  onPostAttempt(event: MouseEvent): void {
    // If post is enabled, proceed normally
    if (this.isPostEnabled) {
      // Prevent the container click from firing twice if inner component emits click
      event.stopPropagation();
      this.handleSubmit();
      return;
    }

    // Show error prompting selection of emotion
    this.emotionError = 'How are you feeling? Pick an emotion to continue.';

    // Optionally, bring the emotions section into view for the user
    try {
      const el = document.querySelector('.timeline .section');
      if (el)
        (el as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
    } catch (e) {
      /* ignore */
    }
  }

  // Ensure text stays within max length (defensive: trims pasted content)
  onNotesInput(): void {
    if (this.text && this.text.length > this.noteMaxLength) {
      this.text = this.text.slice(0, this.noteMaxLength);
    }
  }

  autoExpandTextarea(event: any): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = (scrollHeight > 300 ? 300 : scrollHeight) + 'px';
  }

  get notesCharCount(): number {
    return (this.text || '').length;
  }

  private resetForm(): void {
    this.text = '';
    this.selected = {};
    this.uploadedImages = [];
    this.currentUploadIndex = -1;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.imageUploadError = null;
  }

  onCancel(): void {
    this.cancel.emit();
    this.text = this.initialText || '';
  }

  /**
   * Navigate back to the journals listing (user dashboard home).
   */
  goBack(): void {
    // Prefer navigating back in history so the user returns to the originating entry page.
    try {
      // Use Angular Location.back() which maps to history.back()
      this.location.back();
    } catch (e) {
      // Fallback to routing to user dashboard if history isn't available
      this.router.navigate(['/authed/user-dashboard']).catch(() => {
        /* ignore navigation errors */
      });
    }
  }

  /**
   * Trigger the native file picker directly.
   * The device OS will automatically prompt for permissions if needed.
   */
  triggerNativeFilePicker(): void {
    try {
      this.fileInput?.nativeElement?.click();
    } catch (e) {
      console.warn('Failed to open file picker:', e);
    }
  }

  // async onFileSelected(event: Event): Promise<void> {
  //   const input = event.target as HTMLInputElement;

  //   try {
  //     if (!input) {
  //       console.warn('onFileSelected: event.target is not an input element');
  //       return;
  //     }
  //     if (input && input.files && input.files.length) {
  //       const f = input.files[0];

  //       // Validate file type (images only). Some mobile WebViews may provide an empty `type`.
  //       const fileType = f.type || '';
  //       if (fileType) {
  //         if (!fileType.startsWith('image/')) {
  //           this.imageUploadError = 'Invalid format';
  //           input.value = '';
  //           return;
  //         }
  //       } else {
  //         // Fallback: check filename extension when `type` is empty
  //         const name = (f.name || '').toLowerCase();
  //         if (!name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) {
  //           console.warn(
  //             'Selected file has no type and unknown extension:',
  //             f.name,
  //           );
  //           this.imageUploadError = 'Invalid format';
  //           input.value = '';
  //           return;
  //         }
  //       }

  //       const maxBytes = 7 * 1024 * 1024; // 7 MB
  //       if (f.size > maxBytes) {
  //         console.warn('Selected file too large:', f.size);
  //         this.imageUploadError = 'File size limit 7mb';
  //         input.value = '';
  //         return;
  //       }

  //       // Generate preview
  //       try {
  //         // Use arrayBuffer + blob URL for preview — more reliable across mobile WebViews
  //         const buffer = await f.arrayBuffer();
  //         const blob = new Blob([buffer], { type: f.type || 'image/jpeg' });
  //         const previewUrl = URL.createObjectURL(blob);
  //         const idx =
  //           this.currentUploadIndex >= 0
  //             ? this.currentUploadIndex
  //             : this.uploadedImages.length;

  //         if (idx < JournalInputComponent.MAX_IMAGES) {
  //           if (idx < this.uploadedImages.length) {
  //             this.uploadedImages[idx] = {
  //               file: f,
  //               previewUrl,
  //               uploadedUrl: null,
  //               uploading: false,
  //               progress: 0,
  //             };
  //           } else {
  //             this.uploadedImages.push({
  //               file: f,
  //               previewUrl,
  //               uploadedUrl: null,
  //               uploading: false,
  //               progress: 0,
  //             });
  //           }

  //           // Clear any previous upload-format/size error once a valid file is selected
  //           this.imageUploadError = null;
  //           // this.uploadImageToS3(idx);
  //         }
  //       } catch (err) {
  //         console.error('arrayBuffer preview failed:', err);
  //       }
  //     }
  //   } catch (err) {
  //     console.error('onFileSelected failed:', err);
  //   } finally {
  //     // reset input so same file can be selected again later
  //     try {
  //       if (input) input.value = '';
  //     } catch (_) {}
  //     this.currentUploadIndex = -1;
  //   }
  // }

async onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;

  try {
    if (!input?.files?.length) return;

    const file = input.files[0];

    // Validate file type
    const fileType = file.type || '';
    if (
      fileType &&
      !fileType.startsWith('image/')
    ) {
      this.imageUploadError = 'Invalid format';
      return;
    }

    // fallback extension check
    if (!fileType) {
      const name = file.name.toLowerCase();
      if (!name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) {
        this.imageUploadError = 'Invalid format';
        return;
      }
    }

    // size check
    const maxBytes = 7 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.imageUploadError = 'File size limit 7mb';
      return;
    }

    // preview
    const previewUrl = URL.createObjectURL(file);

    const idx =
      this.currentUploadIndex >= 0
        ? this.currentUploadIndex
        : this.uploadedImages.length;

    if (idx < JournalInputComponent.MAX_IMAGES) {
      if (idx < this.uploadedImages.length) {
        this.uploadedImages[idx] = {
          file,
          previewUrl,
        };
      } else {
        this.uploadedImages.push({
          file,
          previewUrl,
        });
      }
    }

    this.imageUploadError = null;
  } catch (err) {
    console.error('onFileSelected failed:', err);
  } finally {
    input.value = '';
    this.currentUploadIndex = -1;
  }
}


  // private uploadImageToS3(index: number): void {
  //   if (index < 0 || index >= this.uploadedImages.length) return;

  //   const imgData = this.uploadedImages[index];
  //   if (!imgData.file) return;

  //   (async () => {
  //     try {
  //       imgData.uploading = true;
  //       imgData.progress = 10;

  //       const presignEndpoint = `${environment.apiUrl}/api/s3/presign`;
  //       const uploadCompleteEndpoint = `${environment.apiUrl}/api/s3/upload-complete/{fileId}`;
  //       const token = this.authApi.getToken();

  //       const userId = localStorage.getItem('user_id');
  //       if (!userId) throw new Error('User ID not found. Please log in again.');

  //       imgData.progress = 20;

  //       const uploadedUrl = await this.s3UploadService.uploadFileComplete(
  //         presignEndpoint,
  //         uploadCompleteEndpoint,
  //         imgData.file,
  //         parseInt(userId, 10),
  //         token || undefined,
  //         (percent) => {
  //           imgData.progress = 20 + Math.floor(percent * 0.75);
  //         },
  //         60000
  //       );

  //       imgData.uploadedUrl = uploadedUrl;
  //       imgData.progress = 100;
  //       imgData.uploading = false;
  //       // clear any image upload error on successful upload
  //       this.imageUploadError = null;
  //     } catch (error) {
  //       console.error(`Upload failed for slot ${index}:`, error);
  //       imgData.uploading = false;
  //       imgData.progress = 0;
  //       const msg = error instanceof Error ? error.message : 'Upload failed';
  //       // Map presign server error to invalid format message and avoid alert
  //       let isPresignError = false;
  //       try {
  //         if (error && typeof error === 'object') {
  //           // common shapes: { status, error: { path, status, message }, path }
  //           if ((error as any).status === 500 && typeof (error as any).path === 'string' && String((error as any).path).includes('presign')) {
  //             isPresignError = true;
  //           }
  //           if ((error as any).error && typeof (error as any).error === 'object') {
  //             const e2 = (error as any).error;
  //             if (e2.status === 500 && typeof e2.path === 'string' && String(e2.path).includes('presign')) {
  //               isPresignError = true;
  //             }
  //           }
  //           if (!isPresignError && /presign/.test(JSON.stringify(error))) {
  //             isPresignError = true;
  //           }
  //         }
  //       } catch (e) { /* ignore */ }

  //       if (isPresignError) {
  //         this.imageUploadError = 'Invalid format';
  //       } else {
  //         this.imageUploadError = `Failed to upload image: ${msg}`;
  //       }

  //       // Remove failed image
  //       this.removeImage(index);

  //     }
  //   })();
  // }

  removeImage(index: number): void {
    if (index >= 0 && index < this.uploadedImages.length) {
      this.uploadedImages.splice(index, 1);
    }
  }

  triggerFileInput(slotIndex: number): void {
    if (slotIndex >= JournalInputComponent.MAX_IMAGES) return;
    this.currentUploadIndex = slotIndex;
    this.fileInput?.nativeElement?.click();
  }

  get canAddMoreImages(): boolean {
    return this.uploadedImages.length < JournalInputComponent.MAX_IMAGES;
  }

  getEmptySlotCount(): number {
    return JournalInputComponent.MAX_IMAGES - this.uploadedImages.length;
  }

  getEmptySlotArray(): number[] {
    return Array.from({ length: this.getEmptySlotCount() }, (_, i) => i);
  }

  // getAverageProgress(): number {
  //   const uploadingImages = this.uploadedImages.filter((img) => img.uploading);
  //   if (uploadingImages.length === 0) return 0;
  //   const totalProgress = uploadingImages.reduce(
  //     (sum, img) => sum + img.progress,
  //     0,
  //   );
  //   return Math.round(totalProgress / uploadingImages.length);
  // }

  // isAnyImageUploading(): boolean {
  //   return this.uploadedImages.some((img) => img.uploading);
  // }

  // hasUploadedImagesReady(): boolean {
  //   const uploadedCount = this.uploadedImages.filter(
  //     (img) => img.uploadedUrl,
  //   ).length;
  //   return uploadedCount > 0 && !this.isAnyImageUploading();
  // }

  private authHeaders(contentTypeJson = false): { headers: HttpHeaders } {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', value);
    }
    // if (contentTypeJson) {
    //   headers = headers.set('Content-Type', 'application/json');
    // }
    return { headers };
  }

  /**
   * Select an option in a given section. If the same option is clicked again, toggle off.
   */
  selectOption(section: string, index: number): void {
    const prev = this.selected[section];
    if (prev === index) {
      this.selected[section] = null;
    } else {
      this.selected[section] = index;
    }
    // Clear emotion error when an emotion is chosen/toggled
    if (section === 'emotions' && this.selected['emotions'] != null) {
      this.emotionError = null;
    }
  }

  isSelected(section: string, index: number): boolean {
    return this.selected[section] === index;
  }

  trackBySection = (_: number, section: JournalSection) => section.key;
}
