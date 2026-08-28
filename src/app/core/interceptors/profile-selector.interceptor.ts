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
import { ChildInfo } from '../models/child-info.model';

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

  /**
   * Keep profile-scoped requests internally consistent. A legacy caller may
   * already have added the authenticated parent's age before this interceptor
   * adds/recognises the selected child's forUserId. In that case always
   * replace it with the selected child's age (preferably derived from DOB).
   */
  private applySelectedChildAge(
    req: HttpRequest<any>,
    requestUserId: string | null,
  ): HttpRequest<any> {
    const child = this.profileSelector.getSelectedChild();
    const childId = this.validUserId(child?.id);
    if (!childId || !requestUserId || childId !== requestUserId) return req;

    const age = this.getChildAge(child);
    const params = age === null
      ? req.params.delete('age')
      : req.params.set('age', String(age));
    return req.clone({ params });
  }

  private getChildAge(child: ChildInfo | null): number | null {
    const dateOfBirth = String(child?.dateOfBirth || '').trim();
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (!Number.isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age >= 0) return age;
      }
    }

    const rawAge = child?.age;
    const age = rawAge === null || rawAge === undefined || String(rawAge).trim() === ''
      ? Number.NaN
      : Number(rawAge);
    return Number.isFinite(age) && age >= 0 ? Math.floor(age) : null;
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
          return next.handle(this.applySelectedChildAge(req, explicitUserId));
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
          const modifiedReq = this.applySelectedChildAge(
            req.clone({ params: newParams }),
            idStr,
          );
          return next.handle(modifiedReq);
        }
      })
    );
  }
}
