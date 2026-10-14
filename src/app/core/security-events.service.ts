import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

export interface SecurityEvent {
  id: number;
  eventType: string;
  identifier: string | null;
  ipAddress: string | null;
  details: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SecurityEventsService {
  constructor(private readonly http: HttpClient) {}

  listRecent(): Observable<SecurityEvent[]> {
    return this.http.get<SecurityEvent[]>(`${APP_CONFIG.authIssuer}/api/admin/security-events`);
  }
}
