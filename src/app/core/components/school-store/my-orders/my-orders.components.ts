import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePopupComponent, SupermePopupCTA } from '../../superme-popup/superme-popup.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { environment } from '../../../../../environments/environment';

// ── Backend types ─────────────────────────────────────────────────────────────
type BackendStatus =
    | 'NEW' | 'PACKED' | 'SHIPPED' | 'DELIVERED'
    | 'CANCELLED' | 'PENDING_PAYMENT'
    | 'EXCHANGE_REQUESTED' | 'RETURN_INITIATED';

interface ApiOrderItem {
    id: number;
    productId: number;
    productName: string;
    sizeLabel?: string | null;
    quantity: number;
    unitPrice?: number;
    lineTotal: number;
    thumbnailUrl?: string | null;
    imageUrl?: string | null;
}

interface ApiAddress {
    receiverName?: string;
    mobile?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    postalCode?: string;
}

interface ApiOrder {
    id: number;
    orderNumber?: string;
    status: BackendStatus;
    paymentMethod: 'COD' | 'ONLINE';
    paymentStatus?: string;
    canCancel?: boolean;
    canReturnOrExchange?: boolean;
    items: ApiOrderItem[];
    itemCount?: number;
    itemsTotal?: number;
    gstTotal?: number;
    discountTotal?: number;
    payableTotal?: number;
    placedAt?: string;
    packedAt?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    address?: ApiAddress;
    schoolName?: string | null;
}

interface TrackStep {
    label: string;
    timestamp?: string | null;
    subtitle?: string;
    completed: boolean;
}

// ── UI display type ───────────────────────────────────────────────────────────
type DisplayStatus = 'processing' | 'on-the-way' | 'delivered' | 'cancelled' | 'pending-payment' | 'returned-exchanged';

const STATUS_META: Record<BackendStatus, { display: DisplayStatus; label: string; color: string }> = {
    NEW:                { display: 'processing',        label: 'Order Placed',       color: '#90214D' },
    PACKED:             { display: 'processing',        label: 'Being Packed',        color: '#90214D' },
    SHIPPED:            { display: 'on-the-way',        label: 'On the Way',          color: '#90214D' },
    DELIVERED:          { display: 'delivered',         label: 'Delivered',           color: '#4CAF50' },
    CANCELLED:          { display: 'cancelled',         label: 'Cancelled',           color: '#BB2124' },
    PENDING_PAYMENT:    { display: 'pending-payment',   label: 'Awaiting Payment',    color: '#F0AD4E' },
    EXCHANGE_REQUESTED: { display: 'returned-exchanged', label: 'Exchange Requested', color: '#4CAF50' },
    RETURN_INITIATED:   { display: 'returned-exchanged', label: 'Return Initiated',   color: '#4CAF50' },
};

const TIME_LABELS: Record<string, string> = {
    'last-30-days':  'Last 30 days',
    'last-3-months': 'Last 3 months',
    'last-6-months': 'Last 6 months',
    'older':         'Older',
};

@Component({
    selector: 'my-orders',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent, EmptyStateComponent, SupermeButtonComponent, ViewAllComponent, SupermePopupComponent],
    templateUrl: './my-orders.components.html',
    styleUrls: ['./my-orders.components.scss']
})
export class MyOrdersComponent implements OnInit {

    // ── List state ────────────────────────────────────────────────────────────
    orders: ApiOrder[] = [];
    ordersLoading = false;
    ordersError = false;

    // ── Detail state ──────────────────────────────────────────────────────────
    selectedOrder: ApiOrder | null = null;
    detailLoading = false;
    trackSteps: TrackStep[] = [];
    trackLoading = false;

    // ── UI panels ─────────────────────────────────────────────────────────────
    isFilterScreenVisible = false;
    isOrderDetailVisible = false;
    showPaymentInfo = false;

    // ── Filters ───────────────────────────────────────────────────────────────
    selectedStatus: string[] = [];
    selectedTime = '';
    appliedStatus: string[] = [];
    appliedTime = '';

    // ── Cancel popup ──────────────────────────────────────────────────────────
    isCancelPopupVisible = false;
    cancellingOrder = false;

    // ── Share popup ───────────────────────────────────────────────────────────
    sharePopupVisible = false;

    // ── Popup CTAs ────────────────────────────────────────────────────────────
    sharePrimaryCTA:   SupermePopupCTA = { text: 'Copy Link',              icon: 'assets/icons/attachment-small.svg', iconPosition: 'start', buttonStyle: 'white', buttonLarge: true };
    shareSecondaryCTA: SupermePopupCTA = { text: 'Share through Whatsapp', icon: 'assets/icons/whatsapp-small.svg',   iconPosition: 'start', buttonStyle: 'white', buttonLarge: true };
    cancelPrimaryCTA:  SupermePopupCTA = { text: "Don't Cancel", buttonStyle: 'green',  buttonLarge: true };
    cancelSecondaryCTA:SupermePopupCTA = { text: 'Cancel Order', buttonStyle: 'bronze', buttonLarge: true };

