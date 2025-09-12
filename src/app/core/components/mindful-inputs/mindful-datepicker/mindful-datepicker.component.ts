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

  isOpen = false;
  currentMonth = new Date();
  selectingStart = true;
  startDate: Date | null = null;
  endDate: Date | null = null;

  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor(private eRef: ElementRef) {}

  toggleCalendar() {
    this.isOpen = !this.isOpen;
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  selectDate(date: Date) {
    date = new Date(date); // Ensure it's a new Date instance
    if (this.type === 'date') {
      this.startDate = date;
      this.endDate = null;
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

  isInRange(date: Date): boolean {
    if (this.startDate && this.endDate) {
      return date >= this.startDate && date <= this.endDate;
    }
    return false;
  }

  isSameDay(date1: Date, date2: any): boolean {
    return date1 && date2 && date1.toDateString() === date2.toDateString();
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
    // Check if the date is the start of the selected range
    return this.startDate && this.isSameDay(date, this.startDate);
  }

  isEndOfRange(date: Date) {
    // Check if the date is the end of the selected range
    return this.endDate && this.isSameDay(date, this.endDate);
  }
}
