import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';
import { StreakCalendarResponse, StreakRestoreApi } from './streak-restore.api';

describe('StreakRestoreApi monthly calendar', () => {
  let api: StreakRestoreApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StreakRestoreApi, { provide: AuthApi, useValue: { getToken: () => 'test-jwt' } }]
    });
    api = TestBed.inject(StreakRestoreApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the selected month using the user token, without a userId', () => {
    const response: StreakCalendarResponse = {
      year: 2026, month: 10, timezone: 'Asia/Kolkata',
      days: [{ date: '2026-10-01', status: 'STREAK' }]
    };
    let actual: StreakCalendarResponse | undefined;
    api.getStreakCalendar(2026, 10).subscribe(value => { actual = value; });

    const request = http.expectOne(req => req.url === `${environment.apiUrl}/login-streak/calendar`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.get('month')).toBe('10');
    expect(request.request.params.has('userId')).toBeFalse();
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    request.flush(response);
    expect(actual).toEqual(response);
  });
});