    constructor(
        private router: Router,
        private http: HttpClient,
        private authService: AuthService,
        private toastService: CustomToastService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadOrders();
    }

    // ── API helpers ───────────────────────────────────────────────────────────

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    loadOrders(): void {
        this.ordersLoading = true;
        this.ordersError = false;
        this.http.get<ApiOrder[]>(`${environment.apiUrl}/user/orders`, { headers: this.headers() }).subscribe({
            next: (res) => {
                this.orders = Array.isArray(res) ? res : [];
                this.ordersLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.ordersError = true;
                this.ordersLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private loadOrderDetail(orderId: number): void {
        this.detailLoading = true;
        this.http.get<ApiOrder>(`${environment.apiUrl}/user/orders/${orderId}`, { headers: this.headers() }).subscribe({
            next: (res) => {
                this.selectedOrder = res;
                this.detailLoading = false;
                this.cdr.detectChanges();
                this.loadTrack(orderId);
            },
            error: () => {
                this.detailLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private loadTrack(orderId: number): void {
        this.trackLoading = true;
        this.trackSteps = [];
        this.http.get<any>(`${environment.apiUrl}/user/orders/${orderId}/track`, { headers: this.headers() }).subscribe({
            next: (res) => {
                this.trackSteps = this.buildTimeline(res);
                this.trackLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                // Fallback: build timeline from order timestamps
                if (this.selectedOrder) {
                    this.trackSteps = this.buildTimeline(this.selectedOrder);
                }
                this.trackLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private buildTimeline(data: any): TrackStep[] {
        // Backend may return pre-built steps array or raw timestamps
        if (Array.isArray(data?.steps)) {
            return data.steps as TrackStep[];
        }
        const placedAt   = data?.placedAt   ?? null;
        const packedAt   = data?.packedAt   ?? null;
        const shippedAt  = data?.shippedAt  ?? null;
        const deliveredAt= data?.deliveredAt?? null;

        const steps: TrackStep[] = [
            { label: 'Order Placed', timestamp: placedAt,    completed: !!placedAt },
            { label: 'Packed',       timestamp: packedAt,    completed: !!packedAt },
            { label: 'Shipped',      timestamp: shippedAt,   completed: !!shippedAt },
            { label: 'Delivered',    timestamp: deliveredAt, completed: !!deliveredAt },
        ];

        if (this.selectedOrder?.status === 'CANCELLED') {
            return [
                { label: 'Order Placed', timestamp: placedAt, completed: !!placedAt },
                { label: 'Cancelled',    completed: true },
            ];
        }
        if (this.selectedOrder?.status === 'RETURN_INITIATED') {
            return [
                { label: 'Delivered',        completed: true },
                { label: 'Return Requested', completed: true },
                { label: 'Pickup Scheduled', completed: false },
                { label: 'Refund Initiated', completed: false },
            ];
        }
        if (this.selectedOrder?.status === 'EXCHANGE_REQUESTED') {
            return [
                { label: 'Delivered',         completed: true },
                { label: 'Exchange Requested',completed: true },
                { label: 'Pickup Scheduled',  completed: false },
                { label: 'Exchange Shipped',  completed: false },
            ];
        }
        return steps;
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    goBack(): void {
        if (this.isOrderDetailVisible) {
            this.isOrderDetailVisible = false;
            this.selectedOrder = null;
            this.trackSteps = [];
        } else if (this.isFilterScreenVisible) {
            this.isFilterScreenVisible = false;
        } else {
            try { window.history.back(); } catch (_) { }
        }
    }

    openOrderDetail(order: ApiOrder): void {
        this.selectedOrder = order;
        this.isOrderDetailVisible = true;
        this.showPaymentInfo = false;
        this.trackSteps = [];
        this.loadOrderDetail(order.id);
    }

    openFilterScreen(): void { this.isFilterScreenVisible = true; }

    onHelpClick(): void { this.router.navigate(['/authed', 'bot-helpline']); }

    // ── Filters ───────────────────────────────────────────────────────────────

    onStatusChange(event: Event, value: string): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.selectedStatus = checked
            ? [...this.selectedStatus, value]
            : this.selectedStatus.filter(s => s !== value);
    }

    onTimeChange(value: string): void { this.selectedTime = value; }

    applyFilters(): void {
        this.appliedStatus = [...this.selectedStatus];
        this.appliedTime   = this.selectedTime;
        this.isFilterScreenVisible = false;
    }

    get filteredOrders(): ApiOrder[] {
        if (!this.appliedStatus.length) return this.orders;
        return this.orders.filter(o => this.appliedStatus.includes(this.displayStatus(o.status)));
    }

    get resultsText(): string {
        if (this.appliedTime)          return `Results from ${TIME_LABELS[this.appliedTime] || this.appliedTime}`;
        if (this.appliedStatus.length) return `Results from ${this.appliedStatus.join(', ')}`;
        return 'Results from All Orders';
    }

    // ── Status helpers ────────────────────────────────────────────────────────

    displayStatus(status: BackendStatus): DisplayStatus {
        return STATUS_META[status]?.display ?? 'processing';
    }

    statusLabel(status: BackendStatus): string {
        return STATUS_META[status]?.label ?? status;
    }

    statusColor(status: BackendStatus): string {
        return STATUS_META[status]?.color ?? '#282527';
    }

    // ── Order detail display logic ────────────────────────────────────────────

    get canCancel(): boolean {
        return !!this.selectedOrder?.canCancel;
    }

    get canReturn(): boolean {
        return !!this.selectedOrder?.canReturnOrExchange;
    }

    get isDelivered(): boolean {
        return this.selectedOrder?.status === 'DELIVERED';
    }

    get isCancelled(): boolean {
        return this.selectedOrder?.status === 'CANCELLED';
    }

    get isReturnExchange(): boolean {
        const s = this.selectedOrder?.status;
        return s === 'RETURN_INITIATED' || s === 'EXCHANGE_REQUESTED';
    }

    get isPendingPayment(): boolean {
        return this.selectedOrder?.status === 'PENDING_PAYMENT';
    }

    get showTimeline(): boolean {
        return !this.isCancelled && !this.isDelivered && !this.isPendingPayment;
    }

    get showBillSummary(): boolean {
        return !this.isCancelled && !this.isReturnExchange;
    }

    get showRefundCard(): boolean { return this.isCancelled; }

    get showPaymentAccordion(): boolean { return this.isDelivered; }

    get hasFooter(): boolean {
        return this.canCancel || this.canReturn || this.isDelivered;
    }

    get addressLabel(): string {
        if (!this.selectedOrder) return 'Delivery to:';
        if (this.isDelivered)     return 'Delivered to:';
        if (this.isReturnExchange) return 'Pickup Address:';
        return 'Delivery to:';
    }

    formatAddress(a?: ApiAddress | null): string {
        if (!a) return '';
        return [a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(', ');
    }

    formatDate(iso?: string | null): string {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return iso; }
    }

    // ── Price helpers ─────────────────────────────────────────────────────────

    get itemsTotal(): number  { return this.selectedOrder?.itemsTotal  ?? 0; }
    get gstTotal(): number    { return this.selectedOrder?.gstTotal    ?? 0; }
    get payableTotal(): number{ return this.selectedOrder?.payableTotal ?? 0; }

    fmt(v: number | null | undefined): string {
        return '₹' + (v ?? 0).toFixed(2);
    }

    itemImage(item: ApiOrderItem): string {
        return item.thumbnailUrl ?? item.imageUrl ?? 'assets/School-assets/empty-product-list.png';
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    openCancelPopup(): void  { this.isCancelPopupVisible = true; }
    closeCancelPopup(): void { this.isCancelPopupVisible = false; }

    confirmCancel(): void {
        if (!this.selectedOrder || this.cancellingOrder) return;
        this.cancellingOrder = true;
        this.isCancelPopupVisible = false;
        this.cdr.detectChanges();

        this.http.post<any>(
            `${environment.apiUrl}/user/orders/${this.selectedOrder.id}/cancel`,
            {},
            { headers: this.headers() }
        ).subscribe({
            next: () => {
                this.cancellingOrder = false;
                this.toastService.success('Order cancelled successfully.');
                // Refresh detail and list
                const id = this.selectedOrder!.id;
                this.loadOrderDetail(id);
                this.loadOrders();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.cancellingOrder = false;
                const msg = err?.error?.message || 'Could not cancel order. Please try again.';
                this.toastService.error(msg);
                this.cdr.detectChanges();
            }
        });
    }

    // ── Return / Exchange ─────────────────────────────────────────────────────

    onReturnExchange(): void {
        if (!this.selectedOrder) return;
        this.router.navigate(['/authed/school-store/return-exchange'], {
            state: { orderId: this.selectedOrder.id, orderNumber: this.selectedOrder.orderNumber }
        });
    }

    // ── Share ─────────────────────────────────────────────────────────────────

    onShareTracking(): void  { this.sharePopupVisible = true; }
    closeSharePopup(): void  { this.sharePopupVisible = false; }

    copyLink(): void {
        const ref = this.selectedOrder?.orderNumber ?? String(this.selectedOrder?.id ?? '');
        const link = `https://superme.app/track/${ref}`;
        try { navigator.clipboard.writeText(link); } catch (_) {}
        this.sharePopupVisible = false;
        this.toastService.success('Link copied!');
    }

    shareWhatsapp(): void {
        const ref = this.selectedOrder?.orderNumber ?? String(this.selectedOrder?.id ?? '');
        const link = `https://superme.app/track/${ref}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`, '_blank');
        this.sharePopupVisible = false;
    }

    togglePaymentInfo(): void { this.showPaymentInfo = !this.showPaymentInfo; }

    getStepColor(completed: boolean): string {
        return completed ? '#4CAF50' : '#DCDBDC';
    }

    truncateText(text: string, max: number): string {
        return text && text.length > max ? text.substring(0, max) + '...' : text;
    }
}
