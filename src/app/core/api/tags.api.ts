import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

export interface TagOption {
    id: number;
    name: string;
    system: boolean;
    userId: number | null;
}

@Injectable({ providedIn: 'root' })
export class TagsApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authApi: AuthApi) {}

    private headers(): HttpHeaders {
        const token = this.authApi.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        } else if (environment.apiAuthToken) {
            const envValue = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envValue);
        }
        return headers;
    }

    getTags(): Observable<TagOption[]> {
        return this.http.get<TagOption[]>(`${this.base}/habits-tasks/tags`, { headers: this.headers() });
    }

    createTag(name: string): Observable<TagOption> {
        return this.http.post<TagOption>(`${this.base}/habits-tasks/tags`, { name }, { headers: this.headers() });
    }

    deleteTag(id: number): Observable<any> {
        return this.http.delete(`${this.base}/habits-tasks/tags/${id}`, { headers: this.headers() });
    }
}
