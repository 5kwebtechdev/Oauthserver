import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { CoinLeaderboardService } from './coin-leaderboard.service';

describe('CoinLeaderboardService', () => {
  let service: CoinLeaderboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CoinLeaderboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests global ranks without a group ID or user ID', () => {
    service.getLeaderboard('GLOBAL').subscribe();
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/leaderboard/coins`);
    expect(request.request.params.get('scope')).toBe('GLOBAL');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('groupId')).toBeFalse();
    expect(request.request.params.has('userId')).toBeFalse();
    request.flush({});
  });

  it('sends an explicitly selected authorized group only for GROUP', () => {
    service.getLeaderboard('GROUP', 2, 20, 7).subscribe();
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/leaderboard/coins`);
    expect(request.request.params.get('scope')).toBe('GROUP');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('groupId')).toBe('7');
    request.flush({});
  });

  it('loads families from the authenticated groups endpoint', () => {
    service.getGroups().subscribe(groups => expect(groups).toEqual([{ id: 7, name: 'Family' }]));
    http.expectOne(`${environment.apiUrl}/leaderboard/coins/groups`)
      .flush([{ id: 7, name: 'Family' }]);
  });
});
