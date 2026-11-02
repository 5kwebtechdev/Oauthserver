import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Cart, CartItem } from '../../models/cart.model';
import { Address } from '../../models/address.model';
import { CheckoutPaymentMethod } from '../../models/checkout.model';

export type PaymentMethod = CheckoutPaymentMethod;

@Component({
  selector: 'checkout-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './checkout-modal.component.html',
  styles: [`
    .checkout-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1400;
      background: rgba(20, 16, 18, 0.48);
      animation: fadeIn 180ms ease-out;
    }

    .checkout-modal-container {
      position: fixed;
      left: 50%;
      top: 50%;
      z-index: 1401;
      display: flex;
      width: min(430px, calc(100vw - 32px));
      max-height: min(760px, calc(100vh - 32px));
      transform: translate(-50%, -50%);
      flex-direction: column;
      overflow: hidden;
      border-radius: 18px;
      background: #f7f5f7;
      box-shadow: 0 24px 80px rgba(40, 37, 39, 0.28);
      font-family: Nunito, sans-serif;
      animation: popIn 220ms ease-out;
    }

    .checkout-header {
      display: grid;
      grid-template-columns: 32px 1fr 32px;
      align-items: center;
      gap: 8px;
      padding: 14px 16px 10px;
      background: #f7f5f7;
    }

    .checkout-title {
      margin: 0;
      color: #282527;
      font-size: 18px;
      font-weight: 800;
      text-align: left;
    }

    .icon-btn {
      display: inline-flex;
      width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      background: transparent;
      cursor: pointer;
    }

    .close-btn {
      justify-self: end;
    }

    .checkout-content {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      padding: 0 12px 12px;
    }

    .checkout-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-radius: 14px;
      background: #fff;
      padding: 13px 14px;
      box-shadow: 0 1px 4px rgba(40, 37, 39, 0.07);
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #a8a0a6;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .section-icon {
      display: inline-flex;
      width: 18px;
      height: 18px;
      align-items: center;
      justify-content: center;
    }

    .address-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .address-text {
      margin: 0;
      color: #282527;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.35;
    }

    .text-btn {
      border: 0;
      background: transparent;
      color: #90214d;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
    }

    .items-list,
    .bill-details,
    .payment-options {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .item-row,
    .bill-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .item-copy {
      min-width: 0;
    }

    .item-name {
      margin: 0;
      color: #282527;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.35;
    }

    .item-meta {
      margin: 2px 0 0;
      color: #7a7278;
      font-size: 11px;
      font-weight: 700;
    }

    .item-price {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: 8px;
      color: #7a7278;
      font-size: 12px;
      font-weight: 800;
    }

    .item-price strong {
      color: #282527;
      font-size: 13px;
    }

    .bill-row {
      color: #7a7278;
      font-size: 12px;
      font-weight: 700;
    }

    .bill-row strong {
      color: #282527;
      font-weight: 900;
    }

    .bill-row .free {
      color: #1ba65b;
    }

    .bill-total {
      margin-top: 4px;
      border-top: 1px solid #eee8ec;
      padding-top: 10px;
      color: #282527;
      font-size: 13px;
      font-weight: 900;
    }

    .bill-total strong {
      color: #90214d;
    }

    .payment-option {
      display: flex;
      width: 100%;
      min-height: 56px;
      align-items: center;
      gap: 10px;
      border: 1px solid #eee8ec;
      border-radius: 9px;
      background: #fff;
      padding: 10px;
      text-align: left;
    }

    .payment-option.selected {
      border-color: #d64683;
      box-shadow: inset 0 0 0 1px rgba(214, 70, 131, 0.22);
    }

    .payment-option.disabled {
      opacity: 0.55;
    }

    .radio-indicator {
      position: relative;
      display: inline-flex;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      border: 1.5px solid #d7d0d5;
      border-radius: 999px;
      background: #fff;
    }

    .radio-indicator.checked {
      border-color: #b02a64;
    }

    .radio-indicator.checked::after {
      content: '';
      position: absolute;
      inset: 4px;
      border-radius: inherit;
      background: #b02a64;
    }

    .payment-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 2px;
    }

    .payment-copy strong {
      color: #282527;
      font-size: 13px;
      font-weight: 900;
    }

    .payment-copy small {
      color: #7a7278;
      font-size: 10px;
      font-weight: 700;
    }

    .cash-badge,
    .card-badge {
      display: inline-flex;
      width: 22px;
      height: 14px;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .cash-badge {
      background: #21c16b;
      color: #fff;
      font-size: 12px;
      font-weight: 900;
    }

    .card-badge {
      background: linear-gradient(90deg, #4da7ff 0%, #2f76d2 100%);
    }

    .checkout-footer {
      display: grid;
      grid-template-columns: minmax(86px, 0.38fr) 1fr;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #fff;
      box-shadow: 0 -1px 8px rgba(40, 37, 39, 0.06);
    }

    .checkout-footer div {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .checkout-footer span {
      color: #7a7278;
      font-size: 11px;
      font-weight: 800;
    }

    .checkout-footer strong {
      color: #282527;
      font-size: 18px;
      font-weight: 950;
    }

    .place-order-btn {
      min-height: 48px;
      border: 0;
      border-radius: 10px;
      background: #b02a64;
      color: #fff;
      cursor: pointer;
      font-size: 15px;
      font-weight: 950;
      box-shadow: 0 8px 18px rgba(176, 42, 100, 0.24);
    }

    .place-order-btn:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes popIn {
      from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    @media (max-width: 520px) {
      .checkout-modal-container {
        left: 0;
        right: 0;
        top: auto;
        bottom: 0;
        width: 100%;
        max-height: 94vh;
        transform: none;
        border-radius: 20px 20px 0 0;
        animation: slideUp 220ms ease-out;
      }

      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    }
  `]
})
export class CheckoutModalComponent implements OnInit {
  @Input() cart: Cart = { items: [], itemsTotal: 0, gstTotal: 0, payableTotal: 0 };
  @Input() deliveryAddress: Address | null = null;
  @Input() formattedAddress: string = '';
  @Input() isLoading: boolean = false;
  @Input() isPlacingOrder: boolean = false;

