import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpHeaders } from '@angular/common/http';

export interface LoginCredentials {
    email?: string;
    phone?: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    userId: number;
    // Add other fields as needed
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    login(credentials: LoginCredentials): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
            .pipe(
                tap(response => {
                    // Store the token in localStorage for future API requests
                    if (response && response.token) {
                        localStorage.setItem('auth_token', response.token);
                        localStorage.setItem('user_id', response.userId.toString());
                    }
                })
            );
    }

    /**
     * Request a forgot-password OTP for an identifier (email or phone).
     * Payload: { identifier: string }
     */
    requestOtp(identifier: string) {
        // If an API auth token is configured in environment, include it in headers
        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
            'Content-Type': 'application/json'
        }) : undefined;

        const url = `${this.apiUrl}/auth/forgot-password/request-otp`;

        // The endpoint returns plain text (e.g. 'OTP sent to your registered email/phone.').
        // Configure HttpClient to expect a text response to avoid JSON parse errors.
        const options: any = {
            responseType: 'text'
        };

        if (headers) {
            options.headers = headers;
        }

        return this.http.post<string>(url, { identifier }, options);
    }

    /**
     * Verify the OTP for a given identifier (email or phone).
     * Payload: { identifier: string, otp: string }
     * Returns plain text message from server.
     */
    verifyOtp(identifier: string, otp: string) {
        const url = `${this.apiUrl}/auth/forgot-password/verify-otp`;

        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
            'Content-Type': 'application/json'
        }) : undefined;

        const options: any = {
            responseType: 'text'
        };

        if (headers) {
            options.headers = headers;
        }

        return this.http.post<string>(url, { identifier, otp }, options);
    }

    /**
     * Reset the user's password after OTP verification.
     * Payload: { identifier: string, newPassword: string, confirmPassword: string }
     * Returns plain text message from server.
     */
    resetPassword(identifier: string, newPassword: string, confirmPassword: string) {
        const url = `${this.apiUrl}/auth/forgot-password/reset`;

        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
            'Content-Type': 'application/json'
        }) : undefined;

        const options: any = {
            responseType: 'text'
        };

        if (headers) {
            options.headers = headers;
        }

        return this.http.post<string>(url, { identifier, newPassword, confirmPassword }, options);
    }

    /**
     * Register a new user.
     * Expects payload with name, gender, relationship, email, phone, dateOfBirth (ms), password
     */
    register(payload: any) {
        const url = `${this.apiUrl}/auth/register`;
        // default JSON response
        return this.http.post<any>(url, payload);
    }

    /**
     * Edit user profile.
     * Payload: { avatarName: string, name: string, dateOfBirth: string, gender: string, phone: string, email: string }
     */
    editProfile(payload: EditProfilePayload): Observable<EditProfileResponse> {
        const url = `${this.apiUrl}/auth/edit-profile`;

        // Use the user's authentication token from localStorage
        const userToken = this.getToken();

        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        });

        return this.http.put<EditProfileResponse>(url, payload, { headers });
    }

    logout(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('auth_token');
    }

    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    getUserId(): string | null {
        return localStorage.getItem('user_id');
    }
}

export interface EditProfilePayload {
    avatarName?: string;
    name: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email: string;
}

export interface Avatar {
    id: number;
    avatarName: string;
    gender: string | null;
    url: string;
}

export interface Pet {
    id: number;
    petName: string;
    gender: string | null;
    url: string;
}

export interface EditProfileResponse {
    id: number;
    name: string;
    email: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    relationship: string;
    role: string;
    enabled: boolean;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    lastLoginDate: string;
    createdDateTime: string;
    referralCode: string | null;
    coins: number;
    currentStreak: number;
    highestStreak: number;
    age: number;
    ageGroup: string;
    avatar: Avatar;
    pet: Pet;
    coinHistory: any[];
    rewards: any[];
    badges: any[];
    loggedIn: boolean;
    usingEmail: boolean;
    usingPhone: boolean;
}
