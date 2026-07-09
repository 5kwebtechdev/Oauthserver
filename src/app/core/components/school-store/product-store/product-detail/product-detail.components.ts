import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupermeNavigatorComponent } from '../../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../../superme-button/superme-button.component';
import { SizeGuideComponent } from '../size-guide/size-guide.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { CartService } from '../../../../services/cart.service';
import { environment } from '../../../../../../environments/environment';

interface ApiProductSize {
  sizeLabel: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  available: boolean;
}

interface ApiProductDetail {
  id: number;
  name: string;
  description: string;
  details: string;
  categoryName: string;
  schoolName: string | null;
  tag: string;
  ageGroup: string | null;
  mandatory: boolean;
  images: string[];
  mrp: number;
  sellingPrice: number;
  discountText: string;
  gstClass: string;
  stock: number;
  sizeChartTemplate: string;
  sizeChartInImageUrl: string | null;
  sizeChartCmImageUrl: string | null;
  sizes: ApiProductSize[];
  brandName: string | null;
  pageCount: string;
  rulingType: string;
  size: string;
  coverType: string;
  packOf: number | null;
  type: string;
  material: string;
  productColor: string;
  colorName: string;
  inkColor: string;
  materialType: string;
  sellerName: string;
  sellerLicenseNo: string;
  sellerAddress: string;
  manufacturer: string;
  countryOfOrigin: string;
  deliveryDays: number;
  exchangeAvailable: boolean;
}

@Component({
  standalone: true,
  selector: 'product-detail',
  templateUrl: './product-detail.components.html',
  styleUrls: ['./product-detail.components.scss'],
  imports: [
    CommonModule,
    IonicModule,
    SupermeNavigatorComponent,
    SupermeButtonComponent,
    SizeGuideComponent,
  ],
})
export class ProductDetailComponent implements OnInit, AfterViewInit {
  heading = 'Product';
  product: ApiProductDetail | null = null;
  productLoading = false;
  productError = false;
  isBook = false;
  cartCount = 0;
  selectedAddress: string | null = null;
  // schoolId passed as query param from product-store
  schoolId: number | null = null;
  // Add to cart UI state
  addingToCart = false;
  addToCartSuccess = false;
  addToCartError = '';
  images: string[] = [];
  currentIndex = 0;
  quantity = 1;
  // Purchasable sizes for this product, from the product detail API
  sizes: ApiProductSize[] = [];
  selectedSizeLabel: string | null = null;
  isDragging = false;
  private startX = 0;
  private containerWidth = 0;
  // product details dropdown state
  detailsExpanded = false;
  // estimated delivery date, computed from product.deliveryDays
  deliveryDateText: string | null = null;

