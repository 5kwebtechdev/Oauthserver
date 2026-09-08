import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, filter, tap } from 'rxjs/operators';

export interface UploadProgress {
    /** Percentage of upload completion (0-100) */
    percentage: number;
    /** Number of bytes uploaded */
    loaded: number;
    /** Total number of bytes to upload */
    total: number;
    /** Upload speed in bytes per second */
    speed: number;
    /** Estimated time remaining in seconds */
    estimatedTimeRemaining: number;
    /** Current status message */
    status: string;
}

export interface VideoUploadRequest {
    /** The compressed video blob */
    videoBlob: Blob;
    /** The thumbnail blob (optional) */
    thumbnailBlob?: Blob;
    /** Video title */
    title: string;
    /** Video hashtags */
    hashtags: string;
    /** Video category */
    category: string;
    /** AI label flag */
    aiLabel: boolean;
}

export interface VideoUploadResponse {
    /** Upload success status */
    success: boolean;
    /** Message from server */
    message: string;
    /** Uploaded video ID */
    videoId?: string;
    /** Video URL */
    videoUrl?: string;
    /** Thumbnail URL */
    thumbnailUrl?: string;
}

@Injectable({
    providedIn: 'root'
})
export class VideoUploadService {
    private uploadProgressSubject = new BehaviorSubject<UploadProgress>({
        percentage: 0,
        loaded: 0,
        total: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        status: 'Idle'
    });

    public uploadProgress$: Observable<UploadProgress> = this.uploadProgressSubject.asObservable();

    private uploadStartTime: number = 0;
    private lastLoaded: number = 0;
    private lastTime: number = 0;

    constructor(private http: HttpClient) { }

    /**
     * Upload video with metadata
     * @param apiUrl The API endpoint URL (you'll configure this later)
     * @param request The upload request data
     * @returns Observable with upload response
     */
    uploadVideo(apiUrl: string, request: VideoUploadRequest): Observable<VideoUploadResponse> {
        // Reset progress
        this.uploadStartTime = Date.now();
        this.lastLoaded = 0;
        this.lastTime = this.uploadStartTime;

        this.uploadProgressSubject.next({
            percentage: 0,
            loaded: 0,
            total: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'Preparing upload...'
        });

        // Create FormData
        const formData = new FormData();

        // Add video file
        formData.append('video', request.videoBlob, 'video.mp4');

        // Add thumbnail if provided
        if (request.thumbnailBlob) {
            formData.append('thumbnail', request.thumbnailBlob, 'thumbnail.jpg');
        }

        // Add metadata
        formData.append('title', request.title);
        formData.append('hashtags', request.hashtags);
        formData.append('category', request.category);
        formData.append('aiLabel', request.aiLabel.toString());

        // Upload with progress tracking
        return this.http.post<VideoUploadResponse>(apiUrl, formData, {
            reportProgress: true,
            observe: 'events'
        }).pipe(
            tap((event: HttpEvent<VideoUploadResponse>) => this.handleUploadProgress(event)),
            // Upload progress events are not saved responses. Wait for the
            // backend's final HTTP response before showing success/resetting.
            filter((event): event is HttpResponse<VideoUploadResponse> => event.type === HttpEventType.Response),
            map(event => event.body as VideoUploadResponse),
            catchError(error => {
                this.uploadProgressSubject.next({
                    percentage: 0,
                    loaded: 0,
                    total: 0,
                    speed: 0,
                    estimatedTimeRemaining: 0,
                    status: 'Upload failed'
                });
                console.error('Upload error:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Handle upload progress events
     */
    private handleUploadProgress(event: HttpEvent<VideoUploadResponse>): void {
        if (event.type === HttpEventType.UploadProgress) {
            const progressEvent = event as HttpProgressEvent;
            const currentTime = Date.now();
            const timeDiff = (currentTime - this.lastTime) / 1000; // Convert to seconds
            const loadedDiff = progressEvent.loaded - this.lastLoaded;

            // Calculate upload speed (bytes per second)
            const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;

            // Calculate percentage
            const percentage = progressEvent.total
                ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
                : 0;

            // Calculate estimated time remaining
            const remaining = progressEvent.total ? progressEvent.total - progressEvent.loaded : 0;
            const estimatedTimeRemaining = speed > 0 ? remaining / speed : 0;

            // Update last values
            this.lastLoaded = progressEvent.loaded;
            this.lastTime = currentTime;

            // Update progress subject
            this.uploadProgressSubject.next({
                percentage,
                loaded: progressEvent.loaded,
                total: progressEvent.total || 0,
                speed,
                estimatedTimeRemaining,
                status: `Uploading... ${percentage}%`
            });
        } else if (event.type === HttpEventType.Response) {
            // Upload complete
            this.uploadProgressSubject.next({
                percentage: 100,
                loaded: event.body ? 1 : 0,
                total: 1,
                speed: 0,
                estimatedTimeRemaining: 0,
                status: 'Upload complete!'
            });
        }
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes: number, decimals: number = 2): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format speed to human-readable string
     */
    formatSpeed(bytesPerSecond: number): string {
        return this.formatBytes(bytesPerSecond) + '/s';
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
     * Reset upload progress
     */
    resetProgress(): void {
        this.uploadProgressSubject.next({
            percentage: 0,
            loaded: 0,
            total: 0,
            speed: 0,
            estimatedTimeRemaining: 0,
            status: 'Idle'
        });
    }
}
