import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationeryCategory } from '../stationery.models';

@Component({
  standalone: true,
  selector: 'app-stationery-category-slider',
  templateUrl: './stationery-category-slider.component.html',
  styleUrls: ['./stationery-category-slider.component.scss'],
  imports: [CommonModule]
})
export class StationeryCategorySliderComponent {
  @Input() items: StationeryCategory[] = [];
  @Input() activeId: string | null = null;
  @Output() select = new EventEmitter<StationeryCategory>();

  onSelect(item: StationeryCategory): void {
    this.select.emit(item);
  }
}
