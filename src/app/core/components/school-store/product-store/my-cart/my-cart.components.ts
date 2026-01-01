import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../../mindful-navigator/mindful-navigator.component';
import { Router } from '@angular/router';

@Component({
    selector: 'my-cart',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
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
    items: any[] = [];

    // Per-item quantity (UI only for now)
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

    increaseQuantity(): void {
        this.quantity = (this.quantity || 0) + 1;
        try { this.cdr.detectChanges(); } catch (e) { }
    }

    decreaseQuantity(): void {
        if (!this.quantity || this.quantity <= 1) return;
        this.quantity = this.quantity - 1;
        try { this.cdr.detectChanges(); } catch (e) { }
    }
}
