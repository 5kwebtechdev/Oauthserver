import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'pickup-refund',
  templateUrl: './pickup-refund.components.html',
  styleUrls: ['./pickup-refund.components.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, ViewAllComponent],
})
export class PickupRefundComponent {

  // --- Request type: 'return' or 'exchange' ---
  requestType: 'return' | 'exchange' = 'return';

  // --- Pickup address (static for now) ---
  pickupAddress = 'Rahul- 502, Galaxy Apartments, Mumbai';

  // --- Pickup slot options ---
  pickupSlots = [
    { label: 'Tomorrow, 3rd Jan', value: 'tomorrow' },
  ];
  selectedSlot = 'tomorrow';

  // --- Pricing (original item) ---
  itemTotal = 449;
  gstAmount = 24.44;
  deliveryFee = 0;

  // --- Exchange sizing & pricing ---
  originalSize = 4;
  newSize = 8;
  originalItemPrice = 473.44;
  newItemPrice = 473.44;

  constructor(private router: Router) {}

  // ─── Computed displays (Return flow) ───

  get itemTotalDisplay(): string {
    return '₹' + this.itemTotal;
  }

  get gstDisplay(): string {
    return '₹' + this.gstAmount;
  }

  get deliveryDisplay(): string {
    return this.deliveryFee === 0 ? 'FREE' : '₹' + this.deliveryFee;
  }

  get refundAmount(): number {
    return this.itemTotal + this.gstAmount + this.deliveryFee;
  }

  get refundAmountDisplay(): string {
    return '₹' + this.refundAmount;
  }

  // ─── Computed displays (Exchange flow) ───

  get originalPriceDisplay(): string {
    return '₹' + this.originalItemPrice;
  }

  get newPriceDisplay(): string {
    return '₹' + this.newItemPrice;
  }

  get priceDifference(): number {
    return this.newItemPrice - this.originalItemPrice;
  }

  get differenceDisplay(): string {
    const diff = this.priceDifference;
    if (diff === 0) return '₹0';
    if (diff > 0) return '₹' + diff;
    return '-₹' + Math.abs(diff);
  }

  // ─── CTA text ───

  get ctaText(): string {
    if (this.requestType === 'return') {
      return 'Confirm Return/ Exchange';
    }
    // Exchange
    const diff = this.priceDifference;
    if (diff <= 0) {
      return 'Pay ₹0 and proceed';
    }
    return `Pay ₹${diff} and proceed`;
  }

  // ─── Actions ───

  goBack(): void {
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigateByUrl('/authed/school-store/my-orders');
    }
  }

  onHelpClick(): void {
    this.router.navigate(['/authed', 'bot-helpline']);
  }

  onConfirm(): void {
    if (this.requestType === 'return') {
      console.log('Confirm return/exchange — refund ₹' + this.refundAmount);
    } else {
      console.log('Confirm exchange — pay ₹' + Math.max(0, this.priceDifference));
    }
    // Navigate back to my-orders after confirmation
    this.router.navigateByUrl('/authed/school-store/my-orders');
  }
}
