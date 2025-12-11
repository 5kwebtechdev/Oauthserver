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
  // Track selected option index per section (e.g., { emotions: 0, sleep: 2 })
  public selected: { [section: string]: number | null } = {};

  public selectedFile: File | null = null;
  public imagePreviewUrl: string | null = null;
  public uploadProgress: number = 0;
  public isUploading: boolean = false;
  public uploadedImageUrl: string | null = null;

  // Option label arrays to map selected index to a string payload
  emotionsOptions = ['Happy', 'Excited', 'Angry', 'Sad'];
  sleepOptions = ['Good', 'Bad', 'Medium', 'Early'];
  healthOptions = ['Good', 'Bad', 'Sick', 'Healthy'];
  hobbiesOptions = ['Reading', 'Sports', 'Music', 'Travel'];
  foodOptions = ['Healthy', 'Unhealthy', 'Home cooked', 'Fast Food'];
  socialOptions = ['Friends', 'Family', 'Alone', 'Party'];
  schoolOptions = ['Good', 'Bad', 'Study', 'Exam'];

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
    // Build payload from selections and notes
    const payload: any = {
      emotions: this.selected['emotions'] != null ? this.emotionsOptions[this.selected['emotions'] as number] : null,
      sleep: this.selected['sleep'] != null ? this.sleepOptions[this.selected['sleep'] as number] : null,
      health: this.selected['health'] != null ? this.healthOptions[this.selected['health'] as number] : null,
      hobbies: this.selected['hobbies'] != null ? this.hobbiesOptions[this.selected['hobbies'] as number] : null,
      food: this.selected['food'] != null ? this.foodOptions[this.selected['food'] as number] : null,
      social: this.selected['social'] != null ? this.socialOptions[this.selected['social'] as number] : null,
      school: this.selected['school'] != null ? this.schoolOptions[this.selected['school'] as number] : null,
      notes: this.text || ''
    };

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
  }

  isSelected(section: string, index: number): boolean {
    return this.selected[section] === index;
  }
}
