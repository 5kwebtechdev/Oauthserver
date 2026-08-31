import { HttpParams } from '@angular/common/http';
import { of, Subject } from 'rxjs';
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

  it('requests and appends the next product page without clearing existing cards', () => {
    component.products = [{
      id: '1',
      title: 'Existing product',
      price: '₹100',
      mrp: '₹120',
      img: 'existing.png',
    }];
    component.productsPage = 0;
    component.productsTotalPages = 2;
    component.productsRequestCompleted = true;
    const complete = jasmine.createSpy('complete');

    component.loadMoreProducts({ target: { complete } });

    expect(requests.length).toBe(1);
    expect(requests[0].params.get('page')).toBe('1');
    expect(component.products[0].id).toBe('1');
    expect(component.productsLoadingMore).toBeFalse();
    expect(complete).toHaveBeenCalled();
  });

  it('shows All first and selects it when the horizontal categories load', () => {
    (component as any).http = {
      get: () => of([
        { name: 'Craft & Hobbies', imageUrl: null },
        { name: 'Exam Essentials', imageUrl: null },
      ]),
    };

    component.loadSubCategoryLevel(0, []);

    expect(component.primarySubCategoryLevel?.options[0]).toEqual({
      id: component.allSubCategoryId,
      label: 'All',
      imageUrl: null,
    });
    expect(component.primarySubCategoryLevel?.selected).toBe(component.allSubCategoryId);
    expect(component.activeProductSubCategory).toBeNull();
  });

  it('clears subcategory filtering when All is selected from the horizontal row', () => {
    const allOption = { id: component.allSubCategoryId, label: 'All', imageUrl: null };
    component.activeProductSubCategory = 'Craft & Hobbies';
    component.subCategoryLevels = [
      {
        options: [allOption, { id: 'Craft & Hobbies', label: 'Craft & Hobbies', imageUrl: null }],
        selected: 'Craft & Hobbies',
      },
      {
        options: [{ id: 'Adhesives', label: 'Adhesives', imageUrl: null }],
        selected: 'Adhesives',
      },
    ];

    component.selectSubCategoryAt(0, allOption);

    expect(component.subCategoryLevels.length).toBe(1);
    expect(component.primarySubCategoryLevel?.selected).toBe(component.allSubCategoryId);
    expect(component.activeProductSubCategory).toBeNull();
    expect(requests.length).toBe(1);
    expect(requests[0].params.has('subCategory')).toBeFalse();
  });

  it('filters products only after a left-rail subcategory is selected', () => {
    const notebookOption = { id: 'Notebooks', label: 'Notebooks', imageUrl: null };
    component.subCategoryLevels = [
      { options: [{ id: 'Students', label: 'Students', imageUrl: null }], selected: 'Students' },
      { options: [notebookOption], selected: '' },
    ];

    component.selectSubCategoryAt(1, notebookOption);

    expect(component.activeProductSubCategory).toBe('Notebooks');
    expect(requests.length).toBe(1);
    expect(requests[0].params.get('subCategory')).toBe('Students');
    expect(requests[0].params.get('subCategory1')).toBe('Notebooks');
  });

  it('opens every product in a new top tab and clears previous rail and brand filters', () => {
    const exam = { id: 'Exam Essentials', label: 'Exam Essentials', imageUrl: null };
    component.subCategoryLevels = [
      { options: [exam], selected: 'Craft & Hobbies' },
      { options: [], selected: 'Adhesives' },
    ];
    component.selectedBrands.add('Old brand');
    component.selectSubCategoryAt(0, exam);

    expect(requests[0].params.get('subCategory')).toBe('Exam Essentials');
    expect(requests[0].params.has('subCategory1')).toBeFalse();
    expect(component.selectedBrands.size).toBe(0);
    expect(component.railSubCategoryLevel).toBeNull();
  });

  it('returns to all products in the same tab when it is clicked after a rail selection', () => {
    const craft = { id: 'Craft & Hobbies', label: 'Craft & Hobbies', imageUrl: null };
    component.subCategoryLevels = [
      { options: [craft], selected: craft.id },
      { options: [], selected: 'Canvases & Surfaces' },
    ];
    component.selectSubCategoryAt(0, craft);

    expect(requests[0].params.get('subCategory')).toBe(craft.id);
    expect(requests[0].params.has('subCategory1')).toBeFalse();
  });

  it('retains both category levels when loading more products', () => {
    component.subCategoryLevels = [
      { options: [], selected: 'Craft & Hobbies' },
      { options: [], selected: 'Adhesives' },
    ];
    component.loadProducts(1);
    expect(requests[0].params.get('subCategory')).toBe('Craft & Hobbies');
    expect(requests[0].params.get('subCategory1')).toBe('Adhesives');
    expect(requests[0].params.get('page')).toBe('1');
  });

  it('does not restore an old rail response after selecting All', () => {
    const pending = new Subject<any>();
    (component as any).http = { get: () => pending };
    const all = { id: component.allSubCategoryId, label: 'All', imageUrl: null };
    component.subCategoryLevels = [{ options: [all], selected: 'Craft & Hobbies' }];
    component.loadSubCategoryLevel(1, ['Craft & Hobbies']);
    component.selectSubCategoryAt(0, all);
    pending.next([{ name: 'Adhesives', imageUrl: null }]);
    expect(component.railSubCategoryLevel).toBeNull();
    expect(component.primarySubCategoryLevel?.selected).toBe(all.id);
  });

  it('removes the subcategory parameter when subcategories are reset', () => {
    const notebookOption = { id: 'Notebooks', label: 'Notebooks', imageUrl: null };
    component.activeProductSubCategory = 'Notebooks';
    component.subCategoryLevels = [
      { options: [{ id: 'Students', label: 'Students', imageUrl: null }], selected: 'Students' },
      { options: [notebookOption], selected: 'Notebooks' },
    ];

    component.resetSubCategories();

    expect(component.activeProductSubCategory).toBeNull();
    expect(component.railSubCategoryLevel).toBeNull();
    expect(component.primarySubCategoryLevel?.selected).toBe(component.allSubCategoryId);
    expect(requests.length).toBe(1);
    expect(requests[0].params.has('subCategory')).toBeFalse();
  });
});
