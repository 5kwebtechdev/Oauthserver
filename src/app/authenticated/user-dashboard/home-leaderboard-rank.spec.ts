import { Subject } from 'rxjs';
import { CoinLeaderboardResponse } from '../../core/services/coin-leaderboard.service';
import { UserDashboardComponent } from './user-dashboard.component';

describe('Home leaderboard rank binding', () => {
  it('uses the current user rank from the leaderboard response and updates on refresh', () => {
    const requests: Subject<CoinLeaderboardResponse>[] = [];
    const getLeaderboard = jasmine.createSpy('getLeaderboard').and.callFake(() => {
      const request = new Subject<CoinLeaderboardResponse>();
      requests.push(request);
      return request.asObservable();
    });
    const home = Object.create(UserDashboardComponent.prototype) as UserDashboardComponent;
    (home as any).destroy$ = new Subject<void>();
    (home as any).homeLeaderboardUserId = '42';
    (home as any).homeLeaderboardRequestId = 0;
    (home as any).authService = { isParentUser: () => false };
    (home as any).coinLeaderboard = { getLeaderboard };

    (home as any).loadHomeLeaderboardRank();
    expect(getLeaderboard).toHaveBeenCalledWith('GLOBAL', 0, 1);
    requests[0].next({ currentUser: { rank: 35 } } as CoinLeaderboardResponse);
    expect(home.homeLeaderboardRank).toBe(35);

    (home as any).loadHomeLeaderboardRank();
    requests[1].next({ currentUser: { rank: 250 } } as CoinLeaderboardResponse);
    expect(home.homeLeaderboardRank).toBe(250);

    (home as any).loadHomeLeaderboardRank();
    requests[2].next({ currentUser: { rank: null } } as CoinLeaderboardResponse);
    expect(home.homeLeaderboardRank).toBeNull();
  });

  it('does not request a rank for Parent', () => {
    const getLeaderboard = jasmine.createSpy('getLeaderboard');
    const home = Object.create(UserDashboardComponent.prototype) as UserDashboardComponent;
    (home as any).homeLeaderboardUserId = '42';
    (home as any).homeLeaderboardRequestId = 0;
    (home as any).authService = { isParentUser: () => true };
    (home as any).coinLeaderboard = { getLeaderboard };
    (home as any).loadHomeLeaderboardRank();
    expect(getLeaderboard).not.toHaveBeenCalled();
  });
});
