import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApi {
    /**
     * Get authentication token with priority:
     * 1. Token from localStorage (set after successful login)
     * 2. Fallback to environment.apiAuthToken
     */
    getToken(): string | null {
        // First, try to get the token from localStorage (user logged in)
        const userToken = localStorage.getItem('auth_token');
        if (userToken) {
            return userToken;
        }

        // Fallback to environment token if no user token is found
        return environment.apiAuthToken || null;
    }

    getUserId(): string | null {
        return localStorage.getItem('user_id');
    }
}
