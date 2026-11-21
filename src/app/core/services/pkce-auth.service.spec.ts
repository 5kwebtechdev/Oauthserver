import { Capacitor } from "@capacitor/core";
import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { sessionStorageAdapter as nativeStorage } from '../storage/session-storage';
import { BadgeSocketService } from './badge-socket.service';
import { FamilyService } from './family.service';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable, of, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PkceAuthService } from './pkce-auth.service';

describe('PKCE session bridge', () => {
  let oauth: any;
  let auth: any;
  let service: PkceAuthService;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    auth = { setSession: jasmine.createSpy().and.callFake(() => localStorage.clear()), setUserData: jasmine.createSpy() };
    oauth = {
      logoutUrl: environment.oauth.issuer + '/connect/logout',
      stopAutomaticRefresh: jasmine.createSpy(), getIdToken: () => 'latest-id-token',
      configure: jasmine.createSpy(), setStorage: jasmine.createSpy(), events: new Subject(),
      loadDiscoveryDocumentAndTryLogin: jasmine.createSpy().and.callFake(async () => localStorage.setItem('superme_oidc_refresh_token', 'new-refresh')),
      hasValidAccessToken: () => true, getAccessToken: () => 'new-access',
      getRefreshToken: () => localStorage.getItem('superme_oidc_refresh_token'), getAccessTokenExpiration: () => Date.now() + 600000,
      getCustomTokenResponseProperty: () => ({ id: 7, relationship: 'PARENT' }),
      refreshToken: jasmine.createSpy().and.returnValue(Promise.resolve({ id_token: 'fresh-id-token' })), initCodeFlow: jasmine.createSpy()
    };
    service = new PkceAuthService(oauth, { get: () => auth } as any);
    Object.defineProperty(service, 'enabled', { value: true });
    spyOn(service as any, 'withRefreshLock').and.callFake((exchange: () => Promise<void>) => exchange());
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it('preserves newly received OAuth tokens through account-switch cleanup', async () => {
    await service.init();
    expect(auth.setSession).toHaveBeenCalledWith({ token: 'new-access', userId: 7, user: { id: 7, relationship: 'PARENT' } });
    expect(localStorage.getItem('superme_oidc_refresh_token')).toBe('new-refresh');
  });
  it('recovers from a stale cached OIDC session by clearing it and retrying once', async () => {
    // A long-lived browser profile can accumulate a stale nonce/PKCE verifier/discovery
    // document under the superme_oidc_ prefix that makes the next sign-in attempt throw,
    // even though a fresh profile (incognito, another browser) would succeed immediately.
    localStorage.setItem('superme_oidc_nonce', 'stale-nonce-from-a-prior-deployment');
    oauth.loadDiscoveryDocumentAndTryLogin = jasmine.createSpy().and.callFake(async () => {
      if (localStorage.getItem('superme_oidc_nonce')) throw new Error('stale nonce mismatch');
      localStorage.setItem('superme_oidc_refresh_token', 'new-refresh');
    });
    await service.init();
    expect(oauth.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('superme_oidc_nonce')).toBeNull();
    expect(auth.setSession).toHaveBeenCalledWith({ token: 'new-access', userId: 7, user: { id: 7, relationship: 'PARENT' } });
    expect(service.error).toBe('');
  });
  it('surfaces the generic sign-in error only after a retry also fails', async () => {
    oauth.loadDiscoveryDocumentAndTryLogin = jasmine.createSpy().and.callFake(async () => {
      throw new Error('auth server unreachable');
    });
    await service.init();
    expect(oauth.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(2);
    expect(service.error).toBe('Could not connect to sign in. Please try again.');
  });
  it('uses the configured client for Google login and waits before starting PKCE', async () => {
    let reply!: (value: unknown) => void;
    const post = jasmine.createSpy().and.returnValue(new Promise(resolve => reply = resolve));
    oauth.hasValidAccessToken = () => false;
    oauth.getRefreshToken = () => null;
    const http = { post: (...args: any[]) => new Observable((subscriber: any) => {
      post(...args).then((value: any) => { subscriber.next(value); subscriber.complete(); });
    }) };
    service = new PkceAuthService(oauth, { get: (type: unknown) => type === HttpClient ? http : auth } as any);
    Object.defineProperty(service, 'enabled', { value: true });
    const pending = service.googleLogin('google-proof');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(post).toHaveBeenCalledWith(environment.oauth.issuer + '/api/auth/google-login',
      { idToken: 'google-proof' }, { withCredentials: true, params: { client_id: environment.oauth.clientId } });
    expect(oauth.initCodeFlow).not.toHaveBeenCalled();
    expect(auth.setSession).not.toHaveBeenCalled();
    reply({});
    await pending;
    expect(oauth.initCodeFlow).toHaveBeenCalledTimes(1);
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(service.getGoogleSignupProof()).toBe('google-proof');
    service.clearGoogleSignupProof();
    expect(service.getGoogleSignupProof()).toBe('');
  });
  it('marks only an in-progress Google signup for onboarding resume after PKCE', async () => {
    const post = jasmine.createSpy().and.returnValue(of({ authenticated: true }));
    service = new PkceAuthService(oauth, { get: (type: unknown) => type === HttpClient ? { post } : auth } as any);
    Object.defineProperty(service, 'enabled', { value: true });

    await service.googleLogin('google-proof', true);
    expect(sessionStorage.getItem('pkce_social_onboarding_resume')).toBe('true');

    oauth.initCodeFlow.calls.reset();
    sessionStorage.removeItem('oauth_signup_session_pending');
    await service.googleLogin('returning-google-proof');
    expect(sessionStorage.getItem('pkce_social_onboarding_resume')).toBeNull();
    expect(oauth.initCodeFlow).toHaveBeenCalledTimes(1);
  });
  it('coordinates concurrent refresh requests into one token exchange', async () => {
    localStorage.setItem('superme_oidc_refresh_token', 'stored-refresh');
    await Promise.all([service.refresh(), service.refresh()]);
    expect(oauth.refreshToken).toHaveBeenCalledTimes(1);
  });
  it('does not call the token endpoint when the refresh token is missing', async () => {
    await expectAsync(service.refresh()).toBeRejected();
    expect(oauth.refreshToken).not.toHaveBeenCalled();
  });
  it('discards tokens if another tab logs out during refresh', async () => {
    localStorage.setItem('user_id', '7');
    localStorage.setItem('superme_oidc_refresh_token', 'stored-refresh');
    oauth.refreshToken.and.callFake(async () => {
      localStorage.removeItem('user_id');
      localStorage.setItem('superme_oidc_refresh_token', 'rotated-refresh');
      localStorage.setItem('superme_oidc_access_token', 'rotated-access');
      return { id_token: 'rotated-id' };
    });
    await expectAsync(service.refresh()).toBeRejected();
    expect(localStorage.getItem('superme_oidc_refresh_token')).toBeNull();
    expect(localStorage.getItem('superme_oidc_access_token')).toBeNull();
  });
  it('does not mistake an Auth2 email or phone subject for a numeric API user ID', () => {
    const jwt = (subject: string, algorithm: string) =>
      btoa(JSON.stringify({ alg: algorithm })).replace(/=/g, '') + '.' +
      btoa(JSON.stringify({ sub: subject })).replace(/=/g, '') + '.signature';
    const badge = Object.create(BadgeSocketService.prototype) as any;
    const family = Object.create(FamilyService.prototype) as any;
    for (const subject of ['user@example.com', '919876543210']) {
      expect(badge.extractUserIdFromToken(jwt(subject, 'RS256'))).toBeNull();
      expect(family.decodeUserIdFromToken(jwt(subject, 'RS256'))).toBeNull();
    }
    expect(badge.extractUserIdFromToken(jwt('94', 'HS256'))).toBe('94');
    expect(family.decodeUserIdFromToken(jwt('94', 'HS256'))).toBe(94);
  });
  it('does not send PKCE logout to the legacy business API', async () => {
    const post = jasmine.createSpy();
    const result = AuthService.prototype.logoutUser.call({ pkce: { enabled: true }, http: { post } } as any, 94);
    expect((await firstValueFrom(result)).success).toBeTrue();
    expect(post).not.toHaveBeenCalled();
  });
  it('prepares issuer logout while skipping the legacy logout request', async () => {
    const legacyLogout = jasmine.createSpy().and.returnValue(of({ success: true }));
    const prepareLogout = jasmine.createSpy().and.returnValue(Promise.resolve(null));
    await AuthService.prototype.logout.call({
      pkce: { enabled: true, prepareLogout }, getUserId: () => '94', logoutUser: legacyLogout,
      pushNotifications: { clearToken: () => Promise.resolve() }, clearLocalUserState: () => {},
      analytics: { clearUserId: () => {} }, crashlytics: { clearUserId: () => {} },
      authSessionCleanup: { clearExternalAuthSessions: () => Promise.resolve() }
    } as any, false);
    expect(legacyLogout).not.toHaveBeenCalled();
    expect(prepareLogout).toHaveBeenCalledTimes(1);
  });
  it('renders the signed-out route before stalled native cleanup and continues after its deadline', fakeAsync(() => {
    spyOn(Capacitor, "isNativePlatform").and.returnValue(true);
    const navigateRoot = jasmine.createSpy().and.resolveTo(true);
    const openNativeLogout = jasmine.createSpy().and.resolveTo();
    const clearExternalAuthSessions = jasmine.createSpy().and.returnValue(new Promise(() => {}));
    let finished = false;
    void AuthService.prototype.logout.call({
      pkce: { enabled: true, nativeDev: true, prepareLogout: async () => 'https://auth.supermeapp.com/android-dev-logout', openNativeLogout },
      getUserId: () => '94', clearLocalUserState: () => {}, navCtrl: { navigateRoot },
      pushNotifications: { clearToken: () => new Promise(() => {}) },
      analytics: { clearUserId: () => {} }, crashlytics: { clearUserId: () => {} },
      authSessionCleanup: { clearExternalAuthSessions }
    } as any, true).then(() => { finished = true; });
    flushMicrotasks();
    expect(navigateRoot).toHaveBeenCalledWith('/login?loggedOut=1', { animated: false });
    expect(clearExternalAuthSessions).toHaveBeenCalledWith(false);
    expect(openNativeLogout).not.toHaveBeenCalled();
    tick(2500); flushMicrotasks();
    expect(openNativeLogout).toHaveBeenCalledTimes(1);
    expect(finished).toBeTrue();
  }));
  it('identifies the correct client and callback in logout', async () => {
    localStorage.setItem('superme_oidc_refresh_token', 'stored-refresh');
    const url = new URL((await service.prepareLogout())!);
    expect(url.searchParams.get('client_id')).toBe(environment.oauth.clientId);
    expect(url.searchParams.get('id_token_hint')).toBe('latest-id-token');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(window.location.origin + '/');
    expect(oauth.stopAutomaticRefresh).toHaveBeenCalled();
    expect(oauth.refreshToken).toHaveBeenCalledTimes(1);
  });
  it('waits for token rotation before capturing the logout hint', async () => {
    localStorage.setItem('superme_oidc_refresh_token', 'stored-refresh');
    let finish!: () => void;
    let idToken = 'old-id';
    oauth.getIdToken = () => idToken;
    oauth.refreshToken.and.callFake(() => new Promise<void>(resolve => {
      finish = () => { idToken = 'rotated-id'; resolve({ id_token: 'rotated-id' } as any); };
    }));
    const refresh = service.refresh();
    const logout = service.prepareLogout();
    await new Promise(resolve => setTimeout(resolve, 0));
    finish();
    await refresh;
    expect(new URL((await logout)!).searchParams.get('id_token_hint')).toBe('rotated-id');
    await expectAsync(service.refresh()).toBeRejected();
  });
  it('does not use a stale ID token if the logout refresh omits one', async () => {
    localStorage.setItem('superme_oidc_refresh_token', 'stored-refresh');
    oauth.refreshToken.and.returnValue(Promise.resolve({ access_token: 'fresh-access' }));
    expect(await service.prepareLogout()).toBeNull();
  });
  it('does not retry a failed token exchange while logging out', async () => {
    localStorage.setItem('superme_oidc_refresh_token', 'stored-refresh');
    oauth.refreshToken.and.returnValue(Promise.reject(new Error('invalid_grant')));
    expect(await service.prepareLogout()).toBeNull();
    expect(oauth.refreshToken).toHaveBeenCalledTimes(1);
  });
  it('establishes a credentialed session before starting post-signup PKCE', async () => {
    const post = jasmine.createSpy().and.returnValue(of({ authenticated: true }));
    service = new PkceAuthService(oauth, { get: (type: unknown) => type === HttpClient ? { post } : auth } as any);
    Object.defineProperty(service, 'enabled', { value: true });
    await service.loginAfterRegistration({ email: 'new@example.com', password: 'new-password' });
    expect(post).toHaveBeenCalledWith(environment.oauth.issuer + '/v1/auth/session-login',
      { email: 'new@example.com', phone: undefined, password: 'new-password' },
      { withCredentials: true, params: { client_id: environment.oauth.clientId } });
    expect(oauth.initCodeFlow).toHaveBeenCalled();
  });
  it('rejects an external return URL' , async () => {
    await service.login('//untrusted.example');
    expect(sessionStorage.getItem('pkce_return_url')).toBeNull();
    expect(oauth.initCodeFlow).toHaveBeenCalled();
  });
  it('keeps valid internal navigation across the login redirect', async () => {
    await service.login('/parent-account');
    expect(sessionStorage.getItem('pkce_return_url')).toBe('/parent-account');
  });
});

describe('DEV Android callback boundaries', () => {
  afterEach(() => nativeStorage.removeItem('superme_oidc_android_pending'));
  function create() {
    const navigateByUrl = jasmine.createSpy().and.resolveTo(true);
    const exchange = jasmine.createSpy().and.resolveTo(true);
    const oauth = { tryLoginCodeFlow: exchange, hasValidAccessToken: () => true, loadDiscoveryDocument: jasmine.createSpy().and.resolveTo({}) };
    const service = new PkceAuthService(oauth as any, { get: () => ({ navigateByUrl }) } as any);
    Object.defineProperty(service, 'nativeDev', { value: true });
    Object.defineProperty(service, 'androidConfig', { value: {
      redirectUri: 'superme://oauth/dev/callback', logoutRedirectUri: 'superme://oauth/dev/logout'
    } });
    spyOn(service as any, 'syncSession');
    return { service, exchange, navigateByUrl };
  }
  it('ignores other hosts and production-looking callback paths', async () => {
    const { service, exchange } = create();
    await service.handleNativeCallback('superme://other/dev/callback?code=x&state=y');
    await service.handleNativeCallback('superme://oauth/prod/callback?code=x&state=y');
    expect(exchange).not.toHaveBeenCalled();
  });
  it('refuses missing state instead of redeeming an authorization code', async () => {
    const { service, exchange, navigateByUrl } = create();
    await service.handleNativeCallback('superme://oauth/dev/callback?code=x');
    expect(exchange).not.toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });
  it('rejects an unrelated callback state before contacting the token endpoint', async () => {
    const { service, exchange } = create();
    nativeStorage.setItem('superme_oidc_android_pending', JSON.stringify({ state: 'expected', libraryState: 'nonce' }));
    await service.handleNativeCallback('superme://oauth/dev/callback?code=x&state=wrong');
    expect(exchange).not.toHaveBeenCalled();
  });
  it('passes callback parameters to library state/nonce validation and redeems once', async () => {
    const { service, exchange } = create();
    nativeStorage.setItem('superme_oidc_android_pending', JSON.stringify({ state: 'y', libraryState: 'saved-nonce' }));
    const url = 'superme://oauth/dev/callback?code=x&state=y';
    await service.handleNativeCallback(url);
    await service.handleNativeCallback(url);
    expect(exchange).toHaveBeenCalledOnceWith({ customHashFragment: '?code=x&state=saved-nonce', preventClearHashAfterLogin: true });
  });
});
