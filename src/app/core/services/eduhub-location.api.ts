import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface EduHubResolvedLocation {
  country: string;
  state: string;
  city: string;
  source: 'device' | 'ip' | 'default';
}

@Injectable({ providedIn: 'root' })
export class EduHubLocationApi {
  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  resolve(coords?: { lat: number; lng: number }): Observable<EduHubResolvedLocation> {
    const token = this.auth.getToken();
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    // No coordinates are sent after permission denial or geolocation failure.
    return this.http.post<EduHubResolvedLocation>(
      `${environment.apiUrl}/eduhub/location/resolve`,
      coords ? { lat: coords.lat, lng: coords.lng } : {},
      { headers }
    );
  }
}
