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
    getHabitsByDate(date: string): Observable<any> {
        const url = `${this.base}/habits/day?date=${date}`;
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
}
