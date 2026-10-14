import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class TokenTestService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Calls the real /oauth2/token endpoint with grant_type=refresh_token directly - a
   * developer-facing test tool, not part of the app's own renewal flow (that's handled
   * by AuthService/the interceptor). Lets you paste any refresh token issued by this
   * auth-server and see the raw rotated response.
   */
  refreshAccessToken(refreshToken: string): Observable<TokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    body.set('client_id', APP_CONFIG.clientId);

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    return this.http.post<TokenResponse>(`${APP_CONFIG.authIssuer}/oauth2/token`, body.toString(), { headers });
  }
}
