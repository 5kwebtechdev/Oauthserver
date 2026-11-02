import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, CanMatchFn, ResolveFn, Router, UrlMatcher } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { shopCategorySlug, shopCategoryUrl, shopHierarchySlug, shopSlug } from '../services/shop-url';

export interface ShopRouteSelection {
  categoryId?: number;
  categoryName?: string;
  hierarchy: string[];
  productId?: string;
  error?: string;
}

export const signedInShop: CanMatchFn = () => inject(AuthService).isLoggedIn();
const reserved = new Set(['cart', 'orders', 'checkout', 'school-details', 'products']);
export const shopCategoryMatcher: UrlMatcher = segments => {
  if (segments[0]?.path !== 'shop' || segments.length < 2 || reserved.has(segments[1].path)) return null;
  if (segments.length === 2 && segments[1].path === 'books') return null;
  if (segments.length === 3 && segments[1].path === 'stationery' && /^\d+$/.test(segments[2].path)) return null;
  return { consumed: segments };
};

export const shopSelectionResolver: ResolveFn<ShopRouteSelection> = async route => {
  const http = inject(HttpClient);
  const base = `${environment.apiUrl}/public/store`;
  const rows = (result: any): any[] => Array.isArray(result) ? result : result?.content || result?.data || [];
  try {
    const categories = rows(await firstValueFrom(http.get<any>(`${base}/categories/all`)));
    let segments = route.url.slice(1).map(segment => segment.path);
    if (segments[0] === 'books' && segments.length > 1) segments = segments.slice(1);
    const category = categories.find(c => shopCategorySlug(c.name) === segments[0] || String(c.id) === segments[0]);
    if (!category) return { hierarchy: [], error: 'This shop category is not available.' };
    const hierarchy: string[] = [];
    for (const slug of segments.slice(1)) {
      const level = hierarchy.length;
      const suffix = level ? `/${hierarchy.map(encodeURIComponent).join('/')}/sub-category${level}` : '';
      const options = rows(await firstValueFrom(http.get<any>(`${base}/categories/${category.id}/sub-categories${suffix}`)));
      const option = options.find(o => shopHierarchySlug(o.name) === shopHierarchySlug(slug));
      if (!option) return { hierarchy: [], error: 'This shop category is not available.' };
      hierarchy.push(option.name);
    }
    return { categoryId: category.id, categoryName: category.name, hierarchy };
  } catch {
    return { hierarchy: [], error: 'Unable to load this shop category. Please try again.' };
  }
};

export const legacyShopRedirect: CanActivateFn = async route => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  const query = { ...route.queryParams };
  const aliases: Record<string, string> = { stationery: 'stationery', 'school-uniforms': 'uniforms',
    'entrance-exam-books': 'competitive-exams', 'general-books': 'story-books' };
  const requested = query['categoryId'] || query['category'] || aliases[route.routeConfig?.path || ''];
  if (!requested) return true;
  try {
    const categories = await firstValueFrom(http.get<any[]>(`${environment.apiUrl}/public/store/categories/all`));
    const category = categories.find(c => String(c.id) === String(requested) || shopCategorySlug(c.name) === shopCategorySlug(requested));
    if (!category) return true;
    const hierarchy = ['subCategory', 'subCategory1', 'subCategory2'].map(key => query[key]).filter(Boolean);
    for (const key of ['category', 'categoryId', 'subCategory', 'subCategory1', 'subCategory2']) delete query[key];
    return router.createUrlTree([shopCategoryUrl(category.name, hierarchy)], { queryParams: query });
  } catch {
    return true;
  }
};

/** Resolve readable product slugs through the existing search API, including direct/reloaded links. */
export const shopProductResolver: ResolveFn<ShopRouteSelection> = async route => {
  const http = inject(HttpClient);
  const slug = route.paramMap.get('slug') || '';
  if (/^\d+$/.test(slug)) return { hierarchy: [], productId: slug };
  const matches: any[] = [];
  try {
    let page = 0;
    let totalPages = 1;
    do {
      const response = await firstValueFrom(http.get<any>(`${environment.apiUrl}/public/store/products`, {
        params: { search: slug.replace(/-/g, ' '), page, size: 100 }
      }));
      const products = Array.isArray(response) ? response : response.content || [];
      matches.push(...products.filter((p: any) => shopSlug(p.name) === slug));
      totalPages = Array.isArray(response) ? 1 : Number(response.totalPages || 1);
      page++;
    } while (page < totalPages);
    const unique = [...new Map(matches.map(p => [p.id, p])).values()];
    return unique.length === 1 ? { hierarchy: [], productId: String(unique[0].id) }
      : { hierarchy: [], error: 'This product link is unavailable.' };
  } catch {
    return { hierarchy: [], error: 'Unable to load this product. Please try again.' };
  }
};
