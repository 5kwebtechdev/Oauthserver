import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private readonly base = `${APP_CONFIG.authIssuer}/api/auth/forgot-password`;

  constructor(private readonly http: HttpClient) {}

  requestReset(username: string, captchaToken?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/request`, { username, captchaToken });
  }

  resetPassword(username: string, otp: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/reset`, { username, otp, newPassword });
  }
}
