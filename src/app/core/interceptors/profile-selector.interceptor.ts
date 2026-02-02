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

        // If no valid child id selected, forward request unchanged
        const idStr = forUserId === null || forUserId === undefined ? null : String(forUserId);
        if (!idStr || idStr.trim() === '' || idStr.toLowerCase() === 'nan') {
          console.log('[ProfileSelectorInterceptor] No valid child id selected, forwarding request unchanged', forUserId);
          return next.handle(req);
        }

        // Add forUserId to request body for POST/PUT requests, or to params for GET/DELETE
        if (req.method === 'POST' || req.method === 'PUT') {
          const body = typeof req.body === 'object' && req.body !== null
            ? { ...req.body, forUserId: idStr }
            : { forUserId: idStr };
          console.log('[ProfileSelectorInterceptor] Adding forUserId to body:', body);
          const modifiedReq = req.clone({ body });
          return next.handle(modifiedReq);
        } else {
          // For GET, DELETE, and other methods, add to params
          const newParams = req.params.set('forUserId', idStr as string);
          const modifiedReq = req.clone({ params: newParams });
          return next.handle(modifiedReq);
        }
      })
    );
  }
}
