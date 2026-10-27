import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { CoinApi } from '../api/coin.api';
import { AuthService } from './auth.service';

export interface CoinHistoryItem {
    id: number;
    habit: any | null;
    task: any | null;
    amount: number;
    type: string;
    timestamp: string;
    description: string;
    thumbnailUrl?: string | null;
}

export interface CoinHistory {
    history: CoinHistoryItem[];
    status: number;
}

@Injectable({
    providedIn: 'root'
})
export class CoinService {
    private accountRequestId = 0;
    private coinHistorySubject = new BehaviorSubject<CoinHistoryItem[]>([]);
    public coinHistory$ = this.coinHistorySubject.asObservable();

    private totalCoinsSubject = new BehaviorSubject<number>(0);
    public totalCoins$ = this.totalCoinsSubject.asObservable();

    constructor(private coinApi: CoinApi, private auth: AuthService) { }

    /** Parent wallet and header share the authenticated account's server balance. */
    loadAccountCoinHistory(): Observable<any> {
        const accountId = this.auth.getUserId();
        const requestId = ++this.accountRequestId;
        return this.coinApi.getCoinHistory(true).pipe(
            tap(response => {
                if (this.auth.getUserId() !== accountId || requestId !== this.accountRequestId) return;
                const balance = response?.totalCoins;
                if (balance == null || balance === '' || typeof balance === 'boolean') return;
                const coins = Number(balance);
                if (!Number.isFinite(coins) || coins < 0) return;
                this.auth.updateUserData({ coins });
            })
        );
    }

    /**
     * Load coin history from API
     */
    loadCoinHistory(): Observable<any> {
        return this.coinApi.getCoinHistory().pipe(
            tap(response => {
                if (response && response.history) {
                    this.coinHistorySubject.next(response.history);
                    const historyTotal = response.history.reduce(
                        (sum: number, item: CoinHistoryItem) => sum + Number(item.amount || 0),
                        0
                    );
                    const responseTotal = Number(response.totalCoins);
                    const total = response.totalCoins != null && Number.isFinite(responseTotal)
                        ? Math.max(0, responseTotal)
                        : Math.max(0, historyTotal);
                    this.totalCoinsSubject.next(total);
                }
            }),
            catchError(error => {
                console.error('Error fetching coin history:', error);
                this.coinHistorySubject.next([]);
                this.totalCoinsSubject.next(0);
                return of({ history: [], status: 0 });
            })
        );
    }

    /**
     * Get current coin history
     */
    getCoinHistory(): CoinHistoryItem[] {
        return this.coinHistorySubject.value;
    }

    /**
     * Get total coins
     */
    getTotalCoins(): number {
        return this.totalCoinsSubject.value;
    }

    reset(): void {
        this.accountRequestId++;
        this.coinHistorySubject.next([]);
        this.totalCoinsSubject.next(0);
    }
}
