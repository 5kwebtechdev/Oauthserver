/**
 * Video Compression & Upload Configuration
 * 
 * Centralized configuration for video processing settings.
 * Adjust these values to optimize for your use case.
 */

export const VideoConfig = {
    /**
     * Compression Settings
     */
    compression: {
        /**
         * Video quality (CRF value)
         * Range: 18-28
         * - 18: Best quality, larger file
         * - 23: Balanced (recommended)
         * - 28: Smallest file, lower quality
         */
        quality: 23,

        /**
         * Compression speed preset
         * Options: 'ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'
         * - ultrafast: Fastest, larger file
         * - veryfast: Fast, good compression (recommended for mobile)
         * - medium: Balanced
         * - slow: Best compression, slower
         */
        preset: 'veryfast' as const,

        /**
         * Video codec
         * Default: 'libx264' (H.264 - universal compatibility)
         */
        videoCodec: 'libx264',

        /**
         * Audio codec
         * Default: 'aac' (universal compatibility)
         */
        audioCodec: 'aac',

        /**
         * Maximum output resolution
         * Set to null to preserve original resolution
         */
        maxResolution: {
            width: 1920,   // Full HD
            height: 1080,  // Full HD
        },

        /**
         * Enable faststart flag for progressive streaming
         * Recommended: true for social media apps
         */
        enableFaststart: true,
    },

    /**
     * Thumbnail Settings
     */
    thumbnail: {
        /**
         * Time in seconds to extract thumbnail from video
         */
        extractionTime: 1.0,

        /**
         * Thumbnail dimensions
         */
        width: 320,
        height: 320,

        /**
         * JPEG quality (1-100)
         */
        quality: 85,

        /**
         * Auto-extract thumbnail on compression
         */
        autoExtract: true,
    },

    /**
     * Upload Settings
     */
    upload: {
        /**
         * API endpoint for video upload
         * UPDATE THIS with your actual backend URL
         */
        apiEndpoint: 'https://your-api-endpoint.com/api/reels/upload',

        /**
         * Maximum file size for upload (bytes)
         * Default: 100 MB
         */
        maxUploadSize: 100 * 1024 * 1024,

        /**
         * Upload timeout (milliseconds)
         * Default: 5 minutes
         */
        timeout: 5 * 60 * 1000,

        /**
         * Retry failed uploads
         */
        retryOnFailure: true,

        /**
         * Number of retry attempts
         */
        maxRetries: 3,
    },

    /**
     * Validation Settings
     */
    validation: {
        /**
         * Allowed video formats (MIME types)
         */
        allowedFormats: ['video/mp4', 'video/quicktime'],

        /**
         * Allowed file extensions
         */
        allowedExtensions: ['.mp4', '.mov'],

        /**
         * Maximum input file size (bytes)
         * Default: 100 MB
         */
        maxFileSize: 100 * 1024 * 1024,

        /**
         * Minimum video duration (seconds)
         */
        minDuration: 5,

        /**
         * Maximum video duration (seconds)
         * Set to null for no limit
         */
        maxDuration: null as number | null,
    },

    /**
     * UI Settings
     */
    ui: {
        /**
         * Show compression progress
         */
        showCompressionProgress: true,

        /**
         * Show upload progress
         */
        showUploadProgress: true,

        /**
         * Show detailed progress info (speed, ETA)
         */
        showDetailedProgress: true,

        /**
         * Toast notification duration (milliseconds)
         */
        toastDuration: 3000,
    },

    /**
     * Performance Settings
     */
    performance: {
        /**
         * Compress video in background while user fills metadata
         */
        backgroundCompression: true,

        /**
         * Cancel compression if user navigates away
         */
        cancelOnNavigateAway: true,

        /**
         * Clean up temporary files after upload
         */
        cleanupAfterUpload: true,
    },

    /**
     * Feature Flags
     */
    features: {
        /**
         * Enable video compression
         * Set to false to upload original files
         */
        enableCompression: true,

        /**
         * Enable thumbnail extraction
         */
        enableThumbnails: true,

        /**
         * Use compressed video for preview
         * If false, use original video
         */
        useCompressedPreview: false,

        /**
         * Enable upload analytics
         */
        enableAnalytics: false,
    },
};

/**
 * Preset configurations for different use cases
 */
export const VideoPresets = {
    /**
     * High Quality - Best for professional content
     * Larger files, slower compression
     */
    highQuality: {
        ...VideoConfig,
        compression: {
            ...VideoConfig.compression,
            quality: 18,
            preset: 'slow' as const,
            maxResolution: {
                width: 3840,  // 4K
                height: 2160,
            },
        },
    },

    /**
     * Balanced - Best for social media (DEFAULT)
     * Good quality, fast compression
     */
    balanced: {
        ...VideoConfig,
        compression: {
            ...VideoConfig.compression,
            quality: 23,
            preset: 'veryfast' as const,
            maxResolution: {
                width: 1920,  // Full HD
                height: 1080,
            },
        },
    },

    /**
     * Small Size - Best for quick uploads
     * Smaller files, fastest compression
     */
    smallSize: {
        ...VideoConfig,
        compression: {
            ...VideoConfig.compression,
            quality: 28,
            preset: 'ultrafast' as const,
            maxResolution: {
                width: 1280,  // HD
                height: 720,
            },
        },
    },

    /**
     * Mobile Optimized - Best for mobile devices
     * Optimized for mobile viewing
     */
    mobile: {
        ...VideoConfig,
        compression: {
            ...VideoConfig.compression,
            quality: 25,
            preset: 'veryfast' as const,
            maxResolution: {
                width: 1280,  // HD
                height: 720,
            },
        },
    },
};

/**
 * Get configuration based on preset name
 */
export function getPreset(presetName: keyof typeof VideoPresets) {
    return VideoPresets[presetName];
}

/**
 * Get current active configuration
 * Change this to switch between presets
 */
export const ActiveConfig = VideoPresets.balanced;
