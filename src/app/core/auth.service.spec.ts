import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let oauthServiceSpy: jasmine.SpyObj<OAuthService>;
  let service: AuthService;

  beforeEach(() => {
    oauthServiceSpy = jasmine.createSpyObj<OAuthService>('OAuthService', [
      'configure',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'getAccessToken',
      'initCodeFlow',
      'logOut',
      'silentRefresh',
    ]);
    oauthServiceSpy.loadDiscoveryDocumentAndTryLogin.and.resolveTo(true);
    oauthServiceSpy.silentRefresh.and.resolveTo({} as never);

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: OAuthService, useValue: oauthServiceSpy }],
    });
    service = TestBed.inject(AuthService);
  });

  it('configures the OAuthService on construction', () => {
    expect(oauthServiceSpy.configure).toHaveBeenCalledTimes(1);
  });

  it('init() sets up silent refresh and tries login', async () => {
    oauthServiceSpy.hasValidAccessToken.and.returnValue(true);

    await service.init();

    expect(oauthServiceSpy.setupAutomaticSilentRefresh).toHaveBeenCalledTimes(1);
    expect(oauthServiceSpy.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(1);
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('login() delegates to initCodeFlow', () => {
    service.login();
    expect(oauthServiceSpy.initCodeFlow).toHaveBeenCalledTimes(1);
  });

  it('logout() delegates to logOut', () => {
    service.logout();
    expect(oauthServiceSpy.logOut).toHaveBeenCalledTimes(1);
  });

  it('accessToken returns null when the current token is not valid, even if one is cached', () => {
    oauthServiceSpy.hasValidAccessToken.and.returnValue(false);
    oauthServiceSpy.getAccessToken.and.returnValue('stale-token');

    expect(service.accessToken).toBeNull();
  });

  it('accessToken returns the token when valid', () => {
    oauthServiceSpy.hasValidAccessToken.and.returnValue(true);
    oauthServiceSpy.getAccessToken.and.returnValue('fresh-token');

    expect(service.accessToken).toBe('fresh-token');
  });
});
