import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { PkceInterceptor } from './pkce.interceptor';
import { environment } from '../../../environments/environment';

describe('PKCE API interceptor', () => {
  let pkce: any;
  let interceptor: PkceInterceptor;
  beforeEach(() => {
    localStorage.clear();
    pkce = { enabled: true, token: 'initial', refresh: jasmine.createSpy().and.callFake(async () => { pkce.token = 'renewed'; }) };
    interceptor = new PkceInterceptor(pkce);
  });
  afterEach(() => localStorage.clear());
  it('attaches tokens only to the configured API origin and path', async () => {
    const handler = { handle: jasmine.createSpy().and.returnValue(of(new HttpResponse({ status: 200 }))) };
    await firstValueFrom(interceptor.intercept(new HttpRequest('GET', environment.apiUrl + '/tasks'), handler));
    expect(handler.handle.calls.mostRecent().args[0].headers.get('Authorization')).toBe('Bearer initial');
    await firstValueFrom(interceptor.intercept(new HttpRequest('GET', environment.apiUrl + '-untrusted/tasks'), handler));
    expect(handler.handle.calls.mostRecent().args[0].headers.has('Authorization')).toBeFalse();
    await firstValueFrom(interceptor.intercept(new HttpRequest('GET', 'https://third-party.example/tasks'), handler));
    expect(handler.handle.calls.mostRecent().args[0].headers.has('Authorization')).toBeFalse();
  });
  it('renews a 401 and retries exactly once with the rotated token', async () => {
    const handler = { handle: jasmine.createSpy().and.callFake((req: HttpRequest<unknown>) =>
      req.headers.get('Authorization') === 'Bearer renewed'
        ? of(new HttpResponse({ status: 200 })) : throwError(() => new HttpErrorResponse({ status: 401 }))) };
    await firstValueFrom(interceptor.intercept(new HttpRequest('GET', environment.apiUrl + '/tasks'), handler));
    expect(pkce.refresh).toHaveBeenCalledTimes(1);
    expect(handler.handle).toHaveBeenCalledTimes(2);
  });
  it('does not retry a second 401', async () => {
    const handler = { handle: jasmine.createSpy().and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 }))) };
    await expectAsync(firstValueFrom(interceptor.intercept(new HttpRequest('GET', environment.apiUrl + '/tasks'), handler))).toBeRejected();
    expect(handler.handle).toHaveBeenCalledTimes(2);
    expect(pkce.refresh).toHaveBeenCalledTimes(1);
  });
  it('honors public authentication requests', async () => {
    const handler = { handle: jasmine.createSpy().and.returnValue(of(new HttpResponse({ status: 200 }))) };
    await firstValueFrom(interceptor.intercept(new HttpRequest('POST', environment.apiUrl + '/auth/register', {}), handler));
    expect(handler.handle.calls.mostRecent().args[0].headers.has('Authorization')).toBeFalse();
  });
});
