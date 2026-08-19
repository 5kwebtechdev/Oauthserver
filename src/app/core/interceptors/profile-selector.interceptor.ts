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

  private validUserId(value: unknown): string | null {
    const id = value === null || value === undefined ? '' : String(value).trim();
    return id && id.toLowerCase() !== 'nan' && id.toLowerCase() !== 'null'
      ? id
      : null;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Account-level actions (such as a parent creating a child account) must
    // always run as the authenticated user. They must never receive the
    // dashboard's currently selected child as `forUserId`.
    if (req.headers.get('X-Skip-Profile-Selector') === 'true') {
      return next.handle(req.clone({
        headers: req.headers.delete('X-Skip-Profile-Selector')
      }));
    }

    // Course assignment already receives the selected child in `childIds`.
    // Do not append the profile-selector `forUserId`, because this endpoint's
    // request contract is intentionally limited to courseId and childIds.
    if (req.url.includes('/courses/assign')) {
      return next.handle(req);
    }

    return this.profileSelector.child$.pipe(
      take(1),
      switchMap((forUserId) => {
        const requestBody = typeof req.body === 'object' && req.body !== null
          ? req.body as Record<string, unknown>
          : null;
        const explicitUserId = this.validUserId(requestBody?.['forUserId'])
          ?? this.validUserId(req.params.get('forUserId'));

        // A request that explicitly chooses its user context (for example,
        // checkout for the authenticated parent) must not be overwritten by
        // the child currently selected in the parent dashboard.
        if (explicitUserId) {
          return next.handle(req);
        }

        // If no valid child id selected, forward request unchanged
        const idStr = this.validUserId(forUserId);
        if (!idStr) {
          return next.handle(req);
        }

        // Add forUserId to request body for POST/PUT requests, or to params for GET/DELETE
        if (req.method === 'POST' || req.method === 'PUT') {
          const body = typeof req.body === 'object' && req.body !== null
            ? { ...req.body, forUserId: idStr }
            : { forUserId: idStr };
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
