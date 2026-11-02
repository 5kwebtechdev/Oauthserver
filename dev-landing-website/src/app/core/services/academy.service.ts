import { Injectable, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { map, tap, catchError, shareReplay, switchMap, finalize } from 'rxjs/operators';
import {
    AcademyApi,
    Course,
    CourseDetailResponse,
    CourseLesson,
    LessonDetailResponse,
    LessonStatus
} from '../api/academy.api';

// ==================== SERVICE INTERFACES ====================

export interface CategoryCard {
    category: string;
    title: string;
    displayTitle: string;
    subtitle: string;
    color: string;
    image: string;
    thumbnail?: string | null;
    courseCount: number;
    courses: Course[];
}

export interface LessonDisplay {
    id: number;
    title: string;
    description: string;
    type: string;
    duration: string;
    coins: number;
    icon: string;
    order: number;
    isCompleted: boolean;
    isLocked: boolean;
    status: LessonStatus | null;
    canStart: boolean;
}

export interface CourseDisplay {
    id: number;
    title: string;
    description: string;
    image: string;
    lessons: number;
    duration: string;
    coins: number;
    level: string;
    category: string;
    completedLessons: number;
    completionPercentage: number;
    isCompleted: boolean;
    resumeLessonIndex: number | null;
}

// ==================== SERVICE ====================

@Injectable({ providedIn: 'root' })
export class AcademyService {
    // Cache for courses list (avoid repeated API calls)
    private coursesCache$: Observable<Course[]> | null = null;
    private cacheExpiry = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Loading states as signals for reactive UI
    readonly isLoadingCourses = signal(false);
    readonly isLoadingCourse = signal(false);
    readonly isLoadingLesson = signal(false);
    readonly error = signal<string | null>(null);

    // Category configuration
    readonly categories: CategoryCard[] = [
        {
            category: 'MANAGING_MONEY',
            title: 'Managing Money',
            displayTitle: 'Managing<br>Money',
            subtitle: 'Spend smart · Save more · Use it well',
            color: 'yellow',
            image: '/assets/images/cards/managing-money.png',
            thumbnail: null,
            courseCount: 0,
            courses: []
        },
        {
            category: 'COMMUNICATION',
            title: 'Communication',
            displayTitle: 'Communication',
            subtitle: 'Express yourself · Listen well · Connect better',
            color: 'purple',
            image: '/assets/images/cards/communication.png',
            thumbnail: null,
            courseCount: 0,
            courses: []
        },
        {
            category: 'MEDITATION',
            title: 'Meditation',
            displayTitle: 'Meditation',
            subtitle: 'Breathe deep · Stay calm · Find peace',
            color: 'pink',
            image: '/assets/images/cards/meditation.png',
            thumbnail: null,
            courseCount: 0,
            courses: []
        },
        {
            category: 'CULTURAL_VALUES',
            title: 'Cultural Values',
            displayTitle: 'Cultural<br>Values',
            subtitle: 'Respect all · Embrace diversity · Grow together',
            color: 'green',
            image: '/assets/images/cards/cultural-values.png',
            thumbnail: null,
            courseCount: 0,
            courses: []
        }
    ];

    constructor(private api: AcademyApi) { }

    // ==================== COURSES ====================

    /**
     * Get all courses with caching
     */
    getCourses(forceRefresh = false): Observable<Course[]> {
        const now = Date.now();

        if (!forceRefresh && this.coursesCache$ && now < this.cacheExpiry) {
            return this.coursesCache$;
        }

        this.isLoadingCourses.set(true);
        this.error.set(null);

        this.coursesCache$ = this.api.getCourses().pipe(
            tap(() => {
                this.cacheExpiry = now + this.CACHE_DURATION;
                this.isLoadingCourses.set(false);
            }),
            catchError(err => {
                this.error.set(err.message || 'Failed to load courses');
                this.isLoadingCourses.set(false);
                this.coursesCache$ = null;
                return of([]);
            }),
            shareReplay(1)
        );

        return this.coursesCache$;
    }

    /**
     * Get courses grouped by category with counts
     */
    getCoursesGroupedByCategory(): Observable<CategoryCard[]> {
        return this.getCourses().pipe(
            map(courses => {
                return this.categories.map(cat => {
                    const filtered = courses.filter(
                        c => c.category === cat.category && (c.enabled ?? true)
                    );
                    return {
                        ...cat,
                        courses: filtered,
                        courseCount: filtered.length,
                        thumbnail: filtered[0]?.thumbnailUrl
                            ? this.convertDriveUrl(filtered[0].thumbnailUrl)
                            : cat.image
                    };
                });
            })
        );
    }

    /**
     * Get courses for a specific category
     */
    getCoursesByCategory(category: string): Observable<CourseDisplay[]> {
        return this.getCourses().pipe(
            map(courses =>
                courses
                    .filter(c => c.category === category && (c.enabled ?? true))
                    .map(c => this.mapCourseToDisplay(c))
            )
        );
    }

    /**
     * Get course detail by ID
     */
    getCourseById(courseId: number | string): Observable<CourseDetailResponse | null> {
        this.isLoadingCourse.set(true);
        this.error.set(null);

        return this.api.getCourseById(courseId).pipe(
            tap(() => this.isLoadingCourse.set(false)),
            catchError(err => {
                this.error.set(err.message || 'Failed to load course');
                this.isLoadingCourse.set(false);
                return of(null);
            })
        );
    }

    /**
     * Get course with lessons mapped for display
     */
    getCourseWithLessons(courseId: number | string): Observable<{
        course: CourseDisplay;
        lessons: LessonDisplay[];
        resumeIndex: number | null;
    } | null> {
        return this.getCourseById(courseId).pipe(
            map(response => {
                if (!response) return null;

                const lessons = this.mapLessonsToDisplay(response.lessons);
                const resumeIndex = this.findResumeLessonIndex(response.lessons);

                return {
                    course: {
                        id: response.id,
                        title: response.courseName,
                        description: response.description,
                        image: this.convertDriveUrl(response.thumbnailUrl),
                        lessons: response.noOfLessons,
                        duration: `${response.duration} min`,
                        coins: response.totalCoins,
                        level: this.formatDifficulty(response.difficulty),
                        category: response.category,
                        completedLessons: response.completedLessons,
                        completionPercentage: response.completionPercentage,
                        isCompleted: response.isCourseCompleted,
                        resumeLessonIndex: resumeIndex
                    },
                    lessons,
                    resumeIndex
                };
            })
        );
    }

    // ==================== LESSONS ====================

    /**
     * Get lesson detail by ID
     */
    getLessonById(lessonId: number | string): Observable<LessonDetailResponse | null> {
        this.isLoadingLesson.set(true);
        this.error.set(null);

        return this.api.getLessonById(lessonId).pipe(
            tap(() => this.isLoadingLesson.set(false)),
            catchError(err => {
                this.error.set(err.message || 'Failed to load lesson');
                this.isLoadingLesson.set(false);
                return of(null);
            })
        );
    }

    /**
     * Start a lesson (update status to ONGOING if PENDING)
     */
    startLesson(lessonId: number | string, currentStatus: string | null): Observable<boolean> {
        if (currentStatus === 'PENDING') {
            return this.api.updateLessonStatus(lessonId, 'ONGOING').pipe(
                map(() => true),
                catchError(err => {
                    console.warn('Failed to update lesson status:', err);
                    return of(true); // Allow starting even if status update fails
                })
            );
        }
        return of(true);
    }

    /**
     * Complete a lesson
     */
    completeLesson(lessonId: number | string): Observable<LessonDetailResponse | null> {
        return this.api.completeLesson(lessonId).pipe(
            tap(() => {
                // Invalidate cache so next fetch gets updated progress
                this.invalidateCache();
            }),
            catchError(err => {
                console.error('Failed to complete lesson:', err);
                return of(null);
            })
        );
    }

    /**
     * Invalidate courses cache (call after completing lessons)
     */
    invalidateCache(): void {
        this.coursesCache$ = null;
        this.cacheExpiry = 0;
    }

    // ==================== HELPERS ====================

    /**
     * Map API course to display model
     */
    private mapCourseToDisplay(course: Course): CourseDisplay {
        return {
            id: course.id,
            title: course.courseName,
            description: course.description || '',
            image: this.convertDriveUrl(course.thumbnailUrl || ''),
            lessons: course.noOfLessons || 0,
            duration: `${course.duration || 0} min`,
            coins: course.totalCoins || 0,
            level: this.formatDifficulty(course.difficulty || 'BEGINNER'),
            category: course.category || '',
            completedLessons: 0,
            completionPercentage: 0,
            isCompleted: false,
            resumeLessonIndex: null
        };
    }

    /**
     * Map API lessons to display model
     */
    private mapLessonsToDisplay(lessons: CourseLesson[]): LessonDisplay[] {
        return lessons.map((lesson, index) => {
            const prevCompleted = index === 0 || lessons[index - 1]?.isCompleted;
            const isLocked = !prevCompleted && !lesson.isCompleted;

            return {
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                type: lesson.videoUrl ? 'Video' : 'Text-based',
                duration: `${lesson.duration} min`,
                coins: lesson.coins || 0,
                icon: this.convertDriveUrl(lesson.thumbnailUrl) || '/assets/images/lesson-icons/default.png',
                order: lesson.order,
                isCompleted: lesson.isCompleted,
                isLocked,
                status: lesson.status as LessonStatus | null,
                canStart: !isLocked
            };
        });
    }

    /**
     * Find index of lesson to resume (first non-completed with progress)
     */
    private findResumeLessonIndex(lessons: CourseLesson[]): number | null {
        const inProgressIdx = lessons.findIndex(
            l => !l.isCompleted && (!!l.timeSpentMinutes || !!l.lastAccessedAt)
        );
        if (inProgressIdx >= 0) return inProgressIdx;

        // Otherwise find first non-completed lesson
        const firstIncomplete = lessons.findIndex(l => !l.isCompleted);
        return firstIncomplete >= 0 ? firstIncomplete : null;
    }

    /**
     * Convert Google Drive URL to direct image URL
     */
    convertDriveUrl(url: string): string {
        if (!url) return '';

        // Format: https://drive.google.com/file/d/{id}/view
        const fileMatch = url.match(/\/file\/d\/([^\/]+)/);
        if (fileMatch?.[1]) {
            return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
        }

        // Format: https://drive.google.com/open?id={id}
        const openMatch = url.match(/[?&]id=([^&]+)/);
        if (openMatch?.[1]) {
            return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
        }

        return url;
    }

    /**
     * Format difficulty level
     */
    formatDifficulty(difficulty: string): string {
        const map: Record<string, string> = {
            'BEGINNER': 'Beginner',
            'INTERMEDIATE': 'Intermediate',
            'ADVANCED': 'Advanced',
            'PRO': 'Pro'
        };
        return map[difficulty?.toUpperCase()] || 'Beginner';
    }

    /**
     * Get category info by key
     */
    getCategoryInfo(category: string): CategoryCard | undefined {
        return this.categories.find(c => c.category === category);
    }

    /**
     * Parse lesson content into structured sections
     */
    parseContent(content: string): {
        learningOutcomes: string[];
        sections: Array<{ heading: string; body: string; isFunFact: boolean }>;
    } {
        if (!content) return { learningOutcomes: [], sections: [] };

        const lines = content.split('\n').filter(line => line.trim());
        const learningOutcomes: string[] = [];
        const sections: Array<{ heading: string; body: string; isFunFact: boolean }> = [];
        let currentSection: { heading: string; body: string; isFunFact: boolean } | null = null;

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip intro lines
            if (trimmed === 'In this lesson you will learn' || trimmed.startsWith('By the end')) {
                continue;
            }

            // Parse numbered learning outcomes
            if (/^\d+\./.test(trimmed) && learningOutcomes.length < 5 && !currentSection) {
                learningOutcomes.push(trimmed.replace(/^\d+\.\s*/, ''));
                continue;
            }

            // Detect section headings
            if (trimmed && !trimmed.endsWith('.') && !trimmed.endsWith(':') && !trimmed.match(/^\d+\./)) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    heading: trimmed,
                    body: '',
                    isFunFact: trimmed.toLowerCase().includes('fun fact')
                };
                continue;
            }

            // Add to current section body
            if (currentSection) {
                currentSection.body += (currentSection.body ? ' ' : '') + trimmed;
            }
        }

        if (currentSection) {
            sections.push(currentSection);
        }

        return { learningOutcomes, sections };
    }
}

// Re-export interfaces for convenience
export type {
    Course,
    CourseDetailResponse,
    CourseLesson,
    LessonDetailResponse,
    LessonStatus
} from '../api/academy.api';
