import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationeryProduct } from '../stationery.models';

@Component({
  standalone: true,
  selector: 'app-stationery-product-card',
  templateUrl: './stationery-product-card.component.html',
  styleUrls: ['./stationery-product-card.component.scss'],
  imports: [CommonModule]
})
export class StationeryProductCardComponent {
  @Input() product!: StationeryProduct;
  @Output() open = new EventEmitter<StationeryProduct>();
  @Output() add = new EventEmitter<StationeryProduct>();

  onOpen(): void {
    if (this.product.outOfStock) return;
    this.open.emit(this.product);
  }

  onAdd(event: Event): void {
    event.stopPropagation();
    if (this.product.outOfStock) return;
    this.add.emit(this.product);
  }
}