  @Output() close: EventEmitter<void> = new EventEmitter<void>();
  @Output() changeAddress: EventEmitter<void> = new EventEmitter<void>();
  @Output() placeOrder: EventEmitter<{ paymentMethod: PaymentMethod; address: Address }> = new EventEmitter();

  selectedPaymentMethod: PaymentMethod = 'COD';

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (this.deliveryAddress) {
      this.selectedPaymentMethod = 'COD';
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  onChangeAddress(): void {
    this.changeAddress.emit();
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.cdr.detectChanges();
  }

  onPlaceOrder(): void {
    if (!this.deliveryAddress || this.isPlacingOrder) return;

    this.placeOrder.emit({
      paymentMethod: this.selectedPaymentMethod,
      address: this.deliveryAddress
    });
  }

  get itemCount(): number {
    return this.cart.items ? this.cart.items.length : 0;
  }

  get displayItems(): CartItem[] {
    return this.cart.items || [];
  }

  get deliveryFee(): number {
    const delivery = (this.cart as { deliveryFee?: number }).deliveryFee;
    if (typeof delivery === 'number') return delivery;
    return this.subtotal > 500 ? 0 : 99;
  }

  get deliveryDisplay(): string {
    return this.deliveryFee === 0 ? 'Free' : this.money(this.deliveryFee);
  }

  get gstAmount(): number {
    return this.cart.gstTotal || 0;
  }

  get subtotal(): number {
    return this.cart.itemsTotal || 0;
  }

  get total(): number {
    const totalPayable = (this.cart as { totalPayable?: number }).totalPayable;
    if (typeof totalPayable === 'number') return totalPayable;
    return this.cart.payableTotal || this.subtotal + this.gstAmount + this.deliveryFee;
  }

  money(value: number | null | undefined): string {
    return `₹${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`;
  }
}
