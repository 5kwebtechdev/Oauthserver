import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

export interface NoteTagDto {
    id: number;
    name: string;
    system: boolean;
    userId: number | null;
}

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

    private currentUserId(): number | string | null {
        const userId = this.authApi.getUserId();
        if (!userId) return null;
        const numeric = Number(userId);
        return Number.isFinite(numeric) ? numeric : userId;
    }

    private notePayload(payload: any, includeUserId: boolean): any {
        const body: any = {
            title: payload?.title || 'Untitled',
            content: payload?.content ?? payload?.text ?? ''
        };

        if (payload?.tagId != null && payload?.tagId !== '') {
            body.tagId = Number(payload.tagId);
        }

        if (includeUserId && payload?.userId == null) {
            const userId = this.currentUserId();
            if (userId != null) body.userId = userId;
        } else if (includeUserId && payload?.userId != null) {
            body.userId = payload.userId;
        }

        return body;
    }

    /**
     * Add a new note via backend
     * Endpoint expected: POST {base}/v1/notes/add (based on user's Postman screenshot)
     */
    addNote(payload: any): Observable<any> {
        const url = `${this.base}/notes/add`;
        return this.http.post(url, this.notePayload(payload, true), { headers: this.headers() });
    }

    /**
     * Fetch all notes from the backend.
     * Endpoint: GET {base}/notes/all?userId={userId}
     */
    getAll(): Observable<any> {
        const userId = this.currentUserId();
        const url = `${this.base}/notes/all`;
        const params: any = {};
        if (userId) params['userId'] = userId;
        return this.http.get(url, { headers: this.headers(), params });
    }

    getByTag(tagName: string): Observable<any> {
        const userId = this.currentUserId();
        const url = `${this.base}/notes/my/tag/${encodeURIComponent(tagName)}`;
        const params: any = {};
        if (userId) params['userId'] = userId;
        return this.http.get(url, { headers: this.headers(), params });
    }

    searchNotes(query: string): Observable<any> {
        const userId = this.currentUserId();
        const url = `${this.base}/notes/my/search`;
        const params: any = { query };
        if (userId) params['userId'] = userId;
        return this.http.get(url, { headers: this.headers(), params });
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
        return this.http.put(url, this.notePayload(payload, false), { headers: this.headers() });
    }

    getTags(): Observable<NoteTagDto[]> {
        const userId = this.currentUserId();
        const url = `${this.base}/notes/tags`;
        const params: any = {};
        if (userId) params['userId'] = userId;
        return this.http.get<NoteTagDto[]>(url, { headers: this.headers(), params });
    }

    createTag(name: string): Observable<NoteTagDto> {
        const url = `${this.base}/notes/tags`;
        return this.http.post<NoteTagDto>(url, { name }, { headers: this.headers() });
    }

    updateTag(tagId: any, name: string): Observable<NoteTagDto> {
        const url = `${this.base}/notes/tags/${tagId}`;
        return this.http.put<NoteTagDto>(url, { name }, { headers: this.headers() });
    }

    deleteTag(tagId: any): Observable<{ message?: string }> {
        const url = `${this.base}/notes/tags/${tagId}`;
        return this.http.delete<{ message?: string }>(url, { headers: this.headers() });
    }
}
