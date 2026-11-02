import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationeryCategory } from '../stationery.models';

@Component({
  standalone: true,
  selector: 'app-stationery-sidebar',
  templateUrl: './stationery-sidebar.component.html',
  styleUrls: ['./stationery-sidebar.component.scss'],
  imports: [CommonModule]
})
export class StationerySidebarComponent {
  @Input() items: StationeryCategory[] = [];
  @Input() activeId: string | null = null;
  @Input() isOpen = false;
  @Output() select = new EventEmitter<StationeryCategory>();
  @Output() closeDrawer = new EventEmitter<void>();

  onSelect(item: StationeryCategory): void {
    this.select.emit(item);
    this.closeDrawer.emit();
  }
}
