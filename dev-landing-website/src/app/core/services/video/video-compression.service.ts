import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface CompressionProgress {
    /** Percentage of completion (0-100) */
    percentage: number;
    /** Processing time in milliseconds */
    time: number;
    /** Processing speed multiplier */
    speed: number;
    /** Current status message */
    status: string;
}

export interface CompressionOptions {
    /** Video quality (18-28, lower = better quality, default: 23) */
    quality?: number;
    /** Compression preset (default: veryfast) */
    preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
    /** Maximum output width (maintains aspect ratio) */
    maxWidth?: number;
    /** Maximum output height (maintains aspect ratio) */
    maxHeight?: number;
}

export interface ThumbnailOptions {
    /** Time in seconds to extract thumbnail from (default: 1.0) */
    timeInSeconds?: number;
    /** Thumbnail width (default: 320) */
    width?: number;
    /** Thumbnail height (default: 320) */
    height?: number;
    /** Thumbnail quality (1-100, default: 85) */
    quality?: number;
}

// Simplified interfaces for web-based video processing
export interface CompressVideoResult {
    outputPath: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
}

export interface CompressionProgressEvent {
    progress?: number;
    time?: number;
    speed?: number;
}

export type PluginListenerHandle = any;

@Injectable({
    providedIn: 'root'
})
export class VideoCompressionService {
    private progressSubject = new BehaviorSubject<CompressionProgress>({
        percentage: 0,
        time: 0,
        speed: 0,
        status: 'Idle'
    });

    public progress$: Observable<CompressionProgress> = this.progressSubject.asObservable();

    constructor() {}

    /**
     * Compress a video file (simplified for web)
     * @param file The video file to compress
     * @param options Compression options
     * @returns Observable with compression result
     */
    compressVideo(file: File, options: CompressionOptions = {}): Observable<CompressVideoResult & { outputBlob: Blob }> {
        this.progressSubject.next({
            percentage: 0,
            time: 0,
            speed: 0,
            status: 'Starting compression...'
        });

        return from(this.performCompression(file, options)).pipe(
            map(result => {
                this.progressSubject.next({
                    percentage: 100,
                    time: result.processingTime,
                    speed: 1,
                    status: 'Compression complete!'
                });
                return result;
            }),
            catchError(error => {
                this.progressSubject.next({
                    percentage: 0,
                    time: 0,
                    speed: 0,
                    status: 'Compression failed'
                });
                return throwError(() => error);
            })
        );
    }

    /**
     * Perform the actual compression (simplified for web)
     */
    private async performCompression(
        file: File,
        options: CompressionOptions
    ): Promise<CompressVideoResult & { outputBlob: Blob }> {
        try {
            // For web implementation, we'll just return the original file
            // In a real implementation, you would use a library like ffmpeg.wasm
            console.log('Using original file (web platform)');
            const outputBlob = file;

            const result: CompressVideoResult = {
                outputPath: URL.createObjectURL(file),
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 1.0,
                processingTime: 1000 // Simulated processing time
            };

            return {
                ...result,
                outputBlob
            };
        } catch (error) {
            console.error('Video compression error:', error);
            throw error;
        }
    }

    /**
     * Extract thumbnail from video (simplified for web)
     * @param file The video file
     * @param options Thumbnail extraction options
     * @returns Observable with thumbnail blob
     */
    extractThumbnail(file: File, options: ThumbnailOptions = {}): Observable<Blob> {
        return from(this.performThumbnailExtraction(file, options));
    }

    /**
     * Perform thumbnail extraction (simplified for web)
     */
    private async performThumbnailExtraction(
        file: File,
        options: ThumbnailOptions
    ): Promise<Blob> {
        try {
            // For web implementation, we'll create a placeholder image
            // In a real implementation, you would use a library like ffmpeg.wasm
            console.log('Extracting thumbnail (web platform)');
            
            // Create a placeholder image blob
            const canvas = document.createElement('canvas');
            canvas.width = options.width || 320;
            canvas.height = options.height || 320;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                // Fill with a gradient
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#4A90E2');
                gradient.addColorStop(1, '#50C878');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add text
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Video Thumbnail', canvas.width / 2, canvas.height / 2);
            }
            
            return new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob || new Blob());
                });
            });
        } catch (error) {
            console.error('Thumbnail extraction error:', error);
            throw error;
        }
    }

    /**
     * Cancel ongoing compression (no-op for web)
     */
    async cancelCompression(): Promise<void> {
        this.progressSubject.next({
            percentage: 0,
            time: 0,
            speed: 0,
            status: 'Cancelled'
        });
    }

    /**
     * Clean up on destroy
     */
    ngOnDestroy(): void {
        // No cleanup needed for web implementation
    }
}