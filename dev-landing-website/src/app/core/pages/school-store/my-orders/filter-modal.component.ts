import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderStatus } from './order.model';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';

export interface FilterState {
  statuses: OrderStatus[];
  timeRange: 'last-30-days' | 'last-3-months' | 'last-6-months' | '2025' | '2024' | 'older';
}

@Component({
  selector: 'filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SupermeButtonComponent],
  templateUrl: './filter-modal.component.html',
  styleUrls: ['./filter-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() filters: FilterState | null | undefined = {
    statuses: [],
    timeRange: 'last-3-months'
  };
  @Input() previewCount?: number;

  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<FilterState>();
  @Output() preview = new EventEmitter<FilterState>();

  // Local state for form
  selectedStatuses: Set<OrderStatus> = new Set();
  selectedTimeRange: 'last-30-days' | 'last-3-months' | 'last-6-months' | '2025' | '2024' | 'older' =
    'last-3-months';

  // Status options with labels
  statusOptions = [
    { value: OrderStatus.ARRIVING, label: 'On the way' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' },
    { value: OrderStatus.RETURN, label: 'Returned / Exchanged' }
  ];

  // Time range options
  timeRangeOptions = [
    { value: 'last-30-days', label: 'Last 30 days' },
    { value: 'last-3-months', label: 'Last 3 months' },
    { value: 'last-6-months', label: 'Last 6 months' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: 'older', label: 'Older' }
  ] as const;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['filters']) {
      this.initializeFilters();
    }
  }

  /**
   * Initialize filters from input
   */
  private initializeFilters(): void {
    const currentFilters = this.filters || {
      statuses: [],
      timeRange: 'last-3-months' as const
    };
    this.selectedStatuses = new Set(currentFilters.statuses);
    this.selectedTimeRange = currentFilters.timeRange;
    this.cdr.markForCheck();
  }

  /**
   * Toggle status checkbox
   */
  toggleStatus(status: OrderStatus): void {
    if (this.selectedStatuses.has(status)) {
      this.selectedStatuses.delete(status);
    } else {
      this.selectedStatuses.add(status);
    }
    this.cdr.markForCheck();
    this.emitPreview();
  }

  /**
   * Check if status is selected
   */
  isStatusSelected(status: OrderStatus): boolean {
    return this.selectedStatuses.has(status);
  }

  /**
   * Handle time range selection
   */
  selectTimeRange(
    timeRange: 'last-30-days' | 'last-3-months' | 'last-6-months' | '2025' | '2024' | 'older'
  ): void {
    this.selectedTimeRange = timeRange;
    this.cdr.markForCheck();
    this.emitPreview();
  }

  /**
   * Emit preview event for parent to compute preview count
   */
  private emitPreview(): void {
    const filters: FilterState = {
      statuses: Array.from(this.selectedStatuses),
      timeRange: this.selectedTimeRange
    };
    this.preview.emit(filters);
  }

  get applyButtonText(): string {
    if (typeof this.previewCount === 'number') {
      return `Apply (Showing ${this.previewCount} results)`;
    }
    return 'Apply';
  }

  /**
   * Handle close button
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Handle apply button
   */
  onApply(): void {
    const filters: FilterState = {
      statuses: Array.from(this.selectedStatuses),
      timeRange: this.selectedTimeRange
    };
    this.apply.emit(filters);
    this.close.emit();
  }
}
