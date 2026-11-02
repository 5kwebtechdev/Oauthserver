import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Renderer2,
} from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, EMPTY } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { FooterComponent } from '../../../../components/footer/footer.component';
import { CartService } from '../../../../services/cart.service';
import { CoreService } from '../../../../services/core.service';
import { AddressService } from '../../../../services/address.service';
import { SchoolContextService } from '../../../../services/school-context.service';
import { ProductService } from '../../../../services/product.service';
import { Address } from '../../../../models/address.model';
import { Product } from '../../../../models/product.model';
import { PublicStoreApi } from '../../../../api/public-store.api';
import { shopSlug } from '../../../../services/shop-url';

// Image Assets from Figma
const imgSchoolPartner = '/assets/School-assets/School Partner.png';
const imgEasyExchange = '/assets/School-assets/Easy Exchange.png';
const imgSecurePayment = '/assets/School-assets/Secure Payment.png';

@Component({
  standalone: true,
  selector: 'product-detail',
  templateUrl: './product-detail.components.html',
  styleUrls: ['./product-detail.components.scss'],
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    IonicModule,
    PublicNavbarComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  heading = 'Product';
  product: any = null;
  loading = false;
  loadError: string | null = null;
  isBook = false;
  isStationeryProduct = false;
  cartCount = 0;
  addedToCart = false;
  showAddressPopup = false;
  addresses: Address[] = [];
  selectedAddress: string = '';
  loadingAddresses = false;
  deletingAddressId: number | null = null;
  private previouslyFocused: HTMLElement | null = null;
  images: string[] = [];
  currentIndex = 0;
  quantity = 1;
  sizes: Array<{ sizeLabel: string; mrp: number; sellingPrice: number; stock: number; available: boolean }> = [];
  selectedSize = '';
  isDragging = false;
  private startX = 0;
  private containerWidth = 0;
  detailsExpanded = false;
  pdpSelectedImage = 0;
  sellerInfoExpanded = true;

  similarProducts = [
    { id: 'classmate-octane-neon', title: 'Classmate Octane Neon Gel Blister Blue', price: 'Rs. 45', mrp: 'Rs. 50', tag: '10% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'parker-gift-set', title: 'Parker Gift Set Vector Special Edition Chrome Trim', price: 'Rs. 409', mrp: 'Rs. 560', tag: '27% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'parker-beta', title: 'Parker Beta Neo Coated Gel Pen Black Body', price: 'Rs. 131', mrp: 'Rs. 150', tag: '13% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'classmate-blister', title: 'Classmate Octane Ball Blister Blue', price: 'Rs. 94', mrp: 'Rs. 100', tag: '6% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'octane-blue', title: 'Classmate Octane Ball Pens Blue', price: 'Rs. 47', mrp: 'Rs. 50', tag: '3% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'reynolds-gel', title: 'Luxor Schneider Gel Pens Pack', price: 'Rs. 124', mrp: 'Rs. 160', tag: '22% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' }
  ];

  alsoLikeProducts = [
    { id: 'camlin-sketch', title: 'Camel Sketch Pens 12 Shades', price: 'Rs. 30', mrp: 'Rs. 45', tag: '33% OFF', img: 'assets/School-assets/temp/Gemini_Generated_Image_pi8q46pi8q46pi8q 1.jpg', category: 'stationery' },
    { id: 'navneet-artbook', title: 'Navneet Youva Soft Bound Notebook', price: 'Rs. 165', mrp: 'Rs. 190', tag: '13% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'hausser-xo', title: 'Hausser XO Ball Pen Blue Pack', price: 'Rs. 49', mrp: 'Rs. 50', tag: '2% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'renee-shine', title: 'Renee Shine Gloss Stick', price: 'Rs. 355', mrp: 'Rs. 399', tag: '11% OFF', img: 'assets/School-assets/Accessories.png', category: 'stationery' },
    { id: 'flair-glitter-pack', title: 'Flair Glitter Pen Pack of 10', price: 'Rs. 295', mrp: 'Rs. 350', tag: '15% OFF', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery' },
    { id: 'fevistik', title: 'Fevistik The Original Glue Stick', price: 'Rs. 25', mrp: 'Rs. 30', tag: '17% OFF', img: 'assets/School-assets/Accessories.png', category: 'stationery' }
  ];

  stationeryFaqs = [
    { q: 'What is the price of Classmate Pens Color Burst on SuperMe?', a: 'The price may vary slightly depending on availability and offers, but SuperMe sources competitive rates for school stationery.' },
    { q: 'How many pens are in the set?', a: 'Each pack contains 10 pens with a variety of vibrant shades.' },
    { q: 'What are the colour options included?', a: 'The set includes multiple colour options such as red, green, blue, orange, purple, pink, black, and metallic tones.' },
    { q: 'Is the ink water-resistant?', a: 'Yes, the ink is smudge and water-resistant, making it ideal for long-lasting work.' },
    { q: 'Can I get same-day delivery?', a: 'SuperMe offers fast delivery in many locations depending on address serviceability.' }
  ];

  trendingGroups = [
    { title: 'Trending Searches', text: 'Ice Creams | Sunscreen | Cold Beverages | Oats | Shampoo | Yoga Mats | Water Bottle | Lunch Box | Pencil Box' },
    { title: 'Popular Searches', text: 'Stationery | School Bags | Pens | Notebooks | Lunch Box | Geometry Box | Sketch Pens | Highlighters' },
    { title: 'Categories', text: 'Fruits & Vegetables | Baby Food | School Supplies | Books | Home Need | Cleaning Essentials | Health & Baby Care' },
    { title: 'Cities', text: 'Agra | Ahmedabad | Bengaluru | Chandigarh | Chennai | Delhi | Hyderabad | Jaipur | Kolkata | Lucknow | Mumbai | Pune' }
  ];

  @ViewChild('swiper', { static: true }) swiperRef!: ElementRef<HTMLElement>;
  @ViewChild('slides', { static: true }) slidesRef!: ElementRef<HTMLElement>;
  @ViewChild('sizeGuideFirstFocus') sizeGuideFirstFocus?: ElementRef<HTMLElement>;
  @ViewChild('addressInner') addressInner?: ElementRef<HTMLElement>;
  @ViewChild('changeBtn') changeBtn?: ElementRef<HTMLElement>;
  showSizeGuide = false;
  unit: 'in' | 'cm' = 'in';
  lastCheckedPincode: string | null = null;
  pincodeAvailable: boolean | null = null;
  sizeChart: Array<{ size: number; chest: number; length: number; sleeve: number; age: string }> = [];

  // Figma Assets - make available to template
  imgSchoolPartner = imgSchoolPartner;
  imgEasyExchange = imgEasyExchange;
  imgSecurePayment = imgSecurePayment;

  private cartSub = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    private cartService: CartService,
    private coreService: CoreService,
    private schoolContextService: SchoolContextService,
    private addressService: AddressService,
    private productService: ProductService,
    private publicStoreApi: PublicStoreApi
  ) { }

  get displayPrice(): string {
    const value = this.product?.sellingPrice ?? this.product?.mrp;
    return value !== undefined && value !== null ? `₹${value}` : '';
  }

  get displayMrp(): string {
    const value = this.product?.mrp;
    const selling = this.product?.sellingPrice;
    // Only show the MRP (struck-through) when it differs from the price being charged
    if (value === undefined || value === null || (selling !== undefined && selling !== null && Number(selling) === Number(value))) {
      return '';
    }
    return `₹${value}`;
  }

  get displayProductTitle(): string {
    return this.product?.name || '';
  }

  get displayDiscount(): string {
    const mrp = Number(this.product?.mrp);
    const selling = Number(this.product?.sellingPrice);
    if (!mrp || !selling || selling >= mrp) return '';
    const percent = Math.round((1 - selling / mrp) * 100);
    return percent > 0 ? `${percent}% OFF` : '';
  }

  get stationeryBrandName(): string {
    return this.product?.brandName || '';
  }

  get stockStatusLabel(): string {
    if (this.product?.stockStatus) return this.product.stockStatus;
    if (this.product?.inStock === true) return 'In Stock';
    if (this.product?.inStock === false) return 'Out of Stock';
    return '';
  }

  get isOutOfStockProduct(): boolean {
    return this.product?.inStock === false;
  }

  get productDetails(): Array<{ label: string; value: string }> {
    if (!this.product) return [];
    const entries: Array<[string, unknown]> = [
      ['Description', this.product.description],
      ['Details', this.product.details],
      ['Brand', this.product.brandName],
      ['Category', this.product.categoryName],
      ['Seller', this.product.sellerName],
      ['Seller Address', this.product.sellerAddress],
      ['Manufacturer', this.product.manufacturer],
      ['Country of Origin', this.product.countryOfOrigin],
      ['Delivery', this.product.deliveryDays ? `${this.product.deliveryDays} days` : undefined],
      ['Exchange Available', this.product.exchangeAvailable !== undefined ? (this.product.exchangeAvailable ? 'Yes' : 'No') : undefined],
    ];
    return entries
      .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim())
      .map(([label, value]) => ({ label, value: `${value}` }));
  }

  // "Highlights" card on the stationery PDP — only the well-known fields the
  // API is expected to return; hidden entirely when a field is absent.
  get productHighlights(): Array<{ label: string; value: string }> {
    if (!this.product) return [];
    const entries: Array<[string, unknown]> = [
      ['Brand', this.product.brandName],
      ['Category', this.product.categoryName],
      ['SKU', this.product.sku],
      ['Stock Status', this.stockStatusLabel],
      ['Description', this.product.description],
    ];
    return entries
      .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim())
      .map(([label, value]) => ({ label, value: `${value}` }));
  }

  // "Seller Information" card on the stationery PDP.
  get productSellerInfo(): Array<{ label: string; value: string }> {
    if (!this.product) return [];
    const entries: Array<[string, unknown]> = [
      ['Name', this.product.sellerName],
      ['Manufactured / Marketed by', this.product.manufacturer],
      ['License No', this.product.licenseNo],
      ['Address', this.product.sellerAddress],
      ['Country of Origin', this.product.countryOfOrigin],
    ];
    return entries
      .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim())
      .map(([label, value]) => ({ label, value: `${value}` }));
  }

  get pdpImages(): string[] {
    return this.images || [];
  }


  openSizeGuide(): void {
    this.showSizeGuide = true;
    this.setBackgroundInert(true);
  }

  openAddressPopup(): void {
    try {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
    } catch (e) {
      this.previouslyFocused = null;
    }

    this.showAddressPopup = true;
    try { this.cdr.markForCheck(); } catch (e) { }
    try { this.renderer.setStyle(document.body, 'overflow', 'hidden'); } catch (e) { }

    setTimeout(() => {
      try {
        const el = this.addressInner?.nativeElement?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement | null;
        if (el && typeof el.focus === 'function') el.focus();
      } catch (e) { }
    }, 30);
  }

  closeAddressPopup(): void {
    this.showAddressPopup = false;
    try { this.cdr.markForCheck(); } catch (e) { }
    try { this.renderer.removeStyle(document.body, 'overflow'); } catch (e) { }
    try {
      if (this.previouslyFocused && typeof this.previouslyFocused.focus === 'function') {
        this.previouslyFocused.focus();
      }
    } catch (e) { }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event): void {
    if (this.showAddressPopup) {
      event.stopPropagation();
      this.closeAddressPopup();
    }
  }

  selectAddress(a: Address): void {
    if (!a) return;
    this.selectedAddress = this.addressService.formatAddress(a);
    this.closeAddressPopup();
    this.cartSub.add(
      this.addressService.setDefaultAddress(a.id).subscribe({
        error: () => {
          const def = this.addressService.defaultAddress;
          this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
          this.cdr.markForCheck();
        }
      })
    );
  }

  removeAddress(a: Address): void {
    if (!a || this.deletingAddressId !== null) return;
    this.deletingAddressId = a.id;
    this.cdr.markForCheck();
    this.cartSub.add(
      this.addressService.deleteAddress(a.id).subscribe({
        next: () => {
          this.deletingAddressId = null;
          const def = this.addressService.defaultAddress;
          this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.deletingAddressId = null;
          this.cdr.markForCheck();
        }
      })
    );
  }

  openAddressInputEdit(a: Address): void {
    this.closeAddressPopup();
    this.router.navigateByUrl('/shop/checkout/address', { state: { editAddress: a } });
  }

  formatAddr(a: Address): string {
    return this.addressService.formatAddress(a);
  }

  async openAddressInput(): Promise<void> {
    try {
      this.closeAddressPopup();
      await this.router.navigateByUrl('/shop/checkout/address');
    } catch (e) { console.error('Failed to open address input page', e); }
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
    try { this.renderer.removeStyle(document.body, 'overflow'); } catch (e) { }
    this.cartSub.unsubscribe();
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
    this.selectedSize = sizeLabel;
  }

  selectUnit(u: 'in' | 'cm'): void {
    this.unit = u;
  }

  isOutOfStock(sizeLabel: string): boolean {
    const size = this.sizes.find((s) => s.sizeLabel === sizeLabel);
    return !!size && !size.available;
  }

  ngOnInit(): void {
    this.cartSub.add(
      this.route.data.pipe(
        map(data => {
          if (data['shopSelection']?.error) {
            this.loadError = data['shopSelection'].error;
            this.loading = false;
            this.cdr.markForCheck();
          }
          return data['shopSelection']?.productId || this.route.snapshot.paramMap.get('id');
        }),
        filter((id): id is string => !!id),
        distinctUntilChanged(),
        tap(() => {
          this.loading = true;
          this.loadError = null;
          this.product = null;
          this.cdr.markForCheck();
        }),
        switchMap(id =>
          this.productService.getProduct(id).pipe(
            catchError(() => {
              this.loading = false;
              this.loadError = 'Could not load this product. Please try again.';
              this.cdr.markForCheck();
              return EMPTY;
            })
          )
        )
      ).subscribe(product => {
        this.applyProduct(product);
        const slug = shopSlug((product as any).name || (product as any).title || (product as any).productName);
        if (slug && this.router.url.split('?')[0] !== `/shop/products/${slug}`) {
          void this.router.navigate(['/shop/products', slug], { replaceUrl: true, queryParams: this.route.snapshot.queryParams });
        }
        this.loading = false;
        this.cdr.markForCheck();
      })
    );

    this.loadSizeChartFromBackend();

    this.cartSub.add(
      this.cartService.cartCount$.subscribe(count => {
        this.cartCount = count;
        this.cdr.markForCheck();
      })
    );
    this.cartSub.add(
      this.addressService.loading$.subscribe(loading => {
        this.loadingAddresses = loading;
        this.cdr.markForCheck();
      })
    );
    this.cartSub.add(
      this.addressService.addresses$.subscribe(addresses => {
        this.addresses = addresses;
        const def = this.addressService.defaultAddress;
        this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
        this.cdr.markForCheck();
      })
    );
    this.addressService.loadAddresses().subscribe();
  }

  private applyProduct(product: Product): void {
    // Keep `this.product` as a plain merged record: the raw API fields stay
    // reachable for the uniform/book PDP variant's ad-hoc bindings (sizes,
    // ageGroup, mandatory, etc.), while the normalized fields below guarantee
    // consistent name/price/image/category access across both PDP variants.
    this.product = {
      ...product.raw,
      id: product.id,
      name: product.name,
      description: product.description,
      sellingPrice: product.discountedPrice ?? product.mrp,
      mrp: product.mrp,
      categoryName: product.category,
      sku: product.sku,
      inStock: product.inStock,
      stockStatus: product.stockStatus,
      brandName: product.brand
    };
    this.heading = product.name || this.heading;

    const cat = (product.category || '').toLowerCase();
    this.isBook = ['textbook', 'textbooks', 'notebook', 'notebooks', 'book', 'books'].some((k) => cat.includes(k));
    this.isStationeryProduct = ['stationery', 'stationary', 'pen', 'pencil', 'marker', 'highlighter'].some((k) => cat.includes(k));

    this.sizes = Array.isArray(this.product.sizes) ? this.product.sizes : [];
    const firstAvailable = this.sizes.find((s: { available: boolean }) => s.available) || this.sizes[0];
    this.selectedSize = firstAvailable?.sizeLabel || '';

    this.images = product.images;
    this.currentIndex = 0;
    this.pdpSelectedImage = 0;
  }

  displayChest(r: { chest: number }): string {
    return this.formatMeasurement(r.chest);
  }


  displayLength(r: { length: number }): string {
    return this.formatMeasurement(r.length);
  }


  displaySleeve(r: { sleeve: number }): string {
    return this.formatMeasurement(r.sleeve);
  }

  private formatMeasurement(value: number): string {
    if (value === null || value === undefined) return '';
    if (this.unit === 'in') {
      return `${value}`;
    }
    const cm = value * 2.54;
    const rounded = Math.round(cm * 10) / 10;
    return `${rounded}`;
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
  }

  checkPincode(code?: string): void {
    const val = (code || '').toString().trim();
    this.lastCheckedPincode = val || null;
    this.pincodeAvailable = null;
    if (!/^\d{6}$/.test(val)) {
      this.pincodeAvailable = false;
      this.cdr.markForCheck();
      return;
    }

    const sub = this.publicStoreApi.checkServiceability(val).subscribe({
      next: (response) => {
        const body = (response && typeof response === 'object' ? response : {}) as Record<string, unknown>;
        const nested = body['data'] && typeof body['data'] === 'object' ? body['data'] as Record<string, unknown> : body;
        this.pincodeAvailable = nested['serviceable'] === true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.pincodeAvailable = false;
        this.cdr.markForCheck();
      },
    });
    this.cartSub.add(sub);
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
    this.pdpSelectedImage = i;
    this.setTranslate(-this.currentIndex * this.containerWidth, false);
  }

  toggleDetails(event?: KeyboardEvent | Event): void {
    if (event && (event as KeyboardEvent).type === 'keydown') {
      (event as KeyboardEvent).preventDefault?.();
    }
    this.detailsExpanded = !this.detailsExpanded;
  }

  toggleSellerInfo(): void {
    this.sellerInfoExpanded = !this.sellerInfoExpanded;
  }

  addToCart(): void {
    const productId = Number(this.product?.id);
    if (!productId) return;

    const categoryName = (this.product?.categoryName as string) || '';
    const quantity = Number(this.quantity) || 1;
    const schoolContext = this.schoolContextService.context ?? undefined;

    this.cartService.addItem({
      productId,
      categoryName,
      sizeLabel: this.selectedSize || null,
      quantity,
      schoolContext
    }).subscribe({
      next: () => {
        this.addedToCart = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.addedToCart = false; this.cdr.markForCheck(); }, 2000);
      },
      error: (err) => {
        this.coreService.triggerToast(err?.error?.message || 'Could not add this item to your cart. Please try again.');
      }
    });
  }

  // Navigation action handler for cart and other actions
  onNavigatorAction(ev: { index?: number; action?: any }): void {
    try {
      const action = ev && (ev as any).action;
      if (!action) return;
      if (action.type === 'cart') {
        try { this.router.navigateByUrl('/shop/cart'); } catch (e) { console.log('Open cart', action); }
        return;
      }
    } catch (e) { }
  }

  private setTranslate(px: number, noTransition = false): void {
    const el = this.slidesRef?.nativeElement as HTMLElement | undefined;
    if (!el) return;
    el.style.transition = noTransition ? 'none' : 'transform 320ms ease';
    el.style.transform = `translateX(${px}px)`;
  }
}
