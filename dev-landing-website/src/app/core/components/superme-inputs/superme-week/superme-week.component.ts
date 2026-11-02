import { Component, EventEmitter, OnInit, Output, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-week',
  templateUrl: './superme-week.component.html',
  styleUrls: ['./superme-week.component.scss'],
  standalone: false,
})
export class SupermeWeekComponent implements OnInit {
  weekDays: Date[] = [];
  selectedDate: Date = new Date();
  today: Date = new Date();
  weekStartDate: Date = new Date();
  weekEndDate: Date = new Date();
  displayWeekStart: string = '';
  displayWeekEnd: string = '';
  showNavButtons: boolean = true;

  @Output() dateSelected = new EventEmitter<Date>();
  /** Optional external setter for the currently focused/reference date */
  @Input() referenceDate?: Date;
  /** Optional input to hide navigation buttons */
  @Input() hideNavButtons: boolean = false;
  /** Optional input to hide per-day habit/task stats under the date */
  @Input() showDayStats: boolean = true;
  /** Per-day stats: key = 'YYYY-MM-DD', value = { habits: '3/5', tasks: '2/4' } */
  @Input() dayStats: { [dateKey: string]: { habits: string; tasks: string } } = {};

  dateKey(day: Date): string {
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  }

  ngOnInit() {
    // Initialize week view from either provided referenceDate or internal selectedDate
    const ref = this.referenceDate ?? this.selectedDate;
    this.setWeek(ref);
    this.updateWeekRange();
    this.showNavButtons = !this.hideNavButtons;
    // ensure we emit initial selection so parents can load related data
    this.selectDate(ref);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['referenceDate'] && this.referenceDate) {
      this.setWeek(this.referenceDate);
      this.updateWeekRange();
      this.selectDate(this.referenceDate);
    }
    if (changes['hideNavButtons']) {
      this.showNavButtons = !this.hideNavButtons;
    }
  }

  setWeek(referenceDate: Date) {
    const monday = new Date(referenceDate);
    const day = monday.getDay();
    const offset = (day + 6) % 7;
    monday.setDate(referenceDate.getDate() - offset);

    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }

  /**
   * Calculate and update the week start and end dates for display
   */
  private updateWeekRange(): void {
    this.weekStartDate = this.weekDays[0];
    this.weekEndDate = this.weekDays[6];
    
    // Format for display (e.g., "Jan 12 - Jan 18, 2026")
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = this.weekStartDate.toLocaleDateString('en-US', options);
    const endStr = this.weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    this.displayWeekStart = startStr;
    this.displayWeekEnd = endStr;
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.dateSelected.emit(date);
  }

  isToday(date: Date): boolean {
    return this.areDatesEqual(date, this.today);
  }

  isSelected(date: Date): boolean {
    return this.areDatesEqual(date, this.selectedDate);
  }

  areDatesEqual(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();
  }

  swipe(direction: 'left' | 'right') {
    // normalize swipe to next/prev week relative to current selection
    if (direction === 'left') {
      this.nextWeek();
    } else {
      this.prevWeek();
    }
  }

  /** Move the selectedDate back by 7 days and emit the new date */
  prevWeek() {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() - 7);
    this.setWeek(d);
    this.updateWeekRange();
    this.selectDate(d);
  }

  /** Move the selectedDate forward by 7 days and emit the new date */
  nextWeek() {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + 7);
    this.setWeek(d);
    this.updateWeekRange();
    this.selectDate(d);
  }

  private touchStartX = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    const deltaX = event.changedTouches[0].screenX - this.touchStartX;
    if (Math.abs(deltaX) > 40) {
      this.swipe(deltaX < 0 ? 'left' : 'right');
    }
  }
}
