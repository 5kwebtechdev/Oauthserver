import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class FamilyService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient, private authService: AuthService) { }

    /**
     * Build HTTP headers using current user token or fallback to environment token
     */
    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
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

    createFamily(familyName: string): Observable<any> {
        const headers = this.getHeaders();
        return this.http.post(`${this.baseUrl}/family/create?familyName=${familyName}`, {}, { headers });
    }

    joinFamily(token: string): Observable<any> {
        const headers = this.getHeaders();
        return this.http.post(`${this.baseUrl}/family/join`, {
            token,
        }, { headers });
    }

    joinFamilyWithCode(familyCode: string, relationship: string): Observable<any> {
        const headers = this.getHeaders();
        return this.http.post(`${this.baseUrl}/family/join`, {
            familyCode,
            relationship
        }, { headers });
    }
}