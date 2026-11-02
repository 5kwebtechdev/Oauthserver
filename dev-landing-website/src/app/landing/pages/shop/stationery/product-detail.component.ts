import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-stationery-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, CommonFooterComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationeryProductDetailComponent implements OnInit {
  product: any = null;
  id = '';
  quantity = 1;
  selectedImage = 0;
  loading = true;
  error = false;

  fallbackImage = 'assets/School-assets/temp/Notebook.jpg';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    const navigationState: any = history.state || {};

    if (navigationState.product) {
      this.applyProduct(navigationState.product);
      this.loading = false;
    } else if (this.id) {
      this.loadProduct();
    } else {
      this.loading = false;
      this.error = true;
    }
  }

  get images(): string[] {
    const imgs = this.product?.images;
    if (Array.isArray(imgs) && imgs.length) return imgs;
    const single = this.product?.image;
    return single ? [single] : [this.fallbackImage];
  }

  get displayName(): string {
    return this.product?.name || this.product?.title || this.product?.productName || 'Product detail';
  }

  get displayPrice(): number | null {
    const value = this.product?.price ?? this.product?.salePrice ?? this.product?.sellingPrice ?? this.product?.amount;
    return value ?? null;
  }

  get displayMrp(): number | null {
    const value = this.product?.mrp ?? this.product?.originalPrice ?? this.product?.listPrice;
    return value ?? null;
  }

  get discountPercent(): number | null {
    const price = this.displayPrice;
    const mrp = this.displayMrp;
    if (!price || !mrp || mrp <= price) return null;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  get displayDescription(): string {
    return this.product?.description || 'Product details will appear here once the API returns full metadata.';
  }

  selectImage(i: number): void {
    this.selectedImage = i;
  }

  increaseQuantity(): void {
    this.quantity++;
    this.cdr.markForCheck();
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) this.quantity--;
    this.cdr.markForCheck();
  }

  addToCart(): void {
    console.log('Add to bag:', { id: this.id, quantity: this.quantity });
  }

  goBack(): void {
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigateByUrl('/shop/stationery');
    }
  }

  private loadProduct(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/public/store/products/${encodeURIComponent(this.id)}`).subscribe({
      next: (response) => {
        this.applyProduct(this.normalizeProductResponse(response));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.cdr.markForCheck();
      },
    });
  }

  private normalizeProductResponse(response: any): any {
    if (!response || typeof response !== 'object') return null;
    const data = response.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : response;
    return { ...data, id: data.id ?? data.productId ?? this.id };
  }

  private applyProduct(product: any): void {
    this.product = product;
    this.selectedImage = 0;
  }
}
