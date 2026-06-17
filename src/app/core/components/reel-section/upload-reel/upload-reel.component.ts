import { Component, Input, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeCardHeaderComponent } from 'src/app/core/components/superme-navigator/superme-card-header/superme-card-header.component';
import { SupermeNavigatorComponent } from 'src/app/core/components/superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from 'src/app/core/components/superme-button/superme-button.component';
import { SupermeToggleComponent } from '../../superme-selectors/superme-toggle/superme-toggle.component';
import { SupermePopupComponent, SupermePopupConfig } from '../../superme-popup/superme-popup.component';
import { FormsModule } from '@angular/forms';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';
import { IonicModule, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { VideoCompressionService, CompressionProgress } from 'src/app/core/services/video/video-compression.service';
import { VideoUploadService, UploadProgress } from 'src/app/core/services/video/video-upload.service';
import { Subscription } from 'rxjs';
import { ActiveConfig } from 'src/app/core/config/video.config';

@Component({
    selector: 'upload-reel',
    templateUrl: './upload-reel.component.html',
    styleUrls: ['./upload-reel.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule, SupermeCardHeaderComponent, SupermeButtonComponent, SupermeNavigatorComponent, SupermeInputsModule, SupermeToggleComponent, SupermePopupComponent]
})
export class UploadReelComponent implements OnDestroy {
    @Input() items: any[] = [];
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    // Video upload state
    selectedVideoFile: File | null = null;
    videoPreviewUrl: string | null = null;
    showMetaPage: boolean = false;

    // Compressed video data
    compressedVideoBlob: Blob | null = null;
    thumbnailBlob: Blob | null = null;

    // Progress tracking
    compressionProgress: CompressionProgress = {
        percentage: 0,
        time: 0,
        speed: 0,
        status: 'Idle'
    };
    uploadProgress: UploadProgress = {
        percentage: 0,
        loaded: 0,
        total: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        status: 'Idle'
    };
    isCompressing: boolean = false;
    isUploading: boolean = false;

    // Subscriptions
    private compressionSub?: Subscription;
    private uploadSub?: Subscription;
    private compressionProgressSub?: Subscription;
    private uploadProgressSub?: Subscription;

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

    constructor(
        private toastController: ToastController,
        private compressionService: VideoCompressionService,
        private uploadService: VideoUploadService
    ) {
        // Subscribe to compression progress
        this.compressionProgressSub = this.compressionService.progress$.subscribe(
            progress => this.compressionProgress = progress
        );

        // Subscribe to upload progress
        this.uploadProgressSub = this.uploadService.uploadProgress$.subscribe(
            progress => this.uploadProgress = progress
        );
    }

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
    private async processVideo(file: File): Promise<void> {
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

        // Start video compression in background
        this.startVideoCompression(file);
    }

    /**
     * Start video compression
     */
    private startVideoCompression(file: File): void {
        this.isCompressing = true;

        // Check if we're on web platform
        const isWeb = Capacitor.getPlatform() === 'web';

        if (isWeb) {
            console.log('Running on web platform - compression will be skipped');
        }

        this.compressionSub = this.compressionService.compressVideo(file, {
            quality: ActiveConfig.compression.quality,
            preset: ActiveConfig.compression.preset,
            maxWidth: ActiveConfig.compression.maxResolution.width,
            maxHeight: ActiveConfig.compression.maxResolution.height
        }).subscribe({
            next: (result) => {
                // Enhanced logging with platform info
                if (isWeb) {
                    console.log('📱 WEB PLATFORM - Original file used (no compression):', {
                        platform: 'Web Browser',
                        fileSize: this.formatBytes(result.originalSize),
                        compressionStatus: 'Skipped (FFmpeg not available on web)',
                        note: 'Compression will work on Android/iOS device'
                    });
                } else {
                    console.log('📱 NATIVE PLATFORM - Compression complete:', {
                        platform: Capacitor.getPlatform(),
                        originalSize: this.formatBytes(result.originalSize),
                        compressedSize: this.formatBytes(result.compressedSize),
                        reduction: ((1 - result.compressionRatio) * 100).toFixed(0) + '%',
                        time: (result.processingTime / 1000).toFixed(1) + 's'
                    });
                }

                this.compressedVideoBlob = result.outputBlob;
                this.isCompressing = false;

                // Extract thumbnail if enabled
                if (ActiveConfig.features.enableThumbnails) {
                    this.extractThumbnail(file);
                }

                // Show appropriate message based on platform
                if (isWeb) {
                    this.showToast(
                        '✅ Video ready! (Compression works on mobile app)',
                        'success'
                    );
                } else if (result.compressionRatio < 1.0) {
                    this.showToast(
                        `✅ Video compressed! Size reduced by ${((1 - result.compressionRatio) * 100).toFixed(0)}%`,
                        'success'
                    );
                } else {
                    this.showToast('✅ Video ready for upload!', 'success');
                }
            },
            error: (error) => {
                console.error('❌ Compression error:', error);
                console.log('Platform:', Capacitor.getPlatform());
                this.isCompressing = false;

                if (isWeb) {
                    console.log('ℹ️ Using original video (expected on web platform)');
                    this.showToast('✅ Using original video (compression works on mobile)', 'success');
                } else {
                    console.error('⚠️ Native compression failed - using original file as fallback');
                    this.showToast('⚠️ Compression failed. Using original file.', 'warning');
                }

                // Fallback: use original file as blob
                this.compressedVideoBlob = file;
            }
        });
    }

    /**
     * Extract thumbnail from video
     */
    private extractThumbnail(file: File): void {
        this.compressionService.extractThumbnail(file, {
            timeInSeconds: ActiveConfig.thumbnail.extractionTime,
            width: ActiveConfig.thumbnail.width,
            height: ActiveConfig.thumbnail.height,
            quality: ActiveConfig.thumbnail.quality
        }).subscribe({
            next: (blob) => {
                this.thumbnailBlob = blob;
                console.log('Thumbnail extracted successfully');
            },
            error: (error) => {
                console.error('Thumbnail extraction error:', error);
                // Non-critical - continue without thumbnail
            }
        });
    }

    /**
     * Reset upload state and return to guidelines
     */
    private resetUpload(): void {
        // Clean up blob URL
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }

        // Cancel any ongoing operations
        if (this.isCompressing) {
            this.compressionService.cancelCompression();
        }

        // Unsubscribe from active subscriptions
        this.compressionSub?.unsubscribe();
        this.uploadSub?.unsubscribe();

        this.selectedVideoFile = null;
        this.videoPreviewUrl = null;
        this.compressedVideoBlob = null;
        this.thumbnailBlob = null;
        this.showMetaPage = false;
        this.reelTitle = '';
        this.letterCount = 0;
        this.reelHashtags = '';
        this.hashtagCount = 0;
        this.reelCategory = '';
        this.aiLabel = false;
        this.isCompressing = false;
        this.isUploading = false;
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

    uploadSuccessConfig: SupermePopupConfig = {
        image: '/assets/Images-Transparent/Image-Reel-Success.png',
        imageAlt: 'Reel uploaded',
        heading: 'Reel Uploaded Successfully!'
    };

    // Called when the user clicks Share - show the success popup
    async onShare() {
        // Validate required fields
        if (!this.selectedVideoFile) {
            this.showToast('Please select a video first', 'warning');
            return;
        }

        if (!this.reelTitle.trim()) {
            this.showToast('Please enter a title', 'warning');
            return;
        }

        // Wait for compression if still in progress
        if (this.isCompressing) {
            this.showToast('Please wait for video compression to complete...', 'warning');
            return;
        }

        // Use compressed video if available, otherwise use original
        const videoToUpload = this.compressedVideoBlob || this.selectedVideoFile;

        // Start upload
        this.isUploading = true;

        // Get API endpoint from config
        const API_ENDPOINT = ActiveConfig.upload.apiEndpoint;

        this.uploadSub = this.uploadService.uploadVideo(API_ENDPOINT, {
            videoBlob: videoToUpload,
            thumbnailBlob: this.thumbnailBlob || undefined,
            title: this.reelTitle,
            hashtags: this.reelHashtags,
            category: this.reelCategory,
            aiLabel: this.aiLabel
        }).subscribe({
            next: (response) => {
                console.log('Upload response:', response);
                this.isUploading = false;

                // Show success popup
                this.showUploadSuccess = true;

                // Reset upload state after a delay
                setTimeout(() => {
                    this.resetUpload();
                }, 2000);
            },
            error: (error) => {
                console.error('Upload error:', error);
                this.isUploading = false;

                // For demo purposes, show success anyway
                // Remove this in production
                this.showToast('Upload failed. Check console for details.', 'danger');

                // Uncomment for demo mode:
                // this.showUploadSuccess = true;
            }
        });
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes: number, decimals: number = 2): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format time to human-readable string
     */
    formatTime(seconds: number): string {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return `${minutes}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Clean up on component destroy
     */
    ngOnDestroy(): void {
        // Clean up blob URLs to prevent memory leaks
        if (this.videoPreviewUrl) {
            URL.revokeObjectURL(this.videoPreviewUrl);
        }

        // Unsubscribe from all subscriptions
        this.compressionSub?.unsubscribe();
        this.uploadSub?.unsubscribe();
        this.compressionProgressSub?.unsubscribe();
        this.uploadProgressSub?.unsubscribe();

        // Cancel any ongoing operations
        if (this.isCompressing) {
            this.compressionService.cancelCompression();
        }
    }
}
