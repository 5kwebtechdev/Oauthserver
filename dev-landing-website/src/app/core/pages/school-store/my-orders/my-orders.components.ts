
import { Component, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { FilterModalComponent, FilterState } from './filter-modal.component';
import { OrderItem, OrderStatus, OrderInfoStatus, OrdersFilter } from './order.model';
import { BehaviorSubject, Observable, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'my-orders',
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule, SupermeNavigatorComponent, SupermeButtonComponent, FilterModalComponent, PublicNavbarComponent],
    templateUrl: './my-orders.components.html',
    styleUrls: ['./my-orders.components.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyOrdersComponent implements OnInit {
    @Output() closeInline: EventEmitter<void> = new EventEmitter<void>();

    // Observable for orders list
    orders$: Observable<OrderItem[]>;
    filteredOrders$ = new BehaviorSubject<OrderItem[]>([]);

    // Filter state
    searchQuery$ = new BehaviorSubject<string>('');
    filters$ = new BehaviorSubject<FilterState>({
        statuses: [],
        timeRange: 'last-3-months'
    });

    // Show/hide filters
    showFilterModal = false;
    // Preview count shown in modal before applying filters
    filterPreviewCount?: number;

    // Sample orders data - in a real scenario, this would come from an API
    private mockOrders: OrderItem[] = [
        {
            id: '1',
            title: 'Classic White Half-Sleeve Shirt',
            size: '16',
            schoolName: 'St. Xavier\'s High School',
            imageUrl: 'https://www.figma.com/api/mcp/asset/eb5b7e6b-8d38-44f9-ad79-1d304b697452',
            status: OrderStatus.ARRIVING,
            statusDate: 'Mon, 2nd Jan'
        },
        {
            id: '2',
            title: 'Mathematics - Class 7',
            edition: 'NCERT - 2025 Edition',
            schoolName: 'St. Xavier\'s High School',
            imageUrl: 'https://www.figma.com/api/mcp/asset/34fe2d47-7251-4988-863d-18500353b277',
            status: OrderStatus.DELIVERED,
            statusDate: '15th Nov'
        },
        {
            id: '3',
            title: 'Mathematics - Class 7',
            size: '12',
            schoolName: 'St. Xavier\'s High School',
            imageUrl: 'https://www.figma.com/api/mcp/asset/eb5b7e6b-8d38-44f9-ad79-1d304b697452',
            status: OrderStatus.RETURN,
            statusDate: '',
            additionalInfo: {
                status: OrderInfoStatus.RETURN_DONE,
                message: 'Your return is completed'
            }
        }
    ];

    // Order status labels
    readonly statusLabels = {
        [OrderStatus.ARRIVING]: { label: 'Arriving', color: '#90214d' },
        [OrderStatus.DELIVERED]: { label: 'Delivered', color: '#4caf50' },
        [OrderStatus.DELAYED]: { label: 'Delayed', color: '#ff9800' },
        [OrderStatus.CANCELLED]: { label: 'Cancelled', color: '#f44336' },
        [OrderStatus.RETURN]: { label: 'Return / Exchange', color: '#282527' }
    };

    constructor(private router: Router) {
        this.orders$ = new BehaviorSubject<OrderItem[]>(this.mockOrders);
        this.filteredOrders$.next(this.mockOrders);
    }

    ngOnInit(): void {
        this.setupFilters();
    }

    /**
     * Setup filter observables
     */
    private setupFilters(): void {
        this.searchQuery$
            .pipe(
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(() => {
                this.applyFilters();
            });

        this.filters$
            .subscribe(() => {
                this.applyFilters();
            });
    }

    /**
     * Apply all filters to orders
     */
    private applyFilters(): void {
        const orders = this.mockOrders;
        const searchQuery = this.searchQuery$.value.toLowerCase();
        const filters = this.filters$.value;

        let filtered = orders;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(order =>
                order.title.toLowerCase().includes(searchQuery) ||
                order.schoolName.toLowerCase().includes(searchQuery)
            );
        }

        // Apply status filter
        if (filters.statuses && filters.statuses.length > 0) {
            filtered = filtered.filter(order =>
                filters.statuses.includes(order.status)
            );
        }

        // Apply date filter
        filtered = this.applyDateFilter(filtered, filters.timeRange);

        this.filteredOrders$.next(filtered);
    }

    /**
     * Apply date range filter to orders
     */
    private applyDateFilter(
        orders: OrderItem[],
        timeRange: 'last-30-days' | 'last-3-months' | 'last-6-months' | '2025' | '2024' | 'older'
    ): OrderItem[] {
        // In a real scenario, you would filter based on actual order dates
        // This is a placeholder that returns all orders for demonstration
        return orders;
    }

    /**
     * Handle search input change
     */
    onSearchChange(query: string): void {
        this.searchQuery$.next(query);
    }

    /**
     * Handle filter button click
     */
    toggleFilters(): void {
        this.showFilterModal = !this.showFilterModal;
    }

    /**
     * Handle filter modal close
     */
    onFilterModalClose(): void {
        this.showFilterModal = false;
        this.filterPreviewCount = undefined;
    }

    /**
     * Handle filter modal apply
     */
    onFilterModalApply(filters: FilterState): void {
        this.filters$.next(filters);
        this.showFilterModal = false;
        this.filterPreviewCount = undefined;
    }

    /**
     * Handle preview events from modal — compute current matching count
     */
    onFilterPreview(filters: FilterState): void {
        const orders = this.mockOrders;
        const searchQuery = this.searchQuery$.value.toLowerCase();

        let filtered = orders;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(order =>
                order.title.toLowerCase().includes(searchQuery) ||
                order.schoolName.toLowerCase().includes(searchQuery)
            );
        }

        // Apply status filter from preview
        if (filters.statuses && filters.statuses.length > 0) {
            filtered = filtered.filter(order =>
                filters.statuses.includes(order.status)
            );
        }

        // Apply date filter
        filtered = this.applyDateFilter(filtered, filters.timeRange);

        this.filterPreviewCount = filtered.length;
    }

    /**
     * Get status label and color
     */
    getStatusInfo(status: OrderStatus): { label: string; color: string } {
        return this.statusLabels[status] || { label: 'Unknown', color: '#282527' };
    }

    /**
     * Handle back navigation
     */
    goBack(): void {
        try {
            if (this.closeInline.observers && this.closeInline.observers.length) {
                this.closeInline.emit();
                return;
            }
        } catch (e) { }
        try { window.history.back(); } catch (e) { }
    }

    /**
     * Handle view details action
     */
    onViewDetails(orderId: string): void {
        // Navigate to order detail page which opens the order details view
        try {
            this.router.navigate(['/shop/orders', orderId]).catch(() => console.log('navigate failed'));
        } catch (e) { console.log('navigation error', e); }
    }
}
