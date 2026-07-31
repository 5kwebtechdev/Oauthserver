import { HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { ProductStoreComponent } from './product-store.components';

describe('ProductStoreComponent category filtering', () => {
  let component: ProductStoreComponent;
  let requests: Array<{ url: string; params: HttpParams }>;

  beforeEach(() => {
    requests = [];
    const http = {
      get: (url: string, options: { params: HttpParams }) => {
        requests.push({ url, params: options.params });
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 20,
          last: true,
        });
      },
    };

    component = new ProductStoreComponent(
      {} as any,
      { detectChanges: () => undefined } as any,
      {} as any,
      http as any,
      { getToken: () => 'test-token' } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    component.categories = [{ id: 12, label: 'Stationery', requiresSchoolClass: false }];
    component.selectedCategory = 12;
  });

  it('loads all products when a top-level category is opened', () => {
    component.activeProductSubCategory = null;

    component.loadProducts();

    expect(requests.length).toBe(1);
    expect(requests[0].params.get('categoryId')).toBe('12');
    expect(requests[0].params.has('subCategory')).toBeFalse();
  });

  it('filters products only after a left-rail subcategory is selected', () => {
    const allOption = { id: component.allSubCategoryId, label: 'All Products', imageUrl: null };
    const notebookOption = { id: 'Notebooks', label: 'Notebooks', imageUrl: null };
    component.subCategoryLevels = [
      { options: [{ id: 'Students', label: 'Students', imageUrl: null }], selected: 'Students' },
      { options: [allOption, notebookOption], selected: component.allSubCategoryId },
    ];

    component.selectSubCategoryAt(1, notebookOption);

    expect(component.activeProductSubCategory).toBe('Notebooks');
    expect(requests.length).toBe(1);
    expect(requests[0].params.get('subCategory')).toBe('Notebooks');
  });

  it('removes the subcategory parameter when All Products is selected', () => {
    const allOption = { id: component.allSubCategoryId, label: 'All Products', imageUrl: null };
    const notebookOption = { id: 'Notebooks', label: 'Notebooks', imageUrl: null };
    component.activeProductSubCategory = 'Notebooks';
    component.subCategoryLevels = [
      { options: [{ id: 'Students', label: 'Students', imageUrl: null }], selected: 'Students' },
      { options: [allOption, notebookOption], selected: 'Notebooks' },
    ];

    component.selectSubCategoryAt(1, allOption);

    expect(component.activeProductSubCategory).toBeNull();
    expect(requests.length).toBe(1);
    expect(requests[0].params.has('subCategory')).toBeFalse();
  });
});
