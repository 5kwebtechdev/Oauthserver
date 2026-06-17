
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermePopupComponent, SupermePopupCTA } from '../../superme-popup/superme-popup.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { Router } from '@angular/router';

interface TransitStep {
    label: string;
    date?: string;
    subtitle?: string;
    completed: boolean;
}

interface Order {
    id: number;
    status: 'on-the-way' | 'delivered' | 'delayed' | 'cancelled' | 'returned-exchanged';
    statusHeading: string;
    statusSubtitle?: string;
    productName: string;
    subtitle: string;
    schoolName: string;
    imageSrc: string;
    price: string;
    orderDate?: string;
    orderNumber?: string;
    refundStatus?: string;
    transitSteps: TransitStep[];
}

const STATUS_COLORS: Record<string, string> = {
    'on-the-way': '#90214D',
    'delivered': '#4CAF50',
    'delayed': '#F0AD4E',
    'cancelled': '#BB2124',
    'returned-exchanged': '#4CAF50',
};

const STATUS_LABELS: Record<string, string> = {
    'on-the-way': 'On the way',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'returned-exchanged': 'Returned / Exchanged',
};

const TIME_LABELS: Record<string, string> = {
    'last-30-days': 'Last 30 days',
    'last-3-months': 'Last 3 months',
    'last-6-months': 'Last 6 months',
    'older': 'Older',
};

@Component({
    selector: 'my-orders',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent, EmptyStateComponent, SupermeButtonComponent, ViewAllComponent, SupermePopupComponent],
    templateUrl: './my-orders.components.html',
    styleUrls: ['./my-orders.components.scss']
})
export class MyOrdersComponent {
    isFilterScreenVisible = false;
    isOrderDetailVisible = false;
    selectedOrder: Order | null = null;
    selectedStatus: string[] = [];
    selectedTime = '';
    appliedStatus: string[] = [];
    appliedTime = '';
    showPaymentInfo = false;

    constructor(private router: Router) {}

