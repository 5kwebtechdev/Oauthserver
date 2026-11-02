import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CoreModule } from "src/app/core/core.module";
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { SupermeButtonComponent } from 'src/app/core/components/superme-button/superme-button.component';

@Component({
  standalone: true,
  selector: 'return-exchange',
  templateUrl: './return-exchange.components.html',
  styleUrls: ['./return-exchange.components.scss'],
  imports: [CommonModule, FormsModule, CoreModule, PublicNavbarComponent, FooterComponent, SupermeButtonComponent],
})
export class ReturnExchangeComponent implements OnInit {

  selectedRequestType = 'return';
  selectedReason = 'too-small-big';
  showSizeSection = false;
  showUploadProof = false;
  showPickupConfirmation = false;
  selectedPhoto: string | null = null;
  uploadErrorMessage = '';

  readonly deliveryAddress = 'Rahul- 502, Galaxy Apartments, Mumbai';
  readonly pickupSlotValue = 'tomorrow-3-jan';
  readonly pickupSlotLabel = 'Tomorrow, 3rd Jan';
  selectedPickupSlot = this.pickupSlotValue;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly howToMeasureImage = 'assets/School-assets/Size%20Chart-%20Shirt.jpg';
  readonly deliveryDateLabel = 'Thu, 4th Jan';

  get disableRequest(): boolean {
    return !this.selectedPhoto || !!this.uploadErrorMessage;
  }
  selectedSize = 16; // Default to current size
  unit: 'in' | 'cm' = 'in';
  outOfStockSizes: number[] = [6, 8, 16];

  // Prefill/order info
  orderId: string | null = null;
  orderTitle = 'Classic White Half-Sleeve Shirt';
  orderOriginalSize = 16;
  orderQty = 1;
  orderPrice = 799;
  orderImage = 'assets/School-assets/temp/Shirt-l.jpg';

  get itemCostOriginal(): number {
    return this.orderPrice;
  }

  get itemCostSelected(): number {
    // In production this should come from the SKU/variant pricing API.
    return this.orderPrice;
  }

  get differenceAmount(): number {
    return Math.max(0, this.itemCostSelected - this.itemCostOriginal);
  }

