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
        // If no child selected, forward request unchanged
        if (forUserId === null || forUserId === undefined) {
          return next.handle(req);
        }

        // Add forUserId to all requests
        const newParams = req.params.set('forUserId', String(forUserId));
        const modifiedReq = req.clone({ params: newParams });

        return next.handle(modifiedReq);
      })
    );
  }
}
