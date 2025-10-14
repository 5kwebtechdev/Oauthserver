import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip adding auth header if the request already has one (from API services)
    if (request.headers.has('Authorization')) {
      console.log('[AuthInterceptor] Request already has Authorization header, skipping');
      return next.handle(request);
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
          return throwError(() => error);
        })
      );
    }

    // If no token, continue with the original request
    console.log('[AuthInterceptor] No token found, continuing without auth header');
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('[AuthInterceptor] Request failed (no auth):', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        return throwError(() => error);
      })
    );
  }
}
