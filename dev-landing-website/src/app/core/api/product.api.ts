import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ProductApi {
    private base = environment.apiUrl || '';

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

    getProductById(productId: string): Observable<unknown> {
        const url = `${this.base}/public/store/products/${encodeURIComponent(productId)}`;
        return this.http.get<unknown>(url, { headers: this.headers() });
    }
}
