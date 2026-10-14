import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

/**
 * The SuperMeBE-compatible API (ARCHITECTURE.md section 20) — the same five calls the real
 * SuperMeApp frontend makes, at the same paths, with the same bodies. This file is deliberately a
 * thin, literal wrapper rather than something tidied up: its job is to be a reference for building
 * a replica of that frontend against this server.
 */

/** POST /v1/api/auth/send-otp and /verify-otp both answer with this. */
export interface OtpResponse {
  success: boolean;
  message: string;
  /** 4 on a successful verify — the step their frontend advances to. */
  nextStep: number | null;
  email: string | null;
  /** Always null: the code is only ever delivered to the inbox. */
  otp: string | null;
  identifierType: string | null;
  savedData: Record<string, unknown> | null;
}

export interface AlreadyRegisteredResponse {
  identifier: string;
  message: 'User already registered!' | 'User not found!';
  status: boolean;
}

/** The body POST /v1/auth/register takes — SuperMeBE's own RegisterRequest. */
export interface RegisterRequest {
  name: string;
  username?: string | null;
  gender: 'male' | 'female' | 'prefer_not_to_say';
  relationship: 'SELF' | 'PARENT' | 'CHILD';
  dateOfBirth: string;
  password?: string | null;
  email: string;
  phone?: string | null;
  countryCode?: string | null;
  avatarName?: string | null;
  avatarImageName?: string | null;
  petName?: string | null;
  familyCode?: string | null;
  familyName?: string | null;
  referralCode?: string | null;
  asChild?: boolean | null;
  unlockPotential?: boolean | null;
}

/**
 * What POST /v1/auth/register returns (201). Note this is a different, flatter shape than the user
 * object on the login response — that asymmetry is SuperMeBE's, reproduced faithfully.
 * isLoggedIn/emailVerified/enabled/lastLoginDate are never populated by their mapper, so they read
 * as false/null however the stored row actually looks.
 */
export interface RegisteredUser {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  relationship: string;
  loggedIn: boolean;
  emailVerified: boolean;
  enabled: boolean;
  onboardingStep: number;
  gender: string;
  dateOfBirth: string;
  dobChanged: boolean;
  usernameChanged: boolean;
  age: number;
  ageGroup: string;
  coins: number;
  currentStreak: number;
  highestStreak: number;
  lastLoginDate: string | null;
  createdDateTime: string;
  avatarName: string | null;
  avatarImageName: string | null;
  petName: string | null;
  familyCode: string | null;
  familyName: string | null;
  referralCode: string | null;
}

/** The nested user object on the login response. */
export interface LoginUser {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  gender: string;
  dateOfBirth: string;
  age: number;
  relationship: string;
  role: string;
  referralCode: string | null;
  onboardingStep: number;
  family: { id: number; familyCode: string; familyName: string } | null;
  familyMembers: unknown[];
  avatar: unknown | null;
  pet: unknown | null;
  lastDailyBonusDate: string | null;
  asChild: boolean | null;
  coins: number;
}

export interface LoginResponse {
  token: string;
  user: LoginUser;
  alreadyExistsUser: boolean | null;
  referralRewards: unknown[] | null;
  roleSwitchNotifications: unknown[] | null;
  firstLoggedForTheDay: boolean | null;
  /** Not in SuperMeBE's response: this server's access token is short-lived, so a client needs it. */
  refreshToken: string | null;
}

@Injectable({ providedIn: 'root' })
export class SupermeApiService {
  private readonly base = `${APP_CONFIG.authIssuer}/v1`;

  constructor(private readonly http: HttpClient) {}

  /** Step 1. Refused with 400 if an account already uses this address. */
  sendOtp(email: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.base}/api/auth/send-otp`, { email });
  }

  /** Step 2. The code is 4 digits, valid for 2 minutes, and single-use. */
  verifyOtp(email: string, otp: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.base}/api/auth/verify-otp`, { email, otp });
  }

  /** Step 3. An identifier containing '@' is looked up as an email, anything else as a phone. */
  checkAlreadyRegistered(identifier: string): Observable<AlreadyRegisteredResponse> {
    return this.http.get<AlreadyRegisteredResponse>(
      `${this.base}/auth/check/alreadyRegistered`,
      { params: new HttpParams().set('identifier', identifier) }
    );
  }

  /** Step 4. Must follow a successful verifyOtp for this address, or it is refused with 401. */
  register(request: RegisterRequest): Observable<RegisteredUser> {
    return this.http.post<RegisteredUser>(`${this.base}/auth/register`, request);
  }

  /** Step 5. Takes email or phone. */
  login(identifier: { email?: string; phone?: string }, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { ...identifier, password });
  }
}
