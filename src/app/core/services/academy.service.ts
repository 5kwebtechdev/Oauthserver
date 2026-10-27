import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

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
  completedLessons?: number;
  completionPercentage?: number;
  isCourseCompleted?: boolean;
  progressStatus?: string;
  continueLessonId?: number | null;
  /** True only when the requested child has this course assigned. */
  assignedToChild?: boolean;
}

export interface CourseAssignmentResponse {
  courseId: number;
  courseName: string;
  assignedBy: number;
  assignedToChild: number[];
  /** Extra reward coins selected by the parent for this assignment. */
  extraCoinsByParent?: number;
  assignedAt: string;
}

export interface AcademyCategory {
  id: number;
  categoryName: string;
  description?: string;
  thumbnailUrl?: string;
  status?: string;
  courseCount?: number;
  pending?: number;
  pendingCount?: number;
  pendingCourseCount?: number;
  completedCount?: number;
  completedCourseCount?: number;
}

// Academy Feed API — /courses/academy-feed
export interface AcademyFeedCourse {
  id: number;
  courseName: string;
  description?: string;
  category?: string;
  difficulty?: string;
  noOfLessons?: number;
  duration?: number;
  thumbnailUrl?: string;
  completedLessons?: number;
  completionPercentage?: number;
  isCourseCompleted?: boolean;
  progressStatus?: string;
  continueLessonId?: number | null;
}

export interface AcademyFeedLesson {
  lessonId: number;
  lessonTitle: string;
  lessonDescription?: string;
  duration?: number;
  order?: number;
  thumbnailUrl?: string | null;
  courseId?: number;
  courseName?: string;
  courseThumbnailUrl?: string;
  slotType?: 'ACTIVE' | 'NEXT_UP' | 'NEW';
  ctaLabel?: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  lessonStatus?: string;
  timeSpentMinutes?: number;
}

export interface AcademyFeedResponse {
  state: 1 | 2 | 3;
  headerTitle: string;
  courses?: AcademyFeedCourse[] | null;
  lessons?: AcademyFeedLesson[] | null;
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
  /** Optional assessment metadata returned for lessons that end with a quiz. */
  hasQuiz?: boolean;
  quizId?: number | string | null;
  quiz?: { id?: number | string; challengeId?: number | string } | null;
  assessmentId?: number | string | null;
}

export interface CourseMetadata {
  id?: number;
  order?: number | null;
  text?: string | null;
  imageUrl?: string | null;
}

export interface CourseDetailResponse {
  courseMetadata?: CourseMetadata[] | null;
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
  continueLessonId?: number | null;
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
  /** Optional assessment metadata returned for lessons that end with a quiz. */
  hasQuiz?: boolean;
  quizId?: number | string | null;
  quiz?: { id?: number | string; challengeId?: number | string } | null;
  assessmentId?: number | string | null;
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

  getCoursesByAge(age: number): Observable<Course[]> {
    const params = new HttpParams().set('age', String(age));
    return this.http.get<Course[]>(`${this.base}/courses/by-age`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getCoursesByCategory(
    category: string,
    age?: number | null,
    forUserId?: string | number | null
  ): Observable<Course[]> {
    let params = new HttpParams().set('category', category);
    if (age != null) params = params.set('age', String(age));
    if (forUserId != null && String(forUserId).trim()) {
      params = params.set('forUserId', String(forUserId));
    }
    return this.http.get<Course[]>(`${this.base}/courses/by-category`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /**
   * Assign a Master Class course to one or more children in the signed-in
   * parent's family. The parent is determined by the bearer token.
   */
  assignCourse(
    courseId: number,
    childIds: number[],
    extraCoinsByParent: number,
  ): Observable<CourseAssignmentResponse> {
    return this.http.post<CourseAssignmentResponse>(
      `${this.base}/courses/assign`,
      { courseId, childIds, extraCoinsByParent },
      { headers: this.getHeaders() },
    );
  }

  getCategories(ageOverride?: number | null, forUserId?: string | number | null): Observable<AcademyCategory[]> {
    let params = new HttpParams();
    const age = ageOverride === undefined
      ? this.authService.getCurrentUserAge()
      : ageOverride;
    if (age !== null) {
      params = params.set('age', String(age));
    }
    if (forUserId != null && String(forUserId).trim()) {
      params = params.set('forUserId', String(forUserId));
    }

    return this.http.get<AcademyCategory[]>(`${this.base}/category`, {
      headers: this.getHeaders(),
      params,
    });
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

  startLessonById(lessonId: number | string): Observable<LessonDetailResponse> {
    return this.http.post<LessonDetailResponse>(
      `${this.base}/courses/lessons/${lessonId}/start`,
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

  getAcademyFeed(age?: number): Observable<AcademyFeedResponse> {
    let params = new HttpParams();
    if (age != null) params = params.set('age', String(age));
    return this.http.get<AcademyFeedResponse>(`${this.base}/courses/academy-feed`, {
      // This endpoint currently has no forUserId contract. Keep the request
      // account-scoped even when a parent has selected a child elsewhere.
      headers: this.getHeaders().set('X-Skip-Profile-Selector', 'true'),
      params,
    });
  }
}
