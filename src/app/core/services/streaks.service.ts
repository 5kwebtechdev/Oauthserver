import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface StreakLeaderboardItem {
    name: string;
    highestStreak: number;
    avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class StreaksService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getLeaderboard(): Observable<StreakLeaderboardItem[]> {
        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
        }) : undefined;
        return this.http.get<StreakLeaderboardItem[]>(`${this.baseUrl}/auth/leaderboard/streaks`, { headers });
    }
}
