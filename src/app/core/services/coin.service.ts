import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { CoinApi } from '../api/coin.api';

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
    private coinHistorySubject = new BehaviorSubject<CoinHistoryItem[]>([]);
    public coinHistory$ = this.coinHistorySubject.asObservable();

    private totalCoinsSubject = new BehaviorSubject<number>(0);
    public totalCoins$ = this.totalCoinsSubject.asObservable();

    constructor(private coinApi: CoinApi) { }

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
}
