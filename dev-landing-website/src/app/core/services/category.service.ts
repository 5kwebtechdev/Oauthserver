import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) { }

  /**
   * Fetch all masterclass categories.
   * GET /v1/category
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/category`, { headers: this.getHeaders() }).pipe(
      retry(1),
      catchError(this.handleError)
    );
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
    let message = 'Failed to load categories. Please try again.';

    if (error.status === 0) {
      message = 'Network error. Please check your connection.';
    } else if (error.error?.message) {
      message = error.error.message;
    }

    return throwError(() => ({ status: error.status, message }));
  }
}
