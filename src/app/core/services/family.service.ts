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

    getMyStatus(): Observable<any> {
        const headers = this.getHeaders();
        return this.http.get(`${this.baseUrl}/family/my-status`, { headers });
    }

    createFamily(familyName: string): Observable<any> {
        return this.convertToParent({ createFamily: true, familyName });
    }

    joinFamily(token: string): Observable<any> {
        return this.joinFamilyWithCode(token, 'child');
    }

    joinFamilyWithCode(familyCode: string, relationship: string): Observable<any> {
        const normalizedRelationship = (relationship || '').toString().toUpperCase();

        if (normalizedRelationship === 'PARENT') {
            return this.convertToParent({ createFamily: false, familyCode });
        }

        return this.convertToChild(familyCode);
    }

    convertToParent(payload: { createFamily: boolean; familyName?: string; familyCode?: string }): Observable<any> {
        const headers = this.getHeaders();
        return this.http.post(`${this.baseUrl}/family/convert-to-parent`, payload, { headers });
    }

    convertToChild(familyCode: string): Observable<any> {
        const headers = this.getHeaders();
        return this.http.post(`${this.baseUrl}/family/convert-to-child`, { familyCode }, { headers });
    }

    /**
     * Convert self account to parent account.
     * Kept for older callers; the backend now generates/returns the family code.
     */
    convertSelfToParent(_familyCode: string, familyName: string): Observable<any> {
        return this.convertToParent({ createFamily: true, familyName });
    }

    switchToFamilyMember(memberId: number): Observable<any> {
        const headers = this.getHeaders();
        return this.http.get(`${this.baseUrl}/family/switch/${memberId}`, { headers });
    }

    leaveFamily(): Observable<any> {
        const headers = this.getHeaders();
        return this.http.post(`${this.baseUrl}/family/leave`, {}, { headers, responseType: 'text' as 'json' });
    }

    /**
     * Check if a family code exists and is valid
     * GET /v1/family/check-family-code?familyCode=...
     */
    checkFamilyCode(familyCode: string): Observable<any> {
        const headers = this.getHeaders();
        return this.http.get(`${this.baseUrl}/family/check-family-code?familyCode=${encodeURIComponent(familyCode)}`, { headers });
    }
}
