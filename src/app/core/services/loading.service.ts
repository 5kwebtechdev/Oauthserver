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
            // Keep the token registered after it becomes visible. Previously
            // it was deleted here, so hide(token) could not identify the
            // request and merely decremented a shared counter. With several
            // concurrent requests that allowed one request (or a duplicate
            // hide) to release another request's loader.
            const current = this._pending.get(id);
            if (!current) return;
            current.showTimer = undefined;
            current.shown = true;
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
        if (token) {
            const rec = this._pending.get(token);
            // A completed token may be hidden again by an RxJS error/finalize
            // chain. Treat that as a no-op instead of decrementing another
            // active request.
            if (!rec) return;

            if (rec.showTimer) clearTimeout(rec.showTimer);
            this._pending.delete(token);
            if (rec.shown && this._activeCount > 0) this._activeCount--;

            this._hideWhenIdle();
            try { console.debug('[LoadingService] hide() -> released token', { token, pendingAfter: this._pending.size, activeCount: this._activeCount }); } catch (e) { }
            return;
        }

        // Backward compatibility for older callers that did not retain the
        // token returned by show(): release one tracked request, preferring a
        // visible one over a still-delayed one.
        const tracked = Array.from(this._pending.entries());
        const fallback = tracked.find(([, rec]) => rec.shown) ?? tracked[0];
        if (fallback) {
            const [id, rec] = fallback;
            if (rec.showTimer) clearTimeout(rec.showTimer);
            this._pending.delete(id);
            if (rec.shown && this._activeCount > 0) this._activeCount--;
        } else if (this._activeCount > 0) {
            this._activeCount--;
        }

        this._hideWhenIdle();
    }

    private _hideWhenIdle(): void {
        if (this._activeCount !== 0 || this._pending.size !== 0) return;

        const elapsed = Date.now() - this._showStart;
        const remaining = Math.max(0, this._currentMinVisible - elapsed);
        if (remaining > 0) {
            setTimeout(() => this._finalizeHide(), remaining);
        } else {
            this._finalizeHide();
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
