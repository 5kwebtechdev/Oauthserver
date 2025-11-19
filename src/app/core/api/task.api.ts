import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class TaskApi {
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

    /**
     * Get all tasks for the user
     * @returns Observable with all tasks
     */
    getAllTasks(): Observable<any> {
        const url = `${this.base}/tasks/all`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Get tasks by date
     * @param date The date in YYYY-MM-DD format
     * @returns Observable with tasks for the specified date
     */
    getTasksByDate(date: string): Observable<any> {
        const url = `${this.base}/tasks/day?date=${date}`;
        return this.http.get(url, { headers: this.headers() });
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
     * Delete a task by id
     * @param id Task id
     */
    deleteTask(id: string): Observable<any> {
        const url = `${this.base}/tasks/delete/${id}`;
        return this.http.delete(url, { headers: this.headers() });
    }
}