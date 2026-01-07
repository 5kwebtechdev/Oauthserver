import { inject, Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { ProfileSelectorService } from "../services/profile-selector-service";

@Injectable()
export class ProfileSelectorInterceptor implements HttpInterceptor {
  profileSelector = inject(ProfileSelectorService);

  constructor() { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.profileSelector.child$.pipe(
      take(1),
      switchMap((forUserId) => {
        console.log('[ProfileSelectorInterceptor] forUserId:', forUserId, 'method:', req.method, 'url:', req.url);

        // If no child selected, forward request unchanged
        if (forUserId === null || forUserId === undefined) {
          console.log('[ProfileSelectorInterceptor] No child selected, forwarding request unchanged');
          return next.handle(req);
        }

        // Add forUserId to request body for POST/PUT requests, or to params for GET/DELETE
        if (req.method === 'POST' || req.method === 'PUT') {
          const body = typeof req.body === 'object' && req.body !== null
            ? { ...req.body, forUserId: String(forUserId) }
            : { forUserId: String(forUserId) };
          console.log('[ProfileSelectorInterceptor] Adding forUserId to body:', body);
          const modifiedReq = req.clone({ body });
          return next.handle(modifiedReq);
        } else {
          // For GET, DELETE, and other methods, add to params
          const newParams = req.params.set('forUserId', String(forUserId));
          const modifiedReq = req.clone({ params: newParams });
          return next.handle(modifiedReq);
        }
      })
    );
  }
}
