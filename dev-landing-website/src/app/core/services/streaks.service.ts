import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StreaksApi } from '../api/streaks.api';

// ========== INTERFACES ==========

export interface StreakLeaderboardUser {
    name: string;
    currentStreak: number;
    avatar?: string;
    avatarImageName?: string;
    avatarName?: string;
}

export interface CurrentUserStreak {
    petMessage: string;
    currentStreak: number;
    highestStreak: number;
    totalActiveDays: number;
    rank: number;
    name: string;
    hasStreak: boolean;
    avatarImageName?: string;
    avatarName?: string;
}

export interface StreakLeaderboardResponse {
    currentUser: CurrentUserStreak;
    topUsers: StreakLeaderboardUser[];
}

// ========== SERVICE ==========

@Injectable({ providedIn: 'root' })
export class StreaksService {
    constructor(private streaksApi: StreaksApi) { }

    /**
     * Get streak leaderboard data
     */
    getLeaderboard(): Observable<StreakLeaderboardResponse> {
        return this.streaksApi.getLeaderboard().pipe(
            // normalize/validate response shape so callers don't need defensive guards
            map((res: any) => {
                const currentUser: CurrentUserStreak = res && res.currentUser ? {
                    petMessage: String(res.currentUser.petMessage || ''),
                    currentStreak: Number(res.currentUser.currentStreak || 0),
                    highestStreak: Number(res.currentUser.highestStreak || 0),
                    totalActiveDays: Number(res.currentUser.totalActiveDays || 0),
                    rank: Number(res.currentUser.rank || 0),
                    name: String(res.currentUser.name || ''),
                    hasStreak: Boolean(res.currentUser.hasStreak || false),
                    avatarImageName: res.currentUser.avatarImageName,
                    avatarName: res.currentUser.avatarName ? String(res.currentUser.avatarName) : undefined
                } : { petMessage: '', currentStreak: 0, highestStreak: 0, totalActiveDays: 0, rank: 0, name: '', hasStreak: false };

                const topUsers: StreakLeaderboardUser[] = Array.isArray(res && res.topUsers)
                    ? res.topUsers.map((u: any) => ({
                        name: String(u.name || ''),
                        currentStreak: Number(u.currentStreak || 0),
                        avatar: u.avatar ? String(u.avatar) : undefined,
                        avatarImageName: u.avatarImageName,
                        avatarName: u.avatarName ? String(u.avatarName) : (u.name ? String(u.name) : undefined)
                    }))
                    : [];

                return { currentUser, topUsers } as StreakLeaderboardResponse;
            }),
            catchError((error) => {
                console.error('Failed to fetch streaks leaderboard:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Sort and rank streakers by highest streak
     */
    sortAndRankStreakers(streakers: StreakLeaderboardUser[]): StreakLeaderboardUser[] {
        return [...streakers].sort((a, b) => b.currentStreak - a.currentStreak);
    }

    /**
     * Format days for display
     */
    formatDays(days: number): string {
        return `${days} day${days === 1 ? '' : 's'}`;
    }
}
