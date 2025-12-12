import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../package/api/auth.service';

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

// Course detail response with progress tracking
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
    coins?: number; // optional per-lesson coin reward
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

@Injectable({
    providedIn: 'root'
})
export class AcademyService {
    private base = environment.apiUrl;

    constructor(private http: HttpClient, private authService: AuthService) { }

    getCourses(): Observable<Course[]> {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // Prefer user token from AuthService (localStorage), fallback to environment.apiAuthToken
        const userToken = this.authService.getToken();
        if (userToken) {
            const t = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
            headers = headers.set('Authorization', t);
        } else if (environment.apiAuthToken) {
            const envToken = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envToken);
        }

        return this.http.get<Course[]>(`${this.base}/courses`, { headers });
    }

    /**
     * Get detailed course information by ID including lessons and progress
     * @param courseId The course ID to fetch
     * @returns Observable with course detail response
     */
    getCourseById(courseId: number | string): Observable<CourseDetailResponse> {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // Prefer user token from AuthService (localStorage), fallback to environment.apiAuthToken
        const userToken = this.authService.getToken();
        if (userToken) {
            const t = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
            headers = headers.set('Authorization', t);
        } else if (environment.apiAuthToken) {
            const envToken = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envToken);
        }

        return this.http.get<CourseDetailResponse>(`${this.base}/courses/${courseId}`, { headers });
    }

    /**
     * Get detailed lesson information by ID
     * @param lessonId The lesson ID to fetch
     * @returns Observable with lesson detail response
     */
    getLessonById(lessonId: number | string): Observable<LessonDetailResponse> {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // Prefer user token from AuthService (localStorage), fallback to environment.apiAuthToken
        const userToken = this.authService.getToken();
        if (userToken) {
            const t = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
            headers = headers.set('Authorization', t);
        } else if (environment.apiAuthToken) {
            const envToken = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envToken);
        }

        return this.http.get<LessonDetailResponse>(`${this.base}/courses/lessons/${lessonId}`, { headers });
    }

    /**
     * Mark a lesson as complete
     * @param lessonId The lesson ID to mark as complete
     * @returns Observable with updated lesson detail response
     */
    completeLessonById(lessonId: number | string): Observable<LessonDetailResponse> {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // Prefer user token from AuthService (localStorage), fallback to environment.apiAuthToken
        const userToken = this.authService.getToken();
        if (userToken) {
            const t = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
            headers = headers.set('Authorization', t);
        } else if (environment.apiAuthToken) {
            const envToken = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envToken);
        }

        return this.http.post<LessonDetailResponse>(`${this.base}/courses/lessons/${lessonId}/complete`, {}, { headers });
    }
}
