import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class CalendarApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authApi: AuthApi) { }

    private headers(): HttpHeaders {
        const token = this.authApi.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    addCalendarEvent(payload: any): Observable<any> {
        const url = `${this.base}/api/calendar/events`;
        return this.http.post(url, payload, { headers: this.headers() });
    }

    getAllCalendarEvents(): Observable<any> {
        const url = `${this.base}/api/calendar/events`;
        return this.http.get(url, { headers: this.headers() });
    }

    getCalendarEventsByDate(date: string): Observable<any> {
        const url = `${this.base}/api/calendar/events?date=${date}`;
        return this.http.get(url, { headers: this.headers() });
    }

    updateCalendarEvent(eventId: string, payload: any): Observable<any> {
        const url = `${this.base}/api/calendar/events/${eventId}`;
        return this.http.put(url, payload, { headers: this.headers() });
    }

    deleteCalendarEvent(eventId: string): Observable<any> {
        const url = `${this.base}/api/calendar/events/${eventId}`;
        return this.http.delete(url, { headers: this.headers() });
    }
}