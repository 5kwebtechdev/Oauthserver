import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full">
      <button
        type="button"
        (click)="toggle()"
        class="w-full h-12 flex items-center justify-between px-4 rounded-[6px] border transition-colors bg-white"
        [ngClass]="hasError ? 'border-[#ce0800]' : (isOpen ? 'border-[#90214d]' : 'border-[rgba(40,37,39,0.2)]')"
      >
        <span
          class="text-[16px] font-semibold"
          [ngClass]="value ? 'text-[#282527]' : 'text-[#a19ca0]'"
          style="font-family:'Nunito',sans-serif"
        >{{ value || placeholder }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          class="text-[#282527] opacity-70 transition-transform duration-200"
          [class.rotate-180]="isOpen">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div *ngIf="isOpen" class="absolute top-full left-0 right-0 z-50 bg-white border border-[rgba(40,37,39,0.2)] rounded-[6px] shadow-md mt-1 max-h-64 overflow-y-auto">
        <button
          *ngFor="let option of options"
          type="button"
          (click)="select(option)"
          class="w-full h-12 flex items-center justify-between px-4 hover:bg-[#fce7eb] transition-colors border-b border-[rgba(40,37,39,0.1)] last:border-b-0"
        >
          <span class="text-[16px] font-semibold text-[#282527]" style="font-family:'Nunito',sans-serif">{{ option }}</span>
          <svg *ngIf="option === value" width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-[#1C1B1F]">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class CustomSelectComponent {
  @Input() options: string[] = [];
  @Input() value = '';
  @Input() placeholder = '';
  @Input() hasError = false;
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;

  constructor(private elRef: ElementRef) {}

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  select(option: string): void {
    this.valueChange.emit(option);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}