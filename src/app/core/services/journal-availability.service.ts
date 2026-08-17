import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthApi } from '../api/auth.api';

export interface JournalAvailabilityResponse {
  allowForTheDay: boolean;
}

@Injectable({ providedIn: 'root' })
export class JournalAvailabilityService {
  constructor(
    private http: HttpClient,
    private authApi: AuthApi
  ) { }

  allowForTheDay(): Observable<JournalAvailabilityResponse> {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }

    return this.http.get<JournalAvailabilityResponse>(
      `${environment.apiUrl}/journal/allowForTheDay`,
      { headers }
    );
  }
}