  @ViewChild('swiper', { static: true }) swiperRef!: ElementRef<HTMLElement>;
  @ViewChild('slides', { static: true }) slidesRef!: ElementRef<HTMLElement>;
  // Controls embedded size guide modal
  showSizeGuide = false;
  // selected unit for size display
  unit: 'in' | 'cm' = 'in';
  // pincode check state for empty address UI
  lastCheckedPincode: string | null = null;
  pincodeAvailable: boolean | null = null;
  // Size chart data for the "Check size guide" measurement modal.
  // The product detail API doesn't provide a chest/length/sleeve breakdown, so this
  // reference table stays static until a dedicated size-chart endpoint exists.
  sizeChart: Array<{ size: number; chest: number; length: number; sleeve: number; age: string }> = [
    { size: 1, chest: 28, length: 30, sleeve: 12, age: '3-4 yrs' },
    { size: 2, chest: 30, length: 32, sleeve: 13, age: '5-6 yrs' },
    { size: 3, chest: 32, length: 34, sleeve: 14, age: '7-8 yrs' },
    { size: 4, chest: 34, length: 36, sleeve: 15, age: '9-10 yrs' },
    { size: 5, chest: 36, length: 38, sleeve: 16, age: '11-12 yrs' },
    { size: 6, chest: 38, length: 40, sleeve: 17, age: '13-14 yrs' },
  ];
  // selected size for the size-guide measurement modal (independent of the real purchasable sizes below)
  sizeGuideSelectedSize = 2;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private cartService: CartService
  ) { }


  openSizeGuide(): void {
    this.showSizeGuide = true;
  }

  openAddressPopup(): void {
    console.log('openAddressPopup called');
  }

  closeSizeGuide(): void {
    this.showSizeGuide = false;
  }

  increaseQuantity(): void {
    this.quantity = (this.quantity || 0) + 1;
  }

  decreaseQuantity(): void {
    if (!this.quantity || this.quantity <= 1) return;
    this.quantity = this.quantity - 1;
  }

  selectSize(sizeLabel: string): void {
    if (this.isOutOfStock(sizeLabel)) return;
    this.selectedSizeLabel = sizeLabel;
  }

  selectUnit(u: 'in' | 'cm'): void {
    this.unit = u;
  }

  onSizeGuideSizeSelected(size: number): void {
    this.sizeGuideSelectedSize = size;
  }

  isOutOfStock(sizeLabel: string): boolean {
    const entry = this.sizes.find(s => s.sizeLabel === sizeLabel);
    return !entry || !entry.available || entry.stock <= 0;
  }

  get selectedSizeEntry(): ApiProductSize | null {
    return this.sizes.find(s => s.sizeLabel === this.selectedSizeLabel) || null;
  }

  ngOnInit(): void {
    // Sync cart badge with shared CartService
    this.cartService.count$.subscribe(n => { this.cartCount = n; this.cdr.detectChanges(); });
    this.cartService.refresh();

    const schoolParam = this.route.snapshot.queryParamMap.get('schoolId');
    this.schoolId = schoolParam ? Number(schoolParam) || null : null;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    }
  }

  retryLoadProduct(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    }
  }

  loadProduct(id: string): void {
    this.productLoading = true;
    this.productError = false;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
    this.http.get<ApiProductDetail>(`${environment.apiUrl}/store/products/${id}`, { headers }).subscribe({
      next: (res) => {
        this.product = res;
        this.heading = res.name || this.heading;
        this.isBook = (res.categoryName || '').trim().toLowerCase() === 'textbooks' || !!res.pageCount;

        this.images = Array.isArray(res.images) && res.images.length
          ? res.images
          : ['assets/School-assets/temp/Shirt-l.jpg'];

        this.sizes = Array.isArray(res.sizes) ? res.sizes : [];
        const firstAvailable = this.sizes.find(s => s.available && s.stock > 0) || this.sizes[0];
        this.selectedSizeLabel = firstAvailable ? firstAvailable.sizeLabel : null;

        this.deliveryDateText = this.computeDeliveryDate(res.deliveryDays);

        this.productLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.productLoading = false;
        this.productError = true;
        this.cdr.detectChanges();
      }
    });
  }

  private computeDeliveryDate(deliveryDays: number | null | undefined): string | null {
    if (deliveryDays == null || isNaN(deliveryDays)) return null;
    const d = new Date();
    d.setDate(d.getDate() + deliveryDays);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const day = d.getDate();
    const suffix = (day % 10 === 1 && day !== 11) ? 'st'
      : (day % 10 === 2 && day !== 12) ? 'nd'
      : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday}, ${day}${suffix} ${month}`;
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '';
    return `₹${Number.isInteger(value) ? value : value.toFixed(2)}`;
  }

  // UI-only pincode check placeholder used by the template
  checkPincode(code?: string): void {
    const val = (code || '').toString().trim();
    this.lastCheckedPincode = val || null;
    // dummy logic: only '247554' is available for delivery in our test
    this.pincodeAvailable = val === '247554';
    console.log('Pincode check (UI):', val, 'available=', this.pincodeAvailable);
  }

  goBack(): void {
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigateByUrl('/home');
    }
  }

  ngAfterViewInit(): void {
    this.updateSizes();
    // set initial translate
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
  }

  @HostListener('window:resize')
  updateSizes(): void {
    try {
      this.containerWidth = this.swiperRef?.nativeElement?.clientWidth || 0;
      this.setTranslate(-this.currentIndex * this.containerWidth, false);
    } catch (e) { }
  }

  onPointerDown(ev: PointerEvent): void {
    this.isDragging = true;
    this.startX = ev.clientX;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = ev.clientX - this.startX;
    const translate = -this.currentIndex * this.containerWidth + dx;
    this.setTranslate(translate, true);
  }

  onPointerUp(ev: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const dx = ev.clientX - this.startX;
    const threshold = this.containerWidth * 0.2;
    if (dx < -threshold && this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    } else if (dx > threshold && this.currentIndex > 0) {
      this.currentIndex--;
    }
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
    try {
      (ev.target as Element).releasePointerCapture?.(ev.pointerId);
    } catch (e) { }
  }

  goTo(i: number): void {
    this.currentIndex = i;
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
  }

  toggleDetails(event?: KeyboardEvent | Event): void {
    if (event && (event as KeyboardEvent).type === 'keydown') {
      (event as KeyboardEvent).preventDefault?.();
    }
    this.detailsExpanded = !this.detailsExpanded;
  }

  handleRightAction(event: { index: number, action: any }): void {
    if (event.action?.type === 'cart') {
      this.router.navigate(['/authed/cart']);
    }
  }

  addToCart(): void {
    if (!this.product) return;
    if (this.addingToCart) return;

    // If product has sizes, a size must be selected
    if (this.sizes.length > 0 && !this.selectedSizeLabel) {
      this.addToCartError = 'Please select a size first.';
      this.cdr.detectChanges();
      return;
    }

    this.addingToCart = true;
    this.addToCartError = '';
    this.addToCartSuccess = false;
    this.cdr.detectChanges();

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });

    const body: Record<string, any> = {
      productId: this.product.id,
      quantity: this.quantity || 1,
    };
    if (this.selectedSizeLabel) body['sizeLabel'] = this.selectedSizeLabel;
    if (this.schoolId != null) body['schoolId'] = this.schoolId;

    this.http.post(`${environment.apiUrl}/cart/items`, body, { headers }).subscribe({
      next: () => {
        this.addingToCart = false;
        this.addToCartSuccess = true;
        this.cartService.increment(this.quantity || 1);
        this.cartCount = this.cartService.count;
        this.cdr.detectChanges();
        // Reset success state after 3 seconds
        setTimeout(() => {
          this.addToCartSuccess = false;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.addingToCart = false;
        const msg = err?.error?.message || err?.error?.error || null;
        this.addToCartError = msg || 'Failed to add to bag. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private setTranslate(px: number, noTransition = false): void {
    const el = this.slidesRef?.nativeElement as HTMLElement | undefined;
    if (!el) return;
    el.style.transition = noTransition ? 'none' : 'transform 320ms ease';
    el.style.transform = `translateX(${px}px)`;
  }
}
