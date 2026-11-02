import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Brand / Page Count option lists are passed in as hardcoded arrays for now
// (see product-store.components.ts); swap the inputs for an API-backed source later.
type FilterTab = 'brand' | 'pageCount';

@Component({
  standalone: true,
  selector: 'app-stationery-filters',
  templateUrl: './stationery-filters.component.html',
  styleUrls: ['./stationery-filters.component.scss'],
  imports: [CommonModule]
})
export class StationeryFiltersComponent {
  @Input() brands: string[] = [];
  @Input() pageCounts: string[] = [];
  @Input() selectedBrands: string[] = [];
  @Input() selectedPageCounts: string[] = [];
  @Input() resultCount = 0;
  @Output() brandsChange = new EventEmitter<string[]>();
  @Output() pageCountsChange = new EventEmitter<string[]>();

  dialogOpen = false;
  activeTab: FilterTab = 'brand';
  draftBrands: string[] = [];
  draftPageCounts: string[] = [];

  get totalSelected(): number {
    return this.selectedBrands.length + this.selectedPageCounts.length;
  }

  isChecked(list: string[], value: string): boolean {
    return list.includes(value);
  }

  openDialog(tab: FilterTab): void {
    this.draftBrands = this.selectedBrands.slice();
    this.draftPageCounts = this.selectedPageCounts.slice();
    this.activeTab = tab;
    this.dialogOpen = true;
  }

  closeDialog(): void {
    this.dialogOpen = false;
  }

  clearAll(): void {
    this.draftBrands = [];
    this.draftPageCounts = [];
  }

  toggleDraft(tab: FilterTab, value: string): void {
    if (tab === 'brand') {
      this.draftBrands = this.toggled(this.draftBrands, value);
    } else {
      this.draftPageCounts = this.toggled(this.draftPageCounts, value);
    }
  }

  apply(): void {
    this.brandsChange.emit(this.draftBrands);
    this.pageCountsChange.emit(this.draftPageCounts);
    this.dialogOpen = false;
  }

  private toggled(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
  }
}
