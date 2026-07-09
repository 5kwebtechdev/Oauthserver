import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartService {
    private _count = new BehaviorSubject<number>(0);
    readonly count$ = this._count.asObservable();

    get count(): number { return this._count.getValue(); }

    constructor(private http: HttpClient, private authService: AuthService) {
        // Load real count as soon as the service is created (happens on app boot)
        this.refresh();
    }

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });
    }

    /** Fetch live cart count from API and update the shared BehaviorSubject. */
    refresh(): void {
        const userId = this.authService.getUserId();
        const url = userId
            ? `${environment.apiUrl}/cart?forUserId=${userId}`
            : `${environment.apiUrl}/cart`;
        this.http.get<any>(url, { headers: this.headers() }).subscribe({
            next: (res) => {
                const count = res?.itemCount ?? res?.totalQuantity
                    ?? (Array.isArray(res?.items) ? res.items.length : 0);
                this._count.next(Number(count) || 0);
            },
            error: () => { /* keep existing count on error */ }
        });
    }

    /** Call after adding an item — increments count immediately without a round-trip. */
    increment(by = 1): void {
        this._count.next(this._count.getValue() + by);
    }

    /** Reset to 0 (e.g. after clear cart). */
    reset(): void {
        this._count.next(0);
    }

    /** Update to an explicit value (e.g. after loading cart page). */
    set(count: number): void {
        this._count.next(count);
    }
}
