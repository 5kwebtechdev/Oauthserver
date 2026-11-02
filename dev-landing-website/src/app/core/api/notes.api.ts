import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotesApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient) { }

    private headers(): HttpHeaders {
        // Try localStorage first, then environment token
        const token = localStorage.getItem('auth_token') || environment.apiAuthToken;
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    addNote(payload: any): Observable<any> {
        const url = `${this.base}/notes/add`;
        console.log('[NotesApi] POST', url, payload);
        return this.http.post(url, payload, { headers: this.headers() }).pipe(
            tap((res) => console.log('[NotesApi] addNote response:', res))
        );
    }

    getAll(): Observable<any> {
        const url = `${this.base}/notes/all`;
        console.log('[NotesApi] GET', url);
        return this.http.get(url, { headers: this.headers() }).pipe(
            tap((res) => console.log('[NotesApi] getAll response:', res))
        );
    }

    updateNote(id: any, payload: any): Observable<any> {
        const url = `${this.base}/notes/update/${id}`;
        console.log('[NotesApi] PUT', url, payload);
        return this.http.put(url, payload, { headers: this.headers() }).pipe(
            tap((res) => console.log('[NotesApi] updateNote response:', res))
        );
    }

    deleteNote(id: any): Observable<any> {
        const url = `${this.base}/notes/delete/${id}`;
        console.log('[NotesApi] DELETE', url);
        return this.http.delete(url, { headers: this.headers() }).pipe(
            tap((res) => console.log('[NotesApi] deleteNote response:', res))
        );
    }
}
