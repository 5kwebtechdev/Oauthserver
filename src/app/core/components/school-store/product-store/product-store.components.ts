import { Component, ViewChild, ChangeDetectorRef, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CartService } from '../../../services/cart.service';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { Router, ActivatedRoute } from '@angular/router';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { AuthService } from '../../../services/auth.service';
import { AddressService } from '../../../services/address.service';
import { Address } from '../../../api/address.api';
import { CustomToastService } from '../../../services/custom-toast.service';
import { SchoolContextService } from '../../../services/school-context.service';
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

interface SubCategoryOption {
  id: string;
  label: string;
  imageUrl: string | null;
}

interface SubCategoryLevel {
  options: SubCategoryOption[];
  selected: string;
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
  brand?: string;
  pageCount?: string;
};

@Component({
  standalone: true,
  selector: 'product-store',
  templateUrl: './product-store.components.html',
  styleUrls: ['./product-store.components.scss'],
  imports: [CommonModule, IonicModule, SupermeButtonComponent, EmptyStateComponent]
  ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProductStoreComponent implements OnDestroy, OnInit {
  @ViewChild(IonContent, { static: false }) ionContent?: IonContent;

  // popup state for address/subtext
  showAddressPopup = false;

  // cart count driven by shared CartService
  cartCount: number = 0;
  private _cartCountSub?: Subscription;
  // local package count shown in the orders action
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
    private http: HttpClient,
    private authService: AuthService,
    private addressService: AddressService,
    private toastService: CustomToastService,
    private cartService: CartService,
    private schoolContext: SchoolContextService
  ) { }

  // product categories, loaded from the store categories API
  categories: { id: number; label: string; requiresSchoolClass: boolean }[] = [];
  categoriesLoading = false;
  categoriesError = false;

  selectedCategory: number | null = null;
  readonly allSubCategoryId = '__all_products__';
  activeProductSubCategory: string | null = null;

  // school + class the user picked on the "find your school" page, forwarded here via query params
  schoolId: number | null = null;
  schoolName: string | null = null;
  className: string | null = null;
  classId: number | null = null;

  // Category is chosen once on the Student-Store home screen — this page just
  // shows which one is active as the page heading, instead of repeating the
  // same category tabs again here.
  get selectedCategoryLabel(): string {
    return this.categories.find(c => c.id === this.selectedCategory)?.label ?? 'Student-Store';
  }

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
    this.productsRequestCompleted = false;
    this.productsError = false;
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
          this.activeProductSubCategory = null;
          this.subCategoryLevels = [];
          // Show every product in the selected store category immediately.
          // Subcategory metadata loads independently and only filters products
          // after the user explicitly chooses an item from the left rail.
          this.loadProducts();
          this.loadSubCategoryLevel(0, []);
        } else {
          this.productsRequestCompleted = true;
          this.productsError = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoriesLoading = false;
        this.categoriesError = true;
        this.productsRequestCompleted = true;
        this.productsError = true;
        this.cdr.detectChanges();
      }
    });
  }

  // Level 0 drives the horizontal Figma tabs. Level 1 drives the illustrated
  // category rail. Names and images remain sourced from the category API.
  subCategoryLevels: SubCategoryLevel[] = [];
  subCategoriesLoading = false;
  subCategoriesError = false;
  private subCategoryRequestId = 0;

  get primarySubCategoryLevel(): SubCategoryLevel | null {
    return this.subCategoryLevels[0] || null;
  }

  get railSubCategoryLevel(): SubCategoryLevel | null {
    return this.subCategoryLevels[1] || null;
  }

  // Level 0 (top-level options for a category, e.g. Boys/Girls) is fetched
  // from the bare /sub-categories URL. Every deeper level appends both the
  // path of selections made so far AND a `/sub-category{levelIndex}` suffix
  // — confirmed against a real working request:
  // /store/categories/2/sub-categories/Boys/sub-category1
  private buildSubCategoryUrl(categoryId: number, path: string[], levelIndex: number): string {
    const base = `${environment.apiUrl}/store/categories/${categoryId}/sub-categories`;
    const pathPart = path.length ? '/' + path.map(p => encodeURIComponent(p)).join('/') : '';
    const levelSuffix = levelIndex > 0 ? `/sub-category${levelIndex}` : '';
    return base + pathPart + levelSuffix;
  }

  private loadSubCategoryLevel(levelIndex: number, path: string[]): void {
    const requestId = ++this.subCategoryRequestId;
    this.subCategoriesLoading = true;
    this.subCategoriesError = false;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
    this.http.get<StoreSubCategory[]>(this.buildSubCategoryUrl(this.selectedCategory!, path, levelIndex), { headers }).subscribe({
      next: (res) => {
        if (requestId !== this.subCategoryRequestId) return;
        const apiSubCategories = Array.isArray(res) ? res : [];
        this.subCategoryLevels = this.subCategoryLevels.slice(0, levelIndex);
        if (apiSubCategories.length) {
          const apiOptions = apiSubCategories.map(s => ({
            id: s.name,
            label: s.name,
            imageUrl: s.imageUrl || null
          }));
          const options = levelIndex > 0
            ? [{ id: this.allSubCategoryId, label: 'All Products', imageUrl: null }, ...apiOptions]
            : apiOptions;
          this.subCategoryLevels.push({
            options,
            selected: levelIndex > 0 ? this.allSubCategoryId : options[0].id
          });

          if (levelIndex === 0 && this.selectedCategory != null) {
            // The first top tab is auto-selected on load — filter the product
            // list to it immediately instead of leaving the unfiltered list up.
            this.activeProductSubCategory = options[0].id;
            this.loadProducts();
            this.loadSubCategoryLevel(1, [apiOptions[0].id]);
            this.cdr.detectChanges();
            return;
          }
        }
        this.subCategoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (requestId !== this.subCategoryRequestId) return;
        this.subCategoriesLoading = false;
        this.subCategoriesError = true;
        this.cdr.detectChanges();
      }
    });
  }

  selectSubCategoryAt(levelIndex: number, option: SubCategoryOption): void {
    const level = this.subCategoryLevels[levelIndex];
    if (!level || level.selected === option.id) return;

    this.clearProductFilters(false);
    level.selected = option.id;
    // Drop deeper levels — they no longer apply to the new selection
    this.subCategoryLevels = this.subCategoryLevels.slice(0, levelIndex + 1);

    if (levelIndex === 0 && this.selectedCategory != null) {
      // A top tab now filters the product list to that top-level sub-category;
      // the rail underneath narrows it further once the user taps an item there.
      this.activeProductSubCategory = option.id;
      this.loadProducts();
      const path = [option.id];
      this.loadSubCategoryLevel(levelIndex + 1, path);
    } else {
      // "All Products" in the rail clears only the rail-level narrowing —
      // it falls back to the active top tab's filter, not to an unfiltered list.
      this.activeProductSubCategory = option.id === this.allSubCategoryId
        ? (this.subCategoryLevels[0]?.selected ?? null)
        : option.id;
      this.loadProducts();
    }

    this.cdr.detectChanges();
  }

  /** Clear the rail filter and return to all products in the active top tab. */
  resetSubCategories(): void {
    this.activeProductSubCategory = this.subCategoryLevels[0]?.selected ?? null;
    const railLevel = this.railSubCategoryLevel;
    if (railLevel?.options.some(option => option.id === this.allSubCategoryId)) {
      railLevel.selected = this.allSubCategoryId;
    }
    this.clearProductFilters();
    this.loadProducts();
    this.cdr.detectChanges();
  }

  // product list for cards, loaded from the store products API
  products: Product[] = [];
  productsLoading = false;
  productsRequestCompleted = false;
  productsError = false;
  productsPage = 0;
  productsTotalPages = 0;
  private readonly productsPageSize = 20;
  private productsRequestId = 0;

  showFilters = false;
  activeFilter: 'brand' | 'pageCount' = 'brand';
  selectedBrands = new Set<string>();
  selectedPageCounts = new Set<string>();
  draftBrands = new Set<string>();
  draftPageCounts = new Set<string>();

  get visibleProducts(): Product[] {
    return this.filterProducts(this.products, this.selectedBrands, this.selectedPageCounts);
  }

  get brandFilterOptions(): string[] {
    return this.uniqueValues(this.products.map(product => product.brand));
  }

  get pageCountFilterOptions(): string[] {
    return this.uniqueValues(this.products.map(product => product.pageCount));
  }

  get activeFilterOptions(): string[] {
    return this.activeFilter === 'brand' ? this.brandFilterOptions : this.pageCountFilterOptions;
  }

  get draftFilterResultCount(): number {
    return this.filterProducts(this.products, this.draftBrands, this.draftPageCounts).length;
  }

  private uniqueValues(values: Array<string | undefined>): string[] {
    return Array.from(new Set(
      values.map(value => String(value || '').trim()).filter(Boolean)
    ));
  }

  private filterProducts(products: Product[], brands: Set<string>, pageCounts: Set<string>): Product[] {
    return products.filter(product => {
      const matchesBrand = brands.size === 0 || (!!product.brand && brands.has(product.brand));
      const matchesPageCount = pageCounts.size === 0
        || (!!product.pageCount && pageCounts.has(product.pageCount));
      return matchesBrand && matchesPageCount;
    });
  }

  openFilters(panel: 'brand' | 'pageCount'): void {
    this.activeFilter = panel;
    this.draftBrands = new Set(this.selectedBrands);
    this.draftPageCounts = new Set(this.selectedPageCounts);
    this.showFilters = true;
    this.cdr.detectChanges();
  }

  closeFilters(): void {
    this.showFilters = false;
    this.cdr.detectChanges();
  }

  setActiveFilter(panel: 'brand' | 'pageCount'): void {
    this.activeFilter = panel;
  }

  isDraftFilterSelected(option: string): boolean {
    return this.activeFilter === 'brand'
      ? this.draftBrands.has(option)
      : this.draftPageCounts.has(option);
  }

  toggleDraftFilter(option: string): void {
    const target = this.activeFilter === 'brand' ? this.draftBrands : this.draftPageCounts;
    if (target.has(option)) target.delete(option);
    else target.add(option);
    this.cdr.detectChanges();
  }

  clearFilterDraft(): void {
    this.draftBrands.clear();
    this.draftPageCounts.clear();
    this.cdr.detectChanges();
  }

  applyFilters(): void {
    this.selectedBrands = new Set(this.draftBrands);
    this.selectedPageCounts = new Set(this.draftPageCounts);
    this.showFilters = false;
    this.cdr.detectChanges();
  }

  private clearProductFilters(updateDraft = true): void {
    this.selectedBrands.clear();
    this.selectedPageCounts.clear();
    if (updateDraft) {
      this.draftBrands.clear();
      this.draftPageCounts.clear();
    }
  }

  private formatCurrency(value: number): string {
    if (value == null || isNaN(value)) return '';
    return `₹${Number.isInteger(value) ? value : value.toFixed(2)}`;
  }

  loadProducts(page: number = 0): void {
    if (this.selectedCategory == null) {
      this.products = [];
      this.productsRequestCompleted = false;
      return;
    }
    const requestId = ++this.productsRequestId;
    this.productsLoading = true;
    this.productsRequestCompleted = false;
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
    if (this.activeProductSubCategory) {
      params = params.set('subCategory', this.activeProductSubCategory);
    }
    // school + class only apply to categories scoped to a specific school (e.g. School Uniform, Textbooks)
    if (this.selectedCategoryRequiresSchoolClass && this.schoolId != null && this.className) {
      params = params.set('schoolId', String(this.schoolId)).set('className', this.className);
    }
    this.http.get<ProductPage>(`${environment.apiUrl}/store/products`, { headers, params }).subscribe({
      next: (res) => {
        if (requestId !== this.productsRequestId) return;
        const content = Array.isArray(res?.content) ? res.content : [];
        const mapped: Product[] = content.map(p => ({
          id: String(p.id),
          tag: p.brandName || p.tag || p.schoolName || undefined,
          title: p.name,
          subtitle: p.schoolName || undefined,
          price: this.formatCurrency(p.sellingPrice),
          mrp: this.formatCurrency(p.mrp),
          img: p.thumbnailUrl || 'assets/School-assets/empty-product-list.png',
          outOfStock: !p.inStock,
          badge: p.mandatory ? 'Mandatory' : undefined,
          brand: p.brandName || p.tag || undefined,
          pageCount: p.pageCount ? String(p.pageCount) : undefined
        }));
        this.products = page === 0 ? mapped : [...this.products, ...mapped];
        this.productsPage = res?.number ?? page;
        this.productsTotalPages = res?.totalPages ?? 0;
        this.productsLoading = false;
        this.productsRequestCompleted = true;
        this.cdr.detectChanges();
      },
      error: () => {
        if (requestId !== this.productsRequestId) return;
        this.productsLoading = false;
        this.productsRequestCompleted = true;
        this.productsError = true;
        if (page === 0) this.products = [];
        this.cdr.detectChanges();
      }
    });
  }

  retryProducts(): void {
    if (this.selectedCategory == null) {
      this.loadCategories();
      return;
    }
    this.loadProducts();
  }

  openProduct(p: any): void {
    if (!p || p.outOfStock) return;
    let url = `/authed/school-store/product/${encodeURIComponent(p.id)}`;
    const qs: string[] = [];
    if (this.schoolId != null) qs.push(`schoolId=${this.schoolId}`);
    if (this.classId != null) qs.push(`classId=${this.classId}`);
    if (qs.length) url += '?' + qs.join('&');
    this.router.navigateByUrl(url);
  }

  // Tracks in-flight quick-adds so a double-tap can't fire the request twice,
  // and so the card can show instant "Added" feedback (Flipkart-style).
  addingToBagIds = new Set<string>();
  addedToBagIds = new Set<string>();

  addToBag(p: any): void {
    if (!p || p.outOfStock || this.addingToBagIds.has(p.id)) return;

    this.addingToBagIds.add(p.id);
    this.cdr.detectChanges();

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });

    const body: Record<string, any> = { productId: p.id, quantity: 1 };
    if (this.schoolId != null) body['schoolId'] = this.schoolId;
    if (this.classId != null) body['classId'] = this.classId;

    this.http.post(`${environment.apiUrl}/cart/items`, body, { headers }).subscribe({
      next: () => {
        this.addingToBagIds.delete(p.id);
        // Update the shared cart count immediately — no need to wait for a
        // full cart reload — so the badge reflects the change instantly.
        this.cartService.increment(1);
        this.addedToBagIds.add(p.id);
        this.cdr.detectChanges();
        setTimeout(() => {
          this.addedToBagIds.delete(p.id);
          this.cdr.detectChanges();
        }, 2000);
      },
      error: () => {
        this.addingToBagIds.delete(p.id);
        this.toastService.error('Failed to add to bag. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  // handle right action clicks from the navigator (e.g., cart)
  onNavigatorAction(ev: { index: number; action: any }): void {
    try {
      const action = ev && (ev as any).action;
      if (!action) return;
      if (action.type === 'cart') {
        this.openCart();
        return;
      }
      if (action.type === 'package') {
        this.openOrders();
        return;
      }
    } catch (e) { }
  }

  openCart(): void {
    const queryParams: Record<string, string> = {};
    if (this.schoolId != null) queryParams['schoolId'] = String(this.schoolId);
    if (this.classId != null) queryParams['classId'] = String(this.classId);
    this.router.navigate(['/authed/cart'], { queryParams });
  }

  openOrders(): void {
    this.router.navigateByUrl('/authed/school-store/my-orders');
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
      const classIdParam = params.get('classId');
      const classIdNum = classIdParam ? Number(classIdParam) : NaN;
      this.classId = isNaN(classIdNum) ? null : classIdNum;
      // Remember this context so it survives a hard refresh on a page (e.g. My
      // Cart) that has no school/class query params of its own.
      if (this.schoolId != null || this.classId != null) {
        this.schoolContext.set(this.schoolId, this.classId);
      }

      this.loadCategories(isNaN(categoryId) ? undefined : categoryId);
    } catch (e) {
      this.loadCategories();
    }
  }
  ngOnDestroy(): void {
    try { this._cartCountSub?.unsubscribe(); } catch (e) { }
    try { this._addrSub?.unsubscribe(); } catch (e) { }
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
