import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { FooterComponent } from '../../../../components/footer/footer.component';
import { SupermeButtonComponent } from '../../../../components/superme-button/superme-button.component';
import { OrderStatus } from '../order.model';

interface TrackingStatus {
  title: string;
  date: string;
  moreDetails?: string;
  status: 'completed' | 'in-progress' | 'pending';
}

interface OrderItemDetail {
  id: string;
  title: string;
  size: string;
  quantity: number;
  schoolName: string;
  price: number;
  imageUrl: string;
  status: OrderStatus;
  statusDate: string;
  trackingId?: string;
  trackingCourier?: string;
  returnEligibleTill?: string;
}

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    PublicNavbarComponent,
    FooterComponent,
    SupermeButtonComponent
  ],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit {
  orderItem!: OrderItemDetail;

  deliveryAddress = {
    name: 'Rahul',
    address: '502, Galaxy Apartments, Mumbai'
  };

  orderPlacedDate = '31st December 2025';
  orderNumber = '408-11145239687';

  itemSummary = {
    itemTotal: 963,
    gstCharges: 24.44,
    delivery: 0,
    total: 983.44
  };

  trackingStatuses: TrackingStatus[] = [];

  showPaymentInfo = false;

  // Mock orders data - matches the my-orders component
  private mockOrders: { [key: string]: OrderItemDetail } = {
    '1': {
      id: '408-11145239687',
      title: 'Classic White Half-Sleeve Shirt',
      size: '16',
      quantity: 1,
      schoolName: "St. Xavier's High School",
      price: 449,
      imageUrl: 'https://www.figma.com/api/mcp/asset/eb5b7e6b-8d38-44f9-ad79-1d304b697452',
      status: OrderStatus.ARRIVING,
      statusDate: 'Mon, 2nd Jan',
      trackingCourier: 'Delhivery',
      trackingId: '8822',
      returnEligibleTill: '9th Jan 2025'
    },
    '2': {
      id: '408-11145239688',
      title: 'Mathematics - Class 7',
      size: '',
      quantity: 1,
      schoolName: "St. Xavier's High School",
      price: 599,
      imageUrl: 'https://www.figma.com/api/mcp/asset/34fe2d47-7251-4988-863d-18500353b277',
      status: OrderStatus.DELIVERED,
      statusDate: 'Monday, 2nd Jan',
      returnEligibleTill: '9th Jan 2025'
    },
    '3': {
      id: '408-11145239689',
      title: 'Mathematics - Class 7',
      size: '12',
      quantity: 1,
      schoolName: "St. Xavier's High School",
      price: 599,
      imageUrl: 'https://www.figma.com/api/mcp/asset/eb5b7e6b-8d38-44f9-ad79-1d304b697452',
      status: OrderStatus.RETURN,
      statusDate: '',
      returnEligibleTill: '9th Jan 2025'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Get order ID from route params
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrderDetails(orderId);
    } else {
      // Fallback to first order if no ID provided
      this.loadOrderDetails('1');
    }
  }

  loadOrderDetails(orderId: string): void {
    // TODO: In production, implement actual API call to fetch order details
    // For now, use mock data
    const order = this.mockOrders[orderId];
    
    if (order) {
      this.orderItem = order;
      this.orderNumber = order.id;
      
      // Setup tracking statuses for non-delivered orders
      if (order.status === OrderStatus.ARRIVING) {
        this.trackingStatuses = [
          {
            title: 'Ordered (Thu, 28 Dec)',
            date: 'Thu, 28 Dec',
            status: 'completed'
          },
          {
            title: 'Shipped (Sun, 31 Dec)',
            date: 'Sun, 31 Dec',
            moreDetails: order.trackingCourier && order.trackingId 
              ? `Shipped via ${order.trackingCourier} (Tracking ID: ${order.trackingId})` 
              : undefined,
            status: 'in-progress'
          },
          {
            title: 'Out for delivery',
            date: '',
            status: 'pending'
          },
          {
            title: `Arriving ${order.statusDate}`,
            date: order.statusDate,
            status: 'pending'
          }
        ];
      }
    } else {
      console.error('Order not found:', orderId);
      // Fallback to default order
      this.orderItem = this.mockOrders['1'];
    }
  }

  get isDelivered(): boolean {
    return this.orderItem.status === OrderStatus.DELIVERED;
  }

  get isArriving(): boolean {
    return this.orderItem.status === OrderStatus.ARRIVING;
  }

  get isCancelled(): boolean {
    return this.orderItem.status === OrderStatus.CANCELLED;
  }

  get isReturn(): boolean {
    return this.orderItem.status === OrderStatus.RETURN;
  }

  get statusText(): string {
    switch (this.orderItem.status) {
      case OrderStatus.DELIVERED:
        return `Delivered on ${this.orderItem.statusDate}`;
      case OrderStatus.ARRIVING:
        return `Arriving ${this.orderItem.statusDate}`;
      case OrderStatus.DELAYED:
        return `Delayed - ${this.orderItem.statusDate}`;
      case OrderStatus.CANCELLED:
        return `Cancelled - ${this.orderItem.statusDate}`;
      case OrderStatus.RETURN:
        return 'Return / Exchange';
      default:
        return this.orderItem.statusDate;
    }
  }

  get statusColor(): string {
    switch (this.orderItem.status) {
      case OrderStatus.DELIVERED:
        return '#4CAF50';
      case OrderStatus.ARRIVING:
      case OrderStatus.RETURN:
        return '#90214D';
      case OrderStatus.DELAYED:
        return '#FF9800';
      case OrderStatus.CANCELLED:
        return '#F44336';
      default:
        return '#90214D';
    }
  }

  goBack(): void {
    this.location.back();
  }

  onCancelOrder(): void {
    // TODO: Implement cancel order logic
    console.log('Cancel order clicked');
    // Show confirmation dialog
  }

  onShareTracking(): void {
    // TODO: Implement share tracking logic
    console.log('Share tracking clicked');
    // Share tracking information via native share or copy to clipboard
  }

  onReturnExchange(): void {
    // TODO: Implement return/exchange logic
    console.log('Return/Exchange clicked');
    // Navigate to return/exchange page
    // Navigate to the return/exchange page and pass the order id as a query param
    this.router.navigate(['/shop/orders', this.orderItem.id, 'return-exchange']).catch(() => console.log('navigate to return-exchange failed'));
  }

  onDownloadInvoice(): void {
    // TODO: Implement download invoice logic
    console.log('Download invoice clicked');
    // Download PDF invoice
  }

  togglePaymentInfo(): void {
    this.showPaymentInfo = !this.showPaymentInfo;
  }

  onHelp(): void {
    // TODO: Navigate to help page or open help modal
    console.log('Help clicked');
    this.router.navigate(['/help']);
  }

  getStatusClass(status: 'completed' | 'in-progress' | 'pending'): string {
    return status;
  }

  getStatusIcon(status: 'completed' | 'in-progress' | 'pending'): string {
    switch (status) {
      case 'completed':
        return 'assets/Icons-Neutral/status-completed.svg';
      case 'in-progress':
        return 'assets/Icons-Neutral/status-in-progress.svg';
      case 'pending':
        return 'assets/Icons-Neutral/status-pending.svg';
      default:
        return '';
    }
  }
}
