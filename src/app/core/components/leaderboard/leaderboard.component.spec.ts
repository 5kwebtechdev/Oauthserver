import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LeaderboardComponent } from './leaderboard.component';
import { CoinLeaderboardResponse, CoinLeaderboardService, CoinLeaderboardUser } from '../../services/coin-leaderboard.service';
import { AvatarService } from '../../services/avatar.service';

describe('LeaderboardComponent', () => {
  const entry = (userId: number, rank: number | null, displayName: string, coins: number): CoinLeaderboardUser =>
    ({ userId, rank, displayName, username: null, avatar: null, coins });
  const response: CoinLeaderboardResponse = {
    scope: 'GLOBAL', group: null, state: 'OK',
    content: [
      entry(1, 1, 'First', 100),
      entry(2, 2, 'Second', 90),
      entry(3, 3, 'Third', 80),
      entry(4, 4, 'Fourth', 70)
    ],
    currentUser: entry(99, 53, 'Me', 10),
    page: 0, size: 20, totalElements: 53, totalPages: 3, hasMore: true
  };

  function create(getLeaderboard = jasmine.createSpy('getLeaderboard').and.returnValue(of(response))) {
    const getGroups = jasmine.createSpy('getGroups').and.returnValue(of([]));
    const component = new LeaderboardComponent(
      { getLeaderboard, getGroups } as any,
      { getAvatarAsset: () => null, getFallbackAvatar: () => ({ value: 'assets/avatar/ChildAvatar.webp' }) } as any,
      { back: () => {} } as any
    );
    return { component, getLeaderboard, getGroups };
  }

  it('uses API ranks without re-sorting and keeps the current user separately', () => {
    const { component } = create();
    component.load();
    expect(component.podium.map(user => user.rank)).toEqual([1, 2, 3]);
    expect(component.rows.map(user => user.rank)).toEqual([4]);
    expect(component.result?.currentUser.rank).toBe(53);
  });

  it('keeps Group as a coming-soon view without requesting a group leaderboard', () => {
    const { component, getLeaderboard, getGroups } = create();
    component.load();
    component.selectScope('GROUP');
    expect(getLeaderboard).toHaveBeenCalledOnceWith('GLOBAL', 0, 10);
    expect(getGroups).not.toHaveBeenCalled();
    expect(component.result).toBeNull();
    expect(component.podium).toEqual([]);
  });

  it('distinguishes an unavailable endpoint from an empty leaderboard', () => {
    const getLeaderboard = jasmine.createSpy('getLeaderboard').and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    const { component } = create(getLeaderboard);
    component.load();
    expect(component.result).toBeNull();
    expect(component.error).toBe('unavailable');
  });

  it('shows a null rank as Unranked and resolves a missing avatar to the app default', () => {
    const { component } = create();
    component.load();
    expect(component.rankLabel(entry(99, null, 'Parent', 0))).toBe('Unranked');
    expect(component.avatarUrl(entry(99, null, 'Parent', 0))).toBe('assets/avatar/ChildAvatar.webp');
  });

  it('shows only ranks 4 to 10 below the podium and enables sharing only in the top 10', () => {
    const ranked = { ...response, content: [...response.content, entry(11, 11, 'Eleventh', 40)] };
    const getLeaderboard = jasmine.createSpy('getLeaderboard').and.returnValue(of(ranked));
    const { component } = create(getLeaderboard);
    component.load();
    expect(getLeaderboard).toHaveBeenCalledWith('GLOBAL', 0, 10);
    expect(component.rows.map(user => user.rank)).toEqual([4]);
    expect(component.currentUserInTopTen).toBeFalse();
    expect(component.showSeparateCurrentUser).toBeTrue();
    component.result = { ...ranked, currentUser: entry(4, 4, 'Fourth', 70) };
    expect(component.currentUserInTopTen).toBeTrue();
    expect(component.showSeparateCurrentUser).toBeFalse();
    component.result = { ...ranked, currentUser: entry(2, 2, 'Second', 90) };
    expect(component.currentUserInTopTen).toBeTrue();
    expect(component.showSeparateCurrentUser).toBeTrue();
  });

  it('discards a stale response after switching tabs', () => {
    const global = new Subject<CoinLeaderboardResponse>();
    const getLeaderboard = jasmine.createSpy('getLeaderboard').and.returnValue(global.asObservable());
    const { component } = create(getLeaderboard);
    component.load();
    component.selectScope('GROUP');
    global.next(response);
    expect(component.result).toBeNull();
  });

  it('keeps a 403 as an access error', () => {
    const getLeaderboard = jasmine.createSpy('getLeaderboard').and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );
    const { component } = create(getLeaderboard);
    component.load();
    expect(component.result).toBeNull();
    expect(component.error).toBe('access');
  });

  it('keeps the ranking layout inside common mobile widths', async () => {
    await TestBed.configureTestingModule({
      imports: [LeaderboardComponent],
      providers: [
        { provide: CoinLeaderboardService, useValue: { getLeaderboard: () => of(response) } },
        { provide: AvatarService, useValue: { getAvatarAsset: () => null, getFallbackAvatar: () => ({ value: 'assets/avatar/ChildAvatar.webp' }) } },
        { provide: Location, useValue: { back: () => {} } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(LeaderboardComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.share-rank__button')).toBeNull();
    expect(host.querySelector('.your-position')).not.toBeNull();
    fixture.componentInstance.result = { ...response, currentUser: entry(4, 4, 'Fourth', 70) };
    fixture.detectChanges();
    expect(host.querySelector('.share-rank__button')?.textContent).toContain('Share your rank');
    expect(host.querySelector('.your-position')).toBeNull();
    fixture.componentInstance.selectScope('GROUP');
    fixture.detectChanges();
    expect(host.querySelector('.group-coming-soon')?.textContent).toContain('coming soon');
    expect(host.querySelector('.ranking-list')).toBeNull();
    fixture.componentInstance.selectScope('GLOBAL');
    fixture.detectChanges();
    for (const width of [360, 375, 390, 414]) {
      host.style.display = 'block';
      host.style.width = `${width}px`;
      fixture.detectChanges();
      const page = host.querySelector('.leaderboard-page') as HTMLElement;
      expect(page.scrollWidth).withContext(`${width}px viewport`).toBeLessThanOrEqual(page.clientWidth + 1);
    }
  });
});
