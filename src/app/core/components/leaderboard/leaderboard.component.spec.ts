import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LeaderboardComponent } from './leaderboard.component';
import { CoinLeaderboardResponse, CoinLeaderboardService, CoinLeaderboardUser } from '../../services/coin-leaderboard.service';
import { AvatarService } from '../../services/avatar.service';
import { LeaderboardRankShareService } from '../../services/leaderboard-rank-share.service';

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
      { getLeaderboardAvatar: () => null, getFallbackAvatar: () => ({ value: 'assets/avatar/ChildAvatar.webp' }) } as any,
      { back: () => {} } as any,
      { share: jasmine.createSpy('share').and.resolveTo(), copyMessage: jasmine.createSpy('copyMessage').and.resolveTo(true), shareInBrowser: jasmine.createSpy('shareInBrowser').and.resolveTo(true) } as any
    );
    return { component, getLeaderboard, getGroups };
  }

  it('opens one share sheet for repeated taps and releases the busy state', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 1, 'Me', 100) };
    let finish!: () => void;
    const share = (component as any).rankShare.share as jasmine.Spy;
    share.and.returnValue(new Promise<void>(resolve => finish = resolve));
    const pending = component.shareRank();
    await component.shareRank();
    expect(share).toHaveBeenCalledTimes(1);
    expect(component.sharingRank).toBeTrue();
    finish();
    await pending;
    expect(component.sharingRank).toBeFalse();
  });

  it('does not block download or a new attempt on pending clipboard permission', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 4, 'Me', 100) };
    const service = (component as any).rankShare;
    const fallback = { file: new File(['png'], 'card.png'), text: 'Real code', canShare: false };
    service.share.and.resolveTo(fallback);
    spyOn(HTMLAnchorElement.prototype, 'click');
    let finishCopy!: (value: boolean) => void;
    service.copyMessage.and.returnValue(new Promise<boolean>(resolve => finishCopy = resolve));
    await component.shareRank();
    expect(component.sharingRank).toBeFalse();
    expect(component.browserShare).toBe(fallback);
    let finishShare!: () => void;
    service.share.and.returnValue(new Promise<void>(resolve => finishShare = resolve));
    const secondAttempt = component.shareRank();
    finishCopy(true);
    await Promise.resolve();
    expect(component.sharingRank).toBeTrue();
    finishShare();
    await secondAttempt;
    expect(component.sharingRank).toBeFalse();
  });

  it('treats native cancellation as a normal dismissal', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 3, 'Me', 100) };
    (component as any).rankShare.share.and.rejectWith(new Error('Share canceled'));
    await component.shareRank();
    expect(component.shareFeedback).toBe('');
    expect(component.sharingRank).toBeFalse();
  });

  it('shows a sharing failure and allows another attempt', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 4, 'Me', 100) };
    (component as any).rankShare.share.and.rejectWith(new Error('Unable to load your referral code'));
    await component.shareRank();
    expect(component.shareFeedback).toBe('Unable to load your referral code');
    expect(component.sharingRank).toBeFalse();
  });

  it('downloads the card and copies the complete message on unsupported browsers', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 5, 'Me', 100) };
    const fallback = { file: new File(['original-artwork'], 'SuperMeApp-rank-5.png', { type: 'image/png' }), text: 'Full message with REALCODE', canShare: false };
    const service = (component as any).rankShare;
    service.share.and.resolveTo(fallback);
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    await component.shareRank();
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.calls.mostRecent().object as HTMLAnchorElement;
    expect(anchor.download).toBe('SuperMeApp-rank-5.png');
    expect(anchor.href).toBe(component.browserShareUrl!);
    expect(service.copyMessage).toHaveBeenCalledOnceWith(fallback.text);
    expect(component.shareFeedback).toContain('message copied');
    expect(component.browserShare).toBe(fallback);
    const revoke = spyOn(URL, 'revokeObjectURL');
    component.ionViewWillLeave();
    expect(revoke).toHaveBeenCalledOnceWith(anchor.href);
    expect(component.browserShare).toBeNull();
  });

  it('provides manual-copy instructions when clipboard access is denied', async () => {
    const { component } = create();
    component.browserShare = { file: new File(['png'], 'card.png'), text: 'Actual referral message', canShare: false };
    (component as any).rankShare.copyMessage.and.resolveTo(false);
    await component.copyRankMessage();
    expect(component.shareFeedback).toContain('copy the message manually');
  });

  it('keeps a new click available if the download outlasts share activation', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 1, 'Me', 100) };
    const fallback = { file: new File(['png'], 'rank-1.png'), text: 'Actual referral message', canShare: true };
    (component as any).rankShare.share.and.resolveTo(fallback);
    const download = spyOn(component, 'downloadRankImage');
    await component.shareRank();
    expect(download).not.toHaveBeenCalled();
    await component.sharePreparedImage();
    expect((component as any).rankShare.shareInBrowser).toHaveBeenCalledOnceWith(fallback.file, fallback.text);
    expect(component.shareFeedback).toContain('was shared');
    component.ngOnDestroy();
  });

  it('recognizes browser cancellation even without an error message', async () => {
    const { component } = create();
    component.result = { ...response, currentUser: entry(99, 1, 'Me', 100) };
    (component as any).rankShare.share.and.rejectWith(new DOMException('', 'AbortError'));
    await component.shareRank();
    expect(component.shareFeedback).toBe('');
    expect(component.browserShare).toBeNull();
  });

  it('keeps the API rank and appends an outside-top-10 user after the top rows', () => {
    const { component } = create();
    component.load();
    expect(component.podium.map(user => user.rank)).toEqual([1, 2, 3]);
    expect(component.rows.map(user => user.rank)).toEqual([4, 53]);
    expect(component.rows[1]).toEqual(response.currentUser);
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
    expect(component.rows.map(user => user.rank)).toEqual([4, 53]);
    expect(component.currentUserInTopTen).toBeFalse();
    component.result = { ...ranked, currentUser: entry(4, 4, 'Fourth', 70) };
    expect(component.currentUserInTopTen).toBeTrue();
    expect(component.rows.map(user => user.rank)).toEqual([4]);
    component.result = { ...ranked, currentUser: entry(2, 2, 'Second', 90) };
    expect(component.currentUserInTopTen).toBeTrue();
    expect(component.rows.map(user => user.rank)).toEqual([4]);
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
        { provide: LeaderboardRankShareService, useValue: { share: jasmine.createSpy('share').and.resolveTo() } },
        { provide: CoinLeaderboardService, useValue: { getLeaderboard: () => of(response) } },
        { provide: AvatarService, useValue: { getLeaderboardAvatar: () => null, getFallbackAvatar: () => ({ value: 'assets/avatar/ChildAvatar.webp' }) } },
        { provide: Location, useValue: { back: () => {} } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(LeaderboardComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.share-rank__button')).toBeNull();
    const appended = host.querySelector('.ranking-list .ranking-row:last-child') as HTMLElement;
    expect(appended.classList.contains('ranking-row--you')).toBeTrue();
    expect(appended.querySelector('.ranking-rank')?.textContent?.trim()).toBe('53');
    expect(appended.querySelector('.ranking-person strong')?.textContent?.trim()).toBe('Me');
    expect(appended.querySelector('.ranking-coins')?.textContent?.trim()).toBe('10');
    expect(host.querySelectorAll('.ranking-row--you').length).toBe(1);
    fixture.componentInstance.result = { ...response, currentUser: entry(4, 4, 'Fourth', 70) };
    fixture.detectChanges();
    expect(host.querySelector('.share-rank__button')?.textContent).toContain('Share your rank');
    expect(host.querySelectorAll('.share-rank__button').length).toBe(1);
    expect(host.querySelector('.leaderboard-hero .hero-toolbar .share-rank__button')).not.toBeNull();
    expect(host.querySelector('.leaderboard-body .share-rank__button')).toBeNull();
    expect(host.querySelectorAll('.ranking-row--you').length).toBe(1);
    fixture.componentInstance.result = { ...response, currentUser: entry(2, 2, 'Second', 90) };
    fixture.detectChanges();
    expect(host.querySelectorAll('.ranking-row--you').length).toBe(0);
    expect(host.querySelectorAll('.podium-entry--you').length).toBe(1);
    fixture.componentInstance.selectScope('GROUP');
    fixture.detectChanges();
    expect(host.querySelector('.group-coming-soon')?.textContent).toContain('coming soon');
    expect(host.querySelector('.ranking-list')).toBeNull();
    fixture.componentInstance.selectScope('GLOBAL');
    fixture.componentInstance.result = {
      ...response,
      currentUser: entry(99, 53, 'A very long leaderboard username that must truncate', 123456)
    };
    fixture.detectChanges();
    for (const width of [360, 375, 390, 414]) {
      host.style.display = 'block';
      host.style.width = `${width}px`;
      fixture.detectChanges();
      const page = host.querySelector('.leaderboard-page') as HTMLElement;
      expect(page.scrollWidth).withContext(`${width}px viewport`).toBeLessThanOrEqual(page.clientWidth + 1);
      fixture.componentInstance.result = { ...response, currentUser: entry(4, 4, 'Fourth', 70) };
      fixture.detectChanges();
      const toolbar = host.querySelector('.hero-toolbar') as HTMLElement;
      expect(toolbar.querySelector('.back-button')).not.toBeNull();
      expect(toolbar.querySelector('.share-rank__button')).not.toBeNull();
      expect(host.querySelectorAll('.share-rank__button').length).toBe(1);
    }
  });
});
