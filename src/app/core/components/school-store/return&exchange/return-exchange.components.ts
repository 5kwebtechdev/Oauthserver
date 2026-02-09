import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { Router } from '@angular/router';
import { SizeGuideComponent } from '../product-store/size-guide/size-guide.component';

@Component({
  standalone: true,
  selector: 'return-exchange',
  templateUrl: './return-exchange.components.html',
  styleUrls: ['./return-exchange.components.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, ViewAllComponent, SizeGuideComponent],
})
export class ReturnExchangeComponent {

  selectedRequestType = 'return';
  selectedReason = 'too-small-big';
  showSizeGuide = false;
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
    if (this.selectedRequestType === 'exchange' && this.selectedReason === 'too-small-big') {
      this.showSizeGuide = true;
    } else {
      this.submitRequest();
    }
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