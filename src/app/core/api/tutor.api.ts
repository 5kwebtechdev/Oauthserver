import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';
import { TutorCategoriesResponse } from '../models/tutor.model';

@Injectable({ providedIn: 'root' })
export class TutorApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authApi: AuthApi) { }

    /**
     * Generate HTTP headers with authorization token
     * @returns HttpHeaders with bearer token
     */
    private headers(): HttpHeaders {
        const token = this.authApi.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        } else if (environment.apiAuthToken) {
            const envValue = environment.apiAuthToken.startsWith('Bearer ')
                ? environment.apiAuthToken
                : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envValue);
        }

        return headers;
    }

    /**
     * Fetch all tutor categories with their filterable fields and options
     * GET /v1/tutors/categories
     * @returns Observable with tutor categories response
     */
    getTutorCategories(): Observable<TutorCategoriesResponse> {
        const url = `${this.base}/tutors/categories`;
        return this.http.get<TutorCategoriesResponse>(url, { headers: this.headers() }).pipe(
            map((categories) => {
                // Sort categories by displayOrder
                return categories
                    .filter(cat => cat.isActive)
                    .sort((a, b) => a.displayOrder - b.displayOrder);
            }),
            tap(categories => console.log('[TutorApi] Fetched categories:', categories.length)),
            catchError(error => {
                console.error('[TutorApi] Error fetching tutor categories:', error);
                // Return empty array on error instead of failing
                return of([]);
            })
        );
    }

    /**
     * Search/filter tutors based on selected criteria
     * POST /v1/tutors/search (example endpoint - adjust based on your API)
     * @param filters Selected filter criteria
     * @returns Observable with matching tutors
     */
    searchTutors(filters: any): Observable<any> {
        const url = `${this.base}/tutors/search`;
        return this.http.post<any>(url, filters, { headers: this.headers() }).pipe(
            catchError(error => {
                console.error('[TutorApi] Error searching tutors:', error);
                return of({ tutors: [], total: 0 });
            })
        );
    }

    /**
     * Get tutor details by ID
     * GET /v1/tutors/:id
     * @param tutorId The tutor ID
     * @returns Observable with tutor details
     */
    getTutorById(tutorId: number | string): Observable<any> {
        const url = `${this.base}/tutors/${tutorId}`;
        return this.http.get<any>(url, { headers: this.headers() });
    }

    /** Unlock protected Tutor or Academy contact details for the requesting user. */
    unlockContact(userId: number | string, tutorId: number | string, amount: number): Observable<any> {
        const params = new HttpParams()
            .set('userId', String(userId))
            .set('id', String(tutorId))
            .set('amount', String(amount));
        return this.http.post<any>(`${this.base}/tutors/unlock-contact`, null, {
            headers: this.headers(),
            params
        });
    }
}
