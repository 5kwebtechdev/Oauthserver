import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { APP_CONFIG } from './app-config';
import { AuthService } from './auth.service';

const BEARER_TOKEN_TARGETS = [APP_CONFIG.resourceServerBaseUrl, `${APP_CONFIG.authIssuer}/api/admin`];

/**
 * Attaches the bearer access token only to requests aimed at our own APIs (the
 * resource-server, and auth-server's own /api/admin/** - never to third-party calls).
 * On a 401 - most often a just-expired access token - it attempts one silent renewal
 * and retries the request once before giving up and sending the user to log in again.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (!BEARER_TOKEN_TARGETS.some((base) => req.url.startsWith(base))) {
    return next(req);
  }

  const attach = (request: HttpRequest<unknown>) => {
    const token = auth.accessToken;
    return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  };

  return next(attach(req)).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return from(auth.silentRefresh()).pipe(
          switchMap(() => next(attach(req))),
          catchError(() => {
            auth.login();
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
