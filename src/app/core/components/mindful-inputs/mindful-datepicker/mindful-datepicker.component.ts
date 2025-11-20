import {
  Component, forwardRef, Input, ElementRef, HostListener
} from '@angular/core';
import {
  ControlValueAccessor, NG_VALUE_ACCESSOR
} from '@angular/forms';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-datepicker',
  templateUrl: './mindful-datepicker.component.html',
  styleUrls: ['./mindful-datepicker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MindfulDatepickerComponent),
      multi: true
    }
  ],
  standalone: false
})
export class MindfulDatepickerComponent implements ControlValueAccessor {
  @Input() type: 'date' | 'range' = 'date';
  @Input() placeholder: string = '';
  @Input() minDate: Date | null = null;
  // Optional external range endpoints to allow highlighting when this is used as a single-date picker
  @Input() rangeStart: Date | null = null;
  @Input() rangeEnd: Date | null = null;

  isOpen = false;
  currentMonth = new Date();
  selectingStart = true;
  startDate: Date | null = null;
  endDate: Date | null = null;

  private onChange = (_: any) => { };
  private onTouched = () => { };

  constructor(private eRef: ElementRef) { }

  toggleCalendar() {
    const wasOpen = this.isOpen;
    this.isOpen = !this.isOpen;

    if (!wasOpen && this.isOpen) {
      // When opening, set currentMonth to show the appropriate month
      if (this.startDate) {
        this.currentMonth = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
      } else {
        this.currentMonth = new Date();
      }

      // For single-date pickers with no value, pre-select minDate or today
      if (this.type === 'date' && !this.startDate) {
        const defaultDate = this.minDate ? new Date(this.minDate) : new Date();
        this.startDate = new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate());
      }
    }
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  selectDate(date: Date) {
    date = new Date(date); // Ensure it's a new Date instance
    // normalize incoming date to date-only
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (this.minDate) {
      const min = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), this.minDate.getDate());
      if (date < min) return; // do not select past dates
    }
    if (this.type === 'date') {
      // For single-date instances, set the internal startDate and emit immediately for live preview
      this.startDate = date;
      this.onChange(this.startDate);
    } else {
      if (this.selectingStart) {
        this.startDate = date;
        if (this.endDate && this.endDate < date) this.endDate = null;
        this.selectingStart = false; // Switch to selecting end date
      } else {
        if (!this.startDate || date < this.startDate) {
          this.startDate = date;
          this.endDate = null;
        } else {
          this.endDate = date;
        }
      }
    }
  }

  confirmSelection() {
    this.isOpen = false;
    if (this.type === 'date') {
      this.onChange(this.startDate);
    } else {
      this.onChange({ start: this.startDate, end: this.endDate });
    }
  }

  cancelSelection() {
    this.isOpen = false;
  }

  writeValue(value: any): void {
    if (this.type === 'date') {
      this.startDate = value ? new Date(value) : null;
    } else {
      this.startDate = value?.start ? new Date(value.start) : null;
      this.endDate = value?.end ? new Date(value.end) : null;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  getMonthDays(): Date[] {
    const days: Date[] = [];
    const firstDayOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const firstDayIndex = firstDayOfMonth.getDay();
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayIndex);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }

    return days;
  }

  isDisabled(date: Date): boolean {
    if (!this.minDate) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const min = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), this.minDate.getDate());
    return d < min;
  }

  private normalize(d: Date | null): Date | null {
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  getEffectiveStart(): Date | null {
    // Prefer external provided rangeStart when present, otherwise internal startDate
    return this.normalize(this.rangeStart ?? this.startDate);
  }

  getEffectiveEnd(): Date | null {
    // Prefer external provided rangeEnd when present, otherwise internal endDate
    return this.normalize(this.rangeEnd ?? this.endDate);
  }

  isInRange(date: Date): boolean {
    const start = this.getEffectiveStart();
    const end = this.getEffectiveEnd();
    if (start && end) {
      return date >= start && date <= end;
    }
    return false;
  }

  isSameDay(date1: Date, date2: any): boolean {
    if (!date1 || !date2) return false;
    const d1 = this.normalize(date1);
    const d2 = this.normalize(new Date(date2));
    return d1!.toDateString() === d2!.toDateString();
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.onTouched();
    }
  }

  isDateinCurrentMonth(date: Date) {
    // Check if the date is in the current month
    return date.getFullYear() === this.currentMonth.getFullYear() &&
      date.getMonth() === this.currentMonth.getMonth();
  }

  isStartOfRange(date: Date) {
    const start = this.getEffectiveStart();
    return start && this.isSameDay(date, start);
  }

  isEndOfRange(date: Date) {
    const end = this.getEffectiveEnd();
    return end && this.isSameDay(date, end);
  }
}
