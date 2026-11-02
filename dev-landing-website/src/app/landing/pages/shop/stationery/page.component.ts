import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';

interface CategoryNode {
  id?: number | string;
  categoryId?: number | string;
  name?: string;
  title?: string;
  label?: string;
  imageUrl?: string | null;
  image?: string | null;
}

@Component({
  selector: 'app-stationery-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, CommonFooterComponent],
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
})
export class StationeryPageComponent implements OnInit {
  readonly defaultCategoryId = 5;

  categories: CategoryNode[] = [];
  levelOneSubCategories: CategoryNode[] = [];
  levelTwoSubCategories: CategoryNode[] = [];
  levelThreeSubCategories: CategoryNode[] = [];
  products: any[] = [];

  loading = false;
  error = '';

  selectedCategoryId = this.defaultCategoryId;
  selectedCategoryName = 'Stationery';
  selectedSubCategory = '';
  selectedSubCategory1 = '';
  selectedSubCategory2 = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.readRouteState();
  }

  getCategoryId(item: CategoryNode): number {
    return Number(item.id ?? item.categoryId ?? 0);
  }

  getName(item: CategoryNode): string {
    return item.name || item.title || item.label || 'Unnamed';
  }

  getProductName(product: any): string {
    return product.name || product.title || product.productName || product.product_name || `Product ${product.id ?? ''}`;
  }

  getProductPrice(product: any): string {
    const value = product.price ?? product.salePrice ?? product.sellingPrice ?? product.amount;
    return value !== undefined && value !== null ? `₹${value}` : 'Price on request';
  }

  getProductMrp(product: any): string {
    const value = product.mrp ?? product.originalPrice ?? product.listPrice;
    return value !== undefined && value !== null ? `₹${value}` : '';
  }

  getProductImage(product: any): string {
    const images = product.images ?? product.imageUrls;
    if (Array.isArray(images) && images.length) return images[0];
    return product.imageUrl || product.image || product.thumbnailUrl || 'assets/School-assets/temp/Notebook.jpg';
  }

  getCategoryEmoji(name: string): string {
    const value = name.toLowerCase();
    if (value.includes('uniform')) return '👕';
    if (value.includes('textbook') || value.includes('book')) return '📚';
    if (value.includes('stationery')) return '✏️';
    if (value.includes('exam')) return '🎯';
    if (value.includes('toy') || value.includes('stem')) return '🧩';
    return '🎨';
  }

  selectCategory(category: CategoryNode): void {
    this.selectedCategoryId = this.getCategoryId(category) || this.defaultCategoryId;
    this.selectedSubCategory = '';
    this.selectedSubCategory1 = '';
    this.selectedSubCategory2 = '';
    this.selectedCategoryName = this.getName(category);
    this.levelOneSubCategories = [];
    this.levelTwoSubCategories = [];
    this.levelThreeSubCategories = [];
    this.products = [];
    this.syncQueryParams();
    this.loadCategories();
  }

  selectSubCategory(item: CategoryNode): void {
    this.selectedSubCategory = this.getName(item);
    this.selectedSubCategory1 = '';
    this.selectedSubCategory2 = '';
    this.levelTwoSubCategories = [];
    this.levelThreeSubCategories = [];
    this.products = [];
    this.syncQueryParams();
    this.loadSubCategoriesForSelection();
  }

  selectSubCategory1(item: CategoryNode): void {
    this.selectedSubCategory1 = this.getName(item);
    this.selectedSubCategory2 = '';
    this.levelThreeSubCategories = [];
    this.products = [];
    this.syncQueryParams();
    this.loadSubCategoriesForSelection();
  }

  selectSubCategory2(item: CategoryNode): void {
    this.selectedSubCategory2 = this.getName(item);
    this.products = [];
    this.syncQueryParams();
    this.loadProducts();
  }

  openProduct(product: any): void {
    const id = product.id ?? product.productId ?? product.slug;
    if (!id) {
      return;
    }

    this.router.navigate(['/shop/stationery', id], {
      state: { product },
    });
  }

  private readonly storeApi = `${environment.apiUrl}/public/store`;

  private loadCategories(): void {
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${this.storeApi}/categories/all`).subscribe({
      next: (response) => {
        this.categories = this.normalizeArray(response);

        const selected = this.categories.find((item) => this.getCategoryId(item) === this.selectedCategoryId);
        if (selected) {
          this.selectedCategoryName = this.getName(selected);
        }

        this.loadTopLevelSubCategories();
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load categories right now.';
      },
    });
  }

  private loadTopLevelSubCategories(): void {
    this.http.get<any>(`${this.storeApi}/categories/${this.selectedCategoryId}/sub-categories`).subscribe({
      next: (response) => {
        this.levelOneSubCategories = this.normalizeArray(response);
        if (!this.selectedSubCategory && this.levelOneSubCategories.length) {
          this.selectedSubCategory = this.getName(this.levelOneSubCategories[0]);
          this.syncQueryParams();
        }

        this.loadSubCategoriesForSelection();
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load sub-categories right now.';
      },
    });
  }

  private loadSubCategoriesForSelection(): void {
    if (!this.selectedSubCategory) {
      this.loading = false;
      this.products = [];
      return;
    }

    const currentSelection = this.levelOneSubCategories.find((item) => this.getName(item).toLowerCase() === this.selectedSubCategory.toLowerCase());
    if (!currentSelection && this.selectedSubCategory) {
      this.selectedSubCategory = '';
      this.selectedSubCategory1 = '';
      this.selectedSubCategory2 = '';
      this.levelTwoSubCategories = [];
      this.levelThreeSubCategories = [];
      this.products = [];
      this.syncQueryParams();
      this.loading = false;
      return;
    }

    if (!this.selectedSubCategory1) {
      this.loadSecondLevelSubCategories();
      return;
    }

    if (!this.selectedSubCategory2) {
      this.loadThirdLevelSubCategories();
      return;
    }

    this.loadProducts();
  }

  private loadSecondLevelSubCategories(): void {
    this.loading = true;

    const url = `${this.storeApi}/categories/${this.selectedCategoryId}/sub-categories/${encodeURIComponent(this.selectedSubCategory)}/sub-category1`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.levelTwoSubCategories = this.normalizeArray(response);
        if (this.levelTwoSubCategories.length) {
          const selectedExists = this.levelTwoSubCategories.some(item => this.getName(item) === this.selectedSubCategory1);
          if (!selectedExists) this.selectedSubCategory1 = this.getName(this.levelTwoSubCategories[0]);
          this.syncQueryParams();
          this.loadThirdLevelSubCategories();
        } else {
          this.loadProducts();
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load nested sub-categories.';
      },
    });
  }

  private loadThirdLevelSubCategories(): void {
    this.loading = true;

    const url = `${this.storeApi}/categories/${this.selectedCategoryId}/sub-categories/${encodeURIComponent(this.selectedSubCategory)}/${encodeURIComponent(this.selectedSubCategory1)}/sub-category2`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.levelThreeSubCategories = this.normalizeArray(response);
        if (this.levelThreeSubCategories.length) {
          const selectedExists = this.levelThreeSubCategories.some(item => this.getName(item) === this.selectedSubCategory2);
          if (!selectedExists) this.selectedSubCategory2 = this.getName(this.levelThreeSubCategories[0]);
          this.syncQueryParams();
        }
        this.loadProducts();
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load the next level of sub-categories.';
      },
    });
  }

  private loadProducts(): void {
    this.loading = true;

    let params = new HttpParams()
      .set('categoryId', String(this.selectedCategoryId))
      .set('page', '0')
      .set('size', '20');

    if (this.selectedSubCategory) {
      params = params.set('subCategory', this.selectedSubCategory);
    }
    if (this.selectedSubCategory1) {
      params = params.set('subCategory1', this.selectedSubCategory1);
    }
    if (this.selectedSubCategory2) {
      params = params.set('subCategory2', this.selectedSubCategory2);
    }

    this.http.get<any>(`${this.storeApi}/products`, { params }).subscribe({
      next: (response) => {
        this.products = this.normalizeArray(response);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.products = [];
        this.error = 'No products found for the selected combination.';
      },
    });
  }

  private normalizeArray(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.content)) {
      return response.content;
    }
    if (Array.isArray(response?.items)) {
      return response.items;
    }

    return [];
  }

  private readRouteState(): void {
    const params = this.route.snapshot.paramMap;
    const queryParams = this.route.snapshot.queryParamMap;

    this.selectedCategoryId = Number(params.get('categoryId') || queryParams.get('categoryId') || this.defaultCategoryId);
    this.selectedSubCategory = params.get('subCategory') || queryParams.get('subCategory') || '';
    this.selectedSubCategory1 = queryParams.get('subCategory1') || '';
    this.selectedSubCategory2 = queryParams.get('subCategory2') || '';
    this.selectedCategoryName = 'Stationery';
    this.levelOneSubCategories = [];
    this.levelTwoSubCategories = [];
    this.levelThreeSubCategories = [];
    this.products = [];
    this.loadCategories();
  }

  private syncQueryParams(): void {
    // Query-state normalization is a browser interaction; navigating while prerendering
    // would turn the canonical /stationery HTML into a redirect page.
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.route.snapshot.paramMap.has('categoryId')) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoryId: this.selectedCategoryId,
        subCategory: this.selectedSubCategory || null,
        subCategory1: this.selectedSubCategory1 || null,
        subCategory2: this.selectedSubCategory2 || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

}
