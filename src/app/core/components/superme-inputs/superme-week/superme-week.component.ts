import { Component, EventEmitter, OnInit, Output, HostListener } from '@angular/core';

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

  @Output() dateSelected = new EventEmitter<Date>();

  ngOnInit() {
    this.setWeek(this.selectedDate);
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
    const daysToAdd = direction === 'left' ? 7 : -7;
    const newRef = new Date(this.weekDays[0]);
    newRef.setDate(newRef.getDate() + daysToAdd);
    this.setWeek(newRef);
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
