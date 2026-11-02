import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectComponent } from './multi-select.component';

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  days: string[];
}

export const ALL_DAYS_LABEL = 'All days';
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_WITH_ALL = [ALL_DAYS_LABEL, ...DAYS_OF_WEEK];

@Component({
  selector: 'app-time-slot-row',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectComponent],
  template: `
    <div class="flex flex-col gap-1.5">
      <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
        <!-- Time column -->
        <div class="flex-1 w-full flex flex-col gap-2">
          <span *ngIf="isFirst" class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px]" style="font-family:'Nunito',sans-serif">
            Time
          </span>
          <div class="flex gap-2 sm:gap-3">
            <input
              type="time"
              [ngModel]="slot.startTime"
              (ngModelChange)="updateField('startTime', $event)"
              [ngClass]="hasError ? 'border-[#ce0800]' : 'border-[rgba(40,37,39,0.2)] focus:border-[#90214d]'"
              class="h-11 sm:h-12 w-full px-3 sm:px-4 rounded-[6px] border text-[14px] sm:text-[16px] font-semibold text-[#282527] outline-none bg-white transition-colors"
              style="font-family:'Nunito',sans-serif"
              name="startTime-{{ slot.id }}"
            />
            <input
              type="time"
              [ngModel]="slot.endTime"
              (ngModelChange)="updateField('endTime', $event)"
              [ngClass]="hasError ? 'border-[#ce0800]' : 'border-[rgba(40,37,39,0.2)] focus:border-[#90214d]'"
              class="h-11 sm:h-12 w-full px-3 sm:px-4 rounded-[6px] border text-[14px] sm:text-[16px] font-semibold text-[#282527] outline-none bg-white transition-colors"
              style="font-family:'Nunito',sans-serif"
              name="endTime-{{ slot.id }}"
            />
          </div>
        </div>

        <!-- Days column -->
        <div class="flex-1 w-full flex flex-col gap-2">
          <span *ngIf="isFirst" class="text-[14px] sm:text-[16px] font-semibold text-[#282527] tracking-[0.8px]" style="font-family:'Nunito',sans-serif">
            Days
          </span>
          <app-multi-select
            [options]="daysWithAll"
            [selected]="slot.days"
            placeholder="Select available days"
            [hasError]="hasError"
            [hiddenChips]="[allDaysLabel]"
            (selectedChange)="handleDaysChange($event)"
          ></app-multi-select>
        </div>

        <!-- Remove button -->
        <div *ngIf="canRemove" class="flex flex-col flex-shrink-0 self-end sm:self-auto">
          <div *ngIf="isFirst" class="hidden sm:block h-[30px]"></div>
          <div class="h-11 sm:h-12 flex items-center justify-center">
            <button
              type="button"
              (click)="remove.emit()"
              class="size-7 flex items-center justify-center rounded-full text-[#90214d] hover:bg-[#fce7eb] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <p *ngIf="error" class="text-[12px] sm:text-[13px] font-semibold text-[#ce0800]" style="font-family:'Nunito',sans-serif">
        {{ error }}
      </p>
    </div>
  `,
})
export class TimeSlotRowComponent {
  @Input() slot!: TimeSlot;
  @Input() isFirst = false;
  @Input() canRemove = false;
  @Input() error = '';
  @Output() change = new EventEmitter<TimeSlot>();
  @Output() remove = new EventEmitter<void>();

  readonly daysWithAll = DAYS_WITH_ALL;
  readonly allDaysLabel = ALL_DAYS_LABEL;

  get hasError(): boolean {
    return Boolean(this.error);
  }

  updateField(field: 'startTime' | 'endTime', value: string): void {
    this.change.emit({ ...this.slot, [field]: value });
  }

  handleDaysChange(newSelected: string[]): void {
    const hadAll = this.slot.days.includes(ALL_DAYS_LABEL);
    const hasAll = newSelected.includes(ALL_DAYS_LABEL);

    if (!hadAll && hasAll) {
      this.change.emit({ ...this.slot, days: [ALL_DAYS_LABEL, ...DAYS_OF_WEEK] });
    } else if (hadAll && !hasAll) {
      this.change.emit({ ...this.slot, days: [] });
    } else {
      const individualDays = newSelected.filter((d) => d !== ALL_DAYS_LABEL);
      const allSelected = DAYS_OF_WEEK.every((d) => individualDays.includes(d));
      this.change.emit({
        ...this.slot,
        days: allSelected ? [ALL_DAYS_LABEL, ...DAYS_OF_WEEK] : individualDays,
      });
    }
  }
}
