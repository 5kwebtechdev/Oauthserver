import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from './app-config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let authServiceStub: {
    accessToken: string | null;
    login: jasmine.Spy;
    silentRefresh: jasmine.Spy;
  };

  beforeEach(() => {
    authServiceStub = {
      accessToken: 'the-access-token',
      login: jasmine.createSpy('login'),
      silentRefresh: jasmine.createSpy('silentRefresh').and.resolveTo(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('attaches the bearer token for requests to the resource server', () => {
    http.get(`${APP_CONFIG.resourceServerBaseUrl}/api/me`).subscribe();

    const req = httpMock.expectOne(`${APP_CONFIG.resourceServerBaseUrl}/api/me`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer the-access-token');
    req.flush({});
  });

  it('does not attach a token for requests to other origins', () => {
    http.get('https://example.com/unrelated').subscribe();

    const req = httpMock.expectOne('https://example.com/unrelated');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('on 401, attempts a silent refresh and retries once', (done) => {
    http.get(`${APP_CONFIG.resourceServerBaseUrl}/api/notes`).subscribe({
      next: (body) => {
        expect(body).toEqual({ ok: true });
        expect(authServiceStub.silentRefresh).toHaveBeenCalledTimes(1);
        done();
      },
    });

    const first = httpMock.expectOne(`${APP_CONFIG.resourceServerBaseUrl}/api/notes`);
    first.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    setTimeout(() => {
      const retry = httpMock.expectOne(`${APP_CONFIG.resourceServerBaseUrl}/api/notes`);
      retry.flush({ ok: true });
    }, 0);
  });

  it('redirects to login when the silent refresh itself fails', (done) => {
    authServiceStub.silentRefresh.and.rejectWith(new Error('refresh failed'));

    http.get(`${APP_CONFIG.resourceServerBaseUrl}/api/notes`).subscribe({
      error: () => {
        expect(authServiceStub.login).toHaveBeenCalledTimes(1);
        done();
      },
    });

    const first = httpMock.expectOne(`${APP_CONFIG.resourceServerBaseUrl}/api/notes`);
    first.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
  });
});
