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
    // Address/popup state copied from product-detail to provide Deliver-to UX
    addresses = [
        {
            id: 'rahul',
            short: '502, Galaxy Apartment, Association Road',
            html: 'Rahul- 502, Galaxy Apartment, Association Road<br/>Chennai- 600071'
        },
        {
            id: 'megha',
            short: '502, Royal Apartment, Altmount Road',
            html: 'Megha- 502, Royal Apartment, Altmount Road<br/>Chennai- 600071'
        }
    ];

    selectedId: string | null = this.addresses[0].id;
    selectedAddress: string = this.addresses[0].short;
    showAddressPopup = false;

    constructor(private router: Router, private cdr: ChangeDetectorRef) { }
    // Simple cart items list; replace with real store/service integration as needed
    items: any[] = [];

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

    selectAddress(a: { id: string; short: string; html: string }): void {
        this.selectedId = a.id;
        this.selectedAddress = a.short;
        this.showAddressPopup = false;
        try { this.cdr.detectChanges(); } catch (e) { }
    }
}
