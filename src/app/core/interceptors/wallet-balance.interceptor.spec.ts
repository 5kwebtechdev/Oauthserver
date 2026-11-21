import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { WalletBalanceInterceptor } from './wallet-balance.interceptor';

describe('WalletBalanceInterceptor', () => {
  let account: string;
  let publish: jasmine.Spy;
  let interceptor: WalletBalanceInterceptor;
  beforeEach(() => {
    account = '1152';
    publish = jasmine.createSpy('updateCoinBalance');
    interceptor = new WalletBalanceInterceptor({ get: (type: unknown) => type === AuthService
      ? { getUserId: () => account, getToken: () => 'session' }
      : { updateCoinBalance: publish } } as any);
  });
  const request = () => new HttpRequest('POST', `${environment.apiUrl}/articles/136/submit-answers`, {});
  it('publishes the exact committed balance, including zero', () => {
    interceptor.intercept(request(), { handle: () => of(new HttpResponse({ body: { walletUserId: 1152, totalCoins: 0 } })) }).subscribe();
    expect(publish).toHaveBeenCalledOnceWith(0);
  });
  it('does not publish a selected child wallet into the parent wallet', () => {
    interceptor.intercept(request(), { handle: () => of(new HttpResponse({ body: { walletUserId: 301, totalCoins: 500 } })) }).subscribe();
    expect(publish).not.toHaveBeenCalled();
  });
  it('ignores a response arriving after switching accounts', () => {
    const response = new Subject<HttpResponse<unknown>>();
    interceptor.intercept(request(), { handle: () => response }).subscribe();
    account = '301';
    response.next(new HttpResponse({ body: { walletUserId: 1152, totalCoins: 147 } }));
    expect(publish).not.toHaveBeenCalled();
  });
  it('ignores unrelated responses containing totals', () => {
    interceptor.intercept(new HttpRequest('GET', `${environment.apiUrl}/courses`), {
      handle: () => of(new HttpResponse({ body: { walletUserId: 1152, totalCoins: 900 } }))
    }).subscribe();
    expect(publish).not.toHaveBeenCalled();
  });
});
