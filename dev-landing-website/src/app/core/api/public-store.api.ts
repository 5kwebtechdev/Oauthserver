import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicStoreQuery {
  schoolId?: string | number | null;
  className?: string | null;
}

export interface PublicProductQuery extends PublicStoreQuery {
  categoryId?: string | number | null;
  subCategory?: string | null;
  subCategory1?: string | null;
  subCategory2?: string | null;
  subCategory3?: string | null;
  brandId?: string | number | null;
  search?: string | null;
  gender?: string | null;
  pageCount?: string | number | null;
  page?: number | null;
  size?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PublicStoreApi {
  private readonly base = `${environment.apiUrl}/public/store`;

  constructor(private readonly http: HttpClient) {}

  getAllCategories(): Observable<unknown> {
    return this.http.get(`${this.base}/categories/all`);
  }

  getHome(query: PublicStoreQuery = {}): Observable<unknown> {
    return this.http.get(`${this.base}/home`, { params: this.toParams(query) });
  }

  getCategories(query: PublicStoreQuery = {}): Observable<unknown> {
    return this.http.get(`${this.base}/categories`, { params: this.toParams(query) });
  }

  getProducts(query: PublicProductQuery = {}): Observable<unknown> {
    return this.http.get(`${this.base}/products`, { params: this.toParams(query) });
  }

  getProduct(productId: string | number, query: PublicStoreQuery = {}): Observable<unknown> {
    return this.http.get(`${this.base}/products/${encodeURIComponent(String(productId))}`, { params: this.toParams(query) });
  }

  getSubCategories(categoryId: string | number): Observable<unknown> {
    return this.http.get(`${this.base}/categories/${encodeURIComponent(String(categoryId))}/sub-categories`);
  }

  getSubCategory1(categoryId: string | number, subCategory: string): Observable<unknown> {
    return this.http.get(`${this.base}/categories/${encodeURIComponent(String(categoryId))}/sub-categories/${encodeURIComponent(subCategory)}/sub-category1`);
  }

  getSubCategory2(categoryId: string | number, subCategory: string, subCategory1: string): Observable<unknown> {
    return this.http.get(`${this.base}/categories/${encodeURIComponent(String(categoryId))}/sub-categories/${encodeURIComponent(subCategory)}/${encodeURIComponent(subCategory1)}/sub-category2`);
  }

  getSubCategory3(categoryId: string | number, subCategory: string, subCategory1: string, subCategory2: string): Observable<unknown> {
    return this.http.get(`${this.base}/categories/${encodeURIComponent(String(categoryId))}/sub-categories/${encodeURIComponent(subCategory)}/${encodeURIComponent(subCategory1)}/${encodeURIComponent(subCategory2)}/sub-category3`);
  }

  getBrands(categoryId: string | number, subCategory?: string | null): Observable<unknown> {
    return this.http.get(`${this.base}/brands`, {
      params: this.toParams({ categoryId, subCategory }),
    });
  }

  checkServiceability(pincode: string): Observable<unknown> {
    return this.http.get(`${this.base}/serviceability`, {
      params: new HttpParams().set('pincode', pincode),
    });
  }

  private toParams(values: object): HttpParams {
    let params = new HttpParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
