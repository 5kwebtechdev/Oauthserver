import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulCardHeaderComponent } from 'src/app/core/components/mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulNavigatorComponent } from 'src/app/core/components/mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from 'src/app/core/components/mindful-button/mindful-button.component';
import { MindfulToggleComponent } from '../../mindful-selectors/mindful-toggle/mindful-toggle.component';
import { MindfulPopupComponent, MindfulPopupConfig } from '../../mindful-popup/mindful-popup.component';
import { FormsModule } from '@angular/forms';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { IonicModule, ToastController } from '@ionic/angular';

@Component({
    selector: 'upload-reel',
    templateUrl: './upload-reel.component.html',
    styleUrls: ['./upload-reel.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule, MindfulCardHeaderComponent, MindfulButtonComponent, MindfulNavigatorComponent, MindfulInputsModule, MindfulToggleComponent, MindfulPopupComponent]
})
export class UploadReelComponent {
    @Input() items: any[] = [];
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    // Video upload state
    selectedVideoFile: File | null = null;
    videoPreviewUrl: string | null = null;
    showMetaPage: boolean = false;

    // Validation constants
    readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB in bytes
    readonly MIN_VIDEO_DURATION = 5; // seconds
    readonly ALLOWED_FORMATS = ['video/mp4', 'video/quicktime'];
    readonly ALLOWED_EXTENSIONS = ['.mp4', '.mov'];

    // Form fields
    reelTitle: string = '';
    letterCount: number = 0;
    reelHashtags: string = '';
    hashtagCount: number = 0;
    readonly maxHashtags = 4;
    reelCategory: string = '';
    readonly categories = [
        'Science Wonders',
        'Creative Arts',
        'Comedy & Fun',
        'Daily Inspiration'
    ];

    constructor(private toastController: ToastController) { }

    // Keep only alphabets and spaces (if you want to disallow spaces remove the space from the regex)
    private filterToAlphabets(value: string) {
        // Remove anything that's not A-Z or a-z (preserve spaces)
        return value.replace(/[^A-Za-z ]+/g, '');
    }

    onTitleInput(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        // Filter out non-alphabet characters
        let filtered = this.filterToAlphabets(input.value || '');
        // Trim to max 40 letters (we count only letters, not spaces)
        // But we still keep spaces in the displayed value; to enforce 40 letters only, we need to count letters
        const lettersOnly = filtered.replace(/[^A-Za-z]/g, '');
        if (lettersOnly.length > 40) {
            // Need to cut down to first 40 letters while preserving spaces in relative order
            let lettersNeeded = 40;
            let result = '';
            for (let i = 0; i < filtered.length; i++) {
                const ch = filtered[i];
                if (/[A-Za-z]/.test(ch)) {
                    if (lettersNeeded <= 0) break;
                    result += ch;
                    lettersNeeded--;
                } else {
                    // preserve space
                    result += ch;
                }
            }
            filtered = result;
        }

        // Update the model and letter count
        this.reelTitle = filtered;
        input.value = filtered;
        this.letterCount = (filtered.match(/[A-Za-z]/g) || []).length;
    }

    onHashtagsInput(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        let value = input.value || '';

        // Extract hashtags (words starting with #)
        const hashtags = value.match(/#[A-Za-z0-9_-]+/g) || [];

        // Limit to max 4 hashtags
        if (hashtags.length > this.maxHashtags) {
            // Keep only first 4 hashtags
            const limited = hashtags.slice(0, this.maxHashtags).join(' ');
            this.reelHashtags = limited;
            input.value = limited;
            this.hashtagCount = this.maxHashtags;
        } else {
            this.reelHashtags = value;
            this.hashtagCount = hashtags.length;
        }
    }

    goBack() {
        // If on meta page, go back to guidelines and clear video
        if (this.showMetaPage) {
            this.resetUpload();
            return;
        }

        // Otherwise navigate back
        try {
            if (window && window.history && window.history.length > 1) {
                window.history.back();
                return;
            }
        } catch (e) {
        }
        return;
    }

    /**
     * Trigger the hidden file input when Upload Reel button is clicked
     */
    onUploadClick(): void {
        this.fileInput.nativeElement.click();
    }

    /**
     * Handle file selection with comprehensive validation
     */
    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        // Reset file input to allow re-selecting same file
        input.value = '';

        // Validate file type
        if (!this.isValidFileType(file)) {
            await this.showToast('Please select only MP4 or MOV video files', 'danger');
            return;
        }

        // Validate file size (100 MB max)
        if (file.size > this.MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            await this.showToast(`File size (${sizeMB} MB) exceeds the 100 MB limit`, 'danger');
            return;
        }

        // Validate video duration
        const isValidDuration = await this.validateVideoDuration(file);
        if (!isValidDuration) {
            await this.showToast('Video must be at least 5 seconds long', 'danger');
            return;
        }

        // All validations passed - process the video
        this.processVideo(file);
    }

    /**
     * Validate file type against allowed formats and extensions
     */
    private isValidFileType(file: File): boolean {
        const hasValidMimeType = this.ALLOWED_FORMATS.includes(file.type);
        const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );
        return hasValidMimeType || hasValidExtension;
    }

    /**
     * Validate video duration using HTML5 video element
     */
    private validateVideoDuration(file: File): Promise<boolean> {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                // Clean up
                window.URL.revokeObjectURL(video.src);
                // Check duration
                resolve(video.duration >= this.MIN_VIDEO_DURATION);
            };

            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(false);
            };

            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Process valid video file and navigate to metadata page
     */
    private processVideo(file: File): void {
        // Clean up previous video preview URL if exists
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }

        // Store the file and create preview URL
        this.selectedVideoFile = file;
        this.videoPreviewUrl = URL.createObjectURL(file);

        // Show metadata page
        this.showMetaPage = true;

        // Scroll to top for better UX
        this.scrollToTop();
    }

    /**
     * Reset upload state and return to guidelines
     */
    private resetUpload(): void {
        // Clean up blob URL
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }

        this.selectedVideoFile = null;
        this.videoPreviewUrl = null;
        this.showMetaPage = false;
        this.reelTitle = '';
        this.letterCount = 0;
        this.reelHashtags = '';
        this.hashtagCount = 0;
        this.reelCategory = '';
        this.aiLabel = false;
    }

    /**
     * Scroll to top of the page
     */
    private scrollToTop(): void {
        const content = document.querySelector('ion-content');
        content?.scrollToTop(300);
    }

    /**
     * Show toast notification
     */
    private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger'): Promise<void> {
        const toast = await this.toastController.create({
            message,
            duration: 3000,
            color,
            position: 'top',
            cssClass: 'custom-toast'
        });
        await toast.present();
    }

    // Whether to include an AI label for the reel
    aiLabel: boolean = false;

    // popup state for successful upload
    showUploadSuccess: boolean = false;

    uploadSuccessConfig: MindfulPopupConfig = {
        image: '/assets/Images-Transparent/Image-Reel-Success.png',
        imageAlt: 'Reel uploaded',
        heading: 'Reel Uploaded Successfully!'
    };

    // Called when the user clicks Share - show the success popup
    onShare() {
        // Validate required fields
        if (!this.selectedVideoFile) {
            this.showToast('Please select a video first', 'warning');
            return;
        }

        if (!this.reelTitle.trim()) {
            this.showToast('Please enter a title', 'warning');
            return;
        }

        // In a real app, you'd upload the video file here
        // For now, just show success
        this.showUploadSuccess = true;

        // TODO: Implement actual upload logic
        // this.uploadVideoToServer(this.selectedVideoFile);
    }

    /**
     * Clean up on component destroy
     */
    ngOnDestroy(): void {
        // Clean up blob URLs to prevent memory leaks
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }
    }
}
