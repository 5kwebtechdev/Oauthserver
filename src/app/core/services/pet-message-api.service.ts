import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthApi } from '../api/auth.api';
import { PetMood } from './pet-messages.service';

export type ApiOverlayType = 'BONUS_COINS' | 'MOOD_PROMPT' | 'DAILY_LOGIN' | 'STREAK_MILESTONE' | 'NONE';
export type ApiPetMoodRaw = 'HAPPINESS' | 'PLAYFUL' | 'BASE' | 'TIRED' | 'CURIOUS';

export interface PetMessageApiResponse {
  petMood?: ApiPetMoodRaw;
  message: string;
  petAgeStage?: 1 | 2 | 3;
  overlayType?: ApiOverlayType;
  hasOverlay?: boolean;
  streakMilestone?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PetMessageApiService {
  private readonly base = environment.apiUrl;

  // Maps API mood values → frontend PetMood type
  private readonly MOOD_MAP: Record<string, PetMood> = {
    HAPPINESS: 'happy',
    PLAYFUL:   'playful',
    BASE:      'base',
    TIRED:     'tired',
    CURIOUS:   'curious',
  };

  constructor(private http: HttpClient, private authApi: AuthApi) {}

  // ── Auth headers ────────────────────────────────────────────────────────────
  private headers(): HttpHeaders {
    const token = this.authApi.getToken();
    let h = new HttpHeaders();
    if (token) h = h.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    return h;
  }

  /** Normalise API PetMood → frontend PetMood, with graceful fallback */
  normaliseMood(raw?: string): PetMood {
    if (!raw) return 'base';
    return this.MOOD_MAP[raw.toUpperCase()] || 'base';
  }

  // ── Home overlay ────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/home/overlay */
  getHomeOverlay(strict = false): Observable<PetMessageApiResponse> {
    const request = this.http.get<PetMessageApiResponse>(`${this.base}/pet-message/home/overlay`, { headers: this.headers() });
    return strict ? request : request.pipe(catchError(() => of({ message: '', hasOverlay: false, overlayType: 'NONE' as ApiOverlayType })));
  }

  /** POST /v1/pet-message/home/overlay/dismiss?type=<overlayType> */
  dismissHomeOverlay(type: ApiOverlayType): Observable<any> {
    return this.http
      .post(`${this.base}/pet-message/home/overlay/dismiss`, null, {
        headers: this.headers(),
        params: new HttpParams().set('type', type),
      })
      .pipe(catchError(() => of(null)));
  }

  // ── Home header ─────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/home/header */
  getHomeHeader(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/home/header`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Coins screen ─────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/coins */
  getCoinsMessage(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/coins`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/leaderboard?rank=<rank> */
  getLeaderboardMessage(rank: number = 0): Observable<PetMessageApiResponse> {
    const params = new HttpParams().set('rank', String(rank));
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/leaderboard`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Learning ─────────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/learning */
  getLearningMessage(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/learning`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  /** GET /v1/pet-message/learning/result?scoreType=<type> */
  getLearningResult(scoreType: 'ALL_CORRECT' | 'GOOD_SCORE' | 'LOW_SCORE'): Observable<PetMessageApiResponse> {
    const params = new HttpParams().set('scoreType', scoreType);
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/learning/result`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  /** GET /v1/pet-message/learning/blank */
  getLearningBlank(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/learning/blank`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Tutors ───────────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/tutors */
  getTutorsMessage(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/tutors`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Academy ──────────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/academy */
  getAcademyMessage(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/academy`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Child blank states ────────────────────────────────────────────────────────
  /**
   * GET /v1/pet-message/blank/child?type=<type>[&routine=<routine>][&priority=<priority>]
   */
  getChildBlank(
    type: 'PENDING' | 'ONGOING' | 'COMPLETED',
    routine?: 'MORNING' | 'EVENING' | 'NIGHT',
    priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  ): Observable<PetMessageApiResponse> {
    let params = new HttpParams().set('type', type);
    if (routine)  params = params.set('routine', routine);
    if (priority) params = params.set('priority', priority);
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/blank/child`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Parent blank states ───────────────────────────────────────────────────────
  /**
   * GET /v1/pet-message/blank/parent?type=<type>[&routine=<routine>][&priority=<priority>]
   */
  getParentBlank(
    type: 'PENDING' | 'ONGOING' | 'COMPLETED',
    routine?: 'MORNING' | 'EVENING' | 'NIGHT',
    priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  ): Observable<PetMessageApiResponse> {
    let params = new HttpParams().set('type', type);
    if (routine)  params = params.set('routine', routine);
    if (priority) params = params.set('priority', priority);
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/blank/parent`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Activity card messages ────────────────────────────────────────────────────
  /** GET /v1/pet-message/activity/completed */
  getActivityCompleted(): Observable<PetMessageApiResponse> {
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/activity/completed`, { headers: this.headers() })
      .pipe(catchError(() => of({ message: '' })));
  }

  /** GET /v1/pet-message/activity/user-note?note=<encoded> */
  getActivityUserNote(note: string): Observable<PetMessageApiResponse> {
    const params = new HttpParams().set('note', encodeURIComponent(note));
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/activity/user-note`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  /** GET /v1/pet-message/activity/parent-note?note=<encoded> */
  getActivityParentNote(note: string): Observable<PetMessageApiResponse> {
    const params = new HttpParams().set('note', encodeURIComponent(note));
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/activity/parent-note`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── My Family ────────────────────────────────────────────────────────────────
  /** GET /v1/pet-message/family?type=SELF_MODE|INDEPENDENT_GROWTH */
  getFamilyMessage(type: 'SELF_MODE' | 'INDEPENDENT_GROWTH'): Observable<PetMessageApiResponse> {
    const params = new HttpParams().set('type', type);
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/family`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }

  // ── Parental control ─────────────────────────────────────────────────────────
  /** GET /v1/pet-message/parental-control?type=FREE_SCREEN_TIME|ALL_APPS_AVAILABLE */
  getParentalControlMessage(type: 'FREE_SCREEN_TIME' | 'ALL_APPS_AVAILABLE'): Observable<PetMessageApiResponse> {
    const params = new HttpParams().set('type', type);
    return this.http
      .get<PetMessageApiResponse>(`${this.base}/pet-message/parental-control`, { headers: this.headers(), params })
      .pipe(catchError(() => of({ message: '' })));
  }
}
