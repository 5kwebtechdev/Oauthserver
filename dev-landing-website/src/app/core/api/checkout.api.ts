import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { CheckoutOrderResponse, CheckoutRequest, CheckoutSummary } from '../models/checkout.model';

@Injectable({ providedIn: 'root' })
export class CheckoutApi {
  private base = environment.apiUrl || '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', value);
    }
    return headers;
  }

  getSummary(payload: CheckoutRequest): Observable<CheckoutSummary> {
    return this.http.post<CheckoutSummary>(`${this.base}/user/checkout/summary`, payload, { headers: this.headers() });
  }

  createOrder(payload: CheckoutRequest): Observable<CheckoutOrderResponse> {
    return this.http.post<CheckoutOrderResponse>(`${this.base}/user/checkout/create-order`, payload, { headers: this.headers() });
  }
}
