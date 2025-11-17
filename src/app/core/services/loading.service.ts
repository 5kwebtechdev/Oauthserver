import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface ShowOptions {
    /** delay before showing the loader (ms). If request completes before this, loader won't appear */
    delayMs?: number;
    /** minimum time the loader must remain visible once shown (ms) to avoid flicker */
    minVisibleMs?: number;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private _visible$ = new BehaviorSubject<boolean>(false);
    private _message$ = new BehaviorSubject<string | undefined>(undefined);

    // internal bookkeeping for pending show calls
    private _pending = new Map<string, { showTimer?: any; shown: boolean }>();
    private _activeCount = 0;
    private _showStart = 0;
    private _currentMinVisible = 0;

    get isLoading$(): Observable<boolean> {
        return this._visible$.asObservable();
    }

    get message$(): Observable<string | undefined> {
        return this._message$.asObservable();
    }

    /**
     * Show the loader. Returns a token string which can be passed to `hide(token)`.
     * Accepts optional debounce delay and minimum visible time to avoid flicker.
     */
    show(message?: string, opts: ShowOptions = {}): string {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const delay = opts.delayMs ?? 120; // default short debounce
        const minVisible = opts.minVisibleMs ?? 200; // default minimum visible time

        if (message !== undefined) {
            this._message$.next(message);
        }

        const record: { showTimer?: any; shown: boolean } = { shown: false };
        this._pending.set(id, record);

        record.showTimer = setTimeout(() => {
            // timer fired - actually show
            record.shown = true;
            this._pending.delete(id);
            this._activeCount++;
            // when first becomes visible, record timestamp and minVisible
            if (this._activeCount === 1) {
                this._showStart = Date.now();
                this._currentMinVisible = minVisible;
                this._visible$.next(true);
            }
        }, delay);

        return id;
    }

    /**
     * Hide loader for a specific token. If token is omitted, reduce one active count.
     */
    hide(token?: string): void {
        // If token maps to a pending show that hasn't fired, cancel it and return
        if (token && this._pending.has(token)) {
            const rec = this._pending.get(token)!;
            if (rec.showTimer) {
                clearTimeout(rec.showTimer);
            }
            this._pending.delete(token);
            // if there was a pending message and no other active/pending, clear message
            if (this._pending.size === 0 && this._activeCount === 0) {
                this._message$.next(undefined);
            }
            return;
        }

        // Otherwise, decrement active count
        if (this._activeCount > 0) {
            this._activeCount--;
        }

        if (this._activeCount === 0) {
            const elapsed = Date.now() - this._showStart;
            const remaining = Math.max(0, this._currentMinVisible - elapsed);
            if (remaining > 0) {
                setTimeout(() => this._finalizeHide(), remaining);
            } else {
                this._finalizeHide();
            }
        }
    }

    private _finalizeHide() {
        if (this._activeCount === 0 && this._pending.size === 0) {
            this._message$.next(undefined);
            this._visible$.next(false);
        }
    }

    /**
     * Immediately reset loader state (clear timers and hide)
     */
    reset() {
        this._pending.forEach(r => r.showTimer && clearTimeout(r.showTimer));
        this._pending.clear();
        this._activeCount = 0;
        this._message$.next(undefined);
        this._visible$.next(false);
    }
}
