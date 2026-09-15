import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePopupComponent, SupermePopupCTA } from '../../superme-popup/superme-popup.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { environment } from '../../../../../environments/environment';
import { Capacitor } from '@capacitor/core';

// ── Backend types ─────────────────────────────────────────────────────────────
type BackendStatus =
    | 'NEW' | 'PACKED' | 'SHIPPED' | 'DELIVERED'
    | 'CANCELLED' | 'PENDING_PAYMENT'
    | 'EXCHANGE_REQUESTED' | 'RETURN_INITIATED';

export interface ApiOrderItem {
    id: number;
    productId: number;
    productName: string;
    thumbnailUrl?: string | null;
    categoryName?: string | null;
    sizeLabel?: string | null;
    quantity: number;
    unitPrice?: number;
    lineTotal: number;
}

export interface ApiAddress {
    id?: number | null;
    receiverName?: string | null;
    mobile?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
}

export interface ApiOrder {
    id: number;
    orderNumber?: string;
    placedAt?: string;
    schoolName?: string | null;
    shippingAddress?: ApiAddress | null;
    items: ApiOrderItem[];
    totalAmount: number;
    paymentMethod: 'COD' | 'ONLINE';
    paymentStatus?: string;
    status: BackendStatus;
    statusNote?: string | null;
    trackingId?: string | null;
    trackingLink?: string | null;
    canCancel?: boolean;
    canReturnOrExchange?: boolean;
}

interface OrdersPage {
    content: ApiOrder[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    last: boolean;
}

interface ApiTrackStep {
    status: string;
    note?: string | null;
    time?: string | null;
    completed: boolean;
}

interface ApiTrackResponse {
    orderId: number;
    orderNumber: string;
    currentStatus: string;
    trackingId?: string | null;
    trackingLink?: string | null;
    timeline: ApiTrackStep[];
}

interface TrackStep {
    label: string;
    timestamp?: string | null;
    subtitle?: string | null;
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

const CANCEL_REASONS = [
    'Ordered by mistake',
    'Found a better price elsewhere',
    'Delivery is taking too long',
    'Want to change the delivery address',
    'Other',
];

const PAGE_SIZE = 20;

@Component({
    selector: 'my-orders',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent, EmptyStateComponent, SupermeButtonComponent, ViewAllComponent, SupermePopupComponent],
    templateUrl: './my-orders.components.html',
    styleUrls: ['./my-orders.components.scss']
})
export class MyOrdersComponent implements OnInit {

    readonly isWebBrowser = !Capacitor.isNativePlatform();

    // ── List state ────────────────────────────────────────────────────────────
    orders: ApiOrder[] = [];
    ordersLoading = false;
    ordersError = false;
    loadingMore = false;
    private page = 0;
    isLastPage = true;
    searchQuery = '';

    // ── Detail state ──────────────────────────────────────────────────────────
    selectedOrder: ApiOrder | null = null;
    detailLoading = false;
    detailError = false;
    private selectedOrderId: number | null = null;
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

    // ── Cancel flow ───────────────────────────────────────────────────────────
    isCancelPopupVisible = false;
    isCancelReasonVisible = false;
    cancelReasons = CANCEL_REASONS;
    selectedCancelReason = '';
    customCancelReason = '';
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
        private route: ActivatedRoute,
        private http: HttpClient,
        private authService: AuthService,
        private toastService: CustomToastService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadOrders();

        // Deep link from a notification (e.g. ?orderId=14) — open that order's
        // detail directly instead of just landing on the list.
        const orderIdParam = this.route.snapshot.queryParamMap.get('orderId');
        const orderId = orderIdParam ? Number(orderIdParam) : NaN;
        if (!isNaN(orderId)) {
            this.selectedOrderId = orderId;
            this.isOrderDetailVisible = true;
            this.loadOrderDetail(orderId);
        }
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
        this.page = 0;
        this.ordersLoading = true;
        this.ordersError = false;
        this.fetchOrdersPage(true);
    }

