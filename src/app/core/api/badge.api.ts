import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class BadgeApi {
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
     * Fetch badge progress from the backend.
     * Endpoint: GET {base}/badges/progress
     */
    getBadgeProgress(): Observable<any> {
        const url = `${this.base}/badges/progress`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Get the next pending badge popup (polling after badge-earning actions).
     * Endpoint: GET {base}/badges/popup/pending
     * Returns { showPopup, badgeId, level, title, badgeName, message, icon, pendingCount, primaryButton, secondaryButton }
     */
    getPendingBadgePopup(): Observable<any> {
        const url = `${this.base}/badges/popup/pending`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Get pending badge popups that were missed while offline (legacy endpoint).
     * Endpoint: GET {base}/badges/pending-popup
     */
    getPendingPopups(): Observable<any> {
        const url = `${this.base}/badges/pending-popup`;
        return this.http.get(url, { headers: this.headers() });
    }

    /**
     * Acknowledge a badge popup has been shown to the user.
     * Endpoint: POST {base}/badges/popup/{badgeId}/ack
     * @param badgeId The ID of the badge to acknowledge
     */
    acknowledgeBadgePopup(badgeId: number): Observable<any> {
        const url = `${this.base}/badges/popup/${badgeId}/ack`;
        return this.http.post(url, {}, { headers: this.headers() });
    }
}

