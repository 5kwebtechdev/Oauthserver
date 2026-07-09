import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CartService } from '../../../services/cart.service';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddressInputComponent } from '../address-input/address-input.components';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { AuthService } from '../../../services/auth.service';
import { AddressService } from '../../../services/address.service';
import { Address } from '../../../api/address.api';
import { CustomToastService } from '../../../services/custom-toast.service';
import { environment } from '../../../../../environments/environment';

interface StoreCategory {
  id: number;
  name: string;
  displayName: string;
  iconUrl: string | null;
  imageUrl: string;
  requiresSchoolClass: boolean;
}

interface StoreSubCategory {
  name: string;
  imageUrl: string | null;
}

interface ApiProduct {
  id: number;
  name: string;
  thumbnailUrl: string;
  categoryName: string;
  schoolName: string | null;
  tag: string;
  mrp: number;
  sellingPrice: number;
  discountText: string;
  mandatory: boolean;
  inStock: boolean;
  brandName: string | null;
  pageCount: string;
}

interface ProductPage {
  content: ApiProduct[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

// top-level Product type used in component and template
type Product = {
  id: string;
  tag?: string;
  title: string;
  subtitle?: string;
  price: string;
  mrp: string;
  img: string;
  outOfStock?: boolean;
  badge?: string;
};

@Component({
  standalone: true,
  selector: 'product-store',
  templateUrl: './product-store.components.html',
  styleUrls: ['./product-store.components.scss'],
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, EmptyStateComponent]
  ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProductStoreComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('navigator', { static: false, read: ElementRef }) navigatorEl?: ElementRef;
  @ViewChild('categorySlider', { static: false, read: ElementRef }) categorySlider?: ElementRef;
  @ViewChild('subCategorySlider', { static: false, read: ElementRef }) subCategorySlider?: ElementRef;
  @ViewChild(IonContent, { static: false }) ionContent?: IonContent;

  // popup state for address/subtext
  showAddressPopup = false;

  // cart count driven by shared CartService
  cartCount: number = 0;
  private _cartCountSub?: Subscription;
  // local package count shown in navigator right action
  packageCount: number = 0;

  // address state (loaded from API via AddressService)
  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  addressesLoading = false;
  deletingAddressId: number | null = null;

  private _addrSub?: Subscription;

  // navigator subtext truncated to 20 chars + ellipsis
  get navigatorSubtext(): string {
    const s = this.selectedAddress ? this.formatAddressShort(this.selectedAddress) : '';
    return s.length > 20 ? s.slice(0, 20) + '...' : s;
  }

  formatAddressShort(a: Address): string {
    return [a.line1, a.line2].filter(Boolean).join(', ');
  }

  formatAddressHtml(a: Address): string {
    const cityState = [a.city, a.state].filter(Boolean).join(', ');
    const line3 = [cityState, a.postalCode].filter(Boolean).join(' - ');
    return [a.receiverName, a.line1, a.line2, line3].filter(Boolean).join('<br/>');
  }

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
    private http: HttpClient,
    private authService: AuthService,
    private addressService: AddressService,
    private toastService: CustomToastService,
    private cartService: CartService
  ) { }

  // product categories, loaded from the store categories API
  categories: { id: number; label: string; requiresSchoolClass: boolean }[] = [];
  categoriesLoading = false;
  categoriesError = false;

  selectedCategory: number | null = null;

  // school + class the user picked on the "find your school" page, forwarded here via query params
  schoolId: number | null = null;
  schoolName: string | null = null;
  className: string | null = null;

  // true when the currently selected top-level category is "Textbooks"
  get isTextbooksSelected(): boolean {
    const label = this.categories.find(c => c.id === this.selectedCategory)?.label;
    return (label || '').trim().toLowerCase() === 'textbooks';
  }

  // true when the currently selected category is scoped to a specific school + class
  get selectedCategoryRequiresSchoolClass(): boolean {
    return !!this.categories.find(c => c.id === this.selectedCategory)?.requiresSchoolClass;
  }

  loadCategories(initialCategoryId?: number): void {
    this.categoriesLoading = true;
    this.categoriesError = false;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
    this.http.get<StoreCategory[]>(`${environment.apiUrl}/store/categories/all`, { headers }).subscribe({
      next: (res) => {
        const apiCategories = Array.isArray(res) ? res : [];
        this.categories = apiCategories.map(c => ({ id: c.id, label: c.displayName, requiresSchoolClass: c.requiresSchoolClass }));
        this.categoriesLoading = false;
        const matched = initialCategoryId != null && this.categories.some(c => c.id === initialCategoryId);
        this.selectedCategory = matched ? initialCategoryId! : (this.categories[0]?.id ?? null);
        if (this.selectedCategory != null) {
          this.loadSubCategories(this.selectedCategory);
          this.loadProducts();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoriesLoading = false;
        this.categoriesError = true;
        this.cdr.detectChanges();
      }
    });
  }

  // sub-categories for the second slider, loaded from the store sub-categories API
  subCategories: { id: string; label: string }[] = [
    { id: 'all', label: 'All' }
  ];
  subCategoriesLoading = false;
  subCategoriesError = false;

  selectedSubCategory: string = this.subCategories[0].id;

  loadSubCategories(categoryId: number): void {
    this.subCategoriesLoading = true;
    this.subCategoriesError = false;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
    this.http.get<StoreSubCategory[]>(`${environment.apiUrl}/store/categories/${categoryId}/sub-categories`, { headers }).subscribe({
      next: (res) => {
        const apiSubCategories = Array.isArray(res) ? res : [];
        this.subCategories = [
          { id: 'all', label: 'All' },
          ...apiSubCategories.map(s => ({ id: s.name, label: s.name }))
        ];
        this.subCategoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.subCategoriesLoading = false;
        this.subCategoriesError = true;
        this.cdr.detectChanges();
      }
    });
  }

  // product list for cards, loaded from the store products API
  products: Product[] = [];
  productsLoading = false;
  productsError = false;
  productsPage = 0;
  productsTotalPages = 0;
  private readonly productsPageSize = 20;

  // Kept so the template's existing `visibleProducts` binding keeps working;
  // filtering now happens server-side via categoryId/subCategory query params.
  get visibleProducts(): Product[] {
    return this.products;
  }

  private formatCurrency(value: number): string {
    if (value == null || isNaN(value)) return '';
    return `₹${Number.isInteger(value) ? value : value.toFixed(2)}`;
  }

  loadProducts(page: number = 0): void {
    if (this.selectedCategory == null) {
      this.products = [];
      return;
    }
    this.productsLoading = true;
    this.productsError = false;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
    let params = new HttpParams()
      .set('categoryId', String(this.selectedCategory))
      .set('page', String(page))
      .set('size', String(this.productsPageSize));
    if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      params = params.set('subCategory', this.selectedSubCategory);
    }
    // school + class only apply to categories scoped to a specific school (e.g. School Uniform, Textbooks)
    if (this.selectedCategoryRequiresSchoolClass && this.schoolId != null && this.className) {
      params = params.set('schoolId', String(this.schoolId)).set('className', this.className);
    }
    this.http.get<ProductPage>(`${environment.apiUrl}/store/products`, { headers, params }).subscribe({
      next: (res) => {
        const content = Array.isArray(res?.content) ? res.content : [];
        const mapped: Product[] = content.map(p => ({
          id: String(p.id),
          tag: p.tag || undefined,
          title: p.name,
          subtitle: p.brandName || p.schoolName || undefined,
          price: this.formatCurrency(p.sellingPrice),
          mrp: this.formatCurrency(p.mrp),
          img: p.thumbnailUrl,
          outOfStock: !p.inStock,
          badge: p.mandatory ? 'Mandatory' : undefined
        }));
        this.products = page === 0 ? mapped : [...this.products, ...mapped];
        this.productsPage = res?.number ?? page;
        this.productsTotalPages = res?.totalPages ?? 0;
        this.productsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.productsLoading = false;
        this.productsError = true;
        if (page === 0) this.products = [];
        this.cdr.detectChanges();
      }
    });
  }

  selectCategory(c: { id: number; label: string }): void {
    // ignore click if user was dragging to scroll
    if ((this as any)._isDragging) return;
    if (this.selectedCategory === c.id) return;

    // categories scoped to a school (e.g. School Uniform) need a school + class first;
    // if we don't have one yet, send the user to pick it rather than showing an unfiltered list
    const requiresSchoolClass = !!this.categories.find(cat => cat.id === c.id)?.requiresSchoolClass;
    if (requiresSchoolClass && (this.schoolId == null || !this.className)) {
      this.router.navigateByUrl(`/authed/school-store/institute-detail?categoryId=${c.id}`).catch(() => {});
      return;
    }

    this.selectedCategory = c.id;
    this.selectedSubCategory = 'all';
    this.loadSubCategories(c.id);
    this.loadProducts();
    this.cdr.detectChanges();
  }

  selectSubCategory(s: { id: string; label: string }): void {
    if ((this as any)._isDragging) return;
    if (this.selectedSubCategory === s.id) return;
    this.selectedSubCategory = s.id;
    this.loadProducts();
    this.cdr.detectChanges();
  }

  openProduct(p: any): void {
    if (!p || p.outOfStock) return;
    let url = `/authed/school-store/product/${encodeURIComponent(p.id)}`;
    const qs: string[] = [];
    if (this.schoolId != null) qs.push(`schoolId=${this.schoolId}`);
    if (qs.length) url += '?' + qs.join('&');
    this.router.navigateByUrl(url);
  }

  addToBag(p: any): void {
    try { console.log('Add to bag', p && p.id); } catch (e) { }
  }

  // handle right action clicks from the navigator (e.g., cart)
  onNavigatorAction(ev: { index: number; action: any }): void {
    try {
      const action = ev && (ev as any).action;
      if (!action) return;
      if (action.type === 'cart') {
        try { this.router.navigateByUrl('/authed/cart'); } catch (e) { console.log('Open cart', action); }
        return;
      }
      if (action.type === 'package') {
        try { this.router.navigateByUrl('/authed/school-store/my-orders'); } catch (e) { console.log('Open packages', action); }
        return;
      }
    } catch (e) { }
  }

  // Compute a display badge for a product when appropriate.
  // Priority: explicit `badge` -> `tag === 'Mandatory'` -> title/subtitle containing 'Pack of N'
  getBadge(p: Product | any): string | undefined {
    if (!p) return undefined;
    if (p.badge) return p.badge;
    if (p.tag && String(p.tag).trim().toLowerCase() === 'mandatory') return 'Mandatory';
    const extractPack = (text: string | undefined) => {
      if (!text) return null;
      const m = /pack\s*of\s*(\d+)/i.exec(text);
      return m ? `Pack of ${m[1]}` : null;
    };
    const fromTitle = extractPack(p.title);
    if (fromTitle) return fromTitle;
    const fromSubtitle = extractPack(p.subtitle);
    if (fromSubtitle) return fromSubtitle;
    return undefined;
  }

  ngOnInit(): void {
    // Subscribe to live cart count
    this._cartCountSub = this.cartService.count$.subscribe(n => {
      this.cartCount = n;
      this.cdr.detectChanges();
    });
    this.cartService.refresh();

    // Subscribe to address list reactively
    this._addrSub = this.addressService.addresses$.subscribe(list => {
      this.addresses = list;
      const def = list.find(a => a.isDefault) ?? list[0] ?? null;
      // Only auto-select default; preserve explicit selection if it still exists in the list
      if (!this.selectedAddress) {
        this.selectedAddress = def;
      } else {
        const stillExists = list.find(a => a.id === this.selectedAddress!.id);
        this.selectedAddress = stillExists ?? def ?? null;
      }
      this.cdr.detectChanges();
    });

    // Trigger initial address fetch
    this.addressesLoading = true;
    this.addressService.load().subscribe({
      next: () => { this.addressesLoading = false; this.cdr.detectChanges(); },
      error: () => { this.addressesLoading = false; this.cdr.detectChanges(); }
    });

    try {
      const params = this.route.snapshot.queryParamMap;
      const cat = params.get('category');
      const categoryId = cat ? Number(cat) : NaN;

      const school = params.get('schoolId');
      const schoolIdNum = school ? Number(school) : NaN;
      this.schoolId = isNaN(schoolIdNum) ? null : schoolIdNum;
      this.schoolName = params.get('schoolName');
      this.className = params.get('className');

      this.loadCategories(isNaN(categoryId) ? undefined : categoryId);
    } catch (e) {
      this.loadCategories();
    }
  }
  // Drag flag used to suppress clicks while user is scrolling
  private _isDragging = false;
  private _cleanupSlider?: () => void;

  ngOnDestroy(): void {
    try { this._cartCountSub?.unsubscribe(); } catch (e) { }
    try { this._addrSub?.unsubscribe(); } catch (e) { }
    try {
      if (this._cleanupSlider) this._cleanupSlider();
    } catch (e: any) { }
  }
  openAddressPopup(): void {
    this.showAddressPopup = true;
    this.cdr.detectChanges();
  }

  closeAddressPopup(): void {
    this.showAddressPopup = false;
    this.cdr.detectChanges();
  }

  async openAddressInput(): Promise<void> {
    try {
      this.closeAddressPopup();
      await this.router.navigateByUrl('/authed/school-store/address-input');
    } catch (e) { console.error('Failed to open address input page', e); }
  }

  selectAddress(a: Address): void {
    if (a.isDefault) { this.closeAddressPopup(); return; }
    const prev = this.selectedAddress;
    this.selectedAddress = a;
    this.closeAddressPopup();
    this.addressService.setDefault(a.id).subscribe({
      error: () => {
        this.selectedAddress = prev;
        this.toastService.error('Failed to update default address.');
        this.cdr.detectChanges();
      }
    });
  }

  editAddress(a: Address): void {
    this.closeAddressPopup();
    this.router.navigate(['/authed/school-store/address-input'], {
      queryParams: { addressId: a.id },
      state: { address: a }
    });
  }

  deleteAddress(a: Address): void {
    if (this.deletingAddressId != null) return;
    this.deletingAddressId = a.id;
    this.cdr.detectChanges();
    this.addressService.deleteAddress(a.id).subscribe({
      next: () => {
        this.deletingAddressId = null;
        this.toastService.success('Address deleted successfully.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.deletingAddressId = null;
        this.toastService.error('Failed to delete address. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit(): void {
    try {
      const navNative = this.navigatorEl?.nativeElement;
      if (navNative && typeof navNative.addEventListener === 'function') {
        navNative.addEventListener('click', (ev: Event) => {
          const target = ev.target as HTMLElement | null;
          if (!target) return;
          if (target.closest && (target.closest('.navigator-heading') || target.closest('.navigator-subtext-row') || target.closest('.navigator-subtext') || target.closest('.navigator-subtext-text'))) {
            this.openAddressPopup();
            return;
          }
        });
      }
    } catch (e: any) { }

    // Attach robust drag-to-scroll using window listeners so children don't block events
    try {
      const el = this.categorySlider?.nativeElement as HTMLElement | undefined;
      if (el && el.addEventListener) {
        let active = false;
        let startX = 0;
        let startScroll = 0;

        const onMove = (ev: PointerEvent) => {
          if (!active) return;
          const dx = ev.clientX - startX;
          if (Math.abs(dx) > 4) this._isDragging = true;
          el.scrollLeft = startScroll - dx;
        };

        const onUp = () => {
          active = false;
          setTimeout(() => (this._isDragging = false), 0);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };

        const onDown = (ev: PointerEvent) => {
          active = true;
          startX = ev.clientX;
          startScroll = el.scrollLeft;
          this._isDragging = false;
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };

        el.addEventListener('pointerdown', onDown);

        this._cleanupSlider = () => {
          el.removeEventListener('pointerdown', onDown);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
      }
    } catch (e: any) { }
  }

  changeSchool(): void {
    const catId = this.selectedCategory ?? '';
    this.router.navigateByUrl(`/authed/school-store/institute-detail?categoryId=${catId}`).catch(() => {});
  }

  goBack(): void {
    // Always navigate to the app entry (home) page instead of relying on history
    this.router.navigateByUrl('/home');
  }

  // Scroll page to top with smooth behaviour
  scrollToTop(): void {
    // Prefer Ionic's IonContent native scroll if present
    try {
      if (this.ionContent && typeof this.ionContent.scrollToTop === 'function') {
        // duration in ms (smooth)
        this.ionContent.scrollToTop(300).catch(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        return;
      }
    } catch (e) { }
    // Fallback to window scrolling
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }

  // Notify handler for out-of-stock products (placeholder)
  notifyMe(p: any): void {
    // TODO: wire to real notify API / UI. For now show a console message.
    try { console.log('Notify requested for', p && p.id); } catch (e) { }
  }
}
