import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mindful-calendar.component.html',
  styleUrls: ['./mindful-calendar.component.scss']
})
export class MindfulCalendarComponent {
  @Input() type: 'date' | 'range' = 'date';
  @Input() currentMonth: Date = new Date();
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;
  @Input() showMoodToggle: boolean = true;

  @Output() dateSelected = new EventEmitter<Date | {start: Date | null, end: Date | null}>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  selectingStart = true;
  showMonthPicker = false;
  moodOn = false;
  months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  years: number[] = [];

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) this.years.push(y);
  }

  toggleMonthPicker() {
    this.showMonthPicker = !this.showMonthPicker;
  }

  pickMonth(monthIndex: number) {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), monthIndex, 1);
    this.showMonthPicker = false;
  }

  pickYear(year: number) {
    this.currentMonth = new Date(year, this.currentMonth.getMonth(), 1);
    this.showMonthPicker = false;
  }

  toggleMood() {
    this.moodOn = !this.moodOn;
  }

  selectDate(date: Date) {
    date = new Date(date);
    if (this.type === 'date') {
      this.startDate = date;
      this.endDate = null;
      this.dateSelected.emit(this.startDate);
    } else {
      if (this.selectingStart) {
        this.startDate = date;
        if (this.endDate && this.endDate < date) this.endDate = null;
        this.selectingStart = false;
      } else {
        if (!this.startDate || date < this.startDate) {
          this.startDate = date;
          this.endDate = null;
        } else {
          this.endDate = date;
        }
        this.dateSelected.emit({ start: this.startDate, end: this.endDate });
      }
    }
  }

  confirmSelection() {
    this.confirmed.emit();
  }

  cancelSelection() {
    this.cancelled.emit();
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

  isDateinCurrentMonth(date: Date) {
    return date.getFullYear() === this.currentMonth.getFullYear() &&
           date.getMonth() === this.currentMonth.getMonth();
  }

  isStartOfRange(date: Date) {
    return this.startDate && this.isSameDay(date, this.startDate);
  }

  isEndOfRange(date: Date) {
    return this.endDate && this.isSameDay(date, this.endDate);
  }
}
