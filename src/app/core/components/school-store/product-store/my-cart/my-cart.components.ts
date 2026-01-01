import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../../mindful-button/mindful-button.component';
import { Router } from '@angular/router';

@Component({
    selector: 'my-cart',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
    templateUrl: './my-cart.components.html',
    styleUrls: ['./my-cart.components.scss']
})
export class MyCartComponent {
    // Popup state and address data (copied from product-store behavior)
    showAddressPopup: boolean = false;
    addresses: Array<{ id: string | number; html: string }> = [
        { id: 'home', html: '502, Galaxy Apartment Association Road, Pune - 411001' },
        { id: 'school', html: 'St. Xavier\'s High School Near Central Plaza, Pune - 411002' }
    ];
    // Selected address shown in header — default to the first address and mark it selected
    selectedId: string | number | null = this.addresses && this.addresses.length ? this.addresses[0].id : null;
    selectedAddress: string = this.addresses && this.addresses.length ? (this.addresses[0].html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
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

    constructor(private router: Router, private cdr: ChangeDetectorRef) { }
    // Simple cart items list; replace with real store/service integration as needed
    items: any[] = [
        { id: '1', title: 'Classic White Half-Sleeve Shirt', subtitle: 'St. Xavier’s High School', image: 'assets/School-assets/temp/Shirt-l.jpg', price: 799, originalPrice: 999, size: 16, quantity: 1 },
        { id: '2', title: 'Classic White Half-Sleeve Shirt', subtitle: 'St. Xavier’s High School', image: 'assets/School-assets/temp/Shirt-l.jpg', price: 799, originalPrice: 999, size: 16, quantity: 1 },
        { id: '3', title: 'Classic White Half-Sleeve Shirt', subtitle: 'St. Xavier’s High School', image: 'assets/School-assets/temp/Shirt-l.jpg', price: 799, originalPrice: 999, size: 16, quantity: 1 },
        { id: '4', title: 'Classic White Half-Sleeve Shirt', subtitle: 'St. Xavier’s High School', image: 'assets/School-assets/temp/Shirt-l.jpg', price: 799, originalPrice: 999, size: 16, quantity: 1 }
    ];

    // Backwards-compatible single-quantity for legacy UI usage (not used for the list)
    quantity: number = 1;

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

    selectAddress(a: { id: string | number; html: string }): void {
        if (!a) return;
        this.selectedId = a.id;
        // Strip simple HTML tags for display in the header
        this.selectedAddress = (a.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        this.closeAddressPopup();
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
        if (typeof index === 'number' && this.items && this.items[index]) {
            this.items[index].quantity = (this.items[index].quantity || 0) + 1;
        } else {
            this.quantity = (this.quantity || 0) + 1;
        }
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    decreaseQuantity(index?: number): void {
        if (typeof index === 'number' && this.items && this.items[index]) {
            if (!this.items[index].quantity || this.items[index].quantity <= 1) return;
            this.items[index].quantity = this.items[index].quantity - 1;
        } else {
            if (!this.quantity || this.quantity <= 1) return;
            this.quantity = this.quantity - 1;
        }
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    addToCart(): void {
        // Placeholder: wire this up to cart service or navigation as needed
        console.log('Add to cart clicked');
    }

    // Compute total price shown in purchase bar by summing all items' (price * quantity)
    get totalPrice(): number {
        if (!this.items || !this.items.length) return (this.quantity || 1) * 799;
        return this.items.reduce((sum, it) => {
            const p = Number(it?.price || 799);
            const q = Number(it?.quantity || 1);
            return sum + p * q;
        }, 0);
    }

    get totalPriceDisplay(): string {
        return '₹' + this.totalPrice;
    }

    // GST at 18% of total price
    get gstAmount(): number {
        return Math.round(this.totalPrice * 0.18);
    }

    get gstDisplay(): string {
        return '₹' + this.gstAmount;
    }

    // Delivery: free if totalPrice > 500 else ₹99
    get deliveryFee(): number {
        return this.totalPrice > 500 ? 0 : 99;
    }

    get deliveryDisplay(): string {
        return this.deliveryFee === 0 ? 'Free' : '₹' + this.deliveryFee;
    }

    get toPay(): number {
        return this.totalPrice + this.gstAmount + this.deliveryFee;
    }

    get toPayDisplay(): string {
        return '₹' + this.toPay;
    }
}
