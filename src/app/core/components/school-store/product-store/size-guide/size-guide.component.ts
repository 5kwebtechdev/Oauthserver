import { Component, Input, output, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal, IonContent } from '@ionic/angular/standalone';
import { MindfulNavigatorComponent } from '../../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../../mindful-button/mindful-button.component';

@Component({
  standalone: true,
  selector: 'size-guide',
  templateUrl: './size-guide.component.html',
  styleUrls: ['./size-guide.component.scss'],
  imports: [CommonModule, IonModal, IonContent, MindfulNavigatorComponent, MindfulButtonComponent],
})
export class SizeGuideComponent implements OnDestroy {
  @Input() sizeChart: Array<{ size: number; chest: number; length: number; sleeve: number; age: string }> = [];
  @Input() selectedSize = 2;
  @Input() unit: 'in' | 'cm' = 'in';
  @Input() outOfStockSizes: number[] = [];
  @Input() isOpen = false;
  @Input() heading = 'Product';
  @Input() productTitle = 'Classic White Half-Sleeve Shirt';
  @Input() productSubtitle = 'St. Xavier’s High School';
  @Input() isFromReturnExchange = false;
  @Input() originalSize = 8; // Delivered size
  @Input() sizePrices: { [size: number]: number } = { 4: 799, 6: 849, 8: 879, 10: 899, 12: 919 }; // Dummy prices per size
  @Input() discountedPrice = '₹799';
  @Input() originalPrice = '₹999';
  @Input() productImage = 'assets/School-assets/temp/Shirt-l.jpg';

  returnSelected = output<void>();
  exchangeSelected = output<void>();

  sizeSelected = output<number>();
  unitSelected = output<'in' | 'cm'>();
  closeModal = output<void>();

  @ViewChild('sizeGuideFirstFocus') sizeGuideFirstFocus!: ElementRef<HTMLElement>;

  // Item summary properties - now computed
  get totalPriceDisplay(): string {
    return this.formatPrice(this.deliveredPrice);
  }

  get gstDisplay(): string {
    return this.formatPrice(this.newPrice);
  }

  get toPayDisplay(): string {
    const diff = this.priceDifference;
    if (diff > 0) {
      return this.formatPrice(diff);
    } else if (diff < 0) {
      return `-${this.formatPrice(Math.abs(diff))}`;
    }
    return '₹0';
  }

  get deliveredPrice(): number {
    return this.sizePrices[this.originalSize] || 0;
  }

  get newPrice(): number {
    return this.sizePrices[this.selectedSize] || 0;
  }

  get priceDifference(): number {
    return this.newPrice - this.deliveredPrice;
  }

  selectSize(size: number): void {
    if (this.isOutOfStock(size)) return;
    this.sizeSelected.emit(size);
  }

  selectUnit(u: 'in' | 'cm'): void {
    this.unit = u;
    this.unitSelected.emit(u);
  }

  isOutOfStock(size: number): boolean {
    return this.outOfStockSizes.includes(size);
  }

  displayChest(r: { chest: number }): string {
    return this.formatMeasurement(r.chest);
  }

  displayLength(r: { length: number }): string {
    return this.formatMeasurement(r.length);
  }

  displaySleeve(r: { sleeve: number }): string {
    return this.formatMeasurement(r.sleeve);
  }

  closeSizeGuide(): void {
    this.isOpen = false;
    this.setBackgroundInert(false);
    this.closeModal.emit();
  }

  onReturn(): void {
    this.returnSelected.emit();
  }

  onExchange(): void {
    this.exchangeSelected.emit();
  }

  onSizeModalPresented(): void {
    try {
      // focus the hidden focus target inside the modal to ensure assistive tech focuses modal content
      this.sizeGuideFirstFocus?.nativeElement?.focus?.();
    } catch (e) { }
  }

  ngOnDestroy(): void {
    // ensure inert is removed if component is destroyed while modal open
    try {
      this.setBackgroundInert(false);
    } catch (e) { }
  }

  private setBackgroundInert(val: boolean): void {
    try {
      const outlet =
        document.querySelector('ion-router-outlet.hydrated') ||
        document.querySelector('ion-router-outlet');
      if (!outlet) return;
      if (val) {
        outlet.setAttribute('inert', '');
      } else {
        outlet.removeAttribute('inert');
      }
    } catch (e) { }
  }

  private formatMeasurement(value: number): string {
    if (value === null || value === undefined) return '';
    if (this.unit === 'in') {
      return `${value}`;
    }
    const cm = value * 2.54;
    const rounded = Math.round(cm * 10) / 10;
    return `${rounded}`;
  }

  private formatPrice(price: number): string {
    return `₹${price}`;
  }
}