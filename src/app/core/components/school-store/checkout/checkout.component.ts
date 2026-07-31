import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
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

interface PaymentBrowserEvent {
    type: string;
    url?: string;
    code?: number;
    message?: string;
}

interface PaymentBrowserRef {
    addEventListener(eventName: string, callback: (event: PaymentBrowserEvent) => void): void;
    removeEventListener(eventName: string, callback: (event: PaymentBrowserEvent) => void): void;
    close(): void;
    show(): void;
}

interface CordovaInAppBrowser {
    open(url: string, target: '_blank', options: string): PaymentBrowserRef;
}

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent],
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
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
    paymentPageLoading = false;
    showSuccessSheet = false;
    orderId: string | null = null;
    orderNumber: string | null = null;

    private paymentBrowserOpen = false;
    private paymentFinalizing = false;
    private paymentTerminal = false;
    private destroyed = false;
    private paymentBrowserRef: PaymentBrowserRef | null = null;
    private paymentBrowserListeners: Array<{
        eventName: string;
        callback: (event: PaymentBrowserEvent) => void;
    }> = [];
    private hostedOrderResponse: any | null = null;

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

    ngOnDestroy(): void {
        this.destroyed = true;
        this.paymentTerminal = true;
        void this.closePaymentBrowser();
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

    private checkoutUserId(): string | null {
        const userId = this.authService.getUserId()?.trim();
        return userId && userId.toLowerCase() !== 'nan' ? userId : null;
    }

    private summaryBody(forUserId: string): Record<string, any> {
        return {
            addressId:     this.addressId,
            paymentMethod: this.paymentMethod,
            schoolId:      this.schoolId ?? null,
            classId:       this.classId  ?? null,
            forUserId,
        };
    }

    private orderBody(forUserId: string): Record<string, any> {
        return {
            addressId:     this.addressId,
            paymentMethod: this.paymentMethod,
            schoolId:      this.schoolId ?? null,
            classId:       this.classId  ?? null,
            forUserId,
        };
    }

    fetchSummary(): void {
        if (!this.addressId) return;

        const forUserId = this.checkoutUserId();
        if (!forUserId) {
            this.summaryLoading = false;
            this.summaryError = true;
            this.toastService.error('Your session could not be verified. Please sign in again.');
            this.cdr.detectChanges();
            return;
        }

        this.summaryLoading = true;
        this.summaryError   = false;
        this.http.post<CheckoutSummary>(
            `${environment.apiUrl}/user/checkout/summary`,
            this.summaryBody(forUserId),
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
        if (this.placing || this.paymentMethod === m) return;
        this.paymentMethod = m;
        this.fetchSummary();
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

        const forUserId = this.checkoutUserId();
        if (!forUserId) {
            this.toastService.error('Your session could not be verified. Please sign in again.');
            return;
        }

        if (!this.canPlace) return;
        this.placing = true;
        this.paymentTerminal = false;
        this.paymentFinalizing = false;
        this.cdr.detectChanges();

        this.http.post<any>(
            `${environment.apiUrl}/user/checkout/create-order`,
            this.orderBody(forUserId),
            { headers: this.headers() }
        ).subscribe({
            next: (res) => {
                if (this.paymentMethod === 'ONLINE') {
                    const paymentUrl = this.resolvePaymentUrl(res);
                    if (paymentUrl.provided && !paymentUrl.url) {
                        this.placing = false;
                        this.toastService.error('The payment link received from the server is invalid or insecure.');
                        this.cdr.detectChanges();
                        return;
                    }

                    if (paymentUrl.url) {
                        void this.openPaymentWebView(paymentUrl.url, res);
                    } else {
                        this.openRazorpay(res);
                    }
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

    private resolvePaymentUrl(orderRes: any): { provided: boolean; url: string | null } {
        const payload = this.paymentPayload(orderRes);
        const keys = [
            'paymentUrl',
            'paymentURL',
            'checkoutUrl',
            'checkoutURL',
            'redirectUrl',
            'redirectURL',
            'paymentLink',
            'paymentLinkUrl',
            'url'
        ];
        const sources = [orderRes, payload, payload?.data, orderRes?.data];

        for (const source of sources) {
            if (!source || typeof source !== 'object') continue;
            for (const key of keys) {
                if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
                return {
                    provided: true,
                    url: this.validSecurePaymentUrl(source[key])
                };
            }
        }

        const rawPayload = orderRes?.paymentPayload;
        if (typeof rawPayload === 'string' && rawPayload.trim() && !payload) {
            return {
                provided: true,
                url: this.validSecurePaymentUrl(rawPayload)
            };
        }

        return { provided: false, url: null };
    }

    private validSecurePaymentUrl(value: unknown): string | null {
        if (typeof value !== 'string') return null;
        const raw = value.trim();
        if (!raw || raw.length > 4096) return null;

        try {
            const parsed = new URL(raw);
            const hostname = parsed.hostname.toLowerCase();
            const isLocal = hostname === 'localhost'
                || hostname === '0.0.0.0'
                || hostname === '::1'
                || hostname.startsWith('127.')
                || hostname.endsWith('.local');

            if (
                parsed.protocol !== 'https:'
                || !hostname
                || isLocal
                || parsed.username
                || parsed.password
            ) {
                return null;
            }
            return parsed.toString();
        } catch {
            return null;
        }
    }

    private paymentPayload(orderRes: any): any | null {
        const raw = orderRes?.paymentPayload;
        if (raw && typeof raw === 'object') return raw;
        if (typeof raw !== 'string' || !raw.trim()) return null;

        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }

    private async openPaymentWebView(paymentUrl: string, orderRes: any): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            this.placing = false;
            this.toastService.error('Secure in-app payment is available in the Android or iOS app.');
            this.cdr.detectChanges();
            return;
        }

        this.hostedOrderResponse = orderRes;
        this.paymentTerminal = false;
        this.paymentFinalizing = false;
        this.paymentPageLoading = true;
        this.removePaymentBrowserListeners();

        try {
            const inAppBrowser = this.cordovaInAppBrowser();
            if (!inAppBrowser) throw new Error('InAppBrowser is unavailable');

            const browserRef = inAppBrowser.open(
                paymentUrl,
                '_blank',
                [
                    'location=no',
                    'hidden=yes',
                    'toolbar=yes',
                    'toolbarposition=top',
                    'closebuttoncaption=Cancel',
                    'hardwareback=yes',
                    'clearcache=no',
                    'clearsessioncache=no',
                    'hidespinner=no'
                ].join(',')
            );
            if (!browserRef) throw new Error('Payment WebView could not be created');

            this.paymentBrowserRef = browserRef;
            this.paymentBrowserOpen = true;
            this.addPaymentBrowserListener('loadstart', event => {
                this.paymentPageLoading = true;
                void this.handlePaymentNavigation(event.url);
                if (!this.destroyed) this.cdr.detectChanges();
            });
            this.addPaymentBrowserListener('loadstop', event => {
                this.paymentPageLoading = false;
                try {
                    this.paymentBrowserRef?.show();
                } catch {
                    // The browser may already be closing after a fast redirect.
                }
                void this.handlePaymentNavigation(event.url);
                if (!this.destroyed) this.cdr.detectChanges();
            });
            this.addPaymentBrowserListener('loaderror', () => {
                if (!this.paymentTerminal && !this.paymentFinalizing) {
                    void this.finishPaymentAttempt(
                        'The payment page could not be loaded. Your cart has not been cleared.',
                        'error'
                    );
                }
            });
            this.addPaymentBrowserListener('exit', () => {
                this.paymentBrowserOpen = false;
                this.paymentBrowserRef = null;
                this.paymentPageLoading = false;
                if (!this.paymentTerminal && !this.paymentFinalizing) {
                    this.placing = false;
                    this.toastService.show('Payment cancelled. Your cart has not been cleared.', 'info');
                    if (!this.destroyed) this.cdr.detectChanges();
                }
                this.removePaymentBrowserListeners();
            });
        } catch {
            this.paymentBrowserOpen = false;
            this.paymentBrowserRef = null;
            this.paymentPageLoading = false;
            this.placing = false;
            this.paymentTerminal = true;
            this.removePaymentBrowserListeners();
            this.toastService.error('Could not open the secure payment page. Please try again.');
            if (!this.destroyed) this.cdr.detectChanges();
        }
    }

    private cordovaInAppBrowser(): CordovaInAppBrowser | null {
        const cordova = (window as any)?.cordova;
        const inAppBrowser = cordova?.InAppBrowser;
        return typeof inAppBrowser?.open === 'function'
            ? inAppBrowser as CordovaInAppBrowser
            : null;
    }

    private addPaymentBrowserListener(
        eventName: string,
        callback: (event: PaymentBrowserEvent) => void
    ): void {
        const browserRef = this.paymentBrowserRef;
        if (!browserRef) return;
        browserRef.addEventListener(eventName, callback);
        this.paymentBrowserListeners.push({ eventName, callback });
    }

    private async handlePaymentNavigation(rawUrl: string | undefined): Promise<void> {
        if (!rawUrl || this.paymentTerminal || this.paymentFinalizing) return;

        const result = this.paymentResultFromUrl(rawUrl);
        if (result.status === 'CANCELLED') {
            await this.finishPaymentAttempt('Payment cancelled. Your cart has not been cleared.', 'info');
            return;
        }
        if (result.status === 'FAILED') {
            await this.finishPaymentAttempt('Payment failed. Please try again.', 'error');
            return;
        }
        if (result.status !== 'SUCCESS') return;

        this.paymentFinalizing = true;
        if (result.gatewayOrderId && result.gatewayPaymentId && result.gatewaySignature) {
            this.sendPaymentCallback(
                result.gatewayOrderId,
                result.gatewayPaymentId,
                result.gatewaySignature
            );
            return;
        }

        await this.confirmHostedPaymentFromBackend(this.hostedOrderResponse);
    }

    private paymentResultFromUrl(rawUrl: string): {
        status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
        gatewayOrderId: string;
        gatewayPaymentId: string;
        gatewaySignature: string;
    } {
        try {
            const parsed = new URL(rawUrl);
            const params = new URLSearchParams(parsed.search);
            const hashValue = parsed.hash.replace(/^#/, '');
            const hashQuery = hashValue.includes('?')
                ? hashValue.slice(hashValue.indexOf('?') + 1)
                : hashValue;
            const hashParams = new URLSearchParams(hashQuery);
            const value = (keys: string[]): string => {
                for (const key of keys) {
                    const found = params.get(key) ?? hashParams.get(key);
                    if (found) return found;
                }
                return '';
            };

            const gatewayOrderId = value(['razorpay_order_id', 'gatewayOrderId', 'order_id']);
            const gatewayPaymentId = value(['razorpay_payment_id', 'gatewayPaymentId', 'payment_id']);
            const gatewaySignature = value(['razorpay_signature', 'gatewaySignature', 'signature']);
            const statusValue = value([
                'paymentStatus',
                'payment_status',
                'status',
                'result'
            ]).toLowerCase();
            const path = parsed.pathname.toLowerCase();

            let status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'UNKNOWN' = 'UNKNOWN';
            if (
                ['cancel', 'cancelled', 'canceled', 'dismissed'].includes(statusValue)
                || /\/(?:payment|checkout|order)\/(?:cancel|cancelled|canceled)(?:\/|$)/.test(path)
            ) {
                status = 'CANCELLED';
            } else if (
                ['failed', 'failure', 'error', 'declined'].includes(statusValue)
                || /\/(?:payment|checkout|order)\/(?:failed|failure|error)(?:\/|$)/.test(path)
            ) {
                status = 'FAILED';
            } else if (
                gatewayOrderId && gatewayPaymentId && gatewaySignature
                || ['success', 'paid', 'captured', 'completed'].includes(statusValue)
                || /\/(?:payment|checkout|order)\/(?:success|paid|completed)(?:\/|$)/.test(path)
            ) {
                status = 'SUCCESS';
            }

            return {
                status,
                gatewayOrderId,
                gatewayPaymentId,
                gatewaySignature
            };
        } catch {
            return {
                status: 'UNKNOWN',
                gatewayOrderId: '',
                gatewayPaymentId: '',
                gatewaySignature: ''
            };
        }
    }

    private async confirmHostedPaymentFromBackend(orderRes: any): Promise<void> {
        const localOrderId = orderRes?.orderId ?? orderRes?.id;
        if (!localOrderId) {
            await this.finishPaymentAttempt(
                'Payment could not be confirmed. Your cart has not been cleared.',
                'error'
            );
            return;
        }

        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const order = await firstValueFrom(
                    this.http.get<any>(
                        `${environment.apiUrl}/user/orders/${encodeURIComponent(localOrderId)}`,
                        { headers: this.headers() }
                    )
                );
                if (this.isPaymentConfirmed(order)) {
                    await this.completeSuccessfulPayment(order, orderRes);
                    return;
                }
                if (String(order?.status ?? '').toUpperCase() === 'CANCELLED') {
                    await this.finishPaymentAttempt(
                        'Payment was cancelled. Your cart has not been cleared.',
                        'info'
                    );
                    return;
                }
            } catch {
                // A short retry handles the small delay between the gateway
                // redirect and the backend updating the order.
            }

            if (attempt < 3) await this.wait(1200);
        }

        await this.finishPaymentAttempt(
            'Payment confirmation is pending. Please check My Orders before trying again.',
            'info'
        );
    }

    private isPaymentConfirmed(order: any): boolean {
        if (order?.paymentProcessed === true) return true;
        const paymentStatus = String(order?.paymentStatus ?? '').toUpperCase();
        if (['PAID', 'SUCCESS', 'COMPLETED', 'CAPTURED'].includes(paymentStatus)) return true;

        const orderStatus = String(order?.status ?? '').toUpperCase();
        return orderStatus === 'NEW'
            && !['PENDING', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED'].includes(paymentStatus);
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private openRazorpay(orderRes: any): void {
        const payload = this.paymentPayload(orderRes) ?? {};
        const gatewayOrderId = payload?.order_id
            ?? payload?.id
            ?? payload?.gatewayOrderId
            ?? orderRes?.paymentOrderId
            ?? orderRes?.gatewayOrderId
            ?? orderRes?.razorpayOrderId
            ?? '';
        const keyId = payload?.key_id
            ?? payload?.key
            ?? orderRes?.razorpayKeyId
            ?? orderRes?.keyId
            ?? environment.razorpayKeyId
            ?? '';
        const amount = payload?.amount
            ?? orderRes?.amount
            ?? Math.round((this.summary?.payableTotal ?? 0) * 100);
        const currency = payload?.currency ?? orderRes?.currency ?? 'INR';

        if (!gatewayOrderId || !/^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(String(keyId)) || !amount) {
            this.placing = false;
            this.toastService.error('Payment details are missing. Please try again.');
            this.cdr.detectChanges();
            return;
        }

        this.hostedOrderResponse = orderRes;
        this.paymentTerminal = false;
        this.paymentFinalizing = false;

        const storedUser = this.authService.getUserData() ?? {};
        const currentUser = storedUser?.user ?? storedUser?.data?.user ?? storedUser?.data ?? storedUser;
        const prefill = {
            name: String(currentUser?.name ?? currentUser?.fullName ?? '').trim(),
            email: String(currentUser?.email ?? '').trim(),
            contact: String(currentUser?.phone ?? currentUser?.phoneNumber ?? '').trim()
        };

        // Load Razorpay checkout.js if not already present
        const existing = document.getElementById('rzp-script');
        const load = (cb: () => void) => {
            if ((window as any).Razorpay) { cb(); return; }
            if (existing) {
                existing.remove();
            }
            const s = document.createElement('script');
            s.id = 'rzp-script';
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = cb;
            s.onerror = () => {
                this.placing = false;
                this.toastService.error('Could not load the payment gateway. Please try again.');
                this.cdr.detectChanges();
            };
            document.body.appendChild(s);
        };

        load(() => {
            const options = {
                key:         keyId,
                amount,
                currency,
                name:        'SuperMe Store',
                description: 'School Store Order',
                order_id:    gatewayOrderId,
                handler:     (resp: any) => {
                    this.sendPaymentCallback(
                        gatewayOrderId,
                        resp.razorpay_payment_id,
                        resp.razorpay_signature
                    );
                },
                modal: {
                    ondismiss: () => {
                        if (this.paymentFinalizing || this.paymentTerminal) return;
                        this.placing = false;
                        this.cdr.detectChanges();
                        this.toastService.show('Payment cancelled. Your cart has not been cleared.', 'info');
                    }
                },
                prefill,
                theme: { color: '#90214D' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (failure: any) => {
                this.placing = false;
                const message = failure?.error?.description
                    || failure?.error?.reason
                    || 'Payment failed. Please try again.';
                this.toastService.error(message);
                this.cdr.detectChanges();
            });
            rzp.open();
        });
    }

    private sendPaymentCallback(
        gatewayOrderId: string,
        gatewayPaymentId: string,
        gatewaySignature: string
    ): void {
        if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature || this.paymentTerminal) {
            void this.finishPaymentAttempt(
                'Payment verification details are missing. Your cart has not been cleared.',
                'error'
            );
            return;
        }

        this.paymentFinalizing = true;
        const forUserId = this.checkoutUserId();
        if (!forUserId) {
            void this.finishPaymentAttempt(
                'Your session could not be verified. Payment confirmation is pending.',
                'error'
            );
            return;
        }

        const body = {
            paymentGateway: 'RAZORPAY',
            gatewayOrderId,
            gatewayPaymentId,
            gatewaySignature,
            status: 'SUCCESS',
            forUserId
        };
        this.http.post<any>(
            `${environment.apiUrl}/user/checkout/payment/callback`,
            body,
            { headers: this.headers() }
        ).subscribe({
            next: (res) => {
                void this.completeSuccessfulPayment(res, this.hostedOrderResponse);
            },
            error: () => {
                void this.finishPaymentAttempt(
                    'Payment verification failed. Your cart has not been cleared.',
                    'error'
                );
            }
        });
    }

    private async completeSuccessfulPayment(res: any, orderRes?: any): Promise<void> {
        this.paymentTerminal = true;
        this.paymentFinalizing = false;
        this.paymentPageLoading = false;
        this.placing = false;
        this.orderId = res?.orderId ?? res?.id ?? orderRes?.orderId ?? orderRes?.id ?? null;
        this.orderNumber = res?.orderNumber ?? orderRes?.orderNumber ?? null;
        this.cartService.reset();
        await this.closePaymentBrowser();
        this.showSuccessSheet = true;
        if (!this.destroyed) this.cdr.detectChanges();
    }

    private async finishPaymentAttempt(
        message: string,
        type: 'error' | 'info'
    ): Promise<void> {
        this.paymentTerminal = true;
        this.paymentFinalizing = false;
        this.paymentPageLoading = false;
        this.placing = false;
        await this.closePaymentBrowser();
        this.toastService.show(message, type);
        if (!this.destroyed) this.cdr.detectChanges();
    }

    private async closePaymentBrowser(): Promise<void> {
        const browserRef = this.paymentBrowserRef;
        this.paymentBrowserRef = null;
        this.paymentBrowserOpen = false;
        this.removePaymentBrowserListeners(browserRef);
        if (browserRef) {
            try {
                browserRef.close();
            } catch {
                // The native browser may already have been dismissed.
            }
        }
        this.hostedOrderResponse = null;
    }

    private removePaymentBrowserListeners(browserRef = this.paymentBrowserRef): void {
        const listeners = this.paymentBrowserListeners.splice(0);
        if (!browserRef) return;
        listeners.forEach(listener => {
            try {
                browserRef.removeEventListener(listener.eventName, listener.callback);
            } catch {
                // Listener may already have been released by the native view.
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
