import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map } from 'rxjs/operators';

export interface StreakLeaderboardUser {
    name: string;
    highestStreak: number;
    avatar?: string;
}

export interface CurrentUserStreak {
    petMessage: string;
    streakDays: number;
    rank: number;
    name: string;
    hasStreak: boolean;
}

export interface StreakLeaderboardResponse {
    currentUser: CurrentUserStreak;
    topUsers: StreakLeaderboardUser[];
}

@Injectable({ providedIn: 'root' })
export class StreaksService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getLeaderboard(): Observable<StreakLeaderboardResponse> {
        return this.http.get<StreakLeaderboardResponse>(`${this.baseUrl}/auth/leaderboard/streaks`).pipe(
            // normalize/validate response shape so callers don't need defensive guards
            map((res: any) => {
                const currentUser: CurrentUserStreak = res && res.currentUser ? {
                    petMessage: String(res.currentUser.petMessage || ''),
                    streakDays: Number(res.currentUser.streakDays || 0),
                    rank: Number(res.currentUser.rank || 0),
                    name: String(res.currentUser.name || ''),
                    hasStreak: Boolean(res.currentUser.hasStreak || false)
                } : { petMessage: '', streakDays: 0, rank: 0, name: '', hasStreak: false };

                const topUsers: StreakLeaderboardUser[] = Array.isArray(res && res.topUsers) ? res.topUsers.map((u: any) => ({
                    name: String(u.name || ''),
                    highestStreak: Number(u.highestStreak || 0),
                    avatar: u.avatar ? String(u.avatar) : undefined
                })) : [];

                return { currentUser, topUsers } as StreakLeaderboardResponse;
            }),
            catchError((error) => {
                console.error('Failed to fetch streaks leaderboard:', error);
                return throwError(() => error);
            })
        );
    }
}