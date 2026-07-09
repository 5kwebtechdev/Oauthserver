import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, of, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { SupermeNavigatorComponent } from '../../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../../superme-button/superme-button.component';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../../../services/auth.service';
import { CustomToastService } from '../../../../services/custom-toast.service';
import { AddressService } from '../../../../services/address.service';
import { Address } from '../../../../api/address.api';
import { environment } from '../../../../../../environments/environment';

interface CartItem {
    id: number;
    productId: number;
    productName: string;
    schoolName?: string | null;
    schoolId?: number | null;
    classId?: number | null;
    thumbnailUrl?: string | null;
    image?: string | null;
    imageUrl?: string | null;
    sizeLabel?: string | null;
    quantity: number;
    sellingPrice?: number | null;
    price?: number | null;
    mrp?: number | null;
    originalPrice?: number | null;
    lineTotal?: number | null;
    gstAmount?: number | null;
    inStock?: boolean;
    deliveryDays?: number | null;
}

@Component({
    selector: 'my-cart',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent],
    templateUrl: './my-cart.components.html',
    styleUrls: ['./my-cart.components.scss']
})
export class MyCartComponent implements OnInit, OnDestroy {
    showAddressPopup = false;
    addresses: Address[] = [];
    selectedAddress: Address | null = null;
    addressesLoading = false;
    deletingAddressId: number | null = null;

    private _addrSub?: Subscription;

    showSizePopup = false;
    activeSizeItemIndex: number | null = null;
    selectedSize: number = 16;
    sizes: Array<{ size: number; age: string }> = [];

    // Cart state
    items: CartItem[] = [];
    cartLoading = false;
    cartError = false;
    deletingIndex: number | null = null;
    clearingCart = false;
    quantity = 1;
    // API-provided totals
    apiItemsTotal: number | null = null;
    apiGstTotal: number | null = null;
    apiPayableTotal: number | null = null;

    constructor(
        private router: Router,
        private cdr: ChangeDetectorRef,
        private modalCtrl: ModalController,
        private http: HttpClient,
        private authService: AuthService,
        private toastService: CustomToastService,
        private addressService: AddressService
    ) { }

    ngOnInit(): void {
        // Subscribe to address list reactively
        this._addrSub = this.addressService.addresses$.subscribe(list => {
            this.addresses = list;
            const def = list.find(a => a.isDefault) ?? list[0] ?? null;
            if (!this.selectedAddress) {
                this.selectedAddress = def;
            } else {
                const stillExists = list.find(a => a.id === this.selectedAddress!.id);
                this.selectedAddress = stillExists ?? def ?? null;
            }
            this.cdr.detectChanges();
        });

        this.addressesLoading = true;
        this.addressService.load().subscribe({
            next: () => { this.addressesLoading = false; this.cdr.detectChanges(); },
            error: () => { this.addressesLoading = false; this.cdr.detectChanges(); }
        });

        this.loadCart();
    }

    ngOnDestroy(): void {
        try { this._addrSub?.unsubscribe(); } catch (e) { }
    }

