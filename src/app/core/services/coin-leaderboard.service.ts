import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type CoinLeaderboardScope = 'GLOBAL' | 'GROUP';

export interface CoinLeaderboardUser {
  userId: number;
  rank: number | null;
  displayName: string;
  username: string | null;
  avatar?: string | null;
  coins: number;
}

export interface CoinLeaderboardResponse {
  scope: CoinLeaderboardScope;
  group: CoinLeaderboardGroup | null;
  content: CoinLeaderboardUser[];
  currentUser: CoinLeaderboardUser;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
  state: 'OK' | 'EMPTY' | 'NO_GROUP';
}

export interface CoinLeaderboardGroup { id: number; name: string; }

@Injectable({ providedIn: 'root' })
export class CoinLeaderboardService {
  private readonly url = `${environment.apiUrl}/leaderboard/coins`;

  constructor(private readonly http: HttpClient) {}

  getLeaderboard(scope: CoinLeaderboardScope, page = 0, size = 20, groupId?: number): Observable<CoinLeaderboardResponse> {
    let params = new HttpParams()
      .set('scope', scope)
      .set('page', String(page))
      .set('size', String(size));
    if (scope === 'GROUP' && groupId != null) params = params.set('groupId', String(groupId));
    return this.http.get<CoinLeaderboardResponse>(this.url, { params });
  }

  getGroups(): Observable<CoinLeaderboardGroup[]> {
    return this.http.get<CoinLeaderboardGroup[]>(`${this.url}/groups`);
  }
}
