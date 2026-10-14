import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/app-config';
import { AuthService } from '../../core/auth.service';
import { DashboardComponent } from './dashboard.component';

/**
 * Regression guard for a reported bug: logout worked before refreshing the access token and showed
 * an error page afterwards.
 *
 * Cause: the dashboard's refresh tool posted to /oauth2/token by hand. That grant rotates the ID
 * token server-side too, but the raw call left angular-oauth2-oidc holding the superseded one, and
 * logout sends it as id_token_hint. The authorization server resolves the authorization by that
 * exact value (OidcLogoutAuthenticationProvider), found nothing, and answered invalid_token.
 *
 * So: refreshing this session's own token must go through the library, which stores the rotated
 * id_token. Refreshing some other token may still use the raw call - it rotates a different
 * authorization and cannot stale this session.
 */
describe('DashboardComponent refresh/logout interaction', () => {
  let authSpy: jasmine.SpyObj<AuthService>;
  let httpMock: HttpTestingController;

  function createComponent(): DashboardComponent {
    const fixture = TestBed.createComponent(DashboardComponent);
    return fixture.componentInstance;
  }

  beforeEach(() => {
    authSpy = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['refreshWithStoredToken', 'logout', 'isLoggedIn', 'silentRefresh'],
      { refreshToken: 'MY-OWN-REFRESH-TOKEN', accessToken: 'access' }
    );
    authSpy.refreshWithStoredToken.and.resolveTo({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      id_token: 'new-id-token',
      expires_in: 600,
      scope: 'openid profile',
      token_type: 'Bearer',
    } as never);

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('refreshes this session through the library, so the stored id_token stays current', async () => {
    const component = createComponent();
    component.refreshTokenInput = 'MY-OWN-REFRESH-TOKEN';

    component.callRefresh();
    await authSpy.refreshWithStoredToken.calls.mostRecent().returnValue;

    expect(authSpy.refreshWithStoredToken).toHaveBeenCalled();
    // No hand-rolled token call: that is exactly what used to leave the ID token stale.
    httpMock.expectNone(`${APP_CONFIG.authIssuer}/oauth2/token`);
    expect(component.refreshResult?.access_token).toBe('new-access');
  });

  it('still posts directly when given a refresh token that is not this session', () => {
    const component = createComponent();
    component.refreshTokenInput = 'SOMEONE-ELSES-TOKEN';

    component.callRefresh();

    expect(authSpy.refreshWithStoredToken).not.toHaveBeenCalled();
    const req = httpMock.expectOne(`${APP_CONFIG.authIssuer}/oauth2/token`);
    expect(req.request.body).toContain('grant_type=refresh_token');
    expect(req.request.body).toContain('SOMEONE-ELSES-TOKEN');
    req.flush({ access_token: 'a', scope: 'openid', token_type: 'Bearer', expires_in: 600 });
  });
});
