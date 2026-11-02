/**
 * Order Status enum
 */
export enum OrderStatus {
  ARRIVING = 'arriving',
  DELIVERED = 'delivered',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
  RETURN = 'return'
}

/**
 * Additional Order Info Status enum
 */
export enum OrderInfoStatus {
  RETURN_DONE = 'return-done',
  RETURN_SCHEDULED = 'return-scheduled',
  REFUND_INITIATE = 'refund-initiate',
  REFUND_COMPLETE = 'refund-complete',
  PICKUP_FAILED = 'pickup-failed'
}

/**
 * Order Item Model
 */
export interface OrderItem {
  id: string;
  title: string;
  size?: string;
  edition?: string;
  schoolName: string;
  imageUrl: string;
  status: OrderStatus;
  statusDate: string;
  additionalInfo?: {
    status: OrderInfoStatus;
    message: string;
  };
}

/**
 * Orders Filter Model
 */
export interface OrdersFilter {
  searchQuery: string;
  status?: OrderStatus;
  dateRange?: 'last-week' | 'last-month' | 'last-three-months' | 'last-six-months';
}

/**
 * Orders Response Model
 */
export interface OrdersResponse {
  items: OrderItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Tracking Status Model
 */
export interface TrackingStatus {
  title: string;
  date: string;
  moreDetails?: string;
  status: 'completed' | 'in-progress' | 'pending';
}

/**
 * Detailed Order Item Model (for order details page)
 */
export interface OrderItemDetail {
  id: string;
  title: string;
  size: string;
  quantity: number;
  schoolName: string;
  price: number;
  imageUrl: string;
  status: string;
  statusDate: string;
  trackingId?: string;
  trackingCourier?: string;
  trackingStatuses?: TrackingStatus[];
}

/**
 * Delivery Address Model
 */
export interface DeliveryAddress {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/**
 * Order Summary Model
 */
export interface OrderSummary {
  itemTotal: number;
  gstCharges: number;
  delivery: number;
  total: number;
}

/**
 * Complete Order Details Model
 */
export interface OrderDetails {
  orderNumber: string;
  orderPlacedDate: string;
  item: OrderItemDetail;
  deliveryAddress: DeliveryAddress;
  summary: OrderSummary;
  paymentMethod?: string;
  refundStatus?: {
    status: string;
    orderNumber: string;
  };
}
