import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type EligibilityRole = 'SELF' | 'CHILD' | 'PARENT' | 'CO_PARENT' | 'FAMILY_CREATOR';

export interface EligibilityOption {
  role: EligibilityRole;
  eligible: boolean;
  current: boolean;
  reason: string | null;
  action: string | null;
}

export interface OnboardingEligibilityResponse {
  age: number;
  ageGroup: string;
  eligibleToOnboard: boolean;
  selfLocked: boolean;
  roles: EligibilityOption[];
}

export interface RoleEligibilityResponse {
  age: number;
  currentRole: 'SELF' | 'CHILD' | 'PARENT';
  linked: boolean | null;
  ageLocked: boolean;
  ageSwitchConfirmationRequired: boolean;
  options: EligibilityOption[];
}

@Injectable({ providedIn: 'root' })
export class RoleEligibilityService {
  private readonly baseUrl = `${environment.apiUrl}/role-eligibility`;
  private readonly publicHttp: HttpClient;

  constructor(private http: HttpClient, private auth: AuthService, backend: HttpBackend) {
    // The onboarding rule check is public and must not inherit an old login
    // token or a selected child from the authenticated app interceptors.
    this.publicHttp = new HttpClient(backend);
  }

  onboarding(age: number): Observable<OnboardingEligibilityResponse> {
    return this.publicHttp.get<OnboardingEligibilityResponse>(`${this.baseUrl}/onboarding`, {
      params: new HttpParams().set('age', age),
    });
  }

  options(age: number, currentRole: 'SELF' | 'CHILD' | 'PARENT', linked?: boolean): Observable<RoleEligibilityResponse> {
    let params = new HttpParams().set('age', age).set('currentRole', currentRole);
    if (currentRole === 'CHILD' && linked !== undefined) params = params.set('linked', linked);
    const token = this.auth.getToken();
    const bearer = token?.startsWith('Bearer ') ? token : token ? `Bearer ${token}` : '';
    return this.http.get<RoleEligibilityResponse>(`${this.baseUrl}/options`, {
      params,
      headers: new HttpHeaders({
        ...(bearer ? { Authorization: bearer } : {}),
        'X-Skip-Profile-Selector': 'true',
      }),
    });
  }

  confirmAgeSwitch(): Observable<unknown> {
    const token = this.auth.getToken();
    const bearer = token?.startsWith('Bearer ') ? token : token ? `Bearer ${token}` : '';
    return this.http.post(`${environment.apiUrl}/family/confirm-age-switch`, null, {
      headers: new HttpHeaders({
        ...(bearer ? { Authorization: bearer } : {}),
        'X-Skip-Profile-Selector': 'true',
      }),
    });
  }
}
