import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * The response contract exposed by GET /eduhub/events.  Keeping this model
 * deliberately aligned with the live API avoids displaying Figma sample data
 * for fields the backend does not currently provide (for example, a schedule).
 */
export interface EduHubEventItem {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  entityType: string;
  /** Events are named by `title`; `name` is often intentionally empty. */
  name: string | null;
  title?: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  fee: number | null;
  imageUrls: string[];
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  accountStatus?: string | null;
  verified: boolean;
  latitude: number | null;
  longitude: number | null;
  exactLocation: string | null;
  unlocked: boolean;
  unlockCost: number | null;
  /** true if this viewer had already unlocked this listing before this response's call. */
  alreadySpentCoinsForThisProfile?: boolean;
  /** Coins actually deducted by the unlock-contact call that produced this response: 0 on a repeat unlock, unlockCost on the first. */
  coinsSpent?: number | null;
  /** Viewer's coin balance after the unlock-contact call; null when nothing was spent. */
  remainingBalance?: number | null;
  startDt?: string | null;
  endDt?: string | null;
  venue?: string | null;
  organizer?: string | null;
  contactPerson?: string | null;
  instructor?: string | null;
  isFree?: boolean | null;
  regLink?: string | null;
  description?: string | null;
  /** Total like count for this item. */
  champsLiked?: number | null;
  /** Whether the requesting user has liked this item. */
  likedBySelf?: boolean;
}

export interface EduHubEventPage {
  content: EduHubEventItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type EduHubEventEntityType = 'Events' | 'Workshop';

@Injectable({ providedIn: 'root' })
export class EduHubEventsService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getPage(
    entityType: EduHubEventEntityType,
    page: number,
    size = 20
  ): Observable<EduHubEventPage> {
    let params = new HttpParams()
      .set('entityType', entityType)
      .set('page', String(page))
      .set('size', String(size));

    const userId = this.authService.getUserId();
    if (userId != null) {
      params = params.set('forUserId', String(userId));
    }

    return this.http.get<EduHubEventPage>(`${environment.apiUrl}/eduhub/events`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * POST /eduhub/like?userId=&id=&like= — toggles the like state for an
   * EduHub item (event/workshop/shop listing). Returns the same DTO shape as
   * the list/detail endpoints, with `champsLiked`/`likedBySelf` refreshed.
   */
  toggleLike(itemId: number, like: boolean): Observable<Partial<EduHubEventItem>> {
    const userId = this.authService.getUserId();
    if (userId == null) {
      return throwError(() => new Error('Unable to identify your account. Please sign in again.'));
    }

    const params = new HttpParams()
      .set('userId', String(userId))
      .set('id', String(itemId))
      .set('like', String(like));

    return this.http.post<Partial<EduHubEventItem>>(
      `${environment.apiUrl}/eduhub/like`,
      null,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Reuses the established EduHub contact-unlock interaction already used by
   * directory listings. The returned record is intentionally partial because
   * protected fields are added only after the server authorises the unlock.
   */
  unlockContact(itemId: number): Observable<Partial<EduHubEventItem>> {
    const userId = this.authService.getUserId();
    if (userId == null) {
      return throwError(() => new Error('Unable to identify your account. Please sign in again.'));
    }

    const params = new HttpParams()
      .set('userId', String(userId))
      .set('id', String(itemId));

    return this.http.post<Partial<EduHubEventItem>>(
      `${environment.apiUrl}/eduhub/unlock-contact`,
      null,
      { headers: this.getHeaders(), params }
    );
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      Accept: 'application/json',
      'x-skip-loading': '1'
    });

    if (token) {
      headers = headers.set(
        'Authorization',
        token.startsWith('Bearer ') ? token : `Bearer ${token}`
      );
    }

    return headers;
  }
}
