import { Subject } from 'rxjs';
import { PkceAuthService } from './pkce-auth.service';

describe('PKCE session bridge', () => {
  let oauth: any;
  let auth: any;
  let service: PkceAuthService;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    auth = { setSession: jasmine.createSpy().and.callFake(() => localStorage.clear()), setUserData: jasmine.createSpy() };
    oauth = {
      configure: jasmine.createSpy(), setStorage: jasmine.createSpy(), events: new Subject(),
      loadDiscoveryDocumentAndTryLogin: jasmine.createSpy().and.callFake(async () => localStorage.setItem('superme_oidc_refresh_token', 'new-refresh')),
      hasValidAccessToken: () => true, getAccessToken: () => 'new-access',
      getRefreshToken: () => null, getAccessTokenExpiration: () => Date.now() + 600000,
      getCustomTokenResponseProperty: () => ({ id: 7, relationship: 'PARENT' }),
      refreshToken: jasmine.createSpy().and.returnValue(Promise.resolve({})), initCodeFlow: jasmine.createSpy()
    };
    service = new PkceAuthService(oauth, { get: () => auth } as any);
    Object.defineProperty(service, 'enabled', { value: true });
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it('preserves newly received OAuth tokens through account-switch cleanup', async () => {
    await service.init();
    expect(auth.setSession).toHaveBeenCalledWith({ token: 'new-access', userId: 7, user: { id: 7, relationship: 'PARENT' } });
    expect(localStorage.getItem('superme_oidc_refresh_token')).toBe('new-refresh');
  });
  it('coordinates concurrent refresh requests into one token exchange', async () => {
    await Promise.all([service.refresh(), service.refresh()]);
    expect(oauth.refreshToken).toHaveBeenCalledTimes(1);
  });
  it('rejects an external return URL', async () => {
    await service.login('//untrusted.example');
    expect(sessionStorage.getItem('pkce_return_url')).toBeNull();
    expect(oauth.initCodeFlow).toHaveBeenCalled();
  });
  it('keeps valid internal navigation across the login redirect', async () => {
    await service.login('/parent-account');
    expect(sessionStorage.getItem('pkce_return_url')).toBe('/parent-account');
  });
});
