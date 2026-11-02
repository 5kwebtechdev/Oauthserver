import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CheckoutApi } from '../api/checkout.api';
import { CheckoutOrderResponse, CheckoutRequest, CheckoutSummary } from '../models/checkout.model';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  constructor(private api: CheckoutApi) {}

  getSummary(payload: CheckoutRequest): Observable<CheckoutSummary> {
    return this.api.getSummary(payload);
  }

  createOrder(payload: CheckoutRequest): Observable<CheckoutOrderResponse> {
    return this.api.createOrder(payload);
  }
}
