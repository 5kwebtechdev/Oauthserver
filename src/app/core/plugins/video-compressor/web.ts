import { WebPlugin } from '@capacitor/core';
import type {
    VideoCompressorPlugin,
    CompressVideoOptions,
    CompressVideoResult,
    ExtractThumbnailOptions,
    ExtractThumbnailResult,
    GetVideoMetadataOptions,
    VideoMetadata,
    CompressionProgressEvent,
    PluginListenerHandle,
} from './definitions';

export class VideoCompressorWeb extends WebPlugin implements VideoCompressorPlugin {
    async compressVideo(options: CompressVideoOptions): Promise<CompressVideoResult> {
        console.warn('VideoCompressor: Web platform does not support native FFmpeg compression.');
        console.log('Returning original file without compression. Use native mobile app for compression.');

        // For web, return a mock result indicating no compression was performed
        // The service will handle this gracefully and use the original file
        return {
            outputPath: options.inputPath,
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 1.0, // No compression
            processingTime: 0,
        };
    }

    async extractThumbnail(options: ExtractThumbnailOptions): Promise<ExtractThumbnailResult> {
        console.warn('VideoCompressor: Web platform thumbnail extraction using canvas.');

        // On web, use canvas to extract a frame from video
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.crossOrigin = 'anonymous';

            video.onloadedmetadata = () => {
                // Seek to the specified time
                video.currentTime = options.timeInSeconds || 1;
            };

            video.onseeked = () => {
                try {
                    // Create canvas and draw video frame
                    const canvas = document.createElement('canvas');
                    canvas.width = options.width || 320;
                    canvas.height = options.height || 240;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        throw new Error('Could not get canvas context');
                    }

                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        window.URL.revokeObjectURL(video.src);

                        if (blob) {
                            // Create a temporary file path for the blob
                            const thumbnailUrl = URL.createObjectURL(blob);
                            resolve({
                                outputPath: thumbnailUrl,
                                width: canvas.width,
                                height: canvas.height,
                            });
                        } else {
                            reject(new Error('Failed to create thumbnail blob'));
                        }
                    }, 'image/jpeg', (options.quality || 80) / 100);
                } catch (error) {
                    window.URL.revokeObjectURL(video.src);
                    reject(error);
                }
            };

            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video for thumbnail extraction'));
            };

            // Create blob URL from file path
            fetch(options.inputPath)
                .then(response => response.blob())
                .then(blob => {
                    video.src = URL.createObjectURL(blob);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    async getVideoMetadata(options: GetVideoMetadataOptions): Promise<VideoMetadata> {
        // On web, we can actually get some metadata using HTML5 video element
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                const metadata: VideoMetadata = {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    bitrate: 0, // Not available via HTML5 video API
                    codec: '', // Not easily available via HTML5 video API
                    fileSize: 0, // Would need to fetch the file to get size
                    fps: 0, // Not available via HTML5 video API
                };

                window.URL.revokeObjectURL(video.src);
                resolve(metadata);
            };

            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video metadata'));
            };

            // Create blob URL from file path
            fetch(options.inputPath)
                .then(response => response.blob())
                .then(blob => {
                    video.src = URL.createObjectURL(blob);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    async cancelCompression(): Promise<void> {
        console.log('VideoCompressor: Cancel compression called on web platform.');
        // No-op on web
    }

    override async addListener(
        eventName: 'compressionProgress',
        listenerFunc: (data: CompressionProgressEvent) => void
    ): Promise<PluginListenerHandle> {
        console.log('VideoCompressor: addListener called on web platform.');
        // Return a no-op listener handle for web
        return {
            remove: async () => {
                console.log('VideoCompressor: Listener removed on web platform.');
            }
        };
    }
}
