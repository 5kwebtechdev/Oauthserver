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
  categoryId: number;
  categoryName: string;
  entityType: string;
  name: string;
  phone: string;
  email: string;
  bio: string;
  fee: number | null;
  imageUrls: string[];
  address: string;
  city: string;
  state: string;
  status: string;
  verified: boolean;
  latitude: number | null;
  longitude: number | null;
  exactLocation: string;
  unlocked: boolean;
  unlockCost: number | null;
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
    const params = new HttpParams()
      .set('entityType', entityType)
      .set('page', String(page))
      .set('size', String(size));

    return this.http.get<EduHubEventPage>(`${environment.apiUrl}/eduhub/events`, {
      headers: this.getHeaders(),
      params
    });
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
