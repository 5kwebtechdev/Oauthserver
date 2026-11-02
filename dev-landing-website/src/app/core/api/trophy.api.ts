import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class TrophyApi {
    private readonly base = environment.apiUrl || '';

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

    /**
     * Get user's trophies
     * @returns Observable with trophies data
     */
    getMyTrophies(): Observable<any> {
        const url = `${this.base}/trophies/my-trophies`;
        return this.http.get(url, { headers: this.headers() });
    }
}
