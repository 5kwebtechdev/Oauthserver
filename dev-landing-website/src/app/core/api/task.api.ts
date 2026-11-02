import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class TaskApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    createTask(payload: any): Observable<any> {
        return this.http.post(`${this.base}/tasks/add`, payload, { headers: this.headers() });
    }

    getTasksByDate(date: string): Observable<any> {
        return this.http.get(`${this.base}/tasks/tasks-by-date?date=${date}`, { headers: this.headers() });
    }

    getTaskById(id: number): Observable<any> {
        return this.http.get(`${this.base}/tasks/${id}`, { headers: this.headers() });
    }

    getTaskByIdWithDate(id: number, date: string): Observable<any> {
        const url = `${this.base}/tasks/task-by-id?taskId=${id}&date=${date}`;
        return this.http.get(url, { headers: this.headers() });
    }

    getTasksBySearch(filters?: any): Observable<any> {
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
        return this.http.get(`${this.base}/tasks/search`, { headers: this.headers(), params });
    }

    getTodayTasks(): Observable<any> {
        return this.http.get(`${this.base}/tasks/tasks-by-date`, { headers: this.headers() });
    }

    getAllTasks(): Observable<any> {
        return this.http.get(`${this.base}/tasks/all`, { headers: this.headers() });
    }

    updateTask(id: string, payload: any): Observable<any> {
        return this.http.put(`${this.base}/tasks/update/${id}`, payload, { headers: this.headers() });
    }

    deleteTask(id: string): Observable<any> {
        return this.http.delete(`${this.base}/tasks/delete/${id}`, { headers: this.headers() });
    }

    completeTask(id: string): Observable<any> {
        return this.http.post(`${this.base}/tasks/complete/${id}`, {}, { headers: this.headers() });
    }

    letsGoTask(id: string): Observable<any> {
        return this.http.post(`${this.base}/tasks/lets-go/${id}`, {}, { headers: this.headers() });
    }

    abortTask(id: string): Observable<any> {
        return this.http.post(`${this.base}/tasks/abort/${id}`, {}, { headers: this.headers() });
    }

    getTaskMonthlyCompletion(id: number, year: number, month: number): Observable<any> {
        return this.http.get(`${this.base}/tasks/${id}/month?year=${year}&month=${month}`, { headers: this.headers() });
    }
}
