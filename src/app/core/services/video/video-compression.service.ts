import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { VideoCompressor, CompressVideoResult, CompressionProgressEvent, PluginListenerHandle } from '../../plugins/video-compressor';
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
    private progressListener: PluginListenerHandle | null = null;

    constructor() {
        this.initializeProgressListener();
    }

    /**
     * Initialize listener for compression progress events
     */
    private initializeProgressListener(): void {
        VideoCompressor.addListener('compressionProgress', (data: CompressionProgressEvent) => {
            const progress: CompressionProgress = {
                percentage: data.progress || 0,
                time: data.time || 0,
                speed: data.speed || 0,
                status: data.speed ? `Processing at ${data.speed.toFixed(2)}x speed...` : 'Processing...'
            };
            this.progressSubject.next(progress);
        }).then((handle: PluginListenerHandle) => {
            this.progressListener = handle;
        });
    }

    /**
     * Calculate approximate percentage from processing time
     * Note: This is an approximation since we don't always know total video duration
     */
    private calculatePercentage(processedTime: number): number {
        // This is a rough estimate - ideally we'd know the total video duration
        // For now, we'll return a value that shows progress is happening
        return Math.min(95, (processedTime / 1000) * 5);
    }

    /**
     * Compress a video file
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
     * Perform the actual compression
     */
    private async performCompression(
        file: File,
        options: CompressionOptions
    ): Promise<CompressVideoResult & { outputBlob: Blob }> {
        try {
            // Save input file to temporary location
            const inputPath = await this.saveFileToTemp(file, 'input_video.mp4');

            // Generate output path
            const outputFileName = `compressed_${Date.now()}.mp4`;
            const outputPath = await this.getTempFilePath(outputFileName);

            // Compress video
            const result = await VideoCompressor.compressVideo({
                inputPath,
                outputPath,
                quality: options.quality || 23,
                preset: options.preset || 'veryfast',
                videoCodec: 'libx264',
                audioCodec: 'aac',
                maxWidth: options.maxWidth,
                maxHeight: options.maxHeight
            });

            // Check if compression actually happened (web platform returns compressionRatio = 1.0)
            let outputBlob: Blob;
            if (result.compressionRatio >= 1.0 || result.outputPath === inputPath) {
                // Web platform or no compression - use original file
                console.log('Using original file (web platform or compression skipped)');
                outputBlob = file;

                // Update result to reflect original file
                result.originalSize = file.size;
                result.compressedSize = file.size;
                result.compressionRatio = 1.0;
            } else {
                // Native platform - read compressed file
                outputBlob = await this.readFileAsBlob(outputPath);
            }

            // Clean up temporary input file
            try {
                await this.deleteFile(inputPath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }

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
     * Extract thumbnail from video
     * @param file The video file
     * @param options Thumbnail extraction options
     * @returns Observable with thumbnail blob
     */
    extractThumbnail(file: File, options: ThumbnailOptions = {}): Observable<Blob> {
        return from(this.performThumbnailExtraction(file, options));
    }

    /**
     * Perform thumbnail extraction
     */
    private async performThumbnailExtraction(
        file: File,
        options: ThumbnailOptions
    ): Promise<Blob> {
        try {
            // Save input file to temporary location or create object URL for web
            const inputPath = await this.saveFileToTemp(file, 'thumbnail_input.mp4');

            // Generate output path
            const outputFileName = `thumbnail_${Date.now()}.jpg`;
            const outputPath = await this.getTempFilePath(outputFileName);

            // Extract thumbnail
            const result = await VideoCompressor.extractThumbnail({
                inputPath,
                outputPath,
                timeInSeconds: options.timeInSeconds || 1.0,
                width: options.width || 320,
                height: options.height || 320,
                quality: options.quality || 85
            });

            // Check if we're on web platform (outputPath will be a blob URL)
            let thumbnailBlob: Blob;
            if (result.outputPath.startsWith('blob:')) {
                // Web platform - fetch from blob URL
                const response = await fetch(result.outputPath);
                thumbnailBlob = await response.blob();
                // Clean up blob URL
                URL.revokeObjectURL(result.outputPath);
            } else {
                // Native platform - read from file system
                thumbnailBlob = await this.readFileAsBlob(outputPath);
                await this.deleteFile(outputPath);
            }

            // Clean up temporary input file
            try {
                await this.deleteFile(inputPath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }

            return thumbnailBlob;
        } catch (error) {
            console.error('Thumbnail extraction error:', error);
            throw error;
        }
    }

    /**
     * Cancel ongoing compression
     */
    async cancelCompression(): Promise<void> {
        try {
            await VideoCompressor.cancelCompression();
            this.progressSubject.next({
                percentage: 0,
                time: 0,
                speed: 0,
                status: 'Cancelled'
            });
        } catch (error) {
            console.error('Error cancelling compression:', error);
        }
    }

    /**
     * Save a File object to temporary storage
     */
    private async saveFileToTemp(file: File, fileName: string): Promise<string> {
        // On web platform, just create a blob URL
        if (Capacitor.getPlatform() === 'web') {
            return URL.createObjectURL(file);
        }

        // On native platforms, use filesystem
        // Convert File to base64
        const base64Data = await this.fileToBase64(file);

        // Write to temporary directory
        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        return result.uri;
    }

    /**
     * Get temporary file path
     */
    private async getTempFilePath(fileName: string): Promise<string> {
        // On web platform, return a dummy path (won't be used)
        if (Capacitor.getPlatform() === 'web') {
            return `temp_${fileName}`;
        }

        const result = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
        });
        return result.uri;
    }

    /**
     * Read file from path and convert to Blob
     */
    private async readFileAsBlob(path: string): Promise<Blob> {
        const result = await Filesystem.readFile({
            path: path.replace('file://', '')
        });

        // Convert base64 to Blob
        const base64Data = result.data as string;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'video/mp4' });
    }

    /**
     * Delete file from path
     */
    private async deleteFile(path: string): Promise<void> {
        try {
            // On web platform, clean up blob URLs
            if (Capacitor.getPlatform() === 'web' && path.startsWith('blob:')) {
                URL.revokeObjectURL(path);
                return;
            }

            // On native platforms, delete from filesystem
            await Filesystem.deleteFile({
                path: path.replace('file://', '')
            });
        } catch (error) {
            console.warn('Error deleting temporary file:', error);
        }
    }

    /**
     * Convert File to base64
     */
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Clean up on destroy
     */
    ngOnDestroy(): void {
        if (this.progressListener) {
            this.progressListener.remove();
        }
    }
}
