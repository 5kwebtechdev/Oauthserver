import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { RefreshService } from '../../services/refresh.service';

@Injectable({ providedIn: 'root' })
export class NetworkIssueService {
  private _offline$ = new BehaviorSubject<boolean>(!navigator.onLine);
  readonly offline$: Observable<boolean> = this._offline$.asObservable();

  private _backOnline$ = new Subject<void>();
  readonly backOnline$: Observable<void> = this._backOnline$.asObservable();

  private _retry$ = new Subject<void>();
  readonly retry$ = this._retry$.asObservable();

  constructor(private refreshService: RefreshService) {
    window.addEventListener('online', () => {
      if (this._offline$.value) {
        this._offline$.next(false);
        this._backOnline$.next();
      }
    });
    window.addEventListener('offline', () => this._offline$.next(true));
  }

  show(): void { this._offline$.next(true); }
  hide(): void { this._offline$.next(false); }
  triggerRetry(): void { this._retry$.next(); }
  getOfflineState(): boolean { return this._offline$.value; }

  triggerDataRefresh(): void {
    this.refreshService.triggerRefresh().catch(() => {});
  }
}
