import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, OnInit, Output, EventEmitter, Input, Renderer2, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddressInputComponent } from '../address-input/address-input.components';
import { PublicNavbarComponent } from '../../../components/public-navbar/public-navbar.component';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CartService } from '../../../services/cart.service';
import { CoreService } from '../../../services/core.service';
import { AddressService } from '../../../services/address.service';
import { SchoolContextService } from '../../../services/school-context.service';
import { SchoolContextRequiredError } from '../../../models/cart.model';
import { Address } from '../../../models/address.model';
import { shopCategoryPath, shopCategoryUrl, shopSlug } from '../../../services/shop-url';
import { StationeryCategorySliderComponent } from './stationery/stationery-category-slider/stationery-category-slider.component';
import { StationerySidebarComponent } from './stationery/stationery-sidebar/stationery-sidebar.component';
import { StationeryFiltersComponent } from './stationery/stationery-filters/stationery-filters.component';
import { StationeryProductCardComponent } from './stationery/stationery-product-card/stationery-product-card.component';

// top-level Product type used in component and template
type Product = {
  id: string;
  rawId?: string | number;
  tag?: string;
  title: string;
  subtitle?: string;
  price: string;
  mrp: string;
  img: string;
  subcategory?: string;
  outOfStock?: boolean;
  category?: string;
  categoryName?: string;
  badge?: string;
  brand?: string;
  pageCount?: number;
};

type StationeryCategory = {
  id: string;
  label: string;
  icon: string;
};

type StationerySection = {
  id: string;
  title: string;
  categories?: StationeryCategory[];
  products: Product[];
  banner?: 'books';
};

