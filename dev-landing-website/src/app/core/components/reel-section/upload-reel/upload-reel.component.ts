import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from '../../footer/footer.component';
import { ReelService, ReelCategory } from '../../../services/reel/reel.service';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';

@Component({
        selector: 'app-upload-reel',
        standalone: true,
    imports: [CommonModule, FormsModule, FooterComponent, SupermeButtonComponent],
        templateUrl: './upload-reel.component.html',
        styleUrls: ['./upload-reel.component.scss']
})
export class UploadReelComponent implements OnInit {
    constructor(private location: Location, private reelService: ReelService) {}

    // Modal / upload state
    showUploadContainer = false;
    selectedFile?: File;
    selectedPreviewUrl?: string;
    // Form fields
    title = '';
    hashtags = '';
    categoryId = '';
    aiLabel = false;
    categories: ReelCategory[] = [];
    isUploading = false;

    @ViewChild('modalFileInput') modalFileInput!: ElementRef<HTMLInputElement>;

    ngOnInit() {
        this.reelService.categories$.subscribe(categories => {
            this.categories = categories;
        });
    }

    goBack() {
        this.location.back();
    }

    // Open the upload modal (file picker is triggered from inside modal)
    openUploadContainer() {
        this.showUploadContainer = true;
        // Trigger file input after modal is shown
        setTimeout(() => {
            this.modalFileInput.nativeElement.click();
        }, 100);
    }

    closeUploadContainer() {
        this.showUploadContainer = false;
        this.clearSelection();
        this.clearForm();
    }

    clearSelection() {
        if (this.selectedPreviewUrl) {
            try { URL.revokeObjectURL(this.selectedPreviewUrl); } catch (e) { /* ignore */ }
        }
        this.selectedFile = undefined;
        this.selectedPreviewUrl = undefined;
    }

    clearForm() {
        this.title = '';
        this.hashtags = '';
        this.categoryId = '';
        this.aiLabel = false;
        this.isUploading = false;
    }

    onSelectFile(input: HTMLInputElement) {
        const file = input.files && input.files[0];
        if (!file) return;
        // Minimal client-side validation (size, type, duration should be validated on server)
        const maxSizeMB = 100;
        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`File is too large. Maximum allowed is ${maxSizeMB} MB.`);
            input.value = '';
            return;
        }
        this.selectedFile = file;
        // Create a preview URL (revoke when cleared)
        this.selectedPreviewUrl = URL.createObjectURL(file);
        console.log('Selected file:', file.name, file.size, file.type);
    }

    // Placeholder for share action
    async shareReel() {
        if (!this.selectedFile) {
            alert('Please select a file before sharing.');
            return;
        }
        if (!this.title.trim()) {
            alert('Please enter a title.');
            return;
        }
        if (!this.categoryId) {
            alert('Please select a category.');
            return;
        }

        this.isUploading = true;
        try {
            const thumbnailBlob = await this.generateThumbnail(this.selectedFile);
            const request = {
                title: this.title,
                description: this.hashtags, // using hashtags as description
                categoryId: parseInt(this.categoryId),
                videoBlob: this.selectedFile,
                thumbnailBlob: thumbnailBlob
            };

            this.reelService.uploadReel(request).subscribe({
                next: (reel) => {
                    console.log('Reel uploaded successfully:', reel);
                    alert('Reel uploaded successfully!');
                    this.closeUploadContainer();
                },
                error: (error) => {
                    console.error('Upload failed:', error);
                    alert('Failed to upload reel. Please try again.');
                },
                complete: () => {
                    this.isUploading = false;
                }
            });
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            alert('Failed to process video. Please try again.');
            this.isUploading = false;
        }
    }

    private generateThumbnail(videoFile: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            video.preload = 'metadata';
            video.src = URL.createObjectURL(videoFile);

            video.onloadedmetadata = () => {
                video.currentTime = Math.min(1, video.duration / 2); // Seek to 1s or middle
            };

            video.onseeked = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(video.src);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate thumbnail'));
                    }
                }, 'image/jpeg', 0.8);
            };

            video.onerror = () => reject(new Error('Video load error'));
        });
    }
}
