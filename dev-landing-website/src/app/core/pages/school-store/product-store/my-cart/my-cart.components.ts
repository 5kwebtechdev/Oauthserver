import { Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, ElementRef, Renderer2, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeButtonComponent } from '../../../../components/superme-button/superme-button.component';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { forkJoin, Subscription } from 'rxjs';

import { FooterComponent } from '../../../../components/footer/footer.component';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CheckoutModalComponent } from '../../../../components/checkout-modal/checkout-modal.component';
import { CartService } from '../../../../services/cart.service';
import { CoreService } from '../../../../services/core.service';
import { AddressService } from '../../../../services/address.service';
import { AuthService } from '../../../../services/auth.service';
import { CheckoutService } from '../../../../services/checkout.service';
import { Cart, CartItem } from '../../../../models/cart.model';
import { Address } from '../../../../models/address.model';
import { CheckoutPaymentMethod, CheckoutRequest, CheckoutSummary } from '../../../../models/checkout.model';

// View-model shape the template binds to; mapped from the real CartItem so the
// template markup doesn't need to change as the backend contract evolves.
type CartViewItem = {
    id: number;
    title: string;
    subtitle: string;
    image: string;
    price: number;
    originalPrice: number;
    size: string | null;
    quantity: number;
};

@Component({
    selector: 'my-cart',
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeButtonComponent, FooterComponent, PublicNavbarComponent, CheckoutModalComponent],
    templateUrl: './my-cart.components.html',
    styleUrls: ['./my-cart.components.scss']
})
export class MyCartComponent implements OnInit, OnDestroy {
    @Output()
    closeInline: EventEmitter<void> = new EventEmitter<void>();
    showAddressPopup: boolean = false;
    addresses: Address[] = [];
    selectedAddress: string = '';
    loadingAddresses = false;
    deletingAddressId: number | null = null;
    // Sizes popup state
    showSizePopup: boolean = false;
    sizes: Array<{ size: number; age: string }> = [
        { size: 2, age: '3-4 yrs' },
        { size: 4, age: '4-5 yrs' },
        { size: 6, age: '5-6 yrs' },
        { size: 8, age: '6-7 yrs' },
        { size: 10, age: '7-8 yrs' },
        { size: 12, age: '8-9 yrs' },
        { size: 14, age: '9-10 yrs' },
        { size: 16, age: '10-11 yrs' },
        { size: 18, age: '11-12 yrs' },
        { size: 20, age: '12-13 yrs' },
        { size: 22, age: '13-14 yrs' },
        { size: 24, age: '14-15 yrs' },
        { size: 26, age: '15-16 yrs' }
    ];
    selectedSize: number = 16; // default shown in picker

    @ViewChild('addressInner') addressInner!: ElementRef<HTMLElement>;
    @ViewChild('changeBtn') changeBtn!: ElementRef<HTMLElement>;

    // store previously focused element to restore focus on close
    private previouslyFocused: HTMLElement | null = null;

    constructor(
        private router: Router,
        private cdr: ChangeDetectorRef,
        private modalCtrl: ModalController,
        private renderer: Renderer2,
        private cartService: CartService,
        private coreService: CoreService,
        private addressService: AddressService,
        private authService: AuthService,
        private checkoutService: CheckoutService
    ) { }

    private cartSub = new Subscription();
    private cart: Cart = { items: [], itemsTotal: 0, gstTotal: 0, payableTotal: 0 };
    items: CartViewItem[] = [];
    deletingIndex: number | null = null;
    isClearing = false;
    showCheckoutModal = false;
    checkoutLoading = false;
    orderSubmitting = false;
    showOrderSuccess = false;
    checkoutSummary: CheckoutSummary | null = null;
    //new
    summaryLoading = false;
    // Backwards-compatible single-quantity for legacy UI usage (not used for the list)
    quantity: number = 1;

    

ngOnInit(): void {
    this.cartSub.add(
        this.cartService.cart$.subscribe(cart => {
            this.cart = cart;
            this.items = (cart.items || []).map(item => this.toViewItem(item));
            this.refreshBillSummary();
            this.cdr.detectChanges();
        })
    );
    this.cartSub.add(
        this.addressService.loading$.subscribe(loading => {
            this.loadingAddresses = loading;
            this.cdr.detectChanges();
        })
    );
    this.cartSub.add(
        this.addressService.addresses$.subscribe(addresses => {
            this.addresses = addresses;
            const def = this.addressService.defaultAddress;
            this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
            this.refreshBillSummary();
            this.cdr.detectChanges();
        })
    );
    this.cartService.loadCart().subscribe();
    this.addressService.loadAddresses().subscribe();
}
    ngOnDestroy(): void {
        this.cartSub.unsubscribe();
    }

