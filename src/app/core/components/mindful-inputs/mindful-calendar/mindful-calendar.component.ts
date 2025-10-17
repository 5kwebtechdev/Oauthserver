import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-calendar',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './mindful-calendar.component.html',
  styleUrls: ['./mindful-calendar.component.scss']
})
export class MindfulCalendarComponent implements OnChanges {
  @Input() type: 'date' | 'range' = 'date';
  @Input() currentMonth: Date = new Date();
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;
  @Input() showMoodToggle: boolean = true;
  @Input() useArrowNavigation: boolean = false; // New input to control navigation style
  @Input() dateActivities: { [key: string]: { timetable?: boolean, task?: boolean, habit?: boolean } } = {}; // Activity data for each date
  @Input() useCalendarMainStyle: boolean = false; // New input for calendar-main specific styling

  @Output() dateSelected = new EventEmitter<Date | { start: Date | null, end: Date | null }>();
  @Output() moodToggled = new EventEmitter<boolean>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  selectingStart = true;
  showMonthPicker = false;
  moodOn = false; // Mood toggle OFF by default so activity dots show
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  years: number[] = [];

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) this.years.push(y);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dateActivities']) {
      console.log('dateActivities changed:', this.dateActivities);
      console.log('Number of dates with activities:', Object.keys(this.dateActivities).length);
    }
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
    this.moodToggled.emit(this.moodOn);
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
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

  getDateKey(date: Date): string {
    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getActivitiesForDate(date: Date) {
    const key = this.getDateKey(date);
    const activities = this.dateActivities[key] || {};
    // Log only if there are activities
    if (activities.timetable || activities.task || activities.habit) {
      console.log(`Activities for ${key}:`, activities);
    }
    return activities;
  }

  hasActivities(date: Date): boolean {
    const activities = this.getActivitiesForDate(date);
    const has = !!(activities.timetable || activities.task || activities.habit);
    return has;
  }
}
