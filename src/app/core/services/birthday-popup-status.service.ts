import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { CoinApi } from '../api/coin.api';

@Injectable({ providedIn: 'root' })
export class BirthdayPopupStatusService {
  private readonly requests = new Map<string, Observable<boolean>>();
  private readonly states = new Map<string, 'eligible' | 'consumed'>();

  constructor(private coinApi: CoinApi) {}

  /** One backend read for a user in this login; a displayed popup is consumed immediately. */
  checkOnce(userId: number): Observable<boolean> {
    const key = this.keyFor(userId);
    const request = this.requests.get(key);
    if (request) return request;

    const saved = this.readState(key);
    if (saved) return of(saved === 'eligible');

    const status$ = this.coinApi.getBirthdayPopupStatus().pipe(
      map(status => {
        const eligible = status?.shouldShowPopup === true;
        this.saveState(key, eligible ? 'eligible' : 'consumed');
        return eligible;
      }),
      catchError(() => {
        // A failed request must never open the dialog from local DOB data.
        this.saveState(key, 'consumed');
        return of(false);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.requests.set(key, status$);
    return status$;
  }

  consume(userId: number): boolean {
    const key = this.keyFor(userId);
    if (this.readState(key) !== 'eligible') return false;
    this.saveState(key, 'consumed');
    return true;
  }

  private keyFor(userId: number): string {
    const loginTime = localStorage.getItem('login_time') || 'current';
    return `birthday_popup_status_${userId}_${loginTime}`;
  }

  private readState(key: string): 'eligible' | 'consumed' | null {
    const memory = this.states.get(key);
    if (memory) return memory;
    try {
      const saved = sessionStorage.getItem(key);
      return saved === 'eligible' || saved === 'consumed' ? saved : null;
    } catch { return null; }
  }

  private saveState(key: string, state: 'eligible' | 'consumed'): void {
    this.states.set(key, state);
    try { sessionStorage.setItem(key, state); } catch { /* In-memory deduplication still applies. */ }
  }
}
