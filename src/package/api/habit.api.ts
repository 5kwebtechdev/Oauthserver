import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// Update the import path to match your project's structure
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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
        } else if (environment.apiAuthToken) {
            // fallback to environment token
            const envValue = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envValue);
        }
        return headers;
    }

    createHabit(payload: any): Observable<any> {
        const url = `${this.base}/habits/add`;
        return this.http.post(url, payload, { headers: this.headers() });
    }
}
