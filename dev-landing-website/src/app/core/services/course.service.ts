import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, retry, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { CategoryService } from './category.service';
import { Course } from '../models/course.model';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly base = environment.apiUrl;

  // Shared, replayed aggregate per age: every caller (e.g. the Home page) that
  // asks for "all masterclass courses" for the same age gets the same
  // in-flight/completed request instead of re-fetching every category again.
  private readonly allCoursesCache = new Map<number, Observable<Course[]>>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private categoryService: CategoryService
  ) { }

  /**
   * Fetch courses for a given age.
   * GET /v1/courses/by-age?age={age}
   *
   * categoryId is accepted (and sent when provided) so the API can filter
   * server-side once it supports `&categoryId=`. Until then, callers should
   * filter the returned list on the frontend by category name.
   */
  getCoursesByAge(age: number, categoryId?: number): Observable<Course[]> {
    let params = new HttpParams().set('age', age);
    if (categoryId != null) {
      params = params.set('categoryId', categoryId);
    }

    return this.http.get<Course[]>(`${this.base}/courses/by-age`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Fetch every category's courses for the given age and merge them into a
   * single flat list - used by views (e.g. the Home page) that want "all
   * masterclass courses" without making the user pick a category first.
   *
   * Reuses CategoryService.getCategories() + getCoursesByAge() (no duplicate
   * HTTP logic); category course requests run in parallel via forkJoin. A
   * category whose course request fails contributes an empty list instead of
   * failing the whole aggregate. The merged result is shared/replayed per age
   * so repeated calls (e.g. re-visiting the Home page) don't re-fetch.
   */
  getAllCoursesForAge(age: number): Observable<Course[]> {
    let cached = this.allCoursesCache.get(age);
    if (!cached) {
      cached = this.categoryService.getCategories().pipe(
        switchMap(categories => {
          if (!categories || categories.length === 0) return of([]);

          const requests = categories.map(category =>
            this.getCoursesByAge(age, category.id).pipe(catchError(() => of([] as Course[])))
          );
          return forkJoin(requests);
        }),
        map(coursesPerCategory => coursesPerCategory.flat()),
        catchError(this.handleError),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.allCoursesCache.set(age, cached);
    }
    return cached;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.authService.getToken();

    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    } else if (environment.apiAuthToken) {
      const envToken = environment.apiAuthToken.startsWith('Bearer ')
        ? environment.apiAuthToken
        : `Bearer ${environment.apiAuthToken}`;
      headers = headers.set('Authorization', envToken);
    }

    return headers;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Unable to load courses.';

    if (error.status === 0) {
      message = 'Network error. Please check your connection.';
    } else if (error.error?.message) {
      message = error.error.message;
    }

    return throwError(() => ({ status: error.status, message }));
  }
}
