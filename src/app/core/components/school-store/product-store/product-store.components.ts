import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'product-store',
  templateUrl: './product-store.components.html',
  styleUrls: ['./product-store.components.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent]
  ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProductStoreComponent implements AfterViewInit, OnDestroy {
  @ViewChild('navigator', { static: false, read: ElementRef }) navigatorEl?: ElementRef;
  @ViewChild('categorySlider', { static: false, read: ElementRef }) categorySlider?: ElementRef;
  @ViewChild('subCategorySlider', { static: false, read: ElementRef }) subCategorySlider?: ElementRef;
  @ViewChild(IonContent, { static: false }) ionContent?: IonContent;

  // popup state for address/subtext
  showAddressPopup = false;

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

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

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

  // simple product list for cards (one example product; expand as needed)
  products = [
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
      tag: 'Official School Wear',
      title: 'Comfort Sports Track Pants',
      price: '₹449',
      mrp: '₹600',
      img: 'assets/School-assets/temp/Gemini_Generated_Image_pi8q46pi8q46pi8q 1.jpg',
      outOfStock: true,
      subcategory: 'sport'
    }
  ];

  // Return products filtered by selected subcategory. 'all' returns all products.
  get visibleProducts() {
    if (!this.products || !this.selectedSubCategory) return this.products;
    if (this.selectedSubCategory === 'all') return this.products;
    return this.products.filter(p => (p.subcategory || '') === this.selectedSubCategory);
  }

  selectCategory(c: { id: string; label: string }): void {
    // ignore click if user was dragging to scroll
    if ((this as any)._isDragging) return;
    this.selectedCategory = c.id;
    this.cdr.detectChanges();
  }

  selectSubCategory(s: { id: string; label: string }): void {
    if ((this as any)._isDragging) return;
    this.selectedSubCategory = s.id;
    this.cdr.detectChanges();
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
          if (target.closest && target.closest('svg')) {
            this.openAddressPopup();
            return;
          }
          const text = (target.textContent || '').trim();
          if (text && text.indexOf('502') !== -1) {
            this.openAddressPopup();
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
