import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// ==================== INTERFACES ====================

export interface Lesson {
    id: number;
    lessonTitle: string;
    lessonDescription?: string;
    format?: string;
    duration?: number;
    coins?: number;
    thumbnailUrl?: string;
    content?: string;
    lessonOrder?: number;
}

export interface Course {
    id: number;
    courseName: string;
    description?: string;
    category?: string;
    difficulty?: string;
    noOfLessons?: number;
    ageGroup?: string;
    duration?: number;
    format?: string;
    totalCoins?: number;
    thumbnailUrl?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    enabled?: boolean;
    lessons?: Lesson[];
}

export interface CourseLesson {
    id: number;
    title: string;
    description: string;
    duration: number;
    order: number;
    videoUrl: string | null;
    thumbnailUrl: string;
    content: string;
    status: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    isCompleted: boolean;
    completedAt: string | null;
    timeSpentMinutes: number;
    lastAccessedAt: string | null;
    isLocked: boolean;
    coins?: number;
}

export interface CourseDetailResponse {
    id: number;
    courseName: string;
    description: string;
    category: string;
    difficulty: string;
    noOfLessons: number;
    ageGroup: string;
    duration: number;
    format: string;
    totalCoins: number;
    thumbnailUrl: string;
    status: string;
    completedLessons: number;
    completionPercentage: number;
    isCourseCompleted: boolean;
    progressStatus: string;
    startedAt: string;
    completedAt: string | null;
    lessons: CourseLesson[];
}

export interface LessonDetailResponse {
    id: number;
    title: string;
    description: string;
    duration: number;
    order: number;
    videoUrl: string | null;
    thumbnailUrl: string;
    content: string;
    status: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    isCompleted: boolean;
    completedAt: string | null;
    timeSpentMinutes: number;
    lastAccessedAt: string | null;
    isLocked: boolean;
}

export type LessonStatus = 'PENDING' | 'ONGOING' | 'COMPLETED';

export interface AcademyFeedCourse {
    id: number;
    courseName: string;
    description: string;
    category: string;
    difficulty: string;
    noOfLessons: number;
    ageGroups: string[];
    duration: number;
    format: string;
    totalCoins: number;
    thumbnailUrl: string | null;
    status: string;
    completedLessons: number;
    completionPercentage: number;
    isCourseCompleted: boolean;
    progressStatus: string;
    startedAt: string | null;
    completedAt: string | null;
    continueLessonId: number | null;
    lessons: any | null;
}

export interface AcademyFeedLesson {
    lessonId: number;
    lessonTitle: string;
    lessonDescription: string;
    duration: number;
    order: number;
    thumbnailUrl: string | null;
    content: string;
    courseId: number;
    courseName: string;
    courseThumbnailUrl: string | null;
    slotType: 'ACTIVE' | 'NEXT_UP' | 'NEW';
    ctaLabel: string;
    isCompleted: boolean;
    isLocked: boolean;
    lessonStatus: string;
    timeSpentMinutes: number;
}

export interface AcademyFeedResponse {
    state: 1 | 2 | 3;
    headerTitle: string;
    courses: AcademyFeedCourse[] | null;
    lessons: AcademyFeedLesson[] | null;
}

// ==================== API SERVICE ====================

@Injectable({ providedIn: 'root' })
export class AcademyApi {
    private readonly base = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Build HTTP headers with authorization token
     */
    private getHeaders(): HttpHeaders {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const token = this.authService.getToken();

        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        } else if (environment.apiAuthToken) {
            const envToken = environment.apiAuthToken.startsWith('Bearer ')
                ? environment.apiAuthToken
                : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envToken);
        }

        return headers;
    }

    /**
     * Centralized error handler
     */
    private handleError(operation: string) {
        return (error: HttpErrorResponse): Observable<never> => {
            console.error(`[AcademyApi] ${operation} failed:`, error);

            let message = 'An unexpected error occurred';
            if (error.status === 0) {
                message = 'Network error. Please check your connection.';
            } else if (error.status === 401) {
                message = 'Unauthorized. Please login again.';
            } else if (error.status === 403) {
                message = 'Access denied.';
            } else if (error.status === 404) {
                message = 'Resource not found.';
            } else if (error.error?.message) {
                message = error.error.message;
            }

            return throwError(() => ({ status: error.status, message, original: error }));
        };
    }

    // ==================== ACADEMY FEED ====================

    getAcademyFeed(age?: number): Observable<AcademyFeedResponse> {
        const url = age != null
            ? `${this.base}/courses/academy-feed?age=${age}`
            : `${this.base}/courses/academy-feed`;
        return this.http.get<AcademyFeedResponse>(url, { headers: this.getHeaders() }).pipe(
            retry(1),
            tap(data => console.log('[AcademyApi] Academy feed state:', data?.state)),
            catchError(this.handleError('getAcademyFeed'))
        );
    }

    // ==================== COURSES ====================

    getCourses(): Observable<Course[]> {
        return this.http.get<Course[]>(`${this.base}/courses`, { headers: this.getHeaders() }).pipe(
            retry(1),
            tap(data => console.log('[AcademyApi] Courses fetched:', data?.length)),
            catchError(this.handleError('getCourses'))
        );
    }

    /**
     * Fetch courses by category
     */
    getCoursesByCategory(category: string): Observable<Course[]> {
        return this.http.get<Course[]>(`${this.base}/courses?category=${encodeURIComponent(category)}`, {
            headers: this.getHeaders()
        }).pipe(
            retry(1),
            tap(data => console.log(`[AcademyApi] Courses for ${category}:`, data?.length)),
            catchError(this.handleError('getCoursesByCategory'))
        );
    }

    /**
     * Fetch course by ID with lessons and progress
     */
    getCourseById(courseId: number | string): Observable<CourseDetailResponse> {
        return this.http.get<CourseDetailResponse>(`${this.base}/courses/${courseId}`, {
            headers: this.getHeaders()
        }).pipe(
            retry(1),
            tap(data => console.log('[AcademyApi] Course fetched:', data?.courseName)),
            catchError(this.handleError('getCourseById'))
        );
    }

    // ==================== LESSONS ====================

    /**
     * Fetch lesson by ID
     */
    getLessonById(lessonId: number | string): Observable<LessonDetailResponse> {
        return this.http.get<LessonDetailResponse>(`${this.base}/courses/lessons/${lessonId}`, {
            headers: this.getHeaders()
        }).pipe(
            retry(1),
            tap(data => console.log('[AcademyApi] Lesson fetched:', data?.title)),
            catchError(this.handleError('getLessonById'))
        );
    }

    /**
     * Mark lesson as complete
     */
    completeLesson(lessonId: number | string): Observable<LessonDetailResponse> {
        return this.http.post<LessonDetailResponse>(
            `${this.base}/courses/lessons/${lessonId}/complete`,
            {},
            { headers: this.getHeaders() }
        ).pipe(
            tap(res => console.log('[AcademyApi] Lesson completed:', res?.id)),
            catchError(this.handleError('completeLesson'))
        );
    }

    /**
     * Update lesson status (PENDING -> ONGOING -> COMPLETED)
     */
    updateLessonStatus(lessonId: number | string, status: LessonStatus): Observable<any> {
        return this.http.post<any>(
            `${this.base}/courses/lessons/update-status?lessonId=${lessonId}&status=${status}`,
            {},
            { headers: this.getHeaders() }
        ).pipe(
            tap(res => console.log(`[AcademyApi] Lesson ${lessonId} status updated to ${status}`)),
            catchError(this.handleError('updateLessonStatus'))
        );
    }
}
