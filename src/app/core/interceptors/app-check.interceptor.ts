import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { FirebaseRuntimeService } from '../services/firebase-runtime.service';

@Injectable()
export class AppCheckInterceptor implements HttpInterceptor {
  constructor(private firebaseRuntime: FirebaseRuntimeService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.firebaseRuntime.shouldAttachAppCheck(req.url) || req.headers.has('X-Firebase-AppCheck')) {
      return next.handle(req);
    }

    // Only token acquisition may fall back. Catching errors around next.handle()
    // re-sends failed POSTs (including referral dismissal) without user action.
    return from(this.firebaseRuntime.getAppCheckToken()).pipe(
      catchError(() => of(null)),
      switchMap(token => {
        if (!token) return next.handle(req);

        return next.handle(req.clone({
          setHeaders: {
            'X-Firebase-AppCheck': token,
          },
        }));
      }),
    );
  }
}
