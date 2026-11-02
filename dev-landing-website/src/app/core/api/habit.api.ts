import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class HabitApi {
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

    createHabit(payload: any): Observable<any> {
        return this.http.post(`${this.base}/habits/add`, payload, { headers: this.headers() });
    }

    getHabitsByDate(date: string): Observable<any> {
        return this.http.get(`${this.base}/habits/habits-by-date?date=${date}`, { headers: this.headers() });
    }

    getHabitById(id: number): Observable<any> {
        return this.http.get(`${this.base}/habits/${id}`, { headers: this.headers() });
    }

    getHabitByIdWithDate(id: number, date: string): Observable<any> {
        const url = `${this.base}/habits/habit-by-id?habitId=${id}&date=${date}`;
        return this.http.get(url, { headers: this.headers() });
    }

    getHabitsBySearch(filters?: any): Observable<any> {
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
        return this.http.get(`${this.base}/habits/search`, { headers: this.headers(), params });
    }

    getTodayHabits(): Observable<any> {
        return this.http.get(`${this.base}/habits/habits-by-date`, { headers: this.headers() });
    }

    getAllHabits(): Observable<any> {
        return this.http.get(`${this.base}/habits/all`, { headers: this.headers() });
    }

    updateHabit(id: string, payload: any): Observable<any> {
        return this.http.put(`${this.base}/habits/update/${id}`, payload, { headers: this.headers() });
    }

    deleteHabit(id: string): Observable<any> {
        return this.http.delete(`${this.base}/habits/delete/${id}`, { headers: this.headers() });
    }

    completeHabit(id: string): Observable<any> {
        return this.http.post(`${this.base}/habits/complete/${id}`, {}, { headers: this.headers() });
    }

    letsGoHabit(id: string): Observable<any> {
        return this.http.post(`${this.base}/habits/lets-go/${id}`, {}, { headers: this.headers() });
    }

    abortHabit(id: string): Observable<any> {
        return this.http.post(`${this.base}/habits/abort/${id}`, {}, { headers: this.headers() });
    }

    getTags(): Observable<any> {
        return this.http.get(`${this.base}/habits-tasks/tags`, { headers: this.headers() });
    }

    createTag(name: string): Observable<any> {
        return this.http.post(`${this.base}/habits-tasks/tags`, { name }, { headers: this.headers() });
    }

    deleteTag(id: number): Observable<any> {
        return this.http.delete(`${this.base}/habits-tasks/tags/${id}`, { headers: this.headers() });
    }

    getHabitMonthlyCompletion(id: number, year: number, month: number): Observable<any> {
        return this.http.get(`${this.base}/habits/${id}/month?year=${year}&month=${month}`, { headers: this.headers() });
    }
}