    loadCart(): void {
        this.cartLoading = true;
        this.cartError = false;
        this.apiItemsTotal = null;
        this.apiGstTotal = null;
        this.apiPayableTotal = null;
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });
        const userId = this.authService.getUserId();
        const cartUrl = userId
            ? `${environment.apiUrl}/cart?forUserId=${userId}`
            : `${environment.apiUrl}/cart`;
        this.http.get<any>(cartUrl, { headers }).subscribe({
            next: (res) => {
                console.log('[Cart] GET /cart response:', JSON.stringify(res));
                const raw = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
                this.items = Array.isArray(raw) ? raw : [];
                this.apiItemsTotal = res?.itemsTotal ?? null;
                this.apiGstTotal = res?.gstTotal ?? null;
                this.apiPayableTotal = res?.payableTotal ?? null;
                this.cartLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('[Cart] GET /cart error:', err?.status, JSON.stringify(err?.error));
                this.cartLoading = false;
                this.cartError = true;
                this.cdr.detectChanges();
            }
        });
    }

    get cartItemCount(): number {
        return this.items ? this.items.length : 0;
    }

    get cartSubtext(): string {
        const n = this.cartItemCount;
        return `${n} ${n === 1 ? 'Item' : 'Items'}`;
    }

    goBack(): void {
        try { window.history.back(); } catch (e) { }
    }

    onRightAction(): void {
        // Placeholder for right action click (currently the SVG button)
        console.log('Right action clicked');
    }

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

    openAddressPopup(): void {
        this.showAddressPopup = true;
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    closeAddressPopup(): void {
        this.showAddressPopup = false;
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    formatAddressShort(a: Address): string {
        return [a.flat, a.area].filter(Boolean).join(', ');
    }

    formatAddressHtml(a: Address): string {
        const line2 = [a.flat, a.area].filter(Boolean).join(', ');
        const line3 = [a.cityState, a.pincode].filter(Boolean).join(' - ');
        return [a.fullName, line2, line3].filter(Boolean).join('<br/>');
    }

    selectAddress(a: Address): void {
        if (!a) return;
        if (a.isDefault) { this.closeAddressPopup(); return; }
        const prev = this.selectedAddress;
        this.selectedAddress = a;
        this.closeAddressPopup();
        this.addressService.setDefault(a.id).subscribe({
            error: () => {
                this.selectedAddress = prev;
                this.toastService.error('Failed to update default address.');
                this.cdr.detectChanges();
            }
        });
    }

    editAddress(a: Address): void {
        this.closeAddressPopup();
        this.router.navigate(['/authed/school-store/address-input'], {
            queryParams: { addressId: a.id },
            state: { address: a }
        });
    }

    deleteAddress(a: Address): void {
        if (this.deletingAddressId != null) return;
        this.deletingAddressId = a.id;
        this.cdr.detectChanges();
        this.addressService.deleteAddress(a.id).subscribe({
            next: () => {
                this.deletingAddressId = null;
                this.toastService.success('Address deleted successfully.');
                this.cdr.detectChanges();
            },
            error: () => {
                this.deletingAddressId = null;
                this.toastService.error('Failed to delete address. Please try again.');
                this.cdr.detectChanges();
            }
        });
    }

    // Size popup handlers
    openSizePopup(): void {
        this.showSizePopup = true;
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    closeSizePopup(): void {
        this.showSizePopup = false;
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    selectSize(s: { size: number; age: string }): void {
        if (!s) return;
        this.selectedSize = s.size;
        this.closeSizePopup();
    }

    increaseQuantity(index?: number): void {
        if (typeof index === 'number' && this.items[index]) {
            const item = this.items[index];
            const newQty = (item.quantity || 0) + 1;
            item.quantity = newQty;
            this.cdr.detectChanges();
            this.updateCartItemQty(item, newQty);
        } else {
            this.quantity = (this.quantity || 0) + 1;
            this.cdr.detectChanges();
        }
    }

    decreaseQuantity(index?: number): void {
        if (typeof index === 'number' && this.items[index]) {
            const item = this.items[index];
            if (!item.quantity || item.quantity <= 1) return;
            const newQty = item.quantity - 1;
            item.quantity = newQty;
            this.cdr.detectChanges();
            this.updateCartItemQty(item, newQty);
        } else {
            if (!this.quantity || this.quantity <= 1) return;
            this.quantity = this.quantity - 1;
            this.cdr.detectChanges();
        }
    }

    private updateCartItemQty(item: CartItem, quantity: number): void {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });
        const body: Record<string, any> = {
            productId: item.productId,
            quantity,
        };
        if (item.schoolId != null) body['schoolId'] = item.schoolId;
        if (item.classId != null) body['classId'] = item.classId;
        if (item.sizeLabel) body['sizeLabel'] = item.sizeLabel;
        this.http.post(`${environment.apiUrl}/cart/items`, body, { headers }).subscribe({
            next: () => { /* quantity already updated optimistically */ },
            error: () => {
                // revert on failure
                item.quantity = quantity === (item.quantity || 0) + 1
                    ? (item.quantity || 1) - 1
                    : (item.quantity || 0) + 1;
                this.cdr.detectChanges();
            }
        });
    }

    goToStore(): void {
        this.router.navigateByUrl('/authed/school-store');
    }

    deleteCartItem(item: CartItem, index: number): void {
        if (this.deletingIndex !== null) return;
        this.deletingIndex = index;
        this.cdr.detectChanges();

        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });

        this.http.delete(`${environment.apiUrl}/cart/items/${item.id}`, { headers }).subscribe({
            next: () => {
                this.items.splice(index, 1);
                // refresh API totals after removal
                this.apiItemsTotal = null;
                this.apiGstTotal = null;
                this.apiPayableTotal = null;
                this.deletingIndex = null;
                this.cdr.detectChanges();
                // re-fetch to get updated totals from server
                this.loadCart();
            },
            error: () => {
                this.deletingIndex = null;
                this.cdr.detectChanges();
            }
        });
    }

    clearCart(): void {
        if (this.clearingCart || !this.items.length) return;
        this.clearingCart = true;
        this.cdr.detectChanges();

        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });
        const userId = this.authService.getUserId();
        const cartUrl = userId
            ? `${environment.apiUrl}/cart?forUserId=${userId}`
            : `${environment.apiUrl}/cart`;

        this.http.get<any>(cartUrl, { headers }).pipe(
            switchMap((res) => {
                const raw = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
                const cartItems: CartItem[] = Array.isArray(raw) ? raw : [];
                if (!cartItems.length) {
                    return of('empty');
                }
                const deletes = cartItems.map(item =>
                    this.http.delete(`${environment.apiUrl}/cart/items/${item.id}`, { headers }).pipe(
                        catchError(() => of(null))
                    )
                );
                return forkJoin(deletes);
            }),
            catchError((err) => {
                console.error('[Cart] clearCart GET error:', err);
                return of('error');
            })
        ).subscribe({
            next: (result) => {
                this.clearingCart = false;
                if (result === 'error') {
                    this.toastService.error('Failed to clear cart. Please try again.');
                    this.loadCart();
                } else {
                    this.items = [];
                    this.apiItemsTotal = null;
                    this.apiGstTotal = null;
                    this.apiPayableTotal = null;
                    this.cdr.detectChanges();
                    this.toastService.success('Cart cleared successfully.');
                }
            },
            error: () => {
                this.clearingCart = false;
                this.toastService.error('Failed to clear cart. Please try again.');
                this.loadCart();
            }
        });
    }

    onCartImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        if (!img) return;
        const originalSrc = img.src;
        // Avoid infinite loop if placeholder also fails
        img.onerror = null;
        // Try fetching with auth header and convert to blob URL
        const token = this.authService.getToken();
        if (token && originalSrc && originalSrc.startsWith('http')) {
            fetch(originalSrc, {
                headers: { 'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}` }
            })
            .then(r => r.ok ? r.blob() : Promise.reject())
            .then(blob => {
                img.src = URL.createObjectURL(blob);
            })
            .catch(() => {
                img.src = 'assets/School-assets/empty-product-list.png';
                img.style.objectFit = 'contain';
                img.style.padding = '8px';
            });
        } else {
            img.src = 'assets/School-assets/empty-product-list.png';
            img.style.objectFit = 'contain';
            img.style.padding = '8px';
        }
    }

    addToCart(): void {
        console.log('Proceed to pay clicked');
    }

    get totalPrice(): number {
        if (this.apiItemsTotal != null) return this.apiItemsTotal;
        if (!this.items || !this.items.length) return 0;
        return this.items.reduce((sum, it) => {
            const p = Number(it?.sellingPrice ?? it?.price ?? 0);
            const q = Number(it?.quantity || 1);
            return sum + p * q;
        }, 0);
    }

    get totalPriceDisplay(): string {
        return '₹' + this.totalPrice;
    }

    get gstAmount(): number {
        return this.apiGstTotal != null ? this.apiGstTotal : Math.round(this.totalPrice * 0.18);
    }

    get gstDisplay(): string {
        return '₹' + this.gstAmount;
    }

    get deliveryFee(): number {
        return this.totalPrice > 500 ? 0 : 99;
    }

    get deliveryDisplay(): string {
        return this.deliveryFee === 0 ? 'Free' : '₹' + this.deliveryFee;
    }

    get toPay(): number {
        if (this.apiPayableTotal != null) return this.apiPayableTotal + this.deliveryFee;
        return this.totalPrice + this.gstAmount + this.deliveryFee;
    }

    get toPayDisplay(): string {
        return '₹' + this.toPay;
    }

    async openAddressInput(): Promise<void> {
        try {
            this.closeAddressPopup();
            await this.router.navigateByUrl('/authed/school-store/address-input');
        } catch (e) { console.error('Failed to open address input page', e); }
    }
}
