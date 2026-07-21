import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { environment } from '../../../../../environments/environment';

export type PaymentMethod = 'COD' | 'ONLINE';

interface CheckoutSummary {
    items: any[];
    itemCount: number;
    itemsTotal: number;
    discountTotal: number;
    gstTotal: number;
    payableTotal: number;
    deliveryCharge?: number;
}

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent],
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
    // Passed via router state from my-cart
    addressId: number | null = null;
    addressLabel = '';
    schoolId: number | null = null;
    classId: number | null = null;

    paymentMethod: PaymentMethod = 'COD';

    summary: CheckoutSummary | null = null;
    summaryLoading = false;
    summaryError = false;

    placing = false;
    showSuccessSheet = false;
    orderId: string | null = null;
    orderNumber: string | null = null;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private cartService: CartService,
        private toastService: CustomToastService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        if (this.isChildUser()) {
            this.blockChildCheckout();
            return;
        }

        const s = (history.state || {}) as {
            addressId?: number;
            addressLabel?: string;
            schoolId?: number | null;
            classId?: number | null;
        };
        this.addressId   = s.addressId   ?? null;
        this.addressLabel = s.addressLabel ?? '';
        this.schoolId    = s.schoolId    ?? null;
        this.classId     = s.classId     ?? null;

        this.fetchSummary();
    }

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });
    }

    private summaryBody(): Record<string, any> {
        return {
            addressId:     this.addressId,
            paymentMethod: this.paymentMethod,
            schoolId:      this.schoolId ?? null,
            classId:       this.classId  ?? null,
        };
    }

    private orderBody(): Record<string, any> {
        return {
            addressId:     this.addressId,
            paymentMethod: this.paymentMethod,
            schoolId:      this.schoolId ?? null,
            classId:       this.classId  ?? null,
        };
    }

    fetchSummary(): void {
        if (!this.addressId) return;
        this.summaryLoading = true;
        this.summaryError   = false;
        this.http.post<CheckoutSummary>(
            `${environment.apiUrl}/user/checkout/summary`,
            this.summaryBody(),
            { headers: this.headers() }
        ).subscribe({
            next: (res) => {
                this.summary = res;
                this.summaryLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.summaryLoading = false;
                this.summaryError = true;
                this.cdr.detectChanges();
            }
        });
    }

    selectPayment(m: PaymentMethod): void {
        if (m === 'ONLINE') {
            this.toastService.error('Online payment is coming soon. Please use Cash on Delivery for now.');
            return;
        }
        this.paymentMethod = m;
        this.cdr.detectChanges();
    }

    get totalDisplay(): string {
        const t = this.summary?.payableTotal ?? 0;
        return '₹' + t.toFixed(2);
    }

    get canPlace(): boolean {
        return !this.placing && !!this.addressId && !!this.summary;
    }

    placeOrder(): void {
        if (this.isChildUser()) {
            this.blockChildCheckout();
            return;
        }

        if (!this.canPlace) return;
        this.placing = true;
        this.cdr.detectChanges();

        this.http.post<any>(
            `${environment.apiUrl}/user/checkout/create-order`,
            this.orderBody(),
            { headers: this.headers() }
        ).subscribe({
            next: (res) => {
                if (this.paymentMethod === 'ONLINE') {
                    this.openRazorpay(res);
                } else {
                    this.placing = false;
                    this.orderId = res?.orderId ?? res?.id ?? null;
                    this.orderNumber = res?.orderNumber ?? null;
                    this.cartService.reset();
                    this.showSuccessSheet = true;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                this.placing = false;
                const msg = err?.error?.message || err?.error?.error || 'Could not place order. Please try again.';
                this.toastService.error(msg);
                this.cdr.detectChanges();
            }
        });
    }

    private openRazorpay(orderRes: any): void {
        // Load Razorpay checkout.js if not already present
        const existing = document.getElementById('rzp-script');
        const load = (cb: () => void) => {
            if ((window as any).Razorpay) { cb(); return; }
            const s = document.createElement('script');
            s.id = 'rzp-script';
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = cb;
            document.body.appendChild(s);
        };

        load(() => {
            const options = {
                key:         orderRes?.razorpayKeyId ?? orderRes?.keyId ?? '',
                amount:      orderRes?.amount ?? (this.summary?.payableTotal ?? 0) * 100,
                currency:    'INR',
                name:        'SuperMe Store',
                description: 'School Store Order',
                order_id:    orderRes?.gatewayOrderId ?? orderRes?.razorpayOrderId ?? '',
                handler:     (resp: any) => {
                    this.sendPaymentCallback(
                        orderRes?.gatewayOrderId ?? orderRes?.razorpayOrderId ?? '',
                        resp.razorpay_payment_id,
                        resp.razorpay_signature,
                        'SUCCESS'
                    );
                },
                modal: {
                    ondismiss: () => {
                        this.placing = false;
                        this.cdr.detectChanges();
                        this.toastService.error('Payment cancelled.');
                    }
                },
                prefill: { contact: '' },
                theme: { color: '#90214D' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (resp: any) => {
                this.sendPaymentCallback(
                    orderRes?.gatewayOrderId ?? orderRes?.razorpayOrderId ?? '',
                    resp?.error?.metadata?.payment_id ?? '',
                    '',
                    'FAILED'
                );
            });
            rzp.open();
        });
    }

    private sendPaymentCallback(
        gatewayOrderId: string,
        gatewayPaymentId: string,
        gatewaySignature: string,
        status: 'SUCCESS' | 'FAILED'
    ): void {
        const body = { gatewayOrderId, gatewayPaymentId, gatewaySignature };
        this.http.post<any>(
            `${environment.apiUrl}/user/checkout/payment/callback`,
            body,
            { headers: this.headers() }
        ).subscribe({
            next: (res) => {
                this.placing = false;
                if (status === 'SUCCESS') {
                    this.orderId = res?.orderId ?? res?.id ?? null;
                    this.orderNumber = res?.orderNumber ?? null;
                    this.cartService.reset();
                    this.showSuccessSheet = true;
                } else {
                    this.toastService.error('Payment failed. Please try again.');
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.placing = false;
                this.toastService.error('Payment verification failed. Contact support.');
                this.cdr.detectChanges();
            }
        });
    }

    goToOrders(): void {
        this.showSuccessSheet = false;
        this.router.navigateByUrl('/authed/school-store/my-orders');
    }

    goToStore(): void {
        this.showSuccessSheet = false;
        this.router.navigateByUrl('/authed/school-store');
    }

    goBack(): void {
        try { window.history.back(); } catch (e) { }
    }

    private isChildUser(): boolean {
        return String(this.authService.getUserRelationship() ?? '').toUpperCase() === 'CHILD';
    }

    private blockChildCheckout(): void {
        this.toastService.error('Parent approval is required before payment.');
        this.router.navigateByUrl('/authed/cart', { replaceUrl: true });
    }

    // currency helper
    fmt(v: number | null | undefined): string {
        if (v == null) return '₹0';
        return '₹' + Number(v).toFixed(2);
    }
}
