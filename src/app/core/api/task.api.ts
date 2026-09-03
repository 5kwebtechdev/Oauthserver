import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class TaskApi {
    private base = environment.apiUrl || '';
    // Simple in-memory cache for calendar responses per date
    private calendarDataCache: Map<string, any> = new Map();
    // Track in-flight HTTP observables to coalesce concurrent requests
    private inflightRequests: Map<string, Observable<any>> = new Map();
    private cacheGeneration = 0;

    constructor(private http: HttpClient, private authApi: AuthApi) { }

    private headers(): HttpHeaders {
        const token = this.authApi.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            // Ensure token already contains 'Bearer ' prefix in env; if not, add it.
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        } else if (environment.apiAuthToken) {
            // Fallback to environment token if no token is available
            const envValue = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envValue);
        }
        return headers;
    }

    /**
     * Get all tasks for the user
     * @returns Observable with all tasks
     */
    getAllTasks(forUserId?: string | number | null): Observable<any> {
        const url = `${this.base}/tasks/all`;
        let params = new HttpParams();
        if (forUserId !== null && forUserId !== undefined && String(forUserId).trim()) {
            params = params.set('forUserId', String(forUserId));
        }
        return this.http.get(url, { headers: this.headers(), params });
    }

    getTodayTasks(): Observable<any> {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return this.getCalendarByDate(date).pipe(
            map((resp: any) => (resp && Array.isArray(resp.tasks)) ? resp.tasks : (resp?.tasks || []))
        );
    }

    /**
     * Get tasks by date
     * @param date The date in YYYY-MM-DD format
     * @returns Observable with tasks for the specified date
     */
    /**
     * Get tasks by date. The ProfileSelectorInterceptor automatically adds userId
     * when a child is selected by the parent.
     */
    getTasksByDate(date: string, force: boolean = false): Observable<any> {
        return this.getCalendarByDate(date, force).pipe(
            map((resp: any) => (resp && Array.isArray(resp.tasks)) ? resp.tasks : (resp?.tasks || []))
        );
    }

    /**
     * Get raw calendar response for a date. Cached per date to avoid duplicate network calls
     * @param force When true, bypass cached data and fetch fresh
     */
    getCalendarByDate(date: string, force: boolean = false): Observable<any> {
        const cacheKey = this.getCalendarCacheKey(date);
        const requestGeneration = this.cacheGeneration;

        if (!force && this.calendarDataCache.has(cacheKey)) {
            return of(this.calendarDataCache.get(cacheKey));
        }

        if (this.inflightRequests.has(cacheKey)) {
            return this.inflightRequests.get(cacheKey)!;
        }

        const url = `${this.base}/calendar/user-calendar?date=${date}&viewType=day`;
        const obs = this.http.get(url, { headers: this.headers() }).pipe(
            map(resp => resp),
            // store response and clear inflight on completion
            // use tap here but keep map to preserve types
            // but we need to import tap; use subscription side-effect via map below
        );

        // Wrap to perform caching when the observable emits
        const cached = new Observable<any>(subscriber => {
            const sub = obs.subscribe({
                next: (resp) => {
                    // Never cache a response created under a previous account
                    // or selected-child context.
                    if (requestGeneration === this.cacheGeneration
                        && cacheKey === this.getCalendarCacheKey(date)) {
                        this.calendarDataCache.set(cacheKey, resp);
                    }
                    subscriber.next(resp);
                },
                error: (err) => subscriber.error(err),
                complete: () => subscriber.complete()
            });
            return () => {
                sub.unsubscribe();
                this.inflightRequests.delete(cacheKey);
            };
        }).pipe(
            // replay last value for current subscribers
            shareReplay({ bufferSize: 1, refCount: true })
        );

        this.inflightRequests.set(cacheKey, cached);
        return cached;
    }

    clearCache(): void {
        this.cacheGeneration++;
        this.calendarDataCache.clear();
        this.inflightRequests.clear();
    }

    private getCalendarCacheKey(date: string): string {
        const userId = this.authApi.getUserId() || 'anonymous';
        let selectedChildId = 'self';
        try {
            selectedChildId = localStorage.getItem('mb_selected_child_id') || 'self';
        } catch {}
        return `${userId}:${selectedChildId}:${date}`;
    }

    

    /**
     * Create a new task
     * @param payload Task data
     * @returns Observable with created task
     */
    createTask(payload: any): Observable<any> {
        const url = `${this.base}/tasks/add`;
        return this.http.post(url, payload, { headers: this.headers() });
    }

    /**
     * Get task by id
     * @param id Task id
     * @returns Observable with task details
     */
    getTaskById(id: number): Observable<any> {
        const url = `${this.base}/tasks/${id}`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Get task by id with specific date
     * @param id Task id
     * @param date The date in YYYY-MM-DD format
     * @returns Observable with task details for the specified date
     */
    getTaskByIdWithDate(id: number, date: string): Observable<any> {
        const url = `${this.base}/tasks/task-by-id?taskId=${id}&date=${date}`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Update a task by id
     * @param id Task id
     * @param payload Body to send to the update endpoint
     */
    updateTask(id: string, payload: any): Observable<any> {
        const url = `${this.base}/tasks/update/${id}`;
        return this.http.put(url, payload, { headers: this.headers() });
    }

    /**
     * Delete a task by id
     * @param id Task id
     */
    deleteTask(id: string): Observable<string> {
        const url = `${this.base}/planner-data/task/${id}`;
        // The planner endpoint returns a plain-text success message, not JSON.
        // Explicitly accepting text ensures a successful delete reaches `next`.
        return this.http.delete(url, { headers: this.headers(), responseType: 'text' });
    }

    letsGoTask(id: string): Observable<any> {
        const url = `${this.base}/tasks/lets-go/${id}`;
        return this.http.post(url, {}, { headers: this.headers() });
    }

    abortTask(id: string): Observable<any> {
        const url = `${this.base}/tasks/abort/${id}`;
        return this.http.post(url, {}, { headers: this.headers() });
    }

    completeTask(id: string, confirmed?: boolean): Observable<any> {
        const url = `${this.base}/tasks/complete/${id}${confirmed ? '?confirmed=true' : ''}`;
        return this.http.post(url, {}, { headers: this.headers() });
    }

    /**
     * Get monthly completion status for a task
     * @param id Task id
     * @param year Year (e.g., 2025)
     * @param month Month (1-12)
     * @returns Observable with monthly completion data
     */
    getTaskMonthlyCompletion(id: number, year: number, month: number): Observable<any> {
        const url = `${this.base}/tasks/${id}/month?year=${year}&month=${month}`;
        return this.http.get(url, { headers: this.headers() });
    }
}
