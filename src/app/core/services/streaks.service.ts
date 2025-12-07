import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { delay, catchError } from 'rxjs/operators';

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
        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
        }) : undefined;
        
        return this.http.get<StreakLeaderboardResponse>(`${this.baseUrl}/auth/leaderboard/streaks`, { headers }).pipe(
            catchError((error) => {
                console.warn('API call failed, using mock data instead:', error);
                const mockResponse: StreakLeaderboardResponse = {
                    currentUser: {
                        petMessage: "You're ranked #9, keep going champ!",
                        streakDays: 1,
                        rank: 9,
                        name: "You",
                        hasStreak: true
                    },
                    topUsers: [
                        { name: "Child001", highestStreak: 27 },
                        { name: "yashmeet", highestStreak: 2 },
                        { name: "John wick", highestStreak: 1 },
                        { name: "John wick", highestStreak: 1 },
                        { name: "Naveen Sindhiya", highestStreak: 1 },
                        { name: "Naveen", highestStreak: 1 },
                        { name: "dummy", highestStreak: 1 },
                        { name: "dummy3", highestStreak: 1 },
                        { name: "Yash", highestStreak: 1 },
                        { name: "Yash", highestStreak: 1 }
                    ]
                };
                
                return of(mockResponse).pipe(delay(500));
            })
        );
    }
}