@Component({
  standalone: true,
  selector: 'app-product-store',
  templateUrl: './product-store.components.html',
  styleUrls: ['./product-store.components.scss'],
  imports: [
    CommonModule,
    IonicModule,
    PublicNavbarComponent,
    StationeryCategorySliderComponent,
    StationerySidebarComponent,
    StationeryFiltersComponent,
    StationeryProductCardComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProductStoreComponent implements AfterViewInit, OnDestroy, OnInit {
  @Input() selectedCategoryId: number | null = null;
  @Input() selectedCategoryName: string | null = null;
  @Input() schoolId: string | null = null;
  @Input() className: string | null = null;
  @Output() closeInline: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('navigator', { static: false, read: ElementRef }) navigatorEl?: ElementRef;
  @ViewChild('categorySlider', { static: false, read: ElementRef }) categorySlider?: ElementRef;
  @ViewChild('subCategorySlider', { static: false, read: ElementRef }) subCategorySlider?: ElementRef;
  @ViewChild(IonContent, { static: false }) ionContent?: IonContent;
  @ViewChild('addressInner') addressInner?: ElementRef<HTMLElement>;
  @ViewChild('changeBtn') changeBtn?: ElementRef<HTMLElement>;

  // School name for header
  @Input() schoolName: string = 'Select School';
  private readonly storeApi = `${environment.apiUrl}/public/store`;
  private readonly productsApi = `${this.storeApi}/products`;
  private readonly categoriesApi = `${this.storeApi}/categories/all`;
  private readonly apiSub = new Subscription();
  isLoadingProducts = false;
  currentPage = 0;

  // popup state for address/subtext
  showAddressPopup = false;

  // local cart count shown in navigator right action
  cartCount: number = 0;
  // local package count shown in navigator right action
  packageCount: number = 0;

  addresses: Address[] = [];
  selectedAddress: string = '';
  loadingAddresses = false;
  deletingAddressId: number | null = null;
  private previouslyFocused: HTMLElement | null = null;

  // navigator subtext truncated to 20 chars + ellipsis
  get navigatorSubtext(): string {
    const s = this.selectedAddress || '';
    return s.length > 20 ? s.slice(0, 20) + '...' : s;
  }

  constructor(private router: Router, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private modalCtrl: ModalController, private http: HttpClient, private renderer: Renderer2, private cartService: CartService, private coreService: CoreService, private schoolContextService: SchoolContextService, private addressService: AddressService) { }

  // product categories
  categories: { id: string; label: string; catId?: number }[] = [
    { id: 'stationery', label: 'Stationery' },
    { id: 'boys', label: 'Boys Uniforms' },
    { id: 'girls', label: 'Girls Uniforms' },
    { id: 'textbooks', label: 'Textbooks' },
    { id: 'footwear', label: 'Footwears' },
    { id: 'accessories', label: 'Accessories' }
  ];

  @Input() selectedCategory: string | null = this.categories[1].id; // default to 'Girls Uniforms' as in figma

  // sub-categories for the second slider (simple defaults)
  subCategories = [
    { id: 'all', label: 'All' },
    { id: 'summer', label: 'Summer' },
    { id: 'winter', label: 'Winter' },
    { id: 'sport', label: 'Sport' }
  ];

  selectedSubCategory = this.subCategories[0].id;

  // fallback product list for cards when the store products API is unavailable or returns no records
  private fallbackProducts: Product[] = [
    {
      id: 'shirt-1',
      tag: 'Official School Wear',
      title: 'Classic White Half-Sleeve Shirt',
      price: '₹449',
      mrp: '₹600',
      img: 'assets/School-assets/temp/Shirt.jpg',
      subcategory: 'summer'
    },
    {
      id: 'shorts-1',
      tag: 'Official School Wear',
      title: 'Navy Blue Formal Shorts',
      price: '₹399',
      mrp: '₹500',
      img: 'assets/School-assets/temp/Shorts.jpg',
      subcategory: 'summer'
    },
    {
      id: 'tshirt-1',
      tag: 'Official School Wear',
      title: 'House T-Shirt (White/Red)',
      price: '₹349',
      mrp: '₹500',
      img: 'assets/School-assets/temp/T-Shirt.jpg',
      subcategory: 'summer'
    },
    {
      id: 'trouser-1',
      tag: 'Official School Wear',
      title: 'Classic Formal Trousers',
      price: '₹699',
      mrp: '₹850',
      img: 'assets/School-assets/temp/Trousers.jpg',
      subcategory: 'all'
    },
    {
      id: 'blazer-1',
      tag: 'Official School Wear',
      title: 'Classic Blazer',
      price: '₹699',
      mrp: '₹850',
      img: 'assets/School-assets/temp/Blazer.jpg',
      outOfStock: true,
      subcategory: 'all'
    },
    {
      id: 'track-1',
      category: 'girls',
      tag: 'Official School Wear',
      title: 'Comfort Sports Track Pants',
      price: '₹449',
      mrp: '₹600',
      img: 'assets/School-assets/temp/Gemini_Generated_Image_pi8q46pi8q46pi8q 1.jpg',
      outOfStock: true,
      subcategory: 'sport'
    },
    // --- Boys uniform samples to avoid empty state when selecting Boys > All ---
    {
      id: 'boys-shirt-1',
      category: 'boys',
      tag: 'Official School Wear',
      title: 'Classic White Half-Sleeve Shirt',
      price: '₹449',
      mrp: '₹600',
      img: 'assets/School-assets/temp/Shirt.jpg',
      subcategory: 'summer'
    },
    {
      id: 'boys-trouser-1',
      category: 'boys',
      tag: 'Official School Wear',
      title: 'Classic Formal Trousers',
      price: '₹699',
      mrp: '₹850',
      img: 'assets/School-assets/temp/Trousers.jpg',
      subcategory: 'all'
    },
    {
      id: 'boys-tshirt-1',
      category: 'boys',
      tag: 'Official School Wear',
      title: 'House T-Shirt (White/Red)',
      price: '₹349',
      mrp: '₹500',
      img: 'assets/School-assets/temp/T-Shirt.jpg',
      subcategory: 'summer'
    },
    {
      id: 'boys-shorts-1',
      category: 'boys',
      tag: 'Official School Wear',
      title: 'Navy Blue Formal Shorts',
      price: '₹399',
      mrp: '₹500',
      img: 'assets/School-assets/temp/Shorts.jpg',
      subcategory: 'summer'
    },
    {
      id: 'boys-shirt-l',
      category: 'boys',
      tag: 'Official School Wear',
      title: 'Classic White Shirt (Large)',
      price: '₹499',
      mrp: '₹650',
      img: 'assets/School-assets/temp/Shirt-l.jpg',
      subcategory: 'all'
    },
    {
      id: 'boys-blazer-1',
      category: 'boys',
      tag: 'Official School Wear',
      title: 'Classic Blazer',
      price: '₹699',
      mrp: '₹850',
      img: 'assets/School-assets/temp/Blazer.jpg',
      outOfStock: true,
      subcategory: 'all'
    },
    // --- Textbooks (new dummy data) ---
    {
      id: 'maths-class7',
      category: 'textbooks',
      tag: 'Mandatory',
      title: 'Mathematics -\nClass 7',
      subtitle: 'NCERT - 2025 Edition',
      price: '₹65',
      mrp: '₹80',
      img: 'assets/School-assets/temp/Maths Book.jpg',
      subcategory: 'textbooks'
    },
    {
      id: 'science-class7',
      category: 'textbooks',
      tag: 'Mandatory',
      title: 'Science -\nClass 7',
      subtitle: 'NCERT - 2025 Edition',
      price: '₹65',
      mrp: '₹80',
      img: 'assets/School-assets/temp/Maths Book.jpg',
      subcategory: 'textbooks'
    },
    {
      id: 'english-honeycomb',
      category: 'textbooks',
      tag: '',
      title: 'Honeycomb -\nEnglish',
      subtitle: 'NCERT - 2024 Edition',
      price: '₹65',
      mrp: '₹80',
      img: 'assets/School-assets/temp/English.jpg',
      subcategory: 'textbooks'
    },
    {
      id: 'single-line-notebook',
      category: 'textbooks',
      tag: 'Mandatory',
      title: 'Single Line Notebooks (A4) - Pack of 6',
      subtitle: 'Classmate - 172 Pages',
      price: '₹249',
      mrp: '₹350',
      img: 'assets/School-assets/temp/Notebook.jpg',
      subcategory: 'notesbook'
    }
  ];

  products: Product[] = this.fallbackProducts.slice();

  stationeryCategories: StationeryCategory[] = [
    { id: 'writing', label: 'Writing Essentials', icon: 'pen' },
    { id: 'notebooks', label: 'Notebooks & Journals', icon: 'notebook' },
    { id: 'office', label: 'Office Supplies', icon: 'stapler' },
    { id: 'school', label: 'School Supplies', icon: 'bag' },
    { id: 'craft', label: 'Craft & Hobbies', icon: 'palette' },
    { id: 'books', label: 'Books & Magazines', icon: 'book' }
  ];

  stationeryCategoryCardsData: StationeryCategory[] = this.stationeryCategories.slice();
  stationerySubCategories: StationeryCategory[] = [];
  stationerySubCategoryFilters: StationeryCategory[] = [];
  selectedStationerySubCategory: string | null = null;
  selectedStationerySubCategory2: string | null = null;
  selectedSubCategory1: string | null = null;
  selectedSubCategory2: string | null = null;
  private readonly stationeryRootCategoryId = 5;
  private pendingStationeryLeaf: StationeryCategory | null = null;
  private stationeryTopCategoriesLoaded = false;
  private stationeryTopCategoriesLoading = false;

  selectedStationeryLeaf: StationeryCategory | null = null;

  // Static filter option lists for the Brand / Page Count dropdown filters
  stationeryBrandOptions: string[] = ['Classmate', 'Sundaram', 'Navneet', 'Camel', 'Nataraj', 'Kokuyo', 'Crown', 'Other'];
  stationeryPageCountOptions: string[] = ['80 Pages', '100 Pages', '172 Pages', '200 Pages', '300 Pages'];
  selectedStationeryBrands: string[] = [];
  selectedStationeryPageCounts: string[] = [];
  stationerySidebarOpen = false;

  private stationeryProducts: Product[] = [
    { id: 'parker-vector-set', title: 'Parker Vector Special Edition Chrome Trim Roller Ball Pen Set', price: 'Rs. 409', mrp: 'Rs. 560', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '27% OFF', brand: 'Camel' },
    { id: 'pilot-v7-roller', title: 'Pilot V7 Roller Pen Blue', price: 'Rs. 75', mrp: 'Rs. 90', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '17% OFF', brand: 'Classmate' },
    { id: 'flair-move-gel', title: 'Flair Move Gel Pen Pack of 5', price: 'Rs. 50', mrp: 'Rs. 75', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '33% OFF', brand: 'Kokuyo' },
    { id: 'luxor-fineliner', title: 'Luxor Fineliner Assorted Color Fineliner Pen', price: 'Rs. 99', mrp: 'Rs. 160', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '38% OFF', brand: 'Nataraj' },
    { id: 'fosfor-weavill', title: 'Fosfor Weavill Click Pens Natural Pens Beige', price: 'Rs. 232', mrp: 'Rs. 499', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '53% OFF', brand: 'Crown' },
    { id: 'flair-glitter', title: 'Flair Glitter Pen Pack of 10', price: 'Rs. 295', mrp: 'Rs. 350', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '15% OFF', brand: 'Sundaram' },
    { id: 'toyshine-dog-pens', title: 'Toyshine Dog Gel Pen Set Cartoon Pens', price: 'Rs. 158', mrp: 'Rs. 499', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '68% OFF', brand: 'Navneet' },
    { id: 'classmate-pens', title: 'Classmate Pens Color Burst Pack', price: 'Rs. 94', mrp: 'Rs. 100', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '6% OFF', brand: 'Classmate' },
    { id: 'parker-frontier', title: 'Parker Frontier Stainless Steel Chrome Trim Roller Ball Pen', price: 'Rs. 425', mrp: 'Rs. 800', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '47% OFF', brand: 'Camel' },
    { id: 'doms-ball-pens', title: 'Doms Intra Fine Ball Pens Blue Pack', price: 'Rs. 30', mrp: 'Rs. 40', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '25% OFF', brand: 'Other' },
    { id: 'reynolds-aeroslim', title: 'Reynolds Aeroslim Ball Pen Set Black Pens', price: 'Rs. 30', mrp: 'Rs. 35', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '14% OFF', brand: 'Other' },
    { id: 'classmate-octane', title: 'Classmate Octane Gel Pens Blue', price: 'Rs. 47', mrp: 'Rs. 50', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pen', tag: '3% OFF', brand: 'Classmate' },
    { id: 'nataraj-pencil-set', title: 'Nataraj Superx Pencils Pack of 10', price: 'Rs. 45', mrp: 'Rs. 60', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pencil', tag: '25% OFF', brand: 'Nataraj' },
    { id: 'apsara-eraser', title: 'Apsara Non Dust Eraser Pack of 5', price: 'Rs. 30', mrp: 'Rs. 40', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'pencil', tag: '25% OFF', brand: 'Kokuyo' },
    { id: 'camlin-marker', title: 'Camlin Permanent Marker Black', price: 'Rs. 28', mrp: 'Rs. 35', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'marker', tag: '20% OFF', brand: 'Camel' },
    { id: 'pastel-highlighter', title: 'Pastel Highlighter Set of 6', price: 'Rs. 222', mrp: 'Rs. 240', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'highlighter', tag: '7% OFF', brand: 'Sundaram' },
    { id: 'classmate-notebook', title: 'Classmate Single Line Notebook 172 Pages', price: 'Rs. 45', mrp: 'Rs. 50', img: 'assets/School-assets/temp/Notebook.jpg', category: 'stationery', subcategory: 'notebooks', tag: '10% OFF', brand: 'Classmate', pageCount: 172 },
    { id: 'artist-kit', title: 'Acrylic Colour and Brush Art Kit', price: 'Rs. 269', mrp: 'Rs. 400', img: 'assets/School-assets/temp/Gemini_Generated_Image_pi8q46pi8q46pi8q 1.jpg', category: 'stationery', subcategory: 'art-craft', tag: '33% OFF', brand: 'Navneet' }
  ];

  stationerySections: StationerySection[] = [
    {
      id: 'imported',
      title: 'Japanese & Imported Stationery',
      products: []
    },
    {
      id: 'deals',
      title: 'Top deals for you',
      products: [
        { id: 'elsa-bag', title: 'Kids School Bag Pink Elsa Theme', price: 'Rs. 619', mrp: 'Rs. 1199', img: 'assets/School-assets/Accessories.png', category: 'stationery', subcategory: 'school', tag: '48% OFF' },
        { id: 'unicorn-bag', title: 'Unicorn Backpack for Kids Mini Size', price: 'Rs. 537', mrp: 'Rs. 1199', img: 'assets/School-assets/Accessories.png', category: 'stationery', subcategory: 'school', tag: '55% OFF' },
        { id: 'printed-bus', title: 'Printed School Bus Metal Pencil Box', price: 'Rs. 279', mrp: 'Rs. 399', img: 'assets/School-assets/Accessories.png', category: 'stationery', subcategory: 'school', tag: '30% OFF' }
      ],
      banner: 'books'
    }
    // },
    // {
    //   id: 'last-min',
    //   title: 'Last-min stationery picks',
    //   categories: [
    //     { id: 'pen', label: 'Pens', icon: 'pen' },
    //     { id: 'pencil', label: 'Pencil & Eraser', icon: 'pencil' },
    //     { id: 'marker', label: 'Glue and Tape', icon: 'marker' },
    //     { id: 'art-craft', label: 'Scissors & Stencils', icon: 'palette' }
    //   ],
    //   products: []
    // }
  ];

  get isStationeryStore(): boolean {
    return this.normalizeCategoryKey(this.selectedCategory || this.selectedCategoryName || '') === 'stationery';
  }

  get stationeryCategoryCards(): StationeryCategory[] {
    return this.stationeryCategoryCardsData.length ? this.stationeryCategoryCardsData : this.stationeryCategories;
  }

  get stationerySidebarItems(): StationeryCategory[] {
    return this.stationerySubCategories;
  }

  get stationeryFilterItems(): StationeryCategory[] {
    return this.stationerySubCategoryFilters;
  }

  get selectedStationeryProducts(): Product[] {
    if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      return this.visibleProducts || [];
    }
    const subcategory = this.selectedStationeryLeaf?.id || 'pen';
    return this.stationeryProducts.filter(product => product.subcategory === subcategory);
  }

  get stationeryListingTitle(): string {
    if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      const selected = this.subCategories.find(item => item.id === this.selectedSubCategory);
      const label = selected?.label || this.selectedStationeryLeaf?.label || this.selectedSubCategory;
      return `Buy ${label} Online`;
    }
    return this.selectedStationeryLeaf ? `Buy ${this.selectedStationeryLeaf.label} Online` : 'Buy Pen Online';
  }

  getStationerySectionTitle(section: StationerySection): string {
    if (section.id === 'imported' && this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      const selected = this.subCategories.find(item => item.id === this.selectedSubCategory);
      return selected?.label || this.selectedSubCategory;
    }
    return section.title;
  }

  getStationerySectionProducts(section: StationerySection): Product[] {
    if (this.isStationeryStore && this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      return this.products;
    }
    if (section.products.length) return section.products;
    if (section.id === 'imported') return this.stationeryProducts.slice(0, 8);
    if (section.id === 'last-min') return this.stationeryProducts.slice(6, 14);
    if (section.id === 'artist') return this.stationeryProducts.filter(product => product.subcategory === 'art-craft').concat(this.stationeryProducts.slice(2, 6));
    return this.stationeryProducts.slice(0, 8);
  }

  openStationeryLeaf(category: StationeryCategory): void {
    this.ensureStationeryCategoryId();
    if (this.isStationeryStore && !this.stationeryTopCategoriesLoaded) {
      this.pendingStationeryLeaf = category;
      const categoryId = this.getResolvedCategoryId();
      if (categoryId && !this.stationeryTopCategoriesLoading) {
        this.loadSubCategories(categoryId);
      }
      return;
    }

    this.pendingStationeryLeaf = null;
    this.selectedStationeryLeaf = category;
    this.selectedSubCategory = category.id;
    this.selectedStationerySubCategory = null;
    this.selectedStationerySubCategory2 = null;
    this.selectedSubCategory1 = null;
    this.selectedSubCategory2 = null;
    this.stationerySubCategories = [];
    this.stationerySubCategoryFilters = [];
    this.selectedStationeryBrands = [];
    this.selectedStationeryPageCounts = [];
    this.stationerySidebarOpen = false;

    this.cdr.detectChanges();
    setTimeout(() => {
      this.scrollToTop();
      this.loadStationeryLeafSubCategories(category.label);
    }, 0);
  }

  backToStationeryHome(): void {
    this.selectedStationeryLeaf = null;
    this.selectedSubCategory = 'all';
    this.selectedStationerySubCategory = null;
    this.selectedStationerySubCategory2 = null;
    this.selectedSubCategory1 = null;
    this.selectedSubCategory2 = null;
    this.stationerySubCategories = [];
    this.stationerySubCategoryFilters = [];
    this.selectedStationeryBrands = [];
    this.selectedStationeryPageCounts = [];
    this.stationerySidebarOpen = false;
    this.cdr.detectChanges();
  }

  goToStudentStore(): void {
    this.router.navigateByUrl('/shop');
  }

  seeAllCurrentSubCategory(): void {
    if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      this.loadProducts();
    }
  }

  selectStationerySubCategory(category: StationeryCategory): void {
    if ((this as any)._isDragging) return;
    this.selectedStationerySubCategory = category.id;
    this.selectedStationerySubCategory2 = null;
    this.selectedSubCategory1 = category.label;
    this.selectedSubCategory2 = null;
    this.stationerySubCategoryFilters = [];
    this.cdr.detectChanges();
    this.loadStationerySubCategoryFilters(category.label);
  }

  selectStationeryFilter(filter: StationeryCategory): void {
    if ((this as any)._isDragging) return;
    this.selectedStationerySubCategory2 = filter.id;
    this.selectedSubCategory2 = filter.label;
    this.cdr.detectChanges();
    this.loadProducts();
  }

  // Return products filtered by selected subcategory. 'all' returns all products.
  get visibleProducts() {
    if (!this.products) return [];
    let filtered: Product[];
    if (this.isStationeryStore && this.selectedStationeryLeaf) {
      filtered = this.products;
    } else if (this.getResolvedCategoryId()) {
      filtered = this.products;
    } else {
      filtered = this.products.slice();
      // filter by selected category if present
      if (this.selectedCategory) {
        const selectedKey = this.normalizeCategoryKey(this.selectedCategory);
        filtered = filtered.filter(p => this.normalizeCategoryKey(p.category || '') === selectedKey);
      }
      // then filter by subcategory
      if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
        filtered = filtered.filter(p => (p.subcategory || '') === this.selectedSubCategory);
      }
    }

    if (this.isStationeryStore) {
      if (this.selectedStationeryBrands.length) {
        filtered = filtered.filter(p => !!p.brand && this.selectedStationeryBrands.includes(p.brand));
      }
      if (this.selectedStationeryPageCounts.length) {
        filtered = filtered.filter(p => p.pageCount != null && this.selectedStationeryPageCounts.includes(`${p.pageCount} Pages`));
      }
    }

    return filtered;
  }

  onStationeryBrandsChange(brands: string[]): void {
    this.selectedStationeryBrands = brands;
    this.cdr.detectChanges();
  }

  onStationeryPageCountsChange(pageCounts: string[]): void {
    this.selectedStationeryPageCounts = pageCounts;
    this.cdr.detectChanges();
  }

  openStationerySidebar(): void {
    this.stationerySidebarOpen = true;
  }

  closeStationerySidebar(): void {
    this.stationerySidebarOpen = false;
  }

  get showSchoolHeader(): boolean {
    const selectedKey = this.normalizeCategoryKey(this.selectedCategory || this.selectedCategoryName || '');
    return selectedKey === 'boys' || selectedKey === 'girls';
  }

  selectCategory(c: { id: string; label: string; catId?: number }): void {
    // ignore click if user was dragging to scroll
    if ((this as any)._isDragging) return;
    this.selectedCategory = c.id;
    this.selectedCategoryName = c.label;
    this.selectedCategoryId = c.catId ?? null;
    this.router.navigateByUrl(shopCategoryPath(c.label), {
      replaceUrl: true
    });
    // when switching to textbooks, adjust subcategories
    if (c.id === 'textbooks') {
      this.subCategories = [
        { id: 'all', label: 'All' },
        { id: 'textbooks', label: 'Textbooks' },
        { id: 'notesbook', label: 'Notesbook' }
      ];
      this.selectedSubCategory = 'all';
    } else {
      // restore defaults for other categories
      this.subCategories = [
        { id: 'all', label: 'All' },
        { id: 'summer', label: 'Summer' },
        { id: 'winter', label: 'Winter' },
        { id: 'sport', label: 'Sport' }
      ];
      this.selectedSubCategory = 'all';
    }
     if (this.selectedCategoryId) {
      try { this.loadSubCategories(this.selectedCategoryId); } catch (e) { }
    }
    this.loadProducts();
  }

  private loadSubCategories(categoryId: number, loadProductsAfter = false): void {
    if (this.isStationeryStore) {
      this.stationeryTopCategoriesLoading = true;
    }
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    // prefer runtime auth token (localStorage) but fall back to environment token
    const token = localStorage.getItem('auth_token') || (environment && (environment as any).apiAuthToken) || null;
    if (token) {
      const t = (token as string).startsWith('Bearer ') ? token as string : `Bearer ${token}`;
      headers = headers.set('Authorization', t);
    }

    const url = `${this.storeApi}/categories/${categoryId}/sub-categories`;
    const sub = this.http.get<any[]>(url, { headers }).subscribe({
      next: (result) => {
        if (!Array.isArray(result)) {
          this.stationeryTopCategoriesLoading = false;
          if (this.pendingStationeryLeaf) {
            const pending = this.pendingStationeryLeaf;
            this.stationeryTopCategoriesLoaded = true;
            this.openStationeryLeaf(pending);
            return;
          }
          if (loadProductsAfter) {
            this.loadProducts();
          }
          return;
        }
        // map API response shape (name/label/title) to local subCategories shape { id, label }
        // uses the same robust mapper as the sidebar/filter chain so field-name differences
        // (e.g. `title` instead of `name`) don't silently produce blank-label entries here
        const mapped = this.mapCategoryOptions(result);
        // ensure 'All' option exists at the start
        this.subCategories = [{ id: 'all', label: 'All' }, ...mapped];
        if (this.isStationeryStore) {
          this.stationeryCategoryCardsData = mapped.length
            ? mapped
            : this.stationeryCategories.slice();
          this.stationeryTopCategoriesLoaded = true;
          this.stationeryTopCategoriesLoading = false;
        }
        // auto-select the first available subcategory if nothing else is selected
        const selected = mapped.find(item => item.label === this.selectedSubCategory || item.id === this.selectedSubCategory);
        this.selectedSubCategory = selected?.id || 'all';
        this.cdr.detectChanges();
        if (this.pendingStationeryLeaf) {
          const pending = this.pendingStationeryLeaf;
          const resolved = this.stationeryCategoryCardsData.find(item =>
            item.id === pending.id || item.label.toLowerCase() === pending.label.toLowerCase()
          ) || pending;
          this.openStationeryLeaf(resolved);
          return;
        }
        if (loadProductsAfter) {
          this.loadProducts();
        }
      },
      error: () => {
        this.stationeryTopCategoriesLoading = false;
        if (this.pendingStationeryLeaf) {
          const pending = this.pendingStationeryLeaf;
          this.stationeryTopCategoriesLoaded = true;
          this.openStationeryLeaf(pending);
          return;
        }
        if (loadProductsAfter) {
          this.loadProducts();
        }
      }
    });
    this.apiSub.add(sub);
  }

  private loadStationeryLeafSubCategories(label: string): void {
    const categoryId = this.selectedCategoryId ?? this.stationeryRootCategoryId;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('auth_token') || (environment && (environment as any).apiAuthToken) || null;
    if (token) {
      const t = (token as string).startsWith('Bearer ') ? token as string : `Bearer ${token}`;
      headers = headers.set('Authorization', t);
    }

    const url = `${this.storeApi}/categories/${categoryId}/sub-categories/${encodeURIComponent(label)}/sub-category1`;
    const sub = this.http.get<unknown>(url, { headers }).subscribe({
      next: (result) => {
        this.stationerySubCategories = this.mapCategoryOptions(result);
        const first = this.stationerySubCategories[0];
        if (first) {
          this.selectedStationerySubCategory = first.id;
          this.selectedSubCategory1 = first.label;
          this.loadStationerySubCategoryFilters(first.label);
        } else {
          this.selectedStationerySubCategory = null;
          this.selectedStationerySubCategory2 = null;
          this.selectedSubCategory1 = null;
          this.selectedSubCategory2 = null;
          this.stationerySubCategoryFilters = [];
          this.products = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.stationerySubCategories = [];
        this.cdr.detectChanges();
      }
    });
    this.apiSub.add(sub);
  }

  private loadStationerySubCategoryFilters(subCategory1: string): void {
    const categoryId = this.selectedCategoryId ?? this.stationeryRootCategoryId;
    const parentLabel = this.selectedStationeryLeaf?.label;
    if (!parentLabel) {
      this.stationerySubCategoryFilters = [];
      this.selectedStationerySubCategory2 = null;
      this.selectedSubCategory2 = null;
      this.loadProducts();
      return;
    }

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('auth_token') || (environment && (environment as any).apiAuthToken) || null;
    if (token) {
      const t = (token as string).startsWith('Bearer ') ? token as string : `Bearer ${token}`;
      headers = headers.set('Authorization', t);
    }

    const url = `${this.storeApi}/categories/${categoryId}/sub-categories/${encodeURIComponent(parentLabel)}/${encodeURIComponent(subCategory1)}/sub-category2`;
    const sub = this.http.get<unknown>(url, { headers }).subscribe({
      next: (result) => {
        this.stationerySubCategoryFilters = this.mapCategoryOptions(result);
        const first = this.stationerySubCategoryFilters[0];
        if (first) {
          this.selectedStationerySubCategory2 = first.id;
          this.selectedSubCategory2 = first.label;
        } else {
          this.selectedStationerySubCategory2 = null;
          this.selectedSubCategory2 = null;
        }
        this.cdr.detectChanges();
        this.loadProducts();
      },
      error: () => {
        this.stationerySubCategoryFilters = [];
        this.selectedStationerySubCategory2 = null;
        this.selectedSubCategory2 = null;
        this.cdr.detectChanges();
        this.loadProducts();
      }
    });
    this.apiSub.add(sub);
  }
  selectSubCategory(s: { id: string; label: string }): void {
    if ((this as any)._isDragging) return;
    this.selectedSubCategory = s.id;
    this.cdr.detectChanges();
    // reload products for this sub-category selection
    try { this.loadProducts(); } catch (e) { }
  }

  openProduct(p: any): void {
    if (!p || p.outOfStock) return;
    // navigate to product detail and pass title in history state for heading
    const url = `/shop/products/${shopSlug(p.title || p.name)}`;
    try { this.router.navigateByUrl(url, { state: { product: p } }); } catch (e) { this.router.navigateByUrl(url); }
  }

  addToBag(p: Product): void {
    if (!p) return;
    const productId = Number(p.rawId ?? p.id);
    if (!productId) return;

    const sub = this.cartService.addItem({
      productId,
      categoryName: p.categoryName || '',
      sizeLabel: null,
      quantity: 1
    }).subscribe({
      error: (err) => {
        if (err instanceof SchoolContextRequiredError) {
          // School Uniform / Textbooks: backend doesn't expose classId yet (Phase 2, pending).
          // Preserve the existing placeholder behavior until that's available.
          this.cartCount = (this.cartCount || 0) + 1;
          console.log('Add to bag (placeholder, pending classId support):', p.id);
          return;
        }
        // Genuine failure (network/backend) — surface it, do not fake a success.
        this.coreService.triggerToast(err?.error?.message || 'Could not add this item to your cart. Please try again.');
      }
    });
    this.apiSub.add(sub);
  }

  // handle right action clicks from the navigator (e.g., cart)
  onNavigatorAction(ev: { index?: number; action: any }): void {
    try {
      const action = ev && (ev as any).action;
      if (!action) return;
      if (action.type === 'cart') {
        try { this.router.navigateByUrl('/shop/cart'); } catch (e) { console.log('Open cart', action); }
        return;
      }
      if (action.type === 'package') {
        try { this.router.navigateByUrl('/shop/orders'); } catch (e) { console.log('Open packages', action); }
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
    this.apiSub.add(
      this.cartService.cartCount$.subscribe(count => {
        this.cartCount = count;
        this.cdr.detectChanges();
      })
    );
    this.apiSub.add(
      this.addressService.loading$.subscribe(loading => {
        this.loadingAddresses = loading;
        this.cdr.detectChanges();
      })
    );
    this.apiSub.add(
      this.addressService.addresses$.subscribe(addresses => {
        this.addresses = addresses;
        const def = this.addressService.defaultAddress;
        this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
        this.cdr.detectChanges();
      })
    );
    this.addressService.loadAddresses().subscribe();

    try {
      const state = history.state || {};
      if (state.schoolName) this.schoolName = state.schoolName;
      if (state.schoolId) this.schoolId = state.schoolId;
      if (state.className) this.className = state.className;
      if (state.categoryId) this.selectedCategoryId = Number(state.categoryId);
      if (state.categoryName) this.selectedCategoryName = state.categoryName;
      if (state.category) this.selectedCategory = state.category;

      const cat = this.route.snapshot.paramMap.get('category');
      if (cat) {
        // set selected category and adjust subcategories if textbooks
        this.selectedCategory = cat;
        if (cat === 'textbooks') {
          this.subCategories = [
            { id: 'all', label: 'All' },
            { id: 'textbooks', label: 'Textbooks' },
            { id: 'notesbook', label: 'Notesbook' }
          ];
          this.selectedSubCategory = 'all';
        }
      }
    } catch (e) { }
    this.ensureStationeryCategoryId();
    this.apiSub.add(this.route.data.subscribe(data => {
      const selection = data['shopSelection'];
      if (selection?.error) {
        this.products = [];
        this.isLoadingProducts = false;
        this.shopRouteError = selection.error;
        this.cdr.detectChanges();
        return;
      }
      this.shopRouteError = '';
      this.schoolId = this.route.snapshot.queryParamMap.get('schoolId') || this.schoolId;
      this.className = this.route.snapshot.queryParamMap.get('className') || this.className;
      if (selection?.categoryId) {
        this.selectedCategoryId = selection.categoryId;
        this.selectedCategoryName = selection.categoryName;
        this.selectedCategory = this.normalizeCategoryKey(selection.categoryName);
        this.selectedSubCategory = selection.hierarchy[0] || 'all';
        this.selectedSubCategory1 = selection.hierarchy[1] || '';
        this.selectedSubCategory2 = selection.hierarchy[2] || '';
        this.selectedStationeryLeaf = this.isStationeryStore && selection.hierarchy[0]
          ? { id: this.normalizeCategoryKey(selection.hierarchy[0]), label: selection.hierarchy[0], icon: 'category' }
          : null;
      }
      this.loadCategories();
    }));
  }

  shopRouteError = '';

  private loadCategories(): void {
    const sub = this.http.get<{ id: number; name: string; iconUrl?: string | null }[]>(this.categoriesApi).subscribe({
      next: (result) => {
        if (!Array.isArray(result) || !result.length) return;
        this.categories = result.map(category => {
          const key = this.normalizeCategoryKey(category.name);
          return { id: key, label: category.name, catId: category.id };
        });
        // re-sync current selection against the live category list
        const selectedKey = this.normalizeCategoryKey(this.selectedCategory || this.selectedCategoryName || '');
        const matched = this.categories.find(category => category.id === selectedKey);
        if (matched) {
          this.selectedCategoryId = matched.catId ?? this.selectedCategoryId;
          this.selectedCategoryName = matched.label;
        }
        this.cdr.detectChanges();
        // once categories are loaded, fetch sub-categories for the matched/selected category
        // products will be loaded after sub-categories have been resolved
        try {
          if (this.selectedCategoryId) {
            this.loadSubCategories(this.selectedCategoryId, true);
          } else {
            try { this.loadProducts(); } catch (e) { }
          }
        } catch (e) { }
      },
      error: () => { }
    });
    this.apiSub.add(sub);
  }
  // Drag flag used to suppress clicks while user is scrolling
  private _isDragging = false;
  private _cleanupSlider?: () => void;

  ngOnDestroy(): void {
    this.apiSub.unsubscribe();
    try { this.renderer.removeStyle(document.body, 'overflow'); } catch (e) { }
    try {
      if (this._cleanupSlider) this._cleanupSlider();
    } catch (e: any) { }
  }

  loadProducts(): void {
    this.syncSelectedCategoryTab();
    if (this.shopRouteError) return;
    const top = this.subCategories.find(item => item.id === this.selectedSubCategory)?.label;
    const hierarchy = [this.selectedSubCategory === 'all' ? '' : (top || this.selectedSubCategory),
      this.selectedSubCategory1 || '', this.selectedSubCategory2 || ''];
    const path = shopCategoryUrl(this.selectedCategoryName || this.selectedCategory || '', hierarchy);
    if (this.selectedCategoryId && this.router.url.split('?')[0] !== path) {
      void this.router.navigate([path], { queryParams: this.route.snapshot.queryParams });
      return;
    }

    if (this.schoolId) {
      // TODO: replace hardcoded classId=3 with the numeric class ID once the
      // backend class-listing API returns IDs alongside class names.
      this.schoolContextService.set(Number(this.schoolId), 3);
    }

    const categoryId = this.getResolvedCategoryId();
    if (!categoryId) {
      this.products = this.getFallbackProductsForSelectedCategory();
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingProducts = true;
    this.currentPage = 0;
    let params = new HttpParams()
      .set('categoryId', categoryId.toString())
      .set('page', this.currentPage.toString())
      .set('size', '20');

    if (this.schoolId) {
      params = params.set('schoolId', this.schoolId);
    }

    if (this.className) {
      params = params.set('className', this.className);
    }

    const filters = this.route.snapshot.queryParamMap;
    for (const key of ['brandId', 'search', 'gender', 'color', 'sizeLabel', 'minPrice', 'maxPrice', 'rating', 'sort', 'pageCount']) {
      const value = filters.get(key);
      if (value) params = params.set(key, value);
    }
    const page = Number(filters.get('page') || 0);
    if (Number.isInteger(page) && page >= 0) params = params.set('page', String(page));

    // if a sub-category is selected (and not 'all'), pass the readable label to the API
    if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      const sc = this.subCategories.find(x => x.id === this.selectedSubCategory);
      const value = this.isStationeryStore && this.selectedStationeryLeaf
        ? this.selectedStationeryLeaf.label
        : sc ? sc.label : this.selectedSubCategory;
      params = params.set('subCategory', value);
    }

    if (this.selectedSubCategory1 && this.selectedSubCategory1 !== 'all') {
      params = params.set('subCategory1', this.selectedSubCategory1);
    }

    if (this.selectedSubCategory2 && this.selectedSubCategory2 !== 'all') {
      params = params.set('subCategory2', this.selectedSubCategory2);
    }

    const sub = this.http.get<unknown>(this.productsApi, { params }).subscribe({
      next: (response) => {
        const products = this.extractProducts(response);
        this.products = products;
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.products = [];
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      }
    });
    this.apiSub.add(sub);
  }

  private extractProducts(response: unknown): Product[] {
    const records = this.extractProductRecords(response);
    return records.map(record => this.mapProduct(record)).filter((product): product is Product => !!product);
  }

  private extractProductRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) return response as Record<string, unknown>[];
    if (!response || typeof response !== 'object') return [];
    const body = response as Record<string, unknown>;
    const data = body['data'];
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj['content'])) return dataObj['content'] as Record<string, unknown>[];
      if (Array.isArray(dataObj['products'])) return dataObj['products'] as Record<string, unknown>[];
      if (Array.isArray(dataObj['items'])) return dataObj['items'] as Record<string, unknown>[];
    }
    if (Array.isArray(body['content'])) return body['content'] as Record<string, unknown>[];
    if (Array.isArray(body['products'])) return body['products'] as Record<string, unknown>[];
    if (Array.isArray(body['items'])) return body['items'] as Record<string, unknown>[];
    return [];
  }

  private extractCategoryRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) return response as Record<string, unknown>[];
    if (!response || typeof response !== 'object') return [];
    const body = response as Record<string, unknown>;
    const data = body['data'];
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj['content'])) return dataObj['content'] as Record<string, unknown>[];
      if (Array.isArray(dataObj['items'])) return dataObj['items'] as Record<string, unknown>[];
      if (Array.isArray(dataObj['categories'])) return dataObj['categories'] as Record<string, unknown>[];
    }
    if (Array.isArray(body['content'])) return body['content'] as Record<string, unknown>[];
    if (Array.isArray(body['items'])) return body['items'] as Record<string, unknown>[];
    if (Array.isArray(body['categories'])) return body['categories'] as Record<string, unknown>[];
    return [];
  }

  private mapCategoryOptions(response: unknown): StationeryCategory[] {
    const source = Array.isArray(response) ? response : this.extractCategoryRecords(response);
    return source.map((item) => {
      const label = typeof item === 'string'
        ? item.trim()
        : this.pickString(item as Record<string, unknown>, ['name', 'label', 'title']) || '';
      return {
        id: this.normalizeCategoryKey(label),
        label,
        icon: 'category'
      };
    }).filter(item => item.label);
  }

  private mapProduct(record: Record<string, unknown>): Product | null {
    const rawId = record['id'] ?? record['productId'] ?? record['_id'];
    const title = this.pickString(record, ['name', 'title', 'productName', 'product_name']);
    if (!title) return null;
    const image = this.pickString(record, ['imageUrl', 'img', 'image', 'thumbnailUrl', 'logoUrl']) || 'assets/School-assets/empty-product-list.png';
    const price = this.pickNumberOrString(record, ['sellingPrice', 'price', 'salePrice', 'discountedPrice']);
    const mrp = this.pickNumberOrString(record, ['mrp', 'originalPrice', 'actualPrice', 'listPrice']) || price;
    return {
      id: String(rawId ?? title),
      rawId: rawId as string | number | undefined,
      title,
      subtitle: this.pickString(record, ['subtitle', 'description', 'brand', 'brandName']),
      tag: this.pickString(record, ['discountText', 'tag', 'badge']),
      price: this.formatPrice(price),
      mrp: this.formatPrice(mrp),
      img: image,
      category: this.selectedCategory || undefined,
      categoryName: this.pickString(record, ['categoryName']),
      subcategory: 'all',
      outOfStock: record['outOfStock'] === true || record['inStock'] === false
    };
  }

  private pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  }

  private pickNumberOrString(record: Record<string, unknown>, keys: string[]): string | number | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  }

  private formatPrice(value: string | number | undefined): string {
    if (typeof value === 'number') return `₹${value}`;
    if (typeof value === 'string' && value.trim()) {
      return value.includes('₹') ? value : `₹${value}`;
    }
    return '₹0';
  }

  private getFallbackProductsForSelectedCategory(): Product[] {
    const selectedKey = this.normalizeCategoryKey(this.selectedCategory || '');
    return this.fallbackProducts.filter(product => this.normalizeCategoryKey(product.category || '') === selectedKey);
  }

  private syncSelectedCategoryTab(): void {
    if (!this.selectedCategory) return;
    const exists = this.categories.some(category => category.id === this.selectedCategory);
    if (!exists) {
      this.categories = [
        { id: this.selectedCategory, label: this.selectedCategoryName || this.selectedCategory },
        ...this.categories
      ];
    } else if (this.selectedCategoryName) {
      this.categories = this.categories.map(category =>
        category.id === this.selectedCategory ? { ...category, label: this.selectedCategoryName || category.label } : category
      );
    }
  }

  private getResolvedCategoryId(): number | null {
    if (this.selectedCategoryId) {
      return this.selectedCategoryId;
    }
    return this.isStationeryStore ? this.stationeryRootCategoryId : null;
  }

  private ensureStationeryCategoryId(): void {
    if (!this.selectedCategoryId && this.isStationeryStore) {
      this.selectedCategoryId = this.stationeryRootCategoryId;
      this.selectedCategory = this.normalizeCategoryKey(this.selectedCategory || this.selectedCategoryName || 'stationery');
      this.selectedCategoryName = this.selectedCategoryName || 'Stationery';
    }
  }

  private normalizeCategoryKey(value: string): string {
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const aliases: Record<string, string> = {
      'boys-uniform': 'boys',
      'boys-uniforms': 'boys',
      'girls-uniform': 'girls',
      'girls-uniforms': 'girls',
      'footwears': 'footwear',
      'entrance-exam-books': 'entrance-exam',
      'general-books': 'general-books',
      'stationary': 'stationery',
      'stationary-books': 'stationery',
      'stationery-books': 'stationery'
    };
    return aliases[key] || key;
  }
  openAddressPopup(): void {
    try {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
    } catch (e) {
      this.previouslyFocused = null;
    }

    this.showAddressPopup = true;
    try { this.cdr.detectChanges(); } catch (e) { }
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
    try { this.cdr.detectChanges(); } catch (e) { }
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

  async openAddressInput(): Promise<void> {
    try {
      this.closeAddressPopup();
      await this.router.navigateByUrl('/shop/checkout/address');
    } catch (e) { console.error('Failed to open address input page', e); }
  }

  selectAddress(a: Address): void {
    if (!a) return;
    this.selectedAddress = this.addressService.formatAddress(a);
    this.closeAddressPopup();
    this.apiSub.add(
      this.addressService.setDefaultAddress(a.id).subscribe({
        error: () => {
          const def = this.addressService.defaultAddress;
          this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
          this.cdr.detectChanges();
        }
      })
    );
  }

  removeAddress(a: Address): void {
    if (!a || this.deletingAddressId !== null) return;
    this.deletingAddressId = a.id;
    this.cdr.detectChanges();
    this.apiSub.add(
      this.addressService.deleteAddress(a.id).subscribe({
        next: () => {
          this.deletingAddressId = null;
          const def = this.addressService.defaultAddress;
          this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
          this.cdr.detectChanges();
        },
        error: () => {
          this.deletingAddressId = null;
          this.cdr.detectChanges();
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

  goBack(): void {
    // If used inline, notify parent to close instead of navigating away
    try {
      if ((this as any).closeInline && (this as any).closeInline.observers && (this as any).closeInline.observers.length) {
        (this as any).closeInline.emit();
        return;
      }
    } catch (e) { }
    // Always navigate to the app entry (home) page otherwise
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
