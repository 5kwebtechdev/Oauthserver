import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { CoinApi } from '../api/coin.api';
import { AuthApi } from '../api/auth.api';
import { ProfileSelectorInterceptor } from '../interceptors/profile-selector.interceptor';
import { ProfileSelectorService } from './profile-selector-service';
import { CoinService } from './coin.service';

describe('Parent wallet request ownership', () => {
  let http: HttpTestingController;
  let api: CoinApi;
  let auth: { getUserId: jasmine.Spy; getToken: jasmine.Spy };
  beforeEach(() => {
    auth = { getUserId: jasmine.createSpy().and.returnValue('394'), getToken: jasmine.createSpy().and.returnValue('test-token') };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CoinApi, { provide: AuthApi, useValue: auth },
        { provide: ProfileSelectorService, useValue: {
          child$: new BehaviorSubject(123), getSelectedChild: () => ({ id: 123, age: 10 })
        } },
        { provide: HTTP_INTERCEPTORS, useClass: ProfileSelectorInterceptor, multi: true }]
    });
    api = TestBed.inject(CoinApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends the parent ID without the selected child age', () => {
    api.getCoinHistory(true).subscribe();
    const request = http.expectOne(req => req.url.endsWith('/coins/history'));
    expect(request.request.params.get('forUserId')).toBe('394');
    expect(request.request.params.has('age')).toBeFalse();
    expect(request.request.headers.has('X-Skip-Profile-Selector')).toBeFalse();
    request.flush({ totalCoins: 655, history: [] });
  });

  it('retains selected-child context for existing child-scoped callers', () => {
    api.getCoinHistory().subscribe();
    const request = http.expectOne(req => req.url.endsWith('/coins/history'));
    expect(request.request.params.get('forUserId')).toBe('123');
    expect(request.request.params.get('age')).toBe('10');
    request.flush({ totalCoins: 2000, history: [] });
  });

  it('falls back to token identity, never a child, if the local account ID is missing', () => {
    auth.getUserId.and.returnValue(null);
    api.getCoinHistory(true).subscribe();
    const request = http.expectOne(req => req.url.endsWith('/coins/history'));
    expect(request.request.params.has('forUserId')).toBeFalse();
    expect(request.request.params.has('age')).toBeFalse();
    request.flush({ totalCoins: 655, history: [] });
  });
});

describe('Parent wallet balance synchronization', () => {
  let auth: any;
  let api: any;
  let service: CoinService;
  beforeEach(() => {
    auth = { getUserId: jasmine.createSpy().and.returnValue('394'), updateUserData: jasmine.createSpy() };
    api = { getCoinHistory: jasmine.createSpy() };
    service = new CoinService(api, auth);
  });

  it('publishes the server total rather than summing a page of transactions', () => {
    api.getCoinHistory.and.returnValue(of({ totalCoins: 655, history: [{ amount: 5 }] }));
    service.loadAccountCoinHistory().subscribe();
    expect(api.getCoinHistory).toHaveBeenCalledWith(true);
    expect(auth.updateUserData).toHaveBeenCalledOnceWith({ coins: 655 });
  });

  it('does not replace a refreshed balance with an older in-flight response', () => {
    const oldRequest = new Subject<any>();
    const newRequest = new Subject<any>();
    api.getCoinHistory.and.returnValues(oldRequest, newRequest);
    service.loadAccountCoinHistory().subscribe();
    service.loadAccountCoinHistory().subscribe();
    newRequest.next({ totalCoins: 655 });
    oldRequest.next({ totalCoins: 650 });
    expect(auth.updateUserData).toHaveBeenCalledOnceWith({ coins: 655 });
  });

  it('does not apply a previous account balance after logout or account switching', () => {
    const request = new Subject<any>();
    api.getCoinHistory.and.returnValue(request);
    service.loadAccountCoinHistory().subscribe();
    auth.getUserId.and.returnValue('123');
    request.next({ totalCoins: 655 });
    expect(auth.updateUserData).not.toHaveBeenCalled();
  });

  it('accepts a real zero but does not fabricate a total from missing data', () => {
    api.getCoinHistory.and.returnValues(of({ history: [{ amount: 5 }] }), of({ totalCoins: 0 }));
    service.loadAccountCoinHistory().subscribe();
    expect(auth.updateUserData).not.toHaveBeenCalled();
    service.loadAccountCoinHistory().subscribe();
    expect(auth.updateUserData).toHaveBeenCalledOnceWith({ coins: 0 });
  });
});
