import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { StoreCategoryApi } from '../api/store-category.api';
import { StoreCategory } from '../models/store-category.model';

@Injectable({ providedIn: 'root' })
export class StoreCategoryService {
    private categories: StoreCategory[] = [];
    private categories$: Observable<StoreCategory[]> | null = null;

    constructor(private storeCategoryApi: StoreCategoryApi) { }

    /**
     * Fetches the store category list once per app session and caches it;
     * safe to call repeatedly (e.g. from every CartService.addItem call).
     */
    loadCategories(): Observable<StoreCategory[]> {
        if (!this.categories$) {
            this.categories$ = this.storeCategoryApi.getAllCategories().pipe(
                tap(categories => { this.categories = categories || []; }),
                catchError(() => {
                    this.categories = [];
                    this.categories$ = null;
                    return of([]);
                }),
                shareReplay(1)
            );
        }
        return this.categories$;
    }

    /**
     * Whether the given category (matched by its backend `name`) requires a
     * school/class context. Only meaningful after loadCategories() has resolved.
     */
    requiresSchoolClass(categoryName: string | null | undefined): boolean {
        if (!categoryName) return false;
        const match = this.categories.find(c => c.name === categoryName);
        return match?.requiresSchoolClass ?? false;
    }
}
