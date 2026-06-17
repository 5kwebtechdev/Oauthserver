import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface StreakLeaderboardUser {
    avatarName: string;
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
    avatarName: string;
    hasStreak: boolean;
}

export interface StreakLeaderboardResponse {
    currentUser: CurrentUserStreak;
    topUsers: StreakLeaderboardUser[];
    page: number;
    size: number;
    totalElements?: number;
    totalPages?: number;
    hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class StreaksService {
    private baseUrl = environment.apiUrl;
    readonly leaderboardPageSize = 50;

    constructor(private http: HttpClient, private authService: AuthService) { }

    getLeaderboard(page = 0, size = this.leaderboardPageSize): Observable<StreakLeaderboardResponse> {
        const userAge = this.authService.getCurrentUserAge();
        let params = new HttpParams()
            .set('page', String(Math.max(0, page)))
            .set('size', String(size || this.leaderboardPageSize));

        if (userAge != null) {
            params = params.set('age', String(userAge));
        }

        return this.http.get<StreakLeaderboardResponse>(`${this.baseUrl}/auth/leaderboard/streaks`, { params }).pipe(
            // normalize/validate response shape so callers don't need defensive guards
            map((res: any) => {
                const body = res?.data || res || {};
                const current = body.currentUser || body.current_user || {};
                const requestedPage = Math.max(0, page);
                const requestedSize = size || this.leaderboardPageSize;
                const currentUser: CurrentUserStreak = current ? {
                    petMessage: String(current.petMessage || ''),
                    currentStreak: Number(current.currentStreak || 0),
                    highestStreak: Number(current.highestStreak || 0),
                    streakDays: Number(current.streakDays || current.highestStreak || 0),
                    totalActiveDays: Number(current.totalActiveDays || 0),
                    rank: Number(current.rank || 0),
                    avatarName: String(current.avatarName || ''),
                    hasStreak: Boolean(current.hasStreak || false)
                } : { petMessage: '', currentStreak: 0, highestStreak: 0, streakDays: 0, totalActiveDays: 0, rank: 0, avatarName: '', hasStreak: false };

                const usersSource = body.topUsers || body.content || body.items || body.users || body.leaderboard || [];
                const topUsers: StreakLeaderboardUser[] = Array.isArray(usersSource) ? usersSource.map((u: any, index: number) => ({
                    avatarName: String(u.avatarName || ''),
                    // include rank if provided by API
                    rank: typeof u.rank !== 'undefined' ? Number(u.rank) : (requestedPage * requestedSize) + index + 1,
                    // support APIs that return `currentStreak` or `highestStreak`
                    highestStreak: Number(u.highestStreak ?? u.currentStreak ?? 0),
                    // keep any direct avatar URL if present
                    avatar: u.avatar ? String(u.avatar) : undefined,
                    // preserve avatarImageName (if API provides it) for callers that resolve avatars differently
                    // attach as a passthrough property on the object
                    ...(u.avatarImageName ? { avatarImageName: String(u.avatarImageName) } : {})
                })) : [];

                const pageInfo = body.page || body.pagination || {};
                const normalizedPage = Number(body.pageNumber ?? body.number ?? pageInfo.pageNumber ?? pageInfo.number ?? requestedPage);
                const normalizedSize = Number(body.pageSize ?? body.size ?? pageInfo.pageSize ?? pageInfo.size ?? requestedSize);
                const totalElementsRaw = body.totalElements ?? body.totalCount ?? pageInfo.totalElements ?? pageInfo.totalCount;
                const totalPagesRaw = body.totalPages ?? pageInfo.totalPages;
                const totalElements = totalElementsRaw != null ? Number(totalElementsRaw) : undefined;
                const totalPages = totalPagesRaw != null ? Number(totalPagesRaw) : undefined;
                const hasMore = typeof body.hasMore === 'boolean'
                    ? body.hasMore
                    : typeof body.last === 'boolean'
                        ? !body.last
                        : totalPages != null
                            ? normalizedPage + 1 < totalPages
                            : topUsers.length >= normalizedSize;

                return {
                    currentUser,
                    topUsers,
                    page: normalizedPage,
                    size: normalizedSize,
                    totalElements,
                    totalPages,
                    hasMore
                } as StreakLeaderboardResponse;
            }),
            catchError((error) => {
                console.error('Failed to fetch streaks leaderboard:', error);
                return throwError(() => error);
            })
        );
    }
}
