import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PetMessageApiService } from './pet-message-api.service';
import { AuthApi } from '../api/auth.api';

describe('Home overlay referral API contract', () => {
  let api: PetMessageApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthApi, useValue: { getToken: () => 'test-token' } }] });
    api = TestBed.inject(PetMessageApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('preserves structured referral fields returned by GET', () => {
    const data = { hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 'r-1', amount: 120,
      bothRewarded: true, message: '', relatedUser: { id: 9, name: 'Asha', username: 'asha', relationship: 'SELF', avatar: null } };
    api.getHomeOverlay().subscribe(result => expect(result).toEqual(data as any));
    const req = http.expectOne(req => req.url.endsWith('/pet-message/home/overlay'));
    expect(req.request.headers.get('X-Skip-Profile-Selector')).toBe('true');
    req.flush(data);
  });
  it('sends the referral type and encoded eventId, keeping a null body', () => {
    api.dismissHomeOverlay('REFERRAL_RECEIVED', 'r/1&2').subscribe();
    const req = http.expectOne(req => req.url.endsWith('/overlay/dismiss'));
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('type')).toBe('REFERRAL_RECEIVED');
    expect(req.request.params.get('eventId')).toBe('r/1&2');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('X-Skip-Profile-Selector')).toBe('true');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });
  it('rejects missing referral eventId without sending a request', () => {
    let failed = false;
    api.dismissHomeOverlay('REFERRAL_JOINED').subscribe({ error: () => failed = true });
    expect(failed).toBeTrue();
    http.expectNone(req => req.url.endsWith('/overlay/dismiss'));
  });
  it('preserves existing non-referral dismissal parameters and error handling', () => {
    for (const type of ['BONUS_COINS', 'DAILY_LOGIN', 'STREAK_MILESTONE', 'MOOD_PROMPT'] as const) {
      api.dismissHomeOverlay(type).subscribe(result => expect(result).toBeNull());
      const req = http.expectOne(req => req.params.get('type') === type);
      expect(req.request.params.keys()).toEqual(['type']);
      req.flush({}, { status: 500, statusText: 'Error' });
    }
  });
  it('sends only type for strict BONUS_COINS dismissal and reports failure', () => {
    let failed = false;
    api.dismissHomeOverlay('BONUS_COINS', undefined, true).subscribe({ error: () => failed = true });
    const req = http.expectOne(request => request.url.endsWith('/overlay/dismiss'));
    expect(req.request.params.keys()).toEqual(['type']);
    expect(req.request.params.get('type')).toBe('BONUS_COINS');
    expect(req.request.params.has('eventId')).toBeFalse();
    expect(req.request.headers.get('X-Skip-Profile-Selector')).toBe('true');
    req.flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBeTrue();
  });
  it('propagates referral dismissal errors for retry', () => {
    let failed = false;
    api.dismissHomeOverlay('REFERRAL_JOINED', 1).subscribe({ error: () => failed = true });
    http.expectOne(req => req.params.get('eventId') === '1').flush({}, { status: 500, statusText: 'Error' });
    expect(failed).toBeTrue();
  });
});
