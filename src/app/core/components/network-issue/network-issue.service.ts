import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkIssueService {
  private _offline$ = new BehaviorSubject<boolean>(!navigator.onLine);
  readonly offline$: Observable<boolean> = this._offline$.asObservable();

  private _retry$ = new Subject<void>();
  readonly retry$ = this._retry$.asObservable();

  constructor() {
    // Keep the state in sync with browser online/offline events
    window.addEventListener('online', () => this._offline$.next(false));
    window.addEventListener('offline', () => this._offline$.next(true));
  }

  show(): void { this._offline$.next(true); }
  hide(): void { this._offline$.next(false); }
  triggerRetry(): void { this._retry$.next(); }
  getOfflineState(): boolean { return this._offline$.value; }
}