    loadMoreOrders(): void {
        if (this.isLastPage || this.loadingMore || this.ordersLoading) return;
        this.page += 1;
        this.loadingMore = true;
        this.fetchOrdersPage(false);
    }

    private fetchOrdersPage(reset: boolean): void {
        this.http.get<OrdersPage>(`${environment.apiUrl}/user/orders`, {
            headers: this.headers(),
            params: { page: String(this.page), size: String(PAGE_SIZE) }
        }).subscribe({
            next: (res) => {
                const content = Array.isArray(res?.content) ? res.content : [];
                this.orders = reset ? content : [...this.orders, ...content];
                this.isLastPage = res?.last ?? true;
                this.ordersLoading = false;
                this.loadingMore = false;
                this.cdr.detectChanges();
            },
            error: () => {
                if (reset) {
                    this.ordersError = true;
                    this.orders = [];
                }
                this.ordersLoading = false;
                this.loadingMore = false;
                this.cdr.detectChanges();
            }
        });
    }

    private loadOrderDetail(orderId: number): void {
        this.detailLoading = true;
        this.detailError = false;
        this.http.get<ApiOrder>(`${environment.apiUrl}/user/orders/${orderId}`, { headers: this.headers() }).subscribe({
            next: (res) => {
                this.selectedOrder = res;
                this.detailLoading = false;
                this.cdr.detectChanges();
                this.loadTrack(orderId);
            },
            error: (err) => {
                console.error('[MyOrders] GET /user/orders/' + orderId + ' failed:', err?.status, JSON.stringify(err?.error));
                // Don't leave the sparse list-item data on screen — it's missing
                // fields (items, shippingAddress, etc.) the detail view needs,
                // so it renders as broken/empty content. Show a clear error instead.
                this.selectedOrder = null;
                this.detailLoading = false;
                this.detailError = true;
                this.cdr.detectChanges();
            }
        });
    }

    retryOrderDetail(): void {
        if (this.selectedOrderId != null) this.loadOrderDetail(this.selectedOrderId);
    }

