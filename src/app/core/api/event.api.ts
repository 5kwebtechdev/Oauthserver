import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

export interface EventTypeDto {
  id: number;
  name: string;
  system: boolean;
  userId: number | null;
}

export interface EventPayload {
  name: string;
  isPrivate: boolean;
  highPriority: boolean;
  eventType: string;
  allDay: boolean;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  recurrence: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  reminderMinutesBefore?: number | null;
  note?: string | null;
}

export interface EventDto extends EventPayload {
  id: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/** User-facing Planner Event endpoints. Timetable remains on CalendarApi. */
@Injectable({ providedIn: 'root' })
export class EventApi {
  private readonly base = environment.apiUrl || '';
  private readonly cachedEvents = new Map<number, EventDto>();

  constructor(private readonly http: HttpClient, private readonly authApi: AuthApi) {}

  getEventTypes(): Observable<EventTypeDto[]> {
    return this.http.get<EventTypeDto[]>(`${this.base}/events/types`, { headers: this.headers() });
  }

  createEventType(name: string): Observable<EventTypeDto> {
    return this.http.post<EventTypeDto>(`${this.base}/events/types`, { name }, { headers: this.headers() });
  }

  deleteEventType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/types/${id}`, { headers: this.headers() });
  }

  createEvent(payload: EventPayload): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.base}/events/add`, payload, { headers: this.headers() });
  }

  updateEvent(id: string | number, payload: EventPayload): Observable<EventDto> {
    return this.http.put<EventDto>(`${this.base}/events/update/${id}`, payload, { headers: this.headers() });
  }

  getEvents(): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(`${this.base}/events/all`, { headers: this.headers() }).pipe(
      tap(events => {
        this.cachedEvents.clear();
        (events || []).forEach(event => this.cachedEvents.set(Number(event.id), event));
      })
    );
  }

  getCachedEvent(id: string | number | null | undefined): EventDto | null {
    if (id === null || id === undefined) return null;
    return this.cachedEvents.get(Number(id)) || null;
  }

  getEvent(id: string | number): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.base}/events/${id}`, { headers: this.headers() });
  }

  deleteEvent(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/delete/${id}`, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    } else if (environment.apiAuthToken) {
      const fallback = environment.apiAuthToken.startsWith('Bearer ')
        ? environment.apiAuthToken
        : `Bearer ${environment.apiAuthToken}`;
      headers = headers.set('Authorization', fallback);
    }

    return headers;
  }
}
