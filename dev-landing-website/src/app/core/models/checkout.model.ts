import { Cart } from './cart.model';

export type CheckoutPaymentMethod = 'COD' | 'ONLINE';

export interface CheckoutRequest {
  addressId: number;
  forUserId: string;
  paymentMethod: CheckoutPaymentMethod;
}

export interface CheckoutSummary extends Cart {
  deliveryFee?: number;
  totalPayable?: number;
}

export interface CheckoutOrderResponse {
  id?: number | string;
  orderId?: number | string;
  message?: string;
  [key: string]: unknown;
}