    private loadTrack(orderId: number): void {
        this.trackLoading = true;
        this.trackSteps = [];
        this.http.get<ApiTrackResponse>(`${environment.apiUrl}/user/orders/${orderId}/track`, { headers: this.headers() }).subscribe({
            next: (res) => {
                this.trackSteps = this.buildTimeline(res);
                this.trackLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.trackSteps = [];
                this.trackLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private buildTimeline(data: ApiTrackResponse): TrackStep[] {
        if (!Array.isArray(data?.timeline)) return [];
        // A step with a timestamp has clearly happened — trust that over a
        // possibly-stale `completed` flag (e.g. Delivered=true but the step
        // right before it still flagged false would otherwise show a broken,
        // out-of-order progression).
        const steps = data.timeline.map(step => ({
            label: this.humanizeStatus(step.status),
            timestamp: step.time,
            subtitle: step.time ? null : step.note,
            completed: !!step.completed || !!step.time
        }));
        // Progress only moves forward: once any step is complete, every step
        // before it must be too, so the checkmarks always read as a clean
        // left-to-right progression rather than a gapped/broken one.
        let seenCompleted = false;
        for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i].completed) seenCompleted = true;
            else if (seenCompleted) steps[i].completed = true;
        }
        return steps;
    }

    private humanizeStatus(status: string): string {
        return (status || '')
            .split('_')
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    goBack(): void {
        if (this.isCancelReasonVisible) {
            this.isCancelReasonVisible = false;
        } else if (this.isOrderDetailVisible) {
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
        this.selectedOrderId = order.id;
        this.isOrderDetailVisible = true;
        this.showPaymentInfo = false;
        this.detailError = false;
        this.trackSteps = [];
        this.loadOrderDetail(order.id);
    }

    openFilterScreen(): void { this.isFilterScreenVisible = true; }

    onHelpClick(): void {
        this.router.navigate(['/authed', 'bot-helpline'], { queryParams: { source: 'ecommerce' } });
    }

    goToStore(): void { this.router.navigateByUrl('/authed/school-store'); }

    // ── Search ────────────────────────────────────────────────────────────────

    onSearchInput(event: Event): void {
        this.searchQuery = (event.target as HTMLInputElement).value;
    }

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

    private isWithinTimeRange(order: ApiOrder, time: string): boolean {
        if (!time || !order.placedAt) return true;
        const days = (Date.now() - new Date(order.placedAt).getTime()) / (1000 * 60 * 60 * 24);
        switch (time) {
            case 'last-30-days':  return days <= 30;
            case 'last-3-months': return days <= 90;
            case 'last-6-months': return days <= 180;
            case 'older':         return days > 180;
            default:              return true;
        }
    }

    get filteredOrders(): ApiOrder[] {
        const q = this.searchQuery.trim().toLowerCase();
        return this.orders.filter(o => {
            const statusOk = !this.appliedStatus.length || this.appliedStatus.includes(this.displayStatus(o.status));
            const timeOk = this.isWithinTimeRange(o, this.appliedTime);
            const searchOk = !q
                || (o.orderNumber ?? '').toLowerCase().includes(q)
                || (o.schoolName ?? '').toLowerCase().includes(q)
                || o.items.some(it => (it.productName ?? '').toLowerCase().includes(q));
            return statusOk && timeOk && searchOk;
        });
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

    get itemsTotal(): number {
        return (this.selectedOrder?.items ?? []).reduce((sum, it) => sum + (it.lineTotal ?? 0), 0);
    }

    get orderTotal(): number { return this.selectedOrder?.totalAmount ?? 0; }

    fmt(v: number | null | undefined): string {
        return '₹' + (v ?? 0).toFixed(2);
    }

    itemImage(item?: ApiOrderItem): string {
        return item?.thumbnailUrl ?? 'assets/School-assets/empty-product-list.webp';
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    openCancelPopup(): void  { this.isCancelPopupVisible = true; }
    closeCancelPopup(): void { this.isCancelPopupVisible = false; }

    proceedToCancelReason(): void {
        this.isCancelPopupVisible = false;
        this.selectedCancelReason = '';
        this.customCancelReason = '';
        this.isCancelReasonVisible = true;
    }

    onCancelReasonChange(value: string): void { this.selectedCancelReason = value; }

    get cancelReasonText(): string {
        return this.selectedCancelReason === 'Other'
            ? this.customCancelReason.trim()
            : this.selectedCancelReason;
    }

    get canConfirmCancel(): boolean {
        return !!this.cancelReasonText && !this.cancellingOrder;
    }

    confirmCancel(): void {
        if (!this.selectedOrder || !this.canConfirmCancel) return;
        this.cancellingOrder = true;
        this.cdr.detectChanges();

        this.http.post<any>(
            `${environment.apiUrl}/user/orders/${this.selectedOrder.id}/cancel`,
            { reason: this.cancelReasonText },
            { headers: this.headers() }
        ).subscribe({
            next: () => {
                this.cancellingOrder = false;
                this.isCancelReasonVisible = false;
                this.toastService.success('Order cancelled successfully.');
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
            state: { order: this.selectedOrder }
        });
    }

    // ── Share ─────────────────────────────────────────────────────────────────

    onShareTracking(): void  { this.sharePopupVisible = true; }
    closeSharePopup(): void  { this.sharePopupVisible = false; }

    private get trackingLink(): string {
        if (this.selectedOrder?.trackingLink) return this.selectedOrder.trackingLink;
        const ref = this.selectedOrder?.orderNumber ?? String(this.selectedOrder?.id ?? '');
        return `https://superme.app/track/${ref}`;
    }

    copyLink(): void {
        try { navigator.clipboard.writeText(this.trackingLink); } catch (_) {}
        this.sharePopupVisible = false;
        this.toastService.success('Link copied!');
    }

    shareWhatsapp(): void {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(this.trackingLink)}`, '_blank');
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
