import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddressInputComponent } from '../address-input/address-input.components';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';

// top-level Product type used in component and template
type Product = {
  id: string;
  tag?: string;
  title: string;
  subtitle?: string;
  price: string;
  mrp: string;
  img: string;
  subcategory?: string;
  outOfStock?: boolean;
  category?: string;
  badge?: string;
};

@Component({
  standalone: true,
  selector: 'product-store',
  templateUrl: './product-store.components.html',
  styleUrls: ['./product-store.components.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, EmptyStateComponent]
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

  // local cart count shown in navigator right action
  cartCount: number = 0;
  // local package count shown in navigator right action
  packageCount: number = 0;

  // address list and selection
  addresses = [
    {
      id: 'rahul',
      short: '502, Galaxy Apartment, Association Road',
      html: 'Rahul- 502, Galaxy Apartment, Association Road<br/>Chennai- 600071'
    },
    {
      id: 'megha',
      short: '502, Royal Apartment, Altmount Road',
      html: 'Megha- 502, Royal Apartment, Altmount Road<br/>Chennai- 600071'
    }
  ];

  selectedId: string | null = this.addresses[0].id;
  selectedAddress: string = this.addresses[0].short;

  // navigator subtext truncated to 20 chars + ellipsis
  get navigatorSubtext(): string {
    const s = this.selectedAddress || '';
    return s.length > 20 ? s.slice(0, 20) + '...' : s;
  }

  constructor(private router: Router, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private modalCtrl: ModalController) { }

  // product categories
  categories = [
    { id: 'boys', label: 'Boys Uniforms' },
    { id: 'girls', label: 'Girls Uniforms' },
    { id: 'textbooks', label: 'Textbooks' },
    { id: 'footwear', label: 'Footwears' },
    { id: 'accessories', label: 'Accessories' }
  ];

  selectedCategory = this.categories[1].id; // default to 'Girls Uniforms' as in figma

  // sub-categories for the second slider (simple defaults)
  subCategories = [
    { id: 'all', label: 'All' },
    { id: 'summer', label: 'Summer' },
    { id: 'winter', label: 'Winter' },
    { id: 'sport', label: 'Sport' }
  ];

  selectedSubCategory = this.subCategories[0].id;

  // simple product list for cards (keeps existing uniform/cloth dummy data and adds textbooks)
  products: Product[] = [
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

  // Return products filtered by selected subcategory. 'all' returns all products.
  get visibleProducts() {
    if (!this.products) return [];
    let filtered = this.products.slice();
    // filter by selected category if present
    if (this.selectedCategory) {
      filtered = filtered.filter(p => (p.category || '') === this.selectedCategory);
    }
    // then filter by subcategory
    if (this.selectedSubCategory && this.selectedSubCategory !== 'all') {
      filtered = filtered.filter(p => (p.subcategory || '') === this.selectedSubCategory);
    }
    return filtered;
  }

  selectCategory(c: { id: string; label: string }): void {
    // ignore click if user was dragging to scroll
    if ((this as any)._isDragging) return;
    this.selectedCategory = c.id;
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
    this.cdr.detectChanges();
  }

  selectSubCategory(s: { id: string; label: string }): void {
    if ((this as any)._isDragging) return;
    this.selectedSubCategory = s.id;
    this.cdr.detectChanges();
  }

  openProduct(p: any): void {
    if (!p || p.outOfStock) return;
    // navigate to product detail and pass title in history state for heading
    const url = `/authed/school-store/product/${encodeURIComponent(p.id)}`;
    try { this.router.navigateByUrl(url, { state: { product: p } }); } catch (e) { this.router.navigateByUrl(url); }
  }

  addToBag(p: any): void {
    // placeholder for Add To Bag action
    try { console.log('Add to bag', p && p.id); } catch (e) { }
    // update local cart count so navigator badge reflects additions
    try { this.cartCount = (this.cartCount || 0) + 1; } catch (e) { }
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
    try {
      const cat = this.route.snapshot.queryParamMap.get('category');
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
  }
  // Drag flag used to suppress clicks while user is scrolling
  private _isDragging = false;
  private _cleanupSlider?: () => void;

  ngOnDestroy(): void {
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

  selectAddress(a: { id: string; short: string; html: string }): void {
    this.selectedId = a.id;
    this.selectedAddress = a.short;
    this.showAddressPopup = false;
    this.cdr.detectChanges();
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
