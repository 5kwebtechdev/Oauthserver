import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

/** Mirrors auth-server's AdminUserResponse, which is SuperMeBE's User seen through an admin lens. */
export interface AdminUser {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  /** Derived from the linked OAuth provider; LOCAL when there is none. */
  authProvider: string;
  onboardingStep: number | null;
  enabled: boolean;
  deleted: boolean;
  createdDateTime: string | null;
  lastLoginDate: string | null;
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  users: AdminUser[];
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  constructor(private readonly http: HttpClient) {}

  /** Paged: this lists the real SuperMeApp user table, which is far too big to fetch whole. */
  listUsers(page = 0, size = 50): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(
      `${APP_CONFIG.authIssuer}/api/admin/users?page=${page}&size=${size}`
    );
  }
}
