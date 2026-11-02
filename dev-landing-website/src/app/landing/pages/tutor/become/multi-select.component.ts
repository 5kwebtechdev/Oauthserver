import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full">
      <button
        type="button"
        [disabled]="disabled"
        (click)="toggle()"
        class="w-full min-h-12 flex items-center gap-2 px-4 py-2 rounded-[6px] border transition-colors bg-white"
        [ngClass]="[
          hasError ? 'border-[#ce0800]' : (isOpen ? 'border-[#90214d]' : 'border-[rgba(40,37,39,0.2)]'),
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
      >
        <div class="flex flex-wrap gap-2 flex-1 min-w-0">
          <span *ngIf="visibleSelected.length === 0" class="text-[16px] font-semibold text-[#a19ca0]" style="font-family:'Nunito',sans-serif">
            {{ placeholder }}
          </span>
          <span
            *ngFor="let item of visibleSelected"
            class="inline-flex items-center gap-1.5 bg-[#90214d] text-white rounded-full px-2.5 py-1 text-[13px] font-semibold shrink-0"
            style="font-family:'Nunito',sans-serif"
          >
            {{ item }}
            <span
              role="button"
              [attr.aria-label]="'Remove ' + item"
              (click)="remove(item, $event)"
              class="hover:opacity-80 transition-opacity cursor-pointer leading-none"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          class="opacity-70 text-[#282527] flex-shrink-0 ml-auto transition-transform duration-200"
          [class.rotate-180]="isOpen">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div *ngIf="isOpen" class="absolute top-full left-0 right-0 mt-1 z-[9999] bg-white rounded-[6px] border border-[rgba(40,37,39,0.2)] shadow-lg" style="box-shadow: 0 4px 16px rgba(0,0,0,0.12)">
        <div class="flex items-center gap-2 px-4 h-12 border-b border-[rgba(40,37,39,0.1)] rounded-t-[6px]" (mousedown)="$event.stopPropagation()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-[rgba(40,37,39,0.5)] flex-shrink-0">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="search"
            placeholder="Search..."
            class="flex-1 text-[16px] font-semibold text-[#282527] placeholder:text-[rgba(40,37,39,0.5)] placeholder:opacity-50 outline-none bg-transparent"
            style="font-family:'Nunito',sans-serif"
          />
        </div>
        <div class="max-h-56 overflow-y-auto rounded-b-[6px]">
          <div *ngIf="filtered.length === 0" class="px-4 py-3 text-[14px] text-[rgba(40,37,39,0.5)]" style="font-family:'Nunito',sans-serif">
            No results
          </div>
          <button
            *ngFor="let option of filtered"
            type="button"
            (click)="toggleOption(option)"
            class="w-full h-12 flex items-center justify-between px-4 hover:bg-[#fce7eb] transition-colors border-b border-[rgba(40,37,39,0.08)] last:border-b-0"
          >
            <span class="text-[16px] font-semibold text-[#282527] text-left truncate pr-4" style="font-family:'Nunito',sans-serif">{{ option }}</span>
            <div
              class="size-4 rounded-[4px] flex-shrink-0 flex items-center justify-center transition-colors"
              [ngClass]="isSelected(option) ? 'bg-[#4caf50]' : 'border-2 border-[#282527]'"
            >
              <svg *ngIf="isSelected(option)" width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MultiSelectComponent {
  @Input() options: string[] = [];
  @Input() selected: string[] = [];
  @Input() placeholder = '';
  @Input() hasError = false;
  @Input() disabled = false;
  @Input() hiddenChips?: string[];
  @Output() selectedChange = new EventEmitter<string[]>();

  isOpen = false;
  search = '';

  constructor(private elRef: ElementRef) {}

  get visibleSelected(): string[] {
    return this.selected.filter((item) => !this.hiddenChips?.includes(item));
  }

  get filtered(): string[] {
    if (!this.search) return this.options;
    const q = this.search.toLowerCase();
    return this.options.filter((o) => o.toLowerCase().includes(q));
  }

  isSelected(option: string): boolean {
    return this.selected.includes(option);
  }

  toggle(): void {
    if (!this.disabled) this.isOpen = !this.isOpen;
  }

  toggleOption(option: string): void {
    const next = this.isSelected(option)
      ? this.selected.filter((s) => s !== option)
      : [...this.selected, option];
    this.selectedChange.emit(next);
  }

  remove(option: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedChange.emit(this.selected.filter((s) => s !== option));
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.search = '';
    }
  }
}