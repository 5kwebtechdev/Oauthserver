import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

export interface StreakStatus {
  currentStreak: number;
  highestStreak: number;
  canRestore: boolean;
  missedDays: number;
  lastMissedStreakDate: string | null;
  restoreToStreak: number | null;
  restoreCost: number;
  coins: number;
}

export interface StreakRestoreResult {
  currentStreak?: number;
  highestStreak?: number;
  canRestore?: boolean;
  restoreToStreak?: number | null;
  restoreCost?: number;
  coins?: number;
  userCoins?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class StreakRestoreApi {
  private base = environment.apiUrl || '';

  constructor(private http: HttpClient, private authApi: AuthApi) {}

  private headers(): HttpHeaders {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', value);
    } else if (environment.apiAuthToken) {
      const envValue = environment.apiAuthToken.startsWith('Bearer ')
        ? environment.apiAuthToken
        : `Bearer ${environment.apiAuthToken}`;
      headers = headers.set('Authorization', envValue);
    }
    return headers;
  }

  getStreakStatus(userId: number): Observable<StreakStatus> {
    const params = new HttpParams().set('userId', String(userId));
    return this.http.get<StreakStatus>(`${this.base}/login-streak/status`, {
      headers: this.headers(),
      params
    });
  }

  postRestoreStreak(userId: number): Observable<StreakRestoreResult> {
    const params = new HttpParams().set('userId', String(userId));
    return this.http.post<StreakRestoreResult>(
      `${this.base}/login-streak/restore`,
      null,
      { headers: this.headers(), params }
    );
  }
}