    orders: Order[] = [
        {
            id: 1,
            status: 'on-the-way',
            statusHeading: 'Arriving Mon, 2nd Jan',
            productName: 'The Superme Teen',
            subtitle: 'NCERT',
            schoolName: 'Springfield High School',
            imageSrc: 'assets/School-assets/temp/Maths Book.jpg',
            price: '₹499',
            orderDate: '28th December 2025',
            orderNumber: '408-11145239687',
            transitSteps: [
                { label: 'Ordered', date: 'Thu, 28 Dec', completed: true },
                { label: 'Shipped', date: 'Sun, 31 Dec', subtitle: 'Shipped via Delhivery (Tracking ID: 8822)', completed: true },
                { label: 'Out for delivery', subtitle: 'Agent number: +91 7896321456', completed: true },
                { label: 'Delivery by 6 PM', completed: false },
            ]
        },
        {
            id: 2,
            status: 'delivered',
            statusHeading: 'Delivered on Monday, 2nd Jan',
            statusSubtitle: 'Return / Exchange eligible till 9th Jan 2025',
            productName: 'Superme Workbook',
            subtitle: 'CBSE',
            schoolName: 'Green Valley School',
            imageSrc: 'assets/School-assets/temp/English.jpg',
            price: '₹499',
            orderDate: '31st December 2025',
            orderNumber: '408-11145239687',
            transitSteps: [
                { label: 'Ordered', date: 'Thu, 28 Dec', completed: true },
                { label: 'Shipped', date: 'Sun, 31 Dec', subtitle: 'Shipped via Delhivery (Tracking ID: 8822)', completed: true },
                { label: 'Out for delivery', completed: true },
                { label: 'Delivered', date: 'Mon, 2 Jan', completed: true },
            ]
        },
        {
            id: 3,
            status: 'returned-exchanged',
            statusHeading: 'Return Pickup Scheduled',
            productName: 'Teen Wellness Kit',
            subtitle: 'ICSE',
            schoolName: 'Blue Ridge Academy',
            imageSrc: 'assets/School-assets/temp/Blazer.jpg',
            price: '₹499',
            orderDate: '28th December 2025',
            orderNumber: '408-89511266222',
            transitSteps: [
                { label: 'Return Requested', date: 'Thu, 28 Dec', completed: true },
                { label: 'Pickup Scheduled', date: 'Sun, 31 Dec', subtitle: 'Shipped via Delhivery (Tracking ID: 8822)', completed: true },
                { label: 'Pickup Complete', completed: false },
                { label: 'Refund Initiated / Exchange Shipped', completed: false },
            ]
        },
        {
            id: 4,
            status: 'delayed',
            statusHeading: 'Delayed, Arriving Mon, 2nd Jan',
            statusSubtitle: 'Due to operational issues',
            productName: 'Superme Journal',
            subtitle: 'State Board',
            schoolName: 'Sunnydale High',
            imageSrc: 'assets/School-assets/temp/Notebook.jpg',
            price: '₹499',
            orderDate: '28th December 2025',
            orderNumber: '408-56778901234',
            transitSteps: [
                { label: 'Ordered', date: 'Thu, 28 Dec', completed: true },
                { label: 'Shipped', date: 'Sun, 31 Dec', subtitle: 'Shipped via Delhivery (Tracking ID: 8822)', completed: true },
                { label: 'Out for delivery', completed: false },
                { label: 'Arriving Mon, 2nd Jan', completed: false },
            ]
        },
        {
            id: 5,
            status: 'cancelled',
            statusHeading: 'Order Cancelled',
            productName: 'Stress Relief Cards',
            subtitle: 'NCERT',
            schoolName: 'Riverside School',
            imageSrc: 'assets/School-assets/temp/Shirt-l.jpg',
            price: '₹499',
            orderDate: '28th December 2025',
            orderNumber: '408-89511266222',
            refundStatus: 'Initiated',
            transitSteps: [
                { label: 'Ordered', date: 'Thu, 28 Dec', completed: true },
                { label: 'Cancelled', date: 'Thu, 28 Dec', completed: true },
            ]
        },
        {
            id: 6,
            status: 'returned-exchanged',
            statusHeading: 'Return Completed',
            statusSubtitle: 'Refund Initiated',
            productName: 'Superme Coloring Book',
            subtitle: 'CBSE',
            schoolName: 'Hilltop Academy',
            imageSrc: 'assets/School-assets/temp/Shirt.jpg',
            price: '₹499',
            orderDate: '31st December 2025',
            orderNumber: '408-11145239687',
            transitSteps: [
                { label: 'Return Requested', date: 'Thu, 28 Dec', completed: true },
                { label: 'Pickup Scheduled', date: 'Sun, 31 Dec', completed: true },
                { label: 'Pickup Complete', date: 'Mon, 1 Jan', completed: true },
                { label: 'Refund Initiated', date: 'Tue, 2 Jan', completed: true },
            ]
        },
        {
            id: 7,
            status: 'delivered',
            statusHeading: 'Delivered on Sun, 31 Dec',
            statusSubtitle: 'Return / Exchange eligible till 7th Jan 2025',
            productName: 'Relaxation Audio',
            subtitle: 'ICSE',
            schoolName: 'Valley View School',
            imageSrc: 'assets/School-assets/temp/Shorts.jpg',
            price: '₹349',
            orderDate: '28th December 2025',
            orderNumber: '408-22334556677',
            transitSteps: [
                { label: 'Ordered', date: 'Thu, 28 Dec', completed: true },
                { label: 'Shipped', date: 'Fri, 29 Dec', subtitle: 'Shipped via BlueDart (Tracking ID: 4401)', completed: true },
                { label: 'Out for delivery', completed: true },
                { label: 'Delivered', date: 'Sun, 31 Dec', completed: true },
            ]
        },
        {
            id: 8,
            status: 'cancelled',
            statusHeading: 'Order Cancelled',
            productName: 'Breathing Exercises Guide',
            subtitle: 'State Board',
            schoolName: 'Mountain High',
            imageSrc: 'assets/School-assets/temp/T-Shirt.jpg',
            price: '₹599',
            orderDate: '28th December 2025',
            orderNumber: '408-99887766554',
            refundStatus: 'Initiated',
            transitSteps: [
                { label: 'Ordered', date: 'Thu, 28 Dec', completed: true },
                { label: 'Cancelled', date: 'Fri, 29 Dec', completed: true },
            ]
        }
    ];

    // --- Navigation ---

    goBack(): void {
        if (this.isOrderDetailVisible) {
            this.isOrderDetailVisible = false;
            this.selectedOrder = null;
        } else if (this.isFilterScreenVisible) {
            this.isFilterScreenVisible = false;
        } else {
            try { window.history.back(); } catch (_) { }
        }
    }

