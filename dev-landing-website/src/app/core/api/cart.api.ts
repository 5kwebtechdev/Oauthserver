import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { AddToCartRequest, Cart, SchoolClassContext, UpdateCartItemRequest } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartApi {
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

    private contextParams(context?: SchoolClassContext): HttpParams {
        let params = new HttpParams();
        if (context) {
            params = params.set('schoolId', context.schoolId).set('classId', context.classId);
        }
        return params;
    }

    getCart(context?: SchoolClassContext): Observable<Cart> {
        const url = `${this.base}/cart`;
        return this.http.get<Cart>(url, { headers: this.headers(), params: this.contextParams(context) });
    }

    addItem(payload: AddToCartRequest): Observable<Cart> {
        const url = `${this.base}/cart/items`;
        return this.http.post<Cart>(url, payload, { headers: this.headers() });
    }

    updateItem(itemId: number, payload: UpdateCartItemRequest): Observable<Cart> {
        const url = `${this.base}/cart/items/${itemId}`;
        return this.http.put<Cart>(url, payload, { headers: this.headers() });
    }

    removeItem(itemId: number): Observable<Cart> {
        const url = `${this.base}/cart/items/${itemId}`;
        return this.http.delete<Cart>(url, { headers: this.headers() });
    }

    clearCart(context?: SchoolClassContext): Observable<Cart> {
        const url = `${this.base}/cart`;
        return this.http.delete<Cart>(url, { headers: this.headers(), params: this.contextParams(context) });
    }
}
