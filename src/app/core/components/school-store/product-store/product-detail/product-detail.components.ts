import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../../mindful-button/mindful-button.component';
import { SizeGuideComponent } from '../size-guide/size-guide.component';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'product-detail',
  templateUrl: './product-detail.components.html',
  styleUrls: ['./product-detail.components.scss'],
  imports: [
    CommonModule,
    IonicModule,
    MindfulNavigatorComponent,
    MindfulButtonComponent,
    SizeGuideComponent,
  ],
})
export class ProductDetailComponent implements OnInit, AfterViewInit {
  heading = 'Product';
  product: any = null;
  isBook = false;
  // local cart count displayed on navigator; replace with shared cart service integration as needed
  cartCount = 0;
  // selectedAddress: holds short address string or null when user has no address
  // Set to null to show the empty-state UI by default for now
  selectedAddress: string | null = null;
  images: string[] = [];
  currentIndex = 0;
  quantity = 1;
  // Available sizes for this product
  sizes: number[] = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26];
  selectedSize = 2;
  outOfStockSizes: number[] = [6, 8, 16];
  isDragging = false;
  private startX = 0;
  private containerWidth = 0;
  // product details dropdown state
  detailsExpanded = false;

  @ViewChild('swiper', { static: true }) swiperRef!: ElementRef<HTMLElement>;
  @ViewChild('slides', { static: true }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('sizeGuideFirstFocus') sizeGuideFirstFocus!:
    | ElementRef<HTMLElement>
    | undefined;
  // Controls embedded size guide modal
  showSizeGuide = false;
  // selected unit for size display
  unit: 'in' | 'cm' = 'in';
  // pincode check state for empty address UI
  lastCheckedPincode: string | null = null;
  pincodeAvailable: boolean | null = null;
  // Size chart data (will be loaded from backend in future)
  sizeChart: Array<{ size: number; chest: number; length: number; sleeve: number; age: string }> = [];

  constructor(private router: Router) { }


  openSizeGuide(): void {
    this.showSizeGuide = true;
    this.setBackgroundInert(true);
  }

  openAddressPopup(): void {
    console.log('openAddressPopup called');
  }

  closeSizeGuide(): void {
    this.showSizeGuide = false;
    this.setBackgroundInert(false);
  }

  onSizeModalPresented(): void {
    try {
      // focus the hidden focus target inside the modal to ensure assistive tech focuses modal content
      this.sizeGuideFirstFocus?.nativeElement?.focus?.();
    } catch (e) { }
  }

  private setBackgroundInert(val: boolean): void {
    try {
      const outlet =
        document.querySelector('ion-router-outlet.hydrated') ||
        document.querySelector('ion-router-outlet');
      if (!outlet) return;
      if (val) {
        outlet.setAttribute('inert', '');
      } else {
        outlet.removeAttribute('inert');
      }
    } catch (e) { }
  }

  ngOnDestroy(): void {
    // ensure inert is removed if component is destroyed while modal open
    try {
      this.setBackgroundInert(false);
    } catch (e) { }
  }

  increaseQuantity(): void {
    this.quantity = (this.quantity || 0) + 1;
  }

  decreaseQuantity(): void {
    if (!this.quantity || this.quantity <= 1) return;
    this.quantity = this.quantity - 1;
  }

  selectSize(size: number): void {
    if (this.isOutOfStock(size)) return;
    this.selectedSize = size;
  }

  selectUnit(u: 'in' | 'cm'): void {
    this.unit = u;
  }

  isOutOfStock(size: number): boolean {
    return this.outOfStockSizes.includes(size);
  }

  ngOnInit(): void {
    try {
      const s: any = history && (history as any).state;
      if (s && s.product) {
        this.product = s.product;
        this.heading = this.product.title || this.heading;
        // detect book-like categories and set flag
        try {
          const cat = (this.product?.category || this.product?.type || '').toString().toLowerCase();
          this.isBook = ['textbook', 'textbooks', 'notebook', 'notebooks', 'book', 'books'].includes(cat);
        } catch (e) { this.isBook = false; }
        // use product images if provided
        if (this.product?.images && Array.isArray(this.product.images) && this.product.images.length) {
          this.images = this.product.images;
        } else if (this.product?.image) {
          this.images = [this.product.image];
        }
      } else if (s && s.title) {
        this.heading = s.title;
      }
    } catch (e) { }

    // fallback images when product has none
    if (!this.images || !this.images.length) {
      const src = 'assets/School-assets/temp/Shirt-l.jpg';
      this.images = [src, src, src];
    }

    this.loadSizeChartFromBackend();
  }


  private loadSizeChartFromBackend(): void {
    // Dummy data — will be replaced by backend response
    this.sizeChart = [
      { size: 1, chest: 28, length: 30, sleeve: 12, age: '3-4 yrs' },
      { size: 2, chest: 30, length: 32, sleeve: 13, age: '5-6 yrs' },
      { size: 3, chest: 32, length: 34, sleeve: 14, age: '7-8 yrs' },
      { size: 4, chest: 34, length: 36, sleeve: 15, age: '9-10 yrs' },
      { size: 5, chest: 36, length: 38, sleeve: 16, age: '11-12 yrs' },
      { size: 6, chest: 38, length: 40, sleeve: 17, age: '13-14 yrs' },
    ];

    // keep `sizes` in sync (used by size-tag buttons elsewhere)
    try {
      this.sizes = this.sizeChart.map((r) => r.size);
      if (!this.sizes.includes(this.selectedSize)) {
        this.selectedSize = this.sizes[0] || this.selectedSize;
      }
    } catch (e) { }
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

  addToCart(): void {
    // placeholder - integrate real cart logic here
    try {
      const added = Number(this.quantity) || 1;
      this.cartCount = (this.cartCount || 0) + added;
    } catch (e) { }
    console.log('Add to bag:', { size: this.selectedSize, quantity: this.quantity, cartCount: this.cartCount });
  }

  private setTranslate(px: number, noTransition = false): void {
    const el = this.slidesRef?.nativeElement as HTMLElement | undefined;
    if (!el) return;
    el.style.transition = noTransition ? 'none' : 'transform 320ms ease';
    el.style.transform = `translateX(${px}px)`;
  }
}