    openOrderDetail(order: Order): void {
        this.selectedOrder = order;
        this.isOrderDetailVisible = true;
        this.showPaymentInfo = false;
    }

    openFilterScreen(): void { this.isFilterScreenVisible = true; }
    onHelpClick(): void {
        this.router.navigate(['/authed', 'bot-helpline']);
    }

    // --- Filters ---

    onStatusChange(event: Event, value: string): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.selectedStatus = checked
            ? [...this.selectedStatus, value]
            : this.selectedStatus.filter(s => s !== value);
    }

    onTimeChange(value: string): void { this.selectedTime = value; }

    applyFilters(): void {
        this.appliedStatus = [...this.selectedStatus];
        this.appliedTime = this.selectedTime;
        this.isFilterScreenVisible = false;
    }

    get filteredOrders(): Order[] {
        return this.appliedStatus.length === 0
            ? this.orders
            : this.orders.filter(o => this.appliedStatus.includes(o.status));
    }

    get resultsText(): string {
        if (this.appliedTime) return `Results from ${TIME_LABELS[this.appliedTime] || this.appliedTime}`;
        if (this.appliedStatus.length) return `Results from ${this.appliedStatus.map(s => STATUS_LABELS[s] || s).join(', ')}`;
        return 'Results from All Orders';
    }

    // --- Helpers ---

    getStatusColor(status: string): string {
        return STATUS_COLORS[status] || '#282527';
    }

    getStepColor(order: Order): string {
        return order.status === 'cancelled' ? '#BB2124' : '#4CAF50';
    }

    truncateText(text: string, max: number): string {
        return text.length > max ? text.substring(0, max) + '...' : text;
    }

    // --- Status-based display logic ---

    get isOrderCompleted(): boolean {
        return !!this.selectedOrder && this.selectedOrder.transitSteps.every(s => s.completed);
    }

    get isOutForDelivery(): boolean {
        return !!this.selectedOrder && this.selectedOrder.transitSteps.some(
            s => s.label.toLowerCase().includes('out for delivery') && s.completed
        );
    }

    get showPrice(): boolean {
        if (!this.selectedOrder) return false;
        if (this.selectedOrder.status === 'delivered') return false;
        return !(this.selectedOrder.status === 'returned-exchanged' && this.isOrderCompleted);
    }

    get showTimeline(): boolean { return this.showPrice; }

    get addressLabel(): string {
        if (!this.selectedOrder) return 'Delivery to:';
        if (this.selectedOrder.status === 'delivered') return 'Delivered to:';
        if (this.selectedOrder.status === 'returned-exchanged') {
            return this.isOrderCompleted ? 'Address:' : 'Pickup Address:';
        }
        return 'Delivery to:';
    }

    get showBillSummary(): boolean {
        if (!this.selectedOrder) return false;
        return this.selectedOrder.status === 'on-the-way' || this.selectedOrder.status === 'delayed';
    }

    get showRefundCard(): boolean {
        return !!this.selectedOrder && this.selectedOrder.status === 'cancelled';
    }

    get showOrderInfo(): boolean {
        if (!this.selectedOrder) return false;
        if (this.selectedOrder.status === 'delivered') return true;
        return this.selectedOrder.status === 'returned-exchanged' && this.isOrderCompleted;
    }

    get showPaymentAccordion(): boolean { return this.showOrderInfo; }

    get showCancelShareFooter(): boolean {
        if (!this.selectedOrder) return false;
        return this.selectedOrder.status === 'on-the-way' || this.selectedOrder.status === 'delayed';
    }

    get showCancelReturnFooter(): boolean {
        return !!this.selectedOrder && this.selectedOrder.status === 'returned-exchanged' && !this.isOrderCompleted;
    }

    get showDownloadInvoiceFooter(): boolean { return this.showOrderInfo; }

    get showReturnExchangeFooter(): boolean {
        return !!this.selectedOrder && this.selectedOrder.status === 'delivered';
    }

    get hasFooter(): boolean {
        return this.showCancelShareFooter || this.showCancelReturnFooter || this.showDownloadInvoiceFooter || this.showReturnExchangeFooter;
    }

    // --- Price Calculations ---

    get totalPrice(): number {
        if (!this.selectedOrder) return 0;
        // Extract numeric price from the price string (e.g., "₹499" -> 499)
        const priceMatch = this.selectedOrder.price.match(/₹(\d+)/);
        return priceMatch ? parseInt(priceMatch[1], 10) : 0;
    }

    get totalPriceDisplay(): string {
        return '₹' + this.totalPrice;
    }

    // GST at 18% of total price
    get gstAmount(): number {
        return Math.round(this.totalPrice * 0.18);
    }

    get gstDisplay(): string {
        return '₹' + this.gstAmount;
    }

    // Delivery: free if totalPrice > 500 else ₹99
    get deliveryFee(): number {
        return this.totalPrice > 500 ? 0 : 99;
    }

    get deliveryDisplay(): string {
        return this.deliveryFee === 0 ? 'Free' : '₹' + this.deliveryFee;
    }

    get toPay(): number {
        return this.totalPrice + this.gstAmount + this.deliveryFee;
    }

    get toPayDisplay(): string {
        return '₹' + this.toPay;
    }

    // --- Actions ---
    // --- Actions ---

    // Cancel confirmation popup state
    isCancelPopupVisible = false;

    // Share Tracking popup state & CTAs
    sharePopupVisible = false;
    sharePrimaryCTA: SupermePopupCTA = { text: 'Copy Link', icon: 'assets/icons/attachment-small.svg', iconPosition: 'start', buttonStyle: 'white', buttonLarge: true };
    shareSecondaryCTA: SupermePopupCTA = { text: 'Share through Whatsapp', icon: 'assets/icons/whatsapp-small.svg', iconPosition: 'start', buttonStyle: 'white', buttonLarge: true };
  
    cancelPrimaryCTA: SupermePopupCTA = { text: "Don't Cancel", buttonStyle: 'green', buttonLarge: true };
    cancelSecondaryCTA: SupermePopupCTA = { text: 'Cancel', buttonStyle: 'bronze', buttonLarge: true };

    togglePaymentInfo(): void { this.showPaymentInfo = !this.showPaymentInfo; }

    // Close popup without action
    closeCancelPopup(): void {
        this.isCancelPopupVisible = false;
    }

    // Open the cancel confirmation popup
    openCancelPopup(): void {
        this.isCancelPopupVisible = true;
    }

    // Confirm cancellation: update order state and close popup
    confirmCancel(): void {
        if (!this.selectedOrder) {
            this.isCancelPopupVisible = false;
            return;
        }

        this.selectedOrder.status = 'cancelled';
        this.selectedOrder.statusHeading = 'Order Cancelled';
        this.selectedOrder.refundStatus = this.selectedOrder.refundStatus || 'Initiated';
        // ensure transitSteps include a cancelled step
        this.selectedOrder.transitSteps = [
            ...(this.selectedOrder.transitSteps || []),
        ];
        // push cancelled step if last step isn't cancelled
        const last = this.selectedOrder.transitSteps[this.selectedOrder.transitSteps.length - 1];
        if (!last || last.label.toLowerCase() !== 'cancelled') {
            this.selectedOrder.transitSteps.push({ label: 'Cancelled', date: new Date().toLocaleDateString(), completed: true });
        }

        this.isCancelPopupVisible = false;
        console.log('Order cancelled:', this.selectedOrder.orderNumber || this.selectedOrder.id);
    }

    onCancelOrder(): void { console.log('Cancel order'); }
    onShareTracking(): void { this.sharePopupVisible = true; }
    closeSharePopup(): void { this.sharePopupVisible = false; }

    // Actions for share popup
    copyLink(): void {
        const link = this.selectedOrder ? `https://superme.app/track/${this.selectedOrder.orderNumber || this.selectedOrder.id}` : window.location.href;
        try {
            navigator.clipboard.writeText(link);
            console.log('Copied link:', link);
        } catch (e) {
            console.log('Copy failed, link:', link);
        }
        this.sharePopupVisible = false;
    }

    shareWhatsapp(): void {
        const link = this.selectedOrder ? `https://superme.app/track/${this.selectedOrder.orderNumber || this.selectedOrder.id}` : window.location.href;
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`;
        window.open(url, '_blank');
        this.sharePopupVisible = false;
    }
    onCancelReturn(): void { console.log('Cancel return'); }
    onDownloadInvoice(): void { console.log('Download invoice'); }
    onReturnExchange(): void {
        this.router.navigateByUrl('/authed/school-store/return-exchange');
    }
}
