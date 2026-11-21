import { sessionStorageAdapter as nativeStorage } from '../storage/session-storage';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PkceAuthService } from './pkce-auth.service';

describe('DEV Android hosted login and revocation', () => {
  afterEach(() => nativeStorage.removeItem('superme_oidc_android_pending'));
  function create(code = 'one-time-code') {
    const post = jasmine.createSpy().and.returnValue(of({ code, expires_in: 60 }));
    const navigateByUrl = jasmine.createSpy().and.resolveTo(true);
    const oauth: any = {
      initCodeFlow: jasmine.createSpy(), tryLoginCodeFlow: jasmine.createSpy().and.resolveTo(true),
      hasValidAccessToken: () => true, getCustomTokenResponseProperty: () => ({ id: 7 }), getRefreshToken: () => 'rotated-refresh', getIdToken: () => 'id-token',
      stopAutomaticRefresh: () => {}, hasValidIdToken: () => true, logoutUrl: 'https://auth.supermeapp.com/connect/logout'
    };
    const service = new PkceAuthService(oauth, { get: (type: unknown) => type === HttpClient ? { post } : { navigateByUrl } } as any);
    Object.defineProperty(service, 'nativeDev', { value: true });
    Object.defineProperty(service, 'enabled', { value: true });
    Object.defineProperty(service, 'androidConfig', { value: { clientId: 'supermeapp-dev-android', redirectUri: 'superme://oauth/dev/callback', logoutRedirectUri: 'superme://oauth/dev/logout' } });
    spyOn(service, 'init').and.resolveTo();
    spyOn(service as any, 'ensureNativeDiscovery').and.resolveTo();
    spyOn(service as any, 'syncSession');
    oauth.initCodeFlow.and.callFake(() => void (service as any).openNativeAuthorization('https://auth.supermeapp.com/oauth2/authorize?state=random-state&nonce=random-nonce&code_challenge=S256-challenge&code_challenge_method=S256'));
    return { service, oauth, post, navigateByUrl };
  }
  it('starts hosted login without sending credentials to the native JSON endpoint', async () => {
    const { service, post } = create();
    const login = spyOn(service, 'login').and.resolveTo();
    await service.loginAfterRegistration({ email: 'test@example.invalid', password: 'test-only' });
    expect(login).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
  });
  it('opens hosted authorization with an independent random state and retains the nonce', async () => {
    const { service } = create();
    const open = spyOn(service as any, 'openAuthorizationTab').and.resolveTo();
    await (service as any).openNativeAuthorization('https://auth.supermeapp.com/oauth2/authorize?state=library-nonce&nonce=library-nonce&code_challenge=challenge&code_challenge_method=S256');
    const url = new URL(open.calls.mostRecent().args[0] as string);
    expect(url.searchParams.get('nonce')).toBe('library-nonce');
    expect(url.searchParams.get('state')).not.toBe('library-nonce');
    expect(url.searchParams.get('state')!.length).toBe(43);
    const pending = JSON.parse(nativeStorage.getItem('superme_oidc_android_pending')!);
    expect(pending.state).toBe(url.searchParams.get('state'));
    expect(pending.libraryState).toBe('library-nonce');
  });
  it('opens signup locally and clears the abandoned OAuth transaction', async () => {
    const { service, navigateByUrl } = create();
    nativeStorage.setItem('superme_oidc_android_pending', 'old-transaction');
    spyOn(service as any, 'launchAuthWebView').and.resolveTo({ appRoute: '/signup' });
    await (service as any).openAuthorizationTab('https://auth.supermeapp.com/oauth2/authorize');
    expect(nativeStorage.getItem('superme_oidc_android_pending')).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/signup', { replaceUrl: true });
    expect(service.error).toBe('');
  });
  it('does not navigate to an arbitrary account destination', async () => {
    const { service, navigateByUrl } = create();
    spyOn(service as any, 'launchAuthWebView').and.resolveTo({ appRoute: 'https://evil.invalid' });
    await expectAsync((service as any).openAuthorizationTab('https://auth.supermeapp.com/oauth2/authorize')).toBeRejected();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
  it('passes the OAuth callback to the existing validation handler', async () => {
    const { service } = create();
    const callback = 'superme://oauth/dev/callback?code=test-only&state=random-state';
    spyOn(service as any, 'launchAuthWebView').and.resolveTo({ callbackUrl: callback });
    const handler = spyOn(service, 'handleNativeCallback').and.resolveTo();
    await (service as any).openAuthorizationTab('https://auth.supermeapp.com/oauth2/authorize');
    expect(handler).toHaveBeenCalledOnceWith(callback);
  });
  it('opens hosted login after a logout timeout without restoring the old session', async () => {
    const { service } = create();
    spyOn(service as any, 'launchAuthWebView').and.resolveTo({ cancelled: true, error: 'logout_timeout' });
    const login = spyOn(service, 'login').and.resolveTo();
    await service.openNativeLogout('https://auth.supermeapp.com/android-dev-logout');
    expect(login).toHaveBeenCalledTimes(1);
  });
  it('opens hosted login exactly once after the logout callback, even when the login route is already mounted', async () => {
    const { service, navigateByUrl } = create();
    spyOn(service as any, 'launchAuthWebView').and.resolveTo({ callbackUrl: 'superme://oauth/dev/logout' });
    const login = spyOn(service, 'login').and.resolveTo();
    await service.openNativeLogout('https://auth.supermeapp.com/android-dev-logout');
    expect(login).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(service.error).toBe('');
  });
  it('shows a retryable signed-out error if reopening hosted login fails', async () => {
    const { service, navigateByUrl } = create();
    spyOn(service as any, 'launchAuthWebView').and.resolveTo({ callbackUrl: 'superme://oauth/dev/logout' });
    spyOn(service, 'login').and.rejectWith(new Error('offline'));
    await service.openNativeLogout('https://auth.supermeapp.com/android-dev-logout');
    expect(service.error).toContain('Could not open sign in');
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/login?loggedOut=1', { replaceUrl: true });
  });
  it('uses the dedicated native logout endpoint after restart without cached discovery', async () => {
    const { service, oauth } = create();
    oauth.logoutUrl = undefined;
    const url = await service.prepareLogout();
    expect(url).toContain('https://auth.supermeapp.com/android-dev-logout');
    expect(url).toContain('superme%3A%2F%2Foauth%2Fdev%2Flogout');
  });
  it('revokes the refresh token in a form body and excludes it from the logout URL', async () => {
    const { service, post } = create();
    (service as any).lastRefreshHadIdToken = true;
    const url = await service.prepareLogout();
    expect(post.calls.mostRecent().args[1]).toBe('token=rotated-refresh&token_type_hint=refresh_token&client_id=supermeapp-dev-android');
    expect(url).toContain('/android-dev-logout');
    expect(url).not.toContain('rotated-refresh');
  });
  it('still returns a logout destination when revocation is unavailable', async () => {
    const { service, post } = create(); post.and.returnValue(throwError(() => new Error('offline')));
    expect(await service.prepareLogout()).toContain('/android-dev-logout');
  });
});
