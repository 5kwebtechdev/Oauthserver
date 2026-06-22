import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

export interface StreakStatus {
  currentStreak: number;
  highestStreak: number;
  canRestoreStreak: boolean;
  restoreDeadline: string | null;
  restoreToStreak: number | null;
  restoreCost: number;
}

export interface EligibleItem {
  id: number;
  name: string;
  type: 'HABIT' | 'TASK';
}

export interface StreakRestoreEligibility {
  canRestore: boolean;
  missedDate: string | null;
  restoreCost: number;
  userCoins: number;
  eligibleItems: EligibleItem[];
}

export interface StreakRestoreResult {
  canRestore: boolean;
  missedDate: string | null;
  restoreCost: number;
  userCoins: number;
  eligibleItems: EligibleItem[];
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

  getStreakStatus(): Observable<StreakStatus> {
    return this.http.get<StreakStatus>(`${this.base}/auth/streak-status`, { headers: this.headers() });
  }

  getRestoreEligibility(): Observable<StreakRestoreEligibility> {
    return this.http.get<StreakRestoreEligibility>(`${this.base}/auth/streak-restore/eligible`, { headers: this.headers() });
  }

  postRestoreStreak(itemId: number, itemType: 'HABIT' | 'TASK'): Observable<StreakRestoreResult> {
    return this.http.post<StreakRestoreResult>(
      `${this.base}/auth/restore-streak`,
      { itemId, itemType },
      { headers: this.headers() }
    );
  }
}
