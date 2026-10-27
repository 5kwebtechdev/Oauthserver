import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (environment.oauth.enabled && !Capacitor.isNativePlatform()) return next.handle(request);
    // Public authentication exchanges (OAuth, login, OTP, etc.) must not
    // inherit a token from a previous app session. This is especially
    // important on web, where the Google account picker can complete while an
    // old localStorage token is still being cleared.
    if (request.headers.get('X-Skip-Authorization') === 'true') {
      return next.handle(request.clone({
        headers: request.headers.delete('X-Skip-Authorization')
      }));
    }

    // Skip adding auth header if the request already has one (from API services)
    const skipAuthHandler = request.headers.get('X-Skip-Auth-Handler') === 'true';
    const requestSessionToken = this.readSessionValue('auth_token');
    const requestSessionUserId = this.readSessionValue('user_id');

    if (request.headers.has('Authorization')) {
      console.log('[AuthInterceptor] Request already has Authorization header, skipping');
      return next.handle(request).pipe(
        filter(event => this.belongsToCurrentSession(event, requestSessionToken, requestSessionUserId))
      );
    }

    // Get token with fallback: localStorage first, then environment
    let token = this.authService.getToken();
    if (!token && environment.apiAuthToken) {
      token = environment.apiAuthToken;
      console.log('[AuthInterceptor] Using fallback environment token');
    }

    console.log('[AuthInterceptor] Intercepting request:', {
      url: request.url,
      method: request.method,
      hasToken: !!token,
      tokenSource: token === this.authService.getToken() ? 'localStorage' : 'environment'
    });

    if (token) {
      // Ensure token has Bearer prefix
      const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      // Clone the request and add the authorization header
      const authRequest = request.clone({
        setHeaders: {
          Authorization: authToken
        }
      });
      console.log('[AuthInterceptor] Added token to request');
      return next.handle(authRequest).pipe(
        filter(event => this.belongsToCurrentSession(event, requestSessionToken, requestSessionUserId)),
        tap((event) => {
          console.log('[AuthInterceptor] Request completed successfully');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('[AuthInterceptor] Request failed:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: error.message
          });

          // Handle authentication errors
          if (!skipAuthHandler) {
            if (error.status === 401) {
              console.warn('[AuthInterceptor] Unauthorized - Session expired, logging out');
              this.authService.logout();
            } else if (error.status === 403) {
              // Leaderboard group access errors have a dedicated on-screen state.
              // Keep the usual 401 session-expiry handling above unchanged.
              if (!error.url?.includes('/auth/login') && !error.url?.includes('/leaderboard/coins')) {
                console.warn('[AuthInterceptor] Forbidden - Access denied');
                this.router.navigate(['/home']);
              }
            }
          } else {
            console.log('[AuthInterceptor] Skipping auth-handler actions due to X-Skip-Auth-Handler header');
          }

          return throwError(() => error);
        })
      );
    }

    // If no token, continue with the original request
    console.log('[AuthInterceptor] No token found, continuing without auth header');
    return next.handle(request).pipe(
      filter(event => this.belongsToCurrentSession(event, requestSessionToken, requestSessionUserId)),
      catchError((error: HttpErrorResponse) => {
        console.error('[AuthInterceptor] Request failed (no auth):', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });

        // Handle authentication errors even when no token is present
        if (!skipAuthHandler) {
          if (error.status === 401 && this.authService.isLoggedIn()) {
            console.warn('[AuthInterceptor] Unauthorized - Logging out');
            this.authService.logout();
          }
        } else {
          console.log('[AuthInterceptor] Skipping auth-handler actions due to X-Skip-Auth-Handler header');
        }

        return throwError(() => error);
      })
    );
  }

  private belongsToCurrentSession(
    event: HttpEvent<unknown>,
    requestToken: string | null,
    requestUserId: string | null
  ): boolean {
    if (!(event instanceof HttpResponse) || !requestToken || !requestUserId) {
      return true;
    }

    const isCurrent = this.readSessionValue('auth_token') === requestToken
      && this.readSessionValue('user_id') === requestUserId;

    if (!isCurrent) {
      console.warn('[AuthInterceptor] Discarded response from a replaced user session');
    }
    return isCurrent;
  }

  private readSessionValue(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}
