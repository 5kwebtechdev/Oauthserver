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
    currentStreak: number;
    highestStreak: number;
    streakDays: number;
    totalActiveDays: number;
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
                    currentStreak: Number(res.currentUser.currentStreak || 0),
                    highestStreak: Number(res.currentUser.highestStreak || 0),
                    streakDays: Number(res.currentUser.streakDays || res.currentUser.highestStreak || 0),
                    totalActiveDays: Number(res.currentUser.totalActiveDays || 0),
                    rank: Number(res.currentUser.rank || 0),
                    name: String(res.currentUser.name || ''),
                    hasStreak: Boolean(res.currentUser.hasStreak || false)
                } : { petMessage: '', currentStreak: 0, highestStreak: 0, streakDays: 0, totalActiveDays: 0, rank: 0, name: '', hasStreak: false };

                const topUsers: StreakLeaderboardUser[] = Array.isArray(res && res.topUsers) ? res.topUsers.map((u: any) => ({
                    name: String(u.name || ''),
                    // include rank if provided by API
                    rank: typeof u.rank !== 'undefined' ? Number(u.rank) : undefined,
                    // support APIs that return `currentStreak` or `highestStreak`
                    highestStreak: Number(u.highestStreak ?? u.currentStreak ?? 0),
                    // keep any direct avatar URL if present
                    avatar: u.avatar ? String(u.avatar) : undefined,
                    // preserve avatarImageName (if API provides it) for callers that resolve avatars differently
                    // attach as a passthrough property on the object
                    ...(u.avatarImageName ? { avatarImageName: String(u.avatarImageName) } : {})
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