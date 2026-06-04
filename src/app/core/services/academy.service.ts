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
  lessonStatus: string | null;
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
  lessonStatus?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  timeSpentMinutes: number;
  lastAccessedAt: string | null;
  isLocked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AcademyService {
  private base = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const userToken = this.authService.getToken();
    if (userToken) {
      const t = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
      headers = headers.set('Authorization', t);
    } else if (environment.apiAuthToken) {
      const envToken = environment.apiAuthToken.startsWith('Bearer ')
        ? environment.apiAuthToken
        : `Bearer ${environment.apiAuthToken}`;
      headers = headers.set('Authorization', envToken);
    }
    return headers;
  }

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.base}/courses`, { headers: this.getHeaders() });
  }

  getCourseById(courseId: number | string): Observable<CourseDetailResponse> {
    return this.http.get<CourseDetailResponse>(
      `${this.base}/courses/${courseId}`,
      { headers: this.getHeaders() },
    );
  }

  getLessonById(lessonId: number | string): Observable<LessonDetailResponse> {
    return this.http.get<LessonDetailResponse>(
      `${this.base}/courses/lessons/${lessonId}`,
      { headers: this.getHeaders() },
    );
  }

  completeLessonById(lessonId: number | string): Observable<LessonDetailResponse> {
    return this.http.post<LessonDetailResponse>(
      `${this.base}/courses/lessons/${lessonId}/complete`,
      {},
      { headers: this.getHeaders() },
    );
  }

  updateLessonStatus(lessonId: number | string, status: string): Observable<any> {
    return this.http.post<any>(
      `${this.base}/courses/lessons/update-status?lessonId=${lessonId}&status=${status}`,
      {},
      { headers: this.getHeaders() },
    );
  }
}
