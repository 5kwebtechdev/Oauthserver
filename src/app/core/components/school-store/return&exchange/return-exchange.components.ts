import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { ViewAllComponent } from '../../superme-navigator/view-all/view-all.component';
import { Router } from '@angular/router';
import { SizeGuideComponent } from '../product-store/size-guide/size-guide.component';
import { AuthService } from '../../../services/auth.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'return-exchange',
  templateUrl: './return-exchange.components.html',
  styleUrls: ['./return-exchange.components.scss'],
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeButtonComponent, ViewAllComponent, SizeGuideComponent],
})
export class ReturnExchangeComponent implements OnInit {

  // Passed via router state from my-orders
  orderId: number | null = null;
  orderNumber: string | null = null;

  selectedRequestType = 'return';
  selectedReason = 'too-small-big';
  showSizeGuide = false;
  showUploadProof = false;
  uploadedImages: (string | null)[] = [null, null, null];
  uploadErrorMessage = '';
  submitting = false;

  selectedSize = 16;
  unit: 'in' | 'cm' = 'in';
  outOfStockSizes: number[] = [6, 8, 16];

  sizeChart = [
    { size: 2,  chest: 24, length: 16, sleeve: 5,  age: '2-3 yrs' },
    { size: 4,  chest: 26, length: 18, sleeve: 6,  age: '3-4 yrs' },
    { size: 6,  chest: 28, length: 20, sleeve: 7,  age: '4-5 yrs' },
    { size: 8,  chest: 30, length: 22, sleeve: 8,  age: '5-6 yrs' },
    { size: 10, chest: 32, length: 24, sleeve: 9,  age: '6-7 yrs' },
    { size: 12, chest: 34, length: 26, sleeve: 10, age: '7-8 yrs' },
    { size: 14, chest: 36, length: 28, sleeve: 11, age: '8-9 yrs' },
    { size: 16, chest: 38, length: 30, sleeve: 12, age: '9-10 yrs' },
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private toastService: CustomToastService
  ) {}

  ngOnInit(): void {
    const s = (history.state || {}) as { orderId?: number; orderNumber?: string };
    this.orderId     = s.orderId     ?? null;
    this.orderNumber = s.orderNumber ?? null;
  }

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-skip-loading': '1'
    });
  }

  get disableRequest(): boolean {
    const hasImage = this.uploadedImages.some(i => !!i);
    return !hasImage || !!this.uploadErrorMessage || this.submitting;
  }

  removeImage(index: number): void {
    this.uploadedImages[index] = null;
    if (this.uploadedImages.some(i => !!i)) {
      this.uploadErrorMessage = '';
    }
  }

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
    if (!this.orderId || this.submitting) return;
    this.submitting = true;

    const actionType = this.selectedRequestType === 'exchange' ? 'EXCHANGE' : 'RETURN';
    const body: Record<string, any> = { actionType, reason: this.selectedReason };
    if (actionType === 'EXCHANGE' && this.selectedSize) {
      body['newSizeLabel'] = String(this.selectedSize);
    }

    this.http.post<any>(
      `${environment.apiUrl}/user/orders/${this.orderId}/return`,
      body,
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        this.submitting = false;
        const msg = actionType === 'RETURN'
          ? 'Return request submitted successfully.'
          : 'Exchange request submitted successfully.';
        this.toastService.success(msg);
        this.router.navigateByUrl('/authed/school-store/my-orders');
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Could not submit request. Please try again.';
        this.toastService.error(msg);
      }
    });
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
    this.submitRequest();
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

  selectUnit(u: 'in' | 'cm'): void { this.unit = u; }

  isOutOfStock(size: number): boolean { return this.outOfStockSizes.includes(size); }
}
