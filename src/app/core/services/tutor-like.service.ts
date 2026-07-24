import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface TutorLikeState {
  liked: boolean;
  count: number;
  pending: boolean;
}

const STORAGE_KEY = 'mb_tutor_likes_v1';
const PENDING_KEY = 'mb_tutor_likes_pending_v1';

@Injectable({ providedIn: 'root' })
export class TutorLikeService {
  private states = new Map<string | number, BehaviorSubject<TutorLikeState>>();
  private bc: BroadcastChannel | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {
    // cross-tab sync
    try {
      // Use BroadcastChannel when available
      // @ts-ignore
      if (typeof BroadcastChannel !== 'undefined') {
        // @ts-ignore
        this.bc = new BroadcastChannel('mb_tutor_likes');
        this.bc.onmessage = (ev: any) => {
          const { tutorId, state } = ev.data || {};
          if (tutorId && state) {
            this.getSubject(tutorId).next(state);
          }
        };
      }
    } catch (e) {
      this.bc = null;
    }

    // retry pending actions on startup
    setTimeout(() => this.retryPending(), 1000);
  }

  private getSubject(tutorId: string | number): BehaviorSubject<TutorLikeState> {
    const key = String(tutorId);
    if (!this.states.has(key)) {
      // default empty state until initialized
      this.states.set(key, new BehaviorSubject<TutorLikeState>({ liked: false, count: 0, pending: false }));
    }
    return this.states.get(key)!;
  }

  reset(): void {
    this.states.forEach(subject => {
      subject.next({ liked: false, count: 0, pending: false });
    });
    this.states.clear();
    try {
      this.bc?.close();
    } catch {}
    this.bc = null;
  }

  watch(tutorId: string | number): Observable<TutorLikeState> {
    return this.getSubject(tutorId).asObservable();
  }

  initFromServer(tutor: any) {
    if (!tutor || !tutor.id) return;
    const id = String(tutor.id);
    const subj = this.getSubject(id);
    const persisted = this.loadUserLikes();
    const pending = this.loadPending();

    const base: TutorLikeState = {
      liked: !!(persisted[id] ?? tutor.likedByUser),
      count: typeof tutor.champsLiked === 'number' ? tutor.champsLiked : (Array.isArray(tutor.likes) ? tutor.likes.length : 0),
      pending: !!pending[id]
    };

    subj.next(base);
  }

  isLiked(tutorId: string | number): boolean {
    return this.getSubject(tutorId).value.liked;
  }

  getCount(tutorId: string | number): number {
    return this.getSubject(tutorId).value.count;
  }

  toggleLike(tutor: any): void {
    if (!tutor || !tutor.id) return;
    const id = String(tutor.id);
    const subj = this.getSubject(id);
    const prev = subj.value;
    if (prev.pending) return; // avoid duplicate

    const newState: TutorLikeState = {
      liked: !prev.liked,
      count: prev.liked ? Math.max(0, prev.count - 1) : prev.count + 1,
      pending: true
    };

    subj.next(newState);
    this.broadcast(id, newState);
    this.saveUserLike(id, newState.liked);
    this.savePending(id, true);

    // Perform API call
    const url = `${environment.apiUrl}/tutors/like?tutorId=${encodeURIComponent(id)}`;
    let tokenValue: string | null = this.auth.getToken() || null;
    if (!tokenValue && localStorage.getItem('auth_token')) tokenValue = localStorage.getItem('auth_token');
    if (!tokenValue && environment.apiAuthToken) tokenValue = environment.apiAuthToken;
    if (tokenValue && !tokenValue.toLowerCase().startsWith('bearer ')) tokenValue = 'Bearer ' + tokenValue;
    const headers = tokenValue ? new HttpHeaders({ Authorization: tokenValue }) : undefined as any;

    this.http.post<{ champsLiked?: number; liked?: boolean }>(url, {}, { headers })
      .subscribe({
        next: (res) => {
          const settled: TutorLikeState = {
            liked: typeof res.liked === 'boolean' ? res.liked : newState.liked,
            count: typeof res.champsLiked === 'number' ? res.champsLiked : newState.count,
            pending: false
          };
          subj.next(settled);
          this.broadcast(id, settled);
          this.saveUserLike(id, settled.liked);
          this.savePending(id, false);
        },
        error: (err) => {
          // rollback to previous state
          subj.next({ ...prev, pending: false });
          this.broadcast(id, subj.value);
          this.saveUserLike(id, prev.liked);
          this.savePending(id, false);
          console.error('[TutorLikeService] toggle error', err);
        }
      });
  }

  private broadcast(tutorId: string | number, state: TutorLikeState) {
    try {
      if (this.bc) this.bc.postMessage({ tutorId, state });
      // also write to localStorage key to trigger storage event
      localStorage.setItem(`mb_tutor_likes_last_${tutorId}`, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  // ---------------- Persistence helpers ----------------
  private loadUserLikes(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  private saveUserLike(id: string, liked: boolean) {
    const map = this.loadUserLikes();
    map[id] = liked;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (e) { }
  }

  private loadPending(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  private savePending(id: string, pending: boolean) {
    const map = this.loadPending();
    if (pending) map[id] = true; else delete map[id];
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(map)); } catch (e) { }
  }

  private retryPending() {
    const pending = this.loadPending();
    Object.keys(pending).forEach(id => {
      // for each pending action, re-run toggle to reconcile
      const subj = this.getSubject(id);
      const cur = subj.value;
      if (cur.pending) {
        // call API to confirm
        const url = `${environment.apiUrl}/tutors/like?tutorId=${encodeURIComponent(id)}`;
        let tokenValue: string | null = this.auth.getToken() || null;
        if (!tokenValue && localStorage.getItem('auth_token')) tokenValue = localStorage.getItem('auth_token');
        if (!tokenValue && environment.apiAuthToken) tokenValue = environment.apiAuthToken;
        if (tokenValue && !tokenValue.toLowerCase().startsWith('bearer ')) tokenValue = 'Bearer ' + tokenValue;
        const headers = tokenValue ? new HttpHeaders({ Authorization: tokenValue }) : undefined as any;
        this.http.post<{ champsLiked?: number; liked?: boolean }>(url, {}, { headers })
          .subscribe({
            next: (res) => {
              const settled: TutorLikeState = {
                liked: typeof res.liked === 'boolean' ? res.liked : cur.liked,
                count: typeof res.champsLiked === 'number' ? res.champsLiked : cur.count,
                pending: false
              };
              subj.next(settled);
              this.saveUserLike(id, settled.liked);
              this.savePending(id, false);
              this.broadcast(id, settled);
            },
            error: () => {
              // clear pending flag locally
              subj.next({ ...cur, pending: false });
              this.savePending(id, false);
              this.broadcast(id, subj.value);
            }
          });
      }
    });
  }
}
