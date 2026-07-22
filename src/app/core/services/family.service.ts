import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
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

    /**
     * Resolve the current user's ID as robustly as possible. During the
     * post-signup family setup wizard, AuthService.getUserId() can return
     * null because hasValidSession() requires last_activity/user_id to
     * already be fully populated — which isn't guaranteed yet at this step.
     * Fall back to userData.id, a raw localStorage read, and finally decode
     * the JWT itself (it always carries `id`/`sub` and is always present
     * whenever a request can be authenticated at all).
     */
    private resolveUserId(headers?: HttpHeaders): number | null {
        let userData: any = null;
        let storedUserData: any = null;

        try { userData = this.authService.getUserData(); } catch (e) { /* ignore */ }
        try {
            const rawUserData = localStorage.getItem('user_data');
            storedUserData = rawUserData ? JSON.parse(rawUserData) : null;
        } catch (e) { /* ignore */ }

        const session = this.authService.getUserSession();
        const idCandidates = [
            this.authService.getUserId(),
            session?.userId,
            userData?.id,
            userData?.userId,
            userData?.user?.id,
            storedUserData?.id,
            storedUserData?.userId,
            storedUserData?.user?.id,
            this.readLocalStorage('user_id')
        ];

        for (const candidate of idCandidates) {
            const userId = this.normalizeUserId(candidate);
            if (userId !== null) return userId;
        }

        const tokenCandidates = [
            this.authService.getToken(),
            session?.token,
            this.readLocalStorage('auth_token'),
            headers?.get('Authorization')
        ];

        for (const token of tokenCandidates) {
            const userId = this.decodeUserIdFromToken(token || null);
            if (userId !== null) return userId;
        }

        return null;
    }

    private readLocalStorage(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    private normalizeUserId(value: unknown): number | null {
        const userId = Number(value);
        return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
    }

    private decodeUserIdFromToken(token: string | null): number | null {
        if (!token) return null;
        const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
        const parts = raw.split('.');
        if (parts.length < 2) return null;

        try {
            // JWT payload is base64url — normalize to standard base64 before decoding
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
            const json = decodeURIComponent(
                atob(padded).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
            );
            const claims = JSON.parse(json);
            const id = claims?.id ?? claims?.userId ?? claims?.sub;
            return this.normalizeUserId(id);
        } catch (e) {
            return null;
        }
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
        const userId = this.resolveUserId(headers);
        if (userId === null) {
            return throwError(() => ({
                status: 401,
                error: { message: 'Unable to identify the signed-in user. Please log in again.' }
            }));
        }

        const body = { ...payload, userId };
        return this.http.post(`${this.baseUrl}/family/convert-to-parent`, body, { headers });
    }

    /**
     * POST /family/convert-to-child — auth endpoint, user identified via the
     * Bearer token server-side. Body is just { familyCode }; do NOT add
     * userId here (unlike convert-to-parent, which is public and needs it
     * explicitly).
     */
    convertToChild(familyCode: string): Observable<any> {
        const headers = this.getHeaders();
        const body = { familyCode };
        return this.http.post(`${this.baseUrl}/family/convert-to-child`, body, { headers });
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
