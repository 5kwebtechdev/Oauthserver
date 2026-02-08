import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'size-guide',
  templateUrl: './size-guide.component.html',
  styleUrls: ['./size-guide.component.scss'],
  imports: [CommonModule],
})
export class SizeGuideComponent {
  @Input() sizeChart: Array<{ size: number; chest: number; length: number; sleeve: number; age: string }> = [];
  @Input() selectedSize = 2;
  @Input() unit: 'in' | 'cm' = 'in';
  @Input() outOfStockSizes: number[] = [];

  sizeSelected = output<number>();
  unitSelected = output<'in' | 'cm'>();

  selectSize(size: number): void {
    if (this.isOutOfStock(size)) return;
    this.sizeSelected.emit(size);
  }

  selectUnit(u: 'in' | 'cm'): void {
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

  private formatMeasurement(value: number): string {
    if (value === null || value === undefined) return '';
    if (this.unit === 'in') {
      return `${value}`;
    }
    const cm = value * 2.54;
    const rounded = Math.round(cm * 10) / 10;
    return `${rounded}`;
  }
}