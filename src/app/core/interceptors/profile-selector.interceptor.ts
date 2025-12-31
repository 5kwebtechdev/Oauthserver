import {inject, Injectable} from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { ProfileSelectorService} from "../services/profile-selector-service";

@Injectable()
export class ProfileSelectorInterceptor implements HttpInterceptor {
  profileSelector = inject(ProfileSelectorService);
  constructor( ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Read the current value from the BehaviorSubject once.
    // BehaviorSubject emits synchronously so take(1) will emit right away.
    return this.profileSelector.child$.pipe(
      take(1),
      switchMap((value) => {
        // If no user selected, forward the request unchanged.
        if (value === null || typeof value === 'undefined') {
          return next.handle(req);
        }

        const userId = String(value);

        // Preserve all existing params and set (or overwrite) only the userId param.
        // HttpParams is immutable — req.params.set(...) returns a new HttpParams
        // that includes all existing params plus the new/updated userId param.
        const newParams = req.params.set('userId', userId);

        // Preserve all existing headers and set the userId header.
        const newHeaders = req.headers.set('userId', userId);

        const modifiedReq = req.clone({
          headers: newHeaders,
          params: newParams
        });

        return next.handle(modifiedReq);
      })
    );
  }
}
