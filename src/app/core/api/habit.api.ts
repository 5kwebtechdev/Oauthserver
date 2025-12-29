import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class HabitApi {
    private base = environment.apiUrl || '';

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

    createHabit(payload: any): Observable<any> {
        const url = `${this.base}/habits/add`;
        return this.http.post(url, payload, { headers: this.headers() });
    }

    /**
     * Get habits by date
     * @param date The date in YYYY-MM-DD format
     * @returns Observable with habits for the specified date
     */
    /**
     * Get habits by date. Optionally include `userId` to fetch for a specific child.
     */
    getHabitsByDate(date: string, userId?: number): Observable<any> {
        let url = `${this.base}/habits/habits-by-date?date=${date}`;
        if (userId != null) url += `&userId=${userId}`;
        return this.http.get(url, { headers: this.headers() });
    }

    getHabitById(id: number): Observable<any> {
        const headers = this.headers();
        const url = `${this.base}/habits/${id}`;
        return this.http.get(url, { headers: this.headers() });
    }

    getHabitsBySearch(filters?: any): Observable<any> {
        const url = `${this.base}/habits/search`;
        let params = new HttpParams();
        if (filters) {
            Object.keys(filters).forEach(key => {
                const value = filters[key];
                if (value !== null && value !== undefined && value !== '') {
                    if (Array.isArray(value)) {
                        value.forEach(v => params = params.append(key, v));
                    } else {
                        params = params.set(key, value.toString());
                    }
                }
            });
        }
        return this.http.get(url, { headers: this.headers(), params });
    }

    getTodayHabits(): Observable<any> {
        const url = `${this.base}/habits/habits-by-date`;
        return this.http.get(url, { headers: this.headers() });
    }



    /**
     * Get all habits for the user
     * @returns Observable with all habits
     */
    getAllHabits(): Observable<any> {
        const url = `${this.base}/habits/all`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Update a habit by id
     * @param id Habit id
     * @param payload Body to send to the update endpoint
     */
    updateHabit(id: string, payload: any): Observable<any> {
        const url = `${this.base}/habits/update/${id}`;
        return this.http.put(url, payload, { headers: this.headers() });
    }

    /**
     * Delete a habit by id
     * @param id Habit id
     */
    deleteHabit(id: string): Observable<any> {
        const url = `${this.base}/habits/delete/${id}`;
        return this.http.delete(url, { headers: this.headers() });
    }

    /**
     * Toggle habit completion status
     * @param id Habit id
     */
    completeHabit(id: string): Observable<any> {
        const url = `${this.base}/habits/complete/${id}`;
        return this.http.post(url, {}, { headers: this.headers() });
    }

    /**  * "Let's Go" action for a habit
      * @param id Habit id
      */
    letsGoHabit(id: string): Observable<any> {
        const url = `${this.base}/habits/lets-go/${id}`;
        return this.http.post(url, {}, { headers: this.headers() });
    }

    abortHabit(id: string): Observable<any> {
        const url = `${this.base}/habits/abort/${id}`;
        return this.http.post(url, {}, { headers: this.headers() });
    }

    /**
     * Get monthly completion status for a habit
     * @param id Habit id
     * @param year Year (e.g., 2025)
     * @param month Month (1-12)
     * @returns Observable with monthly completion data
     */
    getHabitMonthlyCompletion(id: number, year: number, month: number): Observable<any> {
        const url = `${this.base}/habits/${id}/month?year=${year}&month=${month}`;
        return this.http.get(url, { headers: this.headers() });
    }
}
