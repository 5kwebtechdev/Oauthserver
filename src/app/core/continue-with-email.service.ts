import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

export interface ContinueWithEmailRequestResponse {
  exists: boolean;
  message: string;
}

export interface ContinueWithEmailVerifyResponse {
  username: string;
  newUser: boolean;
  redirectTo: string;
}

/**
 * Passwordless login by emailed one-time code. /request reports whether a SuperMeApp account
 * exists for the address (and only sends a code if one does), then /verify signs that account in,
 * establishing auth-server's session cookie the same way Google sign-in does.
 *
 * Login only - it used to register a new account for an unknown address, which is no longer
 * possible: accounts live in SuperMeBE's own user table, whose required fields (name, gender, date
 * of birth, relationship) only its onboarding collects. An unknown address is told to register in
 * the app first.
 */
@Injectable({ providedIn: 'root' })
export class ContinueWithEmailService {
  private readonly base = `${APP_CONFIG.authIssuer}/api/auth/continue-with-email`;

  constructor(private readonly http: HttpClient) {}

  requestAccount(email: string, captchaToken?: string): Observable<ContinueWithEmailRequestResponse> {
    return this.http.post<ContinueWithEmailRequestResponse>(
      `${this.base}/request`,
      { email, captchaToken },
      { withCredentials: true }
    );
  }

  verify(email: string, otp: string): Observable<ContinueWithEmailVerifyResponse> {
    return this.http.post<ContinueWithEmailVerifyResponse>(
      `${this.base}/verify`,
      { email, otp },
      { withCredentials: true }
    );
  }
}
