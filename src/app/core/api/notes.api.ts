import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class NotesApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authApi: AuthApi) { }

    private headers(): HttpHeaders {
        const token = this.authApi.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
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
     * Add a new note via backend
     * Endpoint expected: POST {base}/v1/notes/add (based on user's Postman screenshot)
     */
    addNote(payload: any): Observable<any> {
        const url = `${this.base}/notes/add`;
        return this.http.post(url, payload, { headers: this.headers() });
    }

    /**
     * Fetch all notes from the backend.
     * Expected endpoint: GET {base}/notes/all
     */
    getAll(): Observable<any> {
        const url = `${this.base}/notes/all`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Delete a note by id. Expected endpoint: DELETE {base}/notes/delete/{id}
     */
    deleteNote(id: any): Observable<any> {
        const url = `${this.base}/notes/delete/${id}`;
        return this.http.delete(url, { headers: this.headers() });
    }

    /**
     * Update an existing note by id. Endpoint: PUT {base}/notes/update/{id}
     */
    updateNote(id: any, payload: any): Observable<any> {
        const url = `${this.base}/notes/update/${id}`;
        return this.http.put(url, payload, { headers: this.headers() });
    }
}
