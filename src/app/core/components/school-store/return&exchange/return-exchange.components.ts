import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { Router } from '@angular/router';
import { SizeGuideComponent } from '../product-store/size-guide/size-guide.component';

@Component({
  standalone: true,
  selector: 'return-exchange',
  templateUrl: './return-exchange.components.html',
  styleUrls: ['./return-exchange.components.scss'],
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, ViewAllComponent, SizeGuideComponent],
})
export class ReturnExchangeComponent {

  selectedRequestType = 'return';
  selectedReason = 'too-small-big';
  showSizeGuide = false;
  showUploadProof = false;
  uploadedImages: (string | null)[] = [null, null, null];
  uploadErrorMessage = '';

  get disableRequest(): boolean {
    // Disable when no images uploaded or when there's an upload error
    const hasImage = this.uploadedImages.some(i => !!i);
    return !hasImage || !!this.uploadErrorMessage;
  }

  removeImage(index: number): void {
    this.uploadedImages[index] = null;
    // clear error if there is at least one valid image
    if (this.uploadedImages.some(i => !!i)) {
      this.uploadErrorMessage = '';
    }
  }
  selectedSize = 16; // Default to current size
  unit: 'in' | 'cm' = 'in';
  outOfStockSizes: number[] = [6, 8, 16];

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

  constructor(private router: Router) {}

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

  submitRequest(): void {
    // TODO: Implement form submission logic
    console.log('Submit return/exchange request');
    // Navigate back to my-orders after submission
    this.router.navigateByUrl('/authed/school-store/my-orders');
  }

  onNext(): void {
    if (this.requiresPhoto()) {
      this.showUploadProof = true;
    } else if (this.selectedRequestType === 'exchange' && this.selectedReason === 'too-small-big') {
      this.showSizeGuide = true;
    } else {
      this.submitRequest();
    }
  }

  requiresPhoto(): boolean {
    return this.selectedReason === 'damaged' || this.selectedReason === 'wrong-item';
  }

  onUploadProofBack(): void {
    this.showUploadProof = false;
  }

  triggerUpload(index: number): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('.upload-box input[type="file"]');
    inputs[index]?.click();
  }

  onImageSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const name = file.name.toLowerCase();
      const isJpeg = file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
      if (!isJpeg) {
        this.uploadErrorMessage = 'Invalid file format. Upload jpg, jpeg';
        this.uploadedImages[index] = null;
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.uploadedImages[index] = e.target?.result as string;
        this.uploadErrorMessage = '';
      };
      reader.readAsDataURL(file);
    }
  }

  onRequestRefund(): void {
    if (this.disableRequest) return;
    console.log('Request refund with images:', this.uploadedImages.filter(Boolean).length);
    // Open pickup & refund confirmation page
    this.router.navigateByUrl('/authed/school-store/pickup-refund');
  }

  onReturnSelected(): void {
    this.selectedRequestType = 'return';
    this.showSizeGuide = false;
    this.submitRequest();
  }

  onExchangeSelected(): void {
    this.selectedRequestType = 'exchange';
    this.showSizeGuide = false;
    this.submitRequest();
  }

  selectSize(size: number): void {
    if (this.isOutOfStock(size)) return;
    this.selectedSize = size;
  }

  selectUnit(u: 'in' | 'cm'): void {
    this.unit = u;
  }

  isOutOfStock(size: number): boolean {
    return this.outOfStockSizes.includes(size);
  }
}