  sizeChart = [
    { size: 2, chest: 24, length: 16, sleeve: 5, age: '2-3 yrs' },
    { size: 4, chest: 26, length: 18, sleeve: 6, age: '3-4 yrs' },
    { size: 6, chest: 28, length: 20, sleeve: 7, age: '4-5 yrs' },
    { size: 8, chest: 30, length: 22, sleeve: 8, age: '5-6 yrs' },
    { size: 10, chest: 32, length: 24, sleeve: 9, age: '6-7 yrs' },
    { size: 12, chest: 34, length: 26, sleeve: 10, age: '7-8 yrs' },
    { size: 14, chest: 36, length: 28, sleeve: 11, age: '8-9 yrs' },
    { size: 16, chest: 38, length: 30, sleeve: 12, age: '9-10 yrs' },
  ];

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Read orderId from the route path param and prefill some form fields
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (this.orderId) {
      // basic mapping to prefill UI — replace with real API lookup in production
      if (this.orderId.includes('39688')) {
        this.orderTitle = 'Mathematics - Class 7';
        this.orderOriginalSize = 0;
        this.orderQty = 1;
        this.orderPrice = 599;
        this.orderImage = 'https://www.figma.com/api/mcp/asset/34fe2d47-7251-4988-863d-18500353b277';
      } else if (this.orderId.includes('39689')) {
        this.orderTitle = 'Mathematics - Class 7';
        this.orderOriginalSize = 12;
        this.orderQty = 1;
        this.orderPrice = 599;
        this.orderImage = 'https://www.figma.com/api/mcp/asset/eb5b7e6b-8d38-44f9-ad79-1d304b697452';
      } else {
        this.orderTitle = 'Classic White Half-Sleeve Shirt';
        this.orderOriginalSize = 16;
        this.orderQty = 1;
        this.orderPrice = 799;
        this.orderImage = 'assets/School-assets/temp/Shirt-l.jpg';
      }
      // Prefill selected size with original size if available
      if (this.orderOriginalSize) this.selectedSize = this.orderOriginalSize;
    }
  }

  goBack(): void {
    if (this.showUploadProof) {
      this.showUploadProof = false;
      this.uploadErrorMessage = '';
      this.selectedPhoto = null;
      return;
    }
    if (this.showPickupConfirmation) {
      this.showPickupConfirmation = false;
      return;
    }
    if (this.showSizeSection) {
      this.showSizeSection = false;
      return;
    }
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigateByUrl('/shop/orders');
    }
  }

  onHelpClick(): void {
    this.router.navigate(['/authed', 'bot-helpline']);
  }

  submitRequest(): void {
    // TODO: Implement form submission logic
    console.log('Submit return/exchange request');
    // Navigate back to my-orders after submission
    this.router.navigateByUrl('/shop/orders');
  }

  onNext(): void {
    if (this.selectedReason === 'quality') {
      this.showPickupConfirmation = true;
      this.showUploadProof = false;
      this.showSizeSection = false;
      return;
    }

    if (this.selectedReason === 'too-small-big') {
      this.showSizeSection = true;
      this.showPickupConfirmation = false;
      return;
    }

    if (this.requiresPhoto()) {
      this.showUploadProof = true;
      this.showSizeSection = false;
      this.showPickupConfirmation = false;
      this.selectedPhoto = null;
      this.uploadErrorMessage = '';
      return;
    }

    this.submitRequest();
  }

  requiresPhoto(): boolean {
    return this.selectedReason === 'damaged' || this.selectedReason === 'wrong-item';
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  clearSelectedPhoto(event?: Event): void {
    event?.stopPropagation();
    this.selectedPhoto = null;
    this.uploadErrorMessage = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const name = file.name.toLowerCase();
    const isPng = file.type === 'image/png' || name.endsWith('.png');
    const isJpeg = file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
    if (!isPng && !isJpeg) {
      this.uploadErrorMessage = 'Invalid file format. Upload png, jpg, jpeg.';
      this.selectedPhoto = null;
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.selectedPhoto = (e.target?.result as string) ?? null;
      this.uploadErrorMessage = '';
    };
    reader.readAsDataURL(file);
  }

  onRequestRefund(): void {
    if (this.disableRequest) return;
    console.log('Request refund with uploaded proof');
    // Open pickup & refund confirmation page
    this.router.navigateByUrl('/authed/school-store/pickup-refund');
  }

  onPayAndProceed(): void {
    if (!this.selectedPickupSlot) return;
    console.log('Pickup slot confirmed. Proceed to pay (if any).');
    // Minimal navigation hook; replace with real checkout/confirmation flow.
    this.submitRequest();
  }

  onReturnSelected(): void {
    this.selectedRequestType = 'return';
    this.showSizeSection = false;
    this.showUploadProof = false;
    this.showPickupConfirmation = false;
    this.submitRequest();
  }

  onExchangeSelected(): void {
    this.selectedRequestType = 'exchange';
    this.showSizeSection = false;
    this.showUploadProof = false;
    this.showPickupConfirmation = false;
    this.submitRequest();
  }

  selectSize(size: number): void {
    if (this.isOutOfStock(size)) return;
    this.selectedSize = size;
  }

  selectUnit(u: 'in' | 'cm'): void {
    this.unit = u;
  }

  formatMeasurement(valueInInches: number): string {
    if (this.unit === 'cm') {
      const cm = valueInInches * 2.54;
      // Match the UI style: keep one decimal only when needed
      const rounded = Math.round(cm * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }
    return Number.isInteger(valueInInches) ? String(valueInInches) : valueInInches.toFixed(1);
  }

  isOutOfStock(size: number): boolean {
    return this.outOfStockSizes.includes(size);
  }
}
