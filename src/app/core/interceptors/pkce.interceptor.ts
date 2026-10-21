import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap, filter } from 'rxjs/operators';
import { PkceAuthService } from '../services/pkce-auth.service';
import { environment } from '../../../environments/environment';
@Injectable()
export class PkceInterceptor implements HttpInterceptor {
  constructor(private pkce: PkceAuthService) {}
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.pkce.enabled) return next.handle(req);
    const url = new URL(req.url, window.location.origin);
    const api = new URL(environment.apiUrl);
    const issuer = new URL(environment.oauth.issuer);
    const business = url.origin === api.origin && (url.pathname === api.pathname || url.pathname.startsWith(api.pathname + '/'));
    const admin = url.origin === issuer.origin && url.pathname.startsWith('/api/admin/');
    // OAuth exchanges must not inherit the dashboard's selected child profile.
    if (url.origin === issuer.origin && !business && !admin) {
      return next.handle(req.clone({ setHeaders: { 'X-Skip-Profile-Selector': 'true' } }));
    }
    if ((!business && !admin) || req.headers.get('X-Skip-Authorization') === 'true') {
      return next.handle(req.clone({ headers: req.headers.delete('X-Skip-Authorization') }));
    }
    // Public account exchanges must not inherit an old bearer token.
    if (/\/auth\/(?:login|register|oauth2|forgot-password|check)(?:[/?]|$)/.test(url.pathname) || url.pathname.includes('/api/auth/')) return next.handle(req);
    const attach = () => this.pkce.token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + this.pkce.token } }) : req;
    const userId = localStorage.getItem('user_id');
    const currentUser = (event: HttpEvent<unknown>) => !(event instanceof HttpResponse)
      || !userId || localStorage.getItem('user_id') === userId;
    return next.handle(attach()).pipe(filter(currentUser), catchError(error => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || req.headers.get('X-Skip-Auth-Handler') === 'true') return throwError(() => error);
      return from(this.pkce.refresh()).pipe(switchMap(() => next.handle(attach()).pipe(filter(currentUser))), catchError(renewalError => throwError(() => renewalError)));
    }));
  }
}
