export interface VideoCompressorPlugin {
    /**
     * Compress a video file using FFmpeg
     * @param options Compression options including input path and output path
     * @returns Promise with the compressed video path
     */
    compressVideo(options: CompressVideoOptions): Promise<CompressVideoResult>;

    /**
     * Extract a thumbnail from video at specified time
     * @param options Thumbnail extraction options
     * @returns Promise with the thumbnail image path
     */
    extractThumbnail(options: ExtractThumbnailOptions): Promise<ExtractThumbnailResult>;

    /**
     * Get video metadata (duration, dimensions, etc.)
     * @param options Video metadata options
     * @returns Promise with video metadata
     */
    getVideoMetadata(options: GetVideoMetadataOptions): Promise<VideoMetadata>;

    /**
     * Cancel ongoing compression
     */
    cancelCompression(): Promise<void>;

    /**
     * Add listener for compression progress events
     * @param eventName The event to listen for
     * @param listenerFunc The callback function
     * @returns Promise with listener handle
     */
    addListener(
        eventName: 'compressionProgress',
        listenerFunc: (data: CompressionProgressEvent) => void
    ): Promise<PluginListenerHandle>;
}

export interface PluginListenerHandle {
    remove: () => Promise<void>;
}

export interface CompressionProgressEvent {
    progress: number;
    time?: number;
    speed?: number;
    eta?: string;
}

export interface CompressVideoOptions {
    /**
     * Input video file path or URI
     */
    inputPath: string;

    /**
     * Output video file path
     */
    outputPath: string;

    /**
     * Video quality (18-28, lower = better quality, default: 23)
     */
    quality?: number;

    /**
     * Compression preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
     * Default: veryfast
     */
    preset?: string;

    /**
     * Target video codec (default: libx264)
     */
    videoCodec?: string;

    /**
     * Target audio codec (default: aac)
     */
    audioCodec?: string;

    /**
     * Maximum output width (maintains aspect ratio)
     */
    maxWidth?: number;

    /**
     * Maximum output height (maintains aspect ratio)
     */
    maxHeight?: number;
}

export interface CompressVideoResult {
    /**
     * Path to the compressed video file
     */
    outputPath: string;

    /**
     * Original file size in bytes
     */
    originalSize: number;

    /**
     * Compressed file size in bytes
     */
    compressedSize: number;

    /**
     * Compression ratio (0-1, where 0.5 means 50% size reduction)
     */
    compressionRatio: number;

    /**
     * Time taken for compression in milliseconds
     */
    processingTime: number;
}

export interface ExtractThumbnailOptions {
    /**
     * Input video file path or URI
     */
    inputPath: string;

    /**
     * Output thumbnail file path
     */
    outputPath: string;

    /**
     * Time in seconds to extract thumbnail from (default: 1.0)
     */
    timeInSeconds?: number;

    /**
     * Thumbnail width (default: original width)
     */
    width?: number;

    /**
     * Thumbnail height (default: original height)
     */
    height?: number;

    /**
     * Thumbnail quality (1-100, default: 85)
     */
    quality?: number;
}

export interface ExtractThumbnailResult {
    /**
     * Path to the thumbnail image file
     */
    outputPath: string;

    /**
     * Thumbnail width
     */
    width: number;

    /**
     * Thumbnail height
     */
    height: number;
}

export interface GetVideoMetadataOptions {
    /**
     * Input video file path or URI
     */
    inputPath: string;
}

export interface VideoMetadata {
    /**
     * Video duration in seconds
     */
    duration: number;

    /**
     * Video width in pixels
     */
    width: number;

    /**
     * Video height in pixels
     */
    height: number;

    /**
     * Video bitrate in bps
     */
    bitrate: number;

    /**
     * Video codec
     */
    codec: string;

    /**
     * File size in bytes
     */
    fileSize: number;

    /**
     * Frame rate
     */
    fps: number;
}
