import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
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
  imports: [CommonModule, FormsModule, IonicModule, MindfulCardHeaderComponent, MindfulButtonComponent],
  templateUrl: './journal-input.component.html',
  styleUrls: ['./journal-input.component.scss']
})
export class JournalInputComponent implements OnInit {
  @Input() initialText: string = '';
  @Input() placeholder: string = 'Write your thoughts...';
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  text: string = '';
  showAttachPopup = false;
  public selected: { [section: string]: number | null } = {};

  public selectedFile: File | null = null;
  public imagePreviewUrl: string | null = null;
  public uploadProgress: number = 0;
  public isUploading: boolean = false;
  public uploadedImageUrl: string | null = null;
  public emotionError: string | null = null;
  public noteMaxLength = 160;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Define all sections with their options
  sections: JournalSection[] = [
    {
      key: 'emotions',
      title: 'Emotions',
      options: [
        { label: 'Happy', image: '/assets/Images-Thumbnails/Image-Journal-Emotions1.jpg' },
        { label: 'Excited', image: '/assets/Images-Thumbnails/Image-Journal-Emotions2.jpg' },
        { label: 'Angry', image: '/assets/Images-Thumbnails/Image-Journal-Emotions3.jpg' },
        { label: 'Sad', image: '/assets/Images-Thumbnails/Image-Journal-Emotions4.jpg' }
      ]
    },
    {
      key: 'sleep',
      title: 'Sleep',
      options: [
        { label: 'Good', image: '/assets/Images-Thumbnails/Image-Journal-Sleep1.jpg' },
        { label: 'Bad', image: '/assets/Images-Thumbnails/Image-Journal-Sleep2.jpg' },
        { label: 'Medium', image: '/assets/Images-Thumbnails/Image-Journal-Sleep3.jpg' },
        { label: 'Early', image: '/assets/Images-Thumbnails/Image-Journal-Sleep4.jpg' }
      ]
    },
    {
      key: 'health',
      title: 'Health',
      options: [
        { label: 'Good', image: '/assets/Images-Thumbnails/Image-Journal-Health1.jpg' },
        { label: 'Bad', image: '/assets/Images-Thumbnails/Image-Journal-Health2.jpg' },
        { label: 'Sick', image: '/assets/Images-Thumbnails/Image-Journal-Health3.jpg' },
        { label: 'Healthy', image: '/assets/Images-Thumbnails/Image-Journal-Health4.jpg' }
      ]
    },
    {
      key: 'hobbies',
      title: 'Hobbies',
      options: [
        { label: 'Reading', image: '/assets/Images-Thumbnails/Image-Journal-Hobbies1.jpg' },
        { label: 'Sports', image: '/assets/Images-Thumbnails/Image-Journal-Hobbies2.jpg' },
        { label: 'Music', image: '/assets/Images-Thumbnails/Image-Journal-Hobbies3.jpg' },
        { label: 'Travel', image: '/assets/Images-Thumbnails/Image-Journal-Hobbies4.jpg' }
      ]
    },
    {
      key: 'food',
      title: 'Food',
      options: [
        { label: 'Healthy', image: '/assets/Images-Thumbnails/Image-Journal-Food1.jpg' },
        { label: 'Unhealthy', image: '/assets/Images-Thumbnails/Image-Journal-Food2.jpg' },
        { label: 'Home cooked', image: '/assets/Images-Thumbnails/Image-Journal-Food3.jpg' },
        { label: 'Fast Food', image: '/assets/Images-Thumbnails/Image-Journal-Food4.jpg' }
      ]
    },
    {
      key: 'social',
      title: 'Social',
      options: [
        { label: 'Friends', image: '/assets/Images-Thumbnails/Image-Journal-Social1.jpg' },
        { label: 'Family', image: '/assets/Images-Thumbnails/Image-Journal-Social2.jpg' },
        { label: 'Alone', image: '/assets/Images-Thumbnails/Image-Journal-Social3.jpg' },
        { label: 'Party', image: '/assets/Images-Thumbnails/Image-Journal-Social4.jpg' }
      ]
    },
    {
      key: 'school',
      title: 'School',
      options: [
        { label: 'Good', image: '/assets/Images-Thumbnails/Image-Journal-School1.jpg' },
        { label: 'Bad', image: '/assets/Images-Thumbnails/Image-Journal-School2.jpg' },
        { label: 'Study', image: '/assets/Images-Thumbnails/Image-Journal-School3.jpg' },
        { label: 'Exam', image: '/assets/Images-Thumbnails/Image-Journal-School4.jpg' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private authApi: AuthApi,
    private s3UploadService: S3UploadService
  ) { }

  ngOnInit(): void {
    this.text = this.initialText || '';
  }

  async submit(): Promise<void> {
    // Require emotion selection
    const emotionSelected = this.selected['emotions'];
    if (emotionSelected == null) {
      this.emotionError = 'How are you feeling? Pick an emotion to continue.';
      return;
    }

    // Build payload from selections and notes
    const payload: any = { notes: this.text || '' };

    // Add selected options for each section
    this.sections.forEach(section => {
      const selectedIndex = this.selected[section.key];
      payload[section.key] = selectedIndex != null ? section.options[selectedIndex].label : null;
    });

    try {
      // Wait for any ongoing upload to complete
      if (this.isUploading) {
        alert('Please wait for the image upload to complete.');
        return;
      }

      // Build journal payload with uploaded image URL if available
      const journalPayload: any = { ...payload };
      if (this.uploadedImageUrl) {
        journalPayload.attachmentUrl = this.uploadedImageUrl;
      }

      const journalUrl = `${environment.apiUrl}/journal/add`;
      this.http.post(journalUrl, journalPayload, this.authHeaders(true)).subscribe({
        next: (res: any) => {
          console.log('Journal added:', res);
          this.save.emit(this.text);
          this.resetForm();

          // Navigate to the journal output page
          try {
            this.router.navigate(['/authed/journal-output']);
          } catch (e) {
            console.warn('Navigation to journal-output failed', e);
          }
        },
        error: (err) => {
          console.error('Failed to add journal:', err);
          alert('Failed to save journal entry. Please try again.');
        }
      });
    } catch (error) {
      console.error('Submit failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save journal. Please try again.';
      alert(errorMsg);
    }
  }

  // Ensure text stays within max length (defensive: trims pasted content)
  onNotesInput(): void {
    if (this.text && this.text.length > this.noteMaxLength) {
      this.text = this.text.slice(0, this.noteMaxLength);
    }
  }

  get notesCharCount(): number {
    return (this.text || '').length;
  }



  private resetForm(): void {
    this.text = '';
    this.selected = {};
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.uploadedImageUrl = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.text = this.initialText || '';
  }

  /**
   * Navigate back to the journals listing (user dashboard home).
   */
  goBack(): void {
    // The journals list is displayed in the authenticated user dashboard at /authed/user-dashboard
    this.router.navigate(['/authed/user-dashboard']);
  }

  // Open the attachment chooser popup (simulates native permission dialog)
  openAttachPopup(): void {
    this.showAttachPopup = true;
  }

  // Handle the user allowing access - stub for now to integrate with file picker
  onAllowAttach(): void {
    this.showAttachPopup = false;
    // trigger the hidden file input to open system file picker
    setTimeout(() => {
      try {
        this.fileInput?.nativeElement?.click();
      } catch (e) {
        console.warn('file input not available', e);
      }
    }, 50);
  }

  // Handle the user denying access
  onDenyAttach(): void {
    this.showAttachPopup = false;
    console.log('User denied attachment access');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files.length) {
      const f = input.files[0];

      // Validate file type (images only)
      if (!f.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, etc.)');
        input.value = '';
        this.selectedFile = null;
        return;
      }

      const maxBytes = 5 * 1024 * 1024; // 5 MB
      if (f.size > maxBytes) {
        console.warn('Selected file too large:', f.size);
        alert('Selected file is too large. Please choose a file smaller than 5 MB.');
        input.value = '';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = f;
      this.uploadedImageUrl = null; // Reset uploaded URL when new file is selected

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(f);

      console.log('Selected file:', this.selectedFile.name, 'size:', this.selectedFile.size);

      // Start upload immediately
      await this.uploadImageToS3();
    }
  }

  private async uploadImageToS3(): Promise<void> {
    if (!this.selectedFile) {
      return;
    }

    try {
      this.isUploading = true;
      this.uploadProgress = 10;

      const presignEndpoint = `${environment.apiUrl}/api/s3/presign`;
      const uploadCompleteEndpoint = `${environment.apiUrl}/api/s3/upload-complete/{fileId}`;
      const token = this.authApi.getToken();

      // Get userId from localStorage
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      this.uploadProgress = 20;

      // Use the complete upload workflow from S3UploadService
      const uploadedUrl = await this.s3UploadService.uploadFileComplete(
        presignEndpoint,
        uploadCompleteEndpoint,
        this.selectedFile,
        parseInt(userId, 10),
        token || undefined,
        (percent) => {
          // Map upload progress from 20% to 95%
          this.uploadProgress = 20 + Math.floor(percent * 0.75);
        },
        60000 // 60 second timeout
      );

      console.log('Image uploaded successfully:', uploadedUrl);
      this.uploadProgress = 100;

      // Store the presigned URL for journal submission
      this.uploadedImageUrl = uploadedUrl;
      this.isUploading = false;
    } catch (error) {
      console.error('Upload failed:', error);
      this.isUploading = false;
      this.uploadProgress = 0;
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload image. Please try again.';
      alert(errorMsg);

      // Reset file selection on error
      this.selectedFile = null;
      this.imagePreviewUrl = null;
      if (this.fileInput && this.fileInput.nativeElement) {
        this.fileInput.nativeElement.value = '';
      }
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.uploadedImageUrl = null;
    this.uploadProgress = 0;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private authHeaders(contentTypeJson = false): { headers: HttpHeaders } {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', value);
    }
    if (contentTypeJson) {
      headers = headers.set('Content-Type', 'application/json');
    }
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
