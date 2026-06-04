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
    private _safetyTimer?: any;
    private readonly SAFETY_TIMEOUT = 10000; // 10 seconds - auto-hide stuck loaders (reduced from 30s)

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

        // Debug: report show call parameters and current internal state
        try {
            console.debug('[LoadingService] show() ->', { id, message, delay, minVisible, pendingBefore: this._pending.size, activeCount: this._activeCount });
        } catch (e) {
            // ignore logging failures
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

                // Start safety timer to auto-hide if loader gets stuck
                this._startSafetyTimer();
            }
        }, delay);

        return id;
    }

    /**
     * Hide loader for a specific token. If token is omitted, reduce one active count.
     */
    hide(token?: string): void {
        try {
            console.debug('[LoadingService] hide() called', { token, pendingBefore: this._pending.size, activeCountBefore: this._activeCount });
        } catch (e) { }
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
            try { console.debug('[LoadingService] hide() -> cancelled pending show', { token, pendingAfter: this._pending.size, activeCount: this._activeCount }); } catch (e) { }
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
        try {
            console.debug('[LoadingService] _finalizeHide', { activeCount: this._activeCount, pending: this._pending.size });
        } catch (e) { }

        if (this._activeCount === 0 && this._pending.size === 0) {
            this._clearSafetyTimer();
            this._message$.next(undefined);
            this._visible$.next(false);
        }
    }

    /**
     * Force hide the loader immediately (useful for stuck loaders)
     */
    forceHide(): void {
        try {
            console.warn('[LoadingService] forceHide() called - forcibly hiding loader');
        } catch (e) { }
        this._pending.forEach(r => {
            if (r.showTimer) {
                clearTimeout(r.showTimer);
            }
        });
        this._pending.clear();
        this._activeCount = 0;
        this._clearSafetyTimer();
        this._message$.next(undefined);
        this._visible$.next(false);
    }

    /**
     * Start a safety timer to auto-hide loader if it gets stuck
     */
    private _startSafetyTimer() {
        this._clearSafetyTimer();
        this._safetyTimer = setTimeout(() => {
            if (this._visible$.value) {
                console.warn('[LoadingService] Safety timeout triggered - force hiding stuck loader');
                this.reset();
            }
        }, this.SAFETY_TIMEOUT);
    }

    /**
     * Clear the safety timer
     */
    private _clearSafetyTimer() {
        if (this._safetyTimer) {
            clearTimeout(this._safetyTimer);
            this._safetyTimer = undefined;
        }
    }

    /**
     * Immediately reset loader state (clear timers and hide)
     */
    reset() {
        try { console.debug('[LoadingService] reset() - clearing pending and hiding'); } catch (e) { }
        this._pending.forEach(r => r.showTimer && clearTimeout(r.showTimer));
        this._pending.clear();
        this._activeCount = 0;
        this._clearSafetyTimer();
        this._message$.next(undefined);
        this._visible$.next(false);
    }
}