    private toViewItem(item: CartItem): CartViewItem {
        return {
            id: item.id,
            title: item.productName,
            subtitle: item.schoolName || '',
            image: item.thumbnailUrl,
            price: item.sellingPrice,
            originalPrice: item.mrp,
            size: item.sizeLabel,
            quantity: item.quantity
        };
    }

    get cartItemCount(): number {
        return this.items ? this.items.length : 0;
    }

    get isChildUser(): boolean {
        return this.authService.getUserRelationship() === 'CHILD';
    }

    get cartSubtext(): string {
        const n = this.cartItemCount;
        return `${n} ${n === 1 ? 'Item' : 'Items'}`;
    }

    goBack(): void {
        if (this.closeInline.observed) {
            this.closeInline.emit();
        } else {
            window.history.back();
        }
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
                try { this.router.navigateByUrl('/shop/cart'); } catch (e) { console.log('Open cart', action); }
                return;
            }
            if (action.type === 'package') {
                try { this.router.navigateByUrl('/shop/orders'); } catch (e) { console.log('Open packages', action); }
                return;
            }
        } catch (e) { }
    }

    openAddressPopup(): void {
        try {
            this.previouslyFocused = document.activeElement as HTMLElement | null;
        } catch (e) {
            this.previouslyFocused = null;
        }

        this.showAddressPopup = true;
        try { this.cdr.detectChanges(); } catch (e) { }

        // Prevent background scrolling while popup is open
        try { this.renderer.setStyle(document.body, 'overflow', 'hidden'); } catch (e) { }

        // Focus the first focusable element inside popup (close button if available)
        setTimeout(() => {
            try {
                const el = this.addressInner?.nativeElement?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement | null;
                if (el && typeof el.focus === 'function') el.focus();
            } catch (e) { }
        }, 30);
    }

    closeAddressPopup(): void {
        this.showAddressPopup = false;
        try { this.cdr.detectChanges(); } catch (e) { }

        // Restore page scroll
        try { this.renderer.removeStyle(document.body, 'overflow'); } catch (e) { }

        // Restore focus to previously focused element
        try {
            if (this.previouslyFocused && typeof this.previouslyFocused.focus === 'function') {
                this.previouslyFocused.focus();
            }
        } catch (e) { }
    }

    @HostListener('document:keydown.escape', ['$event'])
    handleEscape(event: Event) {
        if (this.showOrderSuccess) {
            event.stopPropagation();
            return;
        }
        if (this.showCheckoutModal) {
            event.stopPropagation();
            this.closeCheckoutModal();
            return;
        }
        if (this.showAddressPopup) {
            event.stopPropagation();
            this.closeAddressPopup();
        }
    }

    selectAddress(a: Address): void {
        if (!a) return;
        this.selectedAddress = this.addressService.formatAddress(a);
        this.closeAddressPopup();
        this.cartSub.add(
            this.addressService.setDefaultAddress(a.id).subscribe({
                error: () => {
                    const def = this.addressService.defaultAddress;
                    this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
                    this.cdr.detectChanges();
                }
            })
        );
    }

    removeAddress(a: Address): void {
        if (!a || this.deletingAddressId !== null) return;
        this.deletingAddressId = a.id;
        this.cdr.detectChanges();
        this.cartSub.add(
            this.addressService.deleteAddress(a.id).subscribe({
                next: () => {
                    this.deletingAddressId = null;
                    const def = this.addressService.defaultAddress;
                    this.selectedAddress = def ? this.addressService.formatAddress(def) : '';
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.deletingAddressId = null;
                    this.cdr.detectChanges();
                }
            })
        );
    }

    openAddressInputEdit(a: Address): void {
        this.closeAddressPopup();
        this.router.navigateByUrl('/shop/checkout/address', { state: { editAddress: a } });
    }

    formatAddr(a: Address): string {
        return this.addressService.formatAddress(a);
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

    selectSize(s: any): void {
        if (!s) return;
        if ((s as Event) && (s as any).size === undefined) return;
        this.selectedSize = s.size;
        this.closeSizePopup();
    }

    increaseQuantity(index?: number): void {
        if (typeof index !== 'number' || !this.items || !this.items[index]) {
            this.quantity = (this.quantity || 0) + 1;
            return;
        }
        const item = this.items[index];
        this.cartSub.add(this.cartService.updateQuantity(item.id, (item.quantity || 0) + 1).subscribe());
    }

    decreaseQuantity(index?: number): void {
        if (typeof index !== 'number' || !this.items || !this.items[index]) {
            if (!this.quantity || this.quantity <= 1) return;
            this.quantity = this.quantity - 1;
            return;
        }
        const item = this.items[index];
        if (!item.quantity || item.quantity <= 1) return;
        this.cartSub.add(this.cartService.updateQuantity(item.id, item.quantity - 1).subscribe());
    }

    deleteItem(index: number): void {
        const item = this.items?.[index];
        if (!item || this.deletingIndex !== null) return;

        this.deletingIndex = index;
        this.cdr.detectChanges();

        this.cartSub.add(
            this.cartService.removeItem(item.id).subscribe({
                next: () => {
                    this.deletingIndex = null;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.deletingIndex = null;
                    this.coreService.triggerToast(err?.error?.message || 'Could not remove item. Please try again.');
                    this.cdr.detectChanges();
                }
            })
        );
    }

    clearCart(): void {
        const itemIds = this.items.map(item => item.id);
        if (!itemIds.length || this.isClearing) return;

        this.isClearing = true;
        this.cdr.detectChanges();

        this.cartSub.add(
            forkJoin(itemIds.map(id => this.cartService.removeItem(id))).subscribe({
                next: () => {
                    this.isClearing = false;
                    this.coreService.triggerToast('Cart cleared successfully.');
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isClearing = false;
                    this.coreService.triggerToast(err?.error?.message || 'Could not clear cart. Please try again.');
                    this.cdr.detectChanges();
                }
            })
        );
    }

    exploreProducts(): void {
        this.router.navigateByUrl('/shop');
    }

    addToCart(): void {
        this.openCheckoutModal();
    }

    openCheckoutModal(): void {
        if (!this.items.length || this.checkoutLoading || this.isChildUser) return;

        const request = this.buildCheckoutRequest('COD');
        if (!request) return;

        this.checkoutLoading = true;
        this.checkoutSummary = null;
        this.cdr.detectChanges();

        this.cartSub.add(
            this.checkoutService.getSummary(request).subscribe({
                next: summary => {
                    this.checkoutSummary = this.normalizeCheckoutSummary(summary);
                    this.checkoutLoading = false;
                    this.showCheckoutModal = true;
                    this.lockBodyScroll();
                    this.cdr.detectChanges();
                },
                error: err => {
                    this.checkoutLoading = false;
                    this.coreService.triggerToast(err?.error?.message || 'Could not load checkout summary. Please try again.');
                    this.cdr.detectChanges();
                }
            })
        );
    }

    closeCheckoutModal(): void {
        if (this.orderSubmitting) return;
        this.showCheckoutModal = false;
        this.unlockBodyScroll();
        this.cdr.detectChanges();
    }

    onCheckoutChangeAddress(): void {
        this.closeCheckoutModal();
        this.openAddressPopup();
    }

    placeOrder(event: { paymentMethod: CheckoutPaymentMethod; address: Address }): void {
        if (this.orderSubmitting) return;

        const request = this.buildCheckoutRequest(event.paymentMethod);
        if (!request) return;

        this.orderSubmitting = true;
        this.cdr.detectChanges();

        this.cartSub.add(
            this.checkoutService.createOrder(request).subscribe({
                next: () => {
                    this.orderSubmitting = false;
                    this.showCheckoutModal = false;
                    this.showOrderSuccess = true;
                    this.checkoutSummary = null;
                    this.cartSub.add(this.cartService.loadCart().subscribe());
                    this.lockBodyScroll();
                    this.cdr.detectChanges();
                },
                error: err => {
                    this.orderSubmitting = false;
                    this.coreService.triggerToast(err?.error?.message || 'Could not place order. Please try again.');
                    this.cdr.detectChanges();
                }
            })
        );
    }

    trackOrder(): void {
        this.showOrderSuccess = false;
        this.unlockBodyScroll();
        this.router.navigateByUrl('/shop/orders');
    }

    continueShopping(): void {
        this.showOrderSuccess = false;
        this.unlockBodyScroll();
        this.router.navigateByUrl('/shop/products');
    }
     private buildSummaryRequest(paymentMethod: CheckoutPaymentMethod = 'COD'): CheckoutRequest | null {
    const address = this.selectedAddressObject;
    const forUserId = this.authService.getUserId();
    if (!address || !forUserId) return null;
    return { addressId: address.id, forUserId, paymentMethod };
}

refreshBillSummary(): void {
    if (!this.items.length) {
        this.checkoutSummary = null;
        return;
    }
    const request = this.buildSummaryRequest();
    if (!request) {
        this.checkoutSummary = null;
        return;
    }

    this.summaryLoading = true;
    this.cdr.detectChanges();

    this.cartSub.add(
        this.checkoutService.getSummary(request).subscribe({
            next: summary => {
                this.checkoutSummary = this.normalizeCheckoutSummary(summary);
                this.summaryLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                // Silent fallback — keep showing cart-based numbers instead of breaking the page
                this.checkoutSummary = null;
                this.summaryLoading = false;
                this.cdr.detectChanges();
            }
        })
    );
}


    // Sourced from the real cart response (itemsTotal), not computed client-side.
    get totalPrice(): number {
    return this.checkoutSummary?.itemsTotal ?? this.cart?.itemsTotal ?? 0;
}

get totalPriceDisplay(): string {
    return '₹' + this.totalPrice;
}

get gstAmount(): number {
    return this.checkoutSummary?.gstTotal ?? this.cart?.gstTotal ?? 0;
}

get gstDisplay(): string {
    return '₹' + this.gstAmount;
}

get deliveryFee(): number {
    return this.checkoutSummary?.deliveryFee ?? 0;
}

get deliveryDisplay(): string {
    return this.deliveryFee === 0 ? 'Free' : '₹' + this.deliveryFee;
}

get toPay(): number {
    return this.checkoutSummary?.payableTotal
        ?? (this.checkoutSummary as any)?.totalPayable
        ?? (this.totalPrice + this.gstAmount + this.deliveryFee);
}

get toPayDisplay(): string {
    return '₹' + this.toPay;
}
    get checkoutCart(): Cart {
        return this.checkoutSummary || this.cart;
    }

    get selectedAddressObject(): Address | null {
        return this.addressService.defaultAddress;
    }

    async openAddressInput(): Promise<void> {
        try {
            this.closeAddressPopup();
            await this.router.navigateByUrl('/shop/checkout/address');
        } catch (e) { console.error('Failed to open address input page', e); }
    }

    private buildCheckoutRequest(paymentMethod: CheckoutPaymentMethod): CheckoutRequest | null {
        const address = this.selectedAddressObject;
        if (!address) {
            this.coreService.triggerToast('Please add a delivery address before checkout.');
            this.openAddressPopup();
            return null;
        }

        const forUserId = this.authService.getUserId();
        if (!forUserId) {
            this.coreService.triggerToast('Please login again to continue checkout.');
            this.router.navigateByUrl('/auth/login');
            return null;
        }

        return {
            addressId: address.id,
            forUserId,
            paymentMethod
        };
    }

    private normalizeCheckoutSummary(summary: CheckoutSummary | null | undefined): CheckoutSummary {
        if (!summary) {
            return { ...this.cart };
        }

        const wrapped = summary as CheckoutSummary & { data?: CheckoutSummary; summary?: CheckoutSummary };
        const source = wrapped.data || wrapped.summary || summary;

        return {
            ...source,
            items: source.items || this.cart.items || [],
            itemsTotal: source.itemsTotal ?? this.cart.itemsTotal ?? 0,
            gstTotal: source.gstTotal ?? this.cart.gstTotal ?? 0,
            payableTotal: source.payableTotal ?? source.totalPayable ?? this.cart.payableTotal ?? 0
        };
    }

    private lockBodyScroll(): void {
        try { this.renderer.setStyle(document.body, 'overflow', 'hidden'); } catch (e) { }
    }

    private unlockBodyScroll(): void {
        if (this.showAddressPopup || this.showCheckoutModal || this.showOrderSuccess) return;
        try { this.renderer.removeStyle(document.body, 'overflow'); } catch (e) { }
    }
}
