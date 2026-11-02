import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { CartApi } from '../api/cart.api';
import { StoreCategoryService } from './store-category.service';
import { SchoolContextService } from './school-context.service';
import { AuthService } from './auth.service';
import { AddToCartInput, AddToCartRequest, Cart, CartItem, SchoolClassContext } from '../models/cart.model';

const EMPTY_CART: Cart = { items: [], itemsTotal: 0, gstTotal: 0, payableTotal: 0 };

@Injectable({ providedIn: 'root' })
export class CartService {
    private cartSubject = new BehaviorSubject<Cart>(EMPTY_CART);
    public cart$ = this.cartSubject.asObservable();

    private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
    public cartItems$ = this.cartItemsSubject.asObservable();

    private cartCountSubject = new BehaviorSubject<number>(0);
    public cartCount$ = this.cartCountSubject.asObservable();

    constructor(
        private cartApi: CartApi,
        private storeCategoryService: StoreCategoryService,
        private schoolContextService: SchoolContextService,
        private authService: AuthService
    ) { }

    /**
     * Loads the cart for a given scope. Omit context for non-school-linked
     * categories; pass { schoolId, classId } once that's resolvable for
     * school-linked categories (Uniform / Textbooks).
     */
    loadCart(context?: SchoolClassContext): Observable<Cart> {
        return this.cartApi.getCart(context).pipe(
            tap(cart => this.applyCart(cart)),
            catchError(error => {
                console.error('Error fetching cart:', error);
                this.applyCart(EMPTY_CART);
                return of(EMPTY_CART);
            })
        );
    }

    /**
     * Adds an item to the cart. Resolves the product category to determine
     * whether schoolId/classId are needed, then sources them from:
     *   1. input.schoolContext (explicit, caller-supplied)
     *   2. SchoolContextService (populated when the user selects a school)
     * The API call is always made — the backend enforces missing-context errors.
     */
    addItem(input: AddToCartInput): Observable<Cart> {
        return this.storeCategoryService.loadCategories().pipe(
            switchMap(() => {
                const requiresSchoolClass = this.storeCategoryService.requiresSchoolClass(input.categoryName);

                // Resolve school context: explicit input wins, then service fallback
                const schoolContext = input.schoolContext
                    ?? (requiresSchoolClass ? this.schoolContextService.context : null);

                const payload: AddToCartRequest = {
                    productId: input.productId,
                    sizeLabel: input.sizeLabel,
                    quantity: input.quantity,
                    ...(this.forUserId ? { forUserId: this.forUserId } : {}),
                    ...(schoolContext ? { schoolId: schoolContext.schoolId, classId: schoolContext.classId } : {})
                };

                return this.cartApi.addItem(payload);
            }),
            tap(cart => this.applyCart(cart)),
            catchError(error => {
                console.error('Error adding item to cart:', error);
                return throwError(() => error);
            })
        );
    }

    updateQuantity(itemId: number, quantity: number): Observable<Cart> {
        return this.cartApi.updateItem(itemId, { quantity, ...(this.forUserId ? { forUserId: this.forUserId } : {}) }).pipe(
            tap(cart => this.applyCart(cart)),
            catchError(error => {
                console.error('Error updating cart item:', error);
                return throwError(() => error);
            })
        );
    }

    removeItem(itemId: number): Observable<Cart> {
        return this.cartApi.removeItem(itemId).pipe(
            tap(cart => this.applyCart(cart)),
            catchError(error => {
                console.error('Error removing cart item:', error);
                return throwError(() => error);
            })
        );
    }

    clearCart(context?: SchoolClassContext): Observable<Cart> {
        return this.cartApi.clearCart(context).pipe(
            tap(cart => this.applyCart(cart)),
            catchError(error => {
                console.error('Error clearing cart:', error);
                return throwError(() => error);
            })
        );
    }

    getCartCount(): number {
        return this.cartCountSubject.value;
    }

    private applyCart(cart: Cart): void {
        this.cartSubject.next(cart);
        this.cartItemsSubject.next(cart.items || []);
        this.cartCountSubject.next((cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0));
    }

    private get forUserId(): string | null {
        return this.authService.getUserId();
    }
}
