import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import type { CoinHistory } from '../services/coin.service';

@Injectable({ providedIn: 'root' })
export class CoinApi {
    private readonly base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    /**
     * Get coin history for the user
     * @returns Observable with coin transaction history
     */
    getCoinHistory(page = 0, size = 50): Observable<CoinHistory> {
        const url = `${this.base}/coins/history`;
        return this.http.get<CoinHistory>(url, {
            headers: this.headers(),
            params: {
                page: String(page),
                size: String(size)
            }
        });
    }

    /**
     * Get total coins for the user
     * @returns Observable with total coins count
     */
    getTotalCoins(): Observable<any> {
        const url = `${this.base}/coins/total`;
        return this.http.get(url, { headers: this.headers() });
    }
}
