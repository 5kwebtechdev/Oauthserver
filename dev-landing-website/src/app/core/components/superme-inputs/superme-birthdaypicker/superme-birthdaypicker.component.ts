import {
  Component,
  forwardRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface BirthdayValue {
  day: number;
  month: number;
  year: number;
}

@Component({
  selector: 'superme-birthdaypicker',
  templateUrl: './superme-birthdaypicker.component.html',
  styleUrls: ['./superme-birthdaypicker.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SupermeBirthdaypickerComponent),
    multi: true
  }],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SupermeBirthdaypickerComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('dayScroller') dayScroller!: ElementRef;
  @ViewChild('monthScroller') monthScroller!: ElementRef;
  @ViewChild('yearScroller') yearScroller!: ElementRef;
  @ViewChild('pickerWrapper') pickerWrapper!: ElementRef;

  @Input() public placeholder = 'Select Birthday';
  // colorVariant allows consumers to pick visual styles (e.g. 'green')
  @Input() public colorVariant: 'default' | 'green' = 'default';
  @Output() dateSelected = new EventEmitter<Date>();

  isOpen = false;
  isExpanded = false;
  hasValue = false;
  selectedDay: number;
  selectedMonth: number; // March (1-based)
  selectedYear: number;

  // Data arrays - only actual values, no padding needed
  readonly daysList = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  readonly yearsList = Array.from({ length: 150 }, (_, i) => new Date().getFullYear() - i);

  private onChange = (value: any) => { };
  private onTouched = () => { };

  constructor(private elementRef: ElementRef) {
    // Initialize with current date
    const now = new Date();
    this.selectedDay = now.getDate();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.done();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToSelected(), 0);
  }

  writeValue(value: any): void {
    if (value instanceof Date) {
      this.selectedDay = value.getDate();
      this.selectedMonth = value.getMonth() + 1;
      this.selectedYear = value.getFullYear();
      this.hasValue = true;
    } else if (typeof value === 'string' && value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        this.selectedDay = date.getDate();
        this.selectedMonth = date.getMonth() + 1;
        this.selectedYear = date.getFullYear();
        this.hasValue = true;
      }
    }
  }

  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  togglePicker() {
    this.isOpen = !this.isOpen;
    this.isExpanded = false;
    if (this.isOpen) {
      setTimeout(() => this.scrollToSelected(), 50);
    }
  }

  expandSection(section: 'day' | 'month' | 'year') {
    this.isExpanded = true;
    setTimeout(() => this.scrollToSelected(), 50);
  }

  private scrollToSelected() {
    this.scrollToIndex(this.dayScroller, this.selectedDay - 1);
    this.scrollToIndex(this.monthScroller, this.selectedMonth - 1);
    this.scrollToIndex(this.yearScroller, this.yearsList.indexOf(this.selectedYear));
  }

  scrollToIndex(element: ElementRef | undefined, index: number) {
    if (!element || index < 0) return;
    const itemHeight = 50;
    try {
      // scrollTop directly to item position (padding handles centering)
      element.nativeElement.scrollTop = index * itemHeight;
    } catch {
      // ignore if element not ready
    }
  }

  onDayScroll(event: Event) { this.updateSelected('day', event); }
  onMonthScroll(event: Event) { this.updateSelected('month', event); }
  onYearScroll(event: Event) { this.updateSelected('year', event); }

  selectItem(type: 'day' | 'month' | 'year', index: number) {
    if (type === 'day') {
      this.selectedDay = this.daysList[index];
    } else if (type === 'month') {
      this.selectedMonth = index + 1;
    } else {
      this.selectedYear = this.yearsList[index];
    }
  }

  private updateSelected(type: 'day' | 'month' | 'year', event: Event) {
    const el = (event.target as HTMLElement);
    const itemHeight = 50;
    const index = Math.round(el.scrollTop / itemHeight);

    if (type === 'day') {
      this.selectedDay = Math.min(Math.max(1, index + 1), 31);
    } else if (type === 'month') {
      this.selectedMonth = Math.min(Math.max(1, index + 1), 12);
    } else if (type === 'year') {
      if (index >= 0 && index < this.yearsList.length) this.selectedYear = this.yearsList[index];
    }
  }

  done() {
    const date = new Date(this.selectedYear, this.selectedMonth - 1, this.selectedDay);
    this.onChange(date);
    this.dateSelected.emit(date);
    this.hasValue = true;
    this.isOpen = false;
    this.isExpanded = false;
  }

  isItemSelected(list: any[], index: number, type: 'day' | 'month' | 'year'): boolean {
    switch (type) {
      case 'day': return list[index] === this.selectedDay;
      case 'month': return index + 1 === this.selectedMonth;
      case 'year': return list[index] === this.selectedYear;
      default: return false;
    }
  }
}
