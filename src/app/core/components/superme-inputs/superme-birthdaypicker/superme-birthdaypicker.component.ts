import {
  Component,
  forwardRef,
  ViewChild,
  ElementRef,
  AfterViewInit, Input,
  OnChanges, SimpleChanges, Output, EventEmitter
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-birthdaypicker',
  templateUrl: './superme-birthdaypicker.component.html',
  styleUrls: ['./superme-birthdaypicker.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SupermeBirthdaypickerComponent),
    multi: true
  }],
  standalone: false
})
export class SupermeBirthdaypickerComponent implements ControlValueAccessor, AfterViewInit, OnChanges {
  @ViewChild('dayCol') dayCol!: ElementRef;
  @ViewChild('monthCol') monthCol!: ElementRef;
  @ViewChild('yearCol') yearCol!: ElementRef;

  @Input()
  public showTrigger: boolean = false;

  @Input()
  public disabled: boolean = false;

  /**
   * Variant class for the picker. Example: 'white-green' to get white main layout and
   * green date selection area as provided by the designer.
   */
  @Input()
  public variant: string | undefined;

  /**
   * Allow parent to pass an initial date to set the picker to.
   * Accepts a Date or ISO string.
   */
  @Input()
  public initialDate: Date | string | undefined;


  // Emit selected Date
  @Output() dateSelected = new EventEmitter<any>();
  // Emit when picker is closed without selecting a date
  @Output() closed = new EventEmitter<void>();

  show = false;
  selectedDate: Date = new Date();

  days = [null, null, ...Array.from({ length: 31 }, (_, i) => i + 1), null, null];
  months = [null, null, ...[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], null, null];
  private readonly fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years = [null, null, ...Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i), null, null];

  rowHeight = 40;

  private onChange = (value: any) => { };
  private onTouched = () => { };

  private scrollTimeouts: { [key: string]: any } = {};
  private isScrolling: { [key: string]: boolean } = { day: false, month: false, year: false };

  ngAfterViewInit() {
    setTimeout(() => this.scrollToSelected());
  }

  writeValue(value: any): void {
    if (value) {
      this.selectedDate = new Date(value);
    } else {
      this.selectedDate = new Date(); // default to today
    }
  }

  /**
   * Public API to set selected date programmatically.
   */
  public setSelectedDate(value: Date | string) {
    if (!value) return;
    this.selectedDate = value instanceof Date ? value : new Date(value);
    // If view is ready, scroll to the new selection
    try {
      this.scrollToSelected();
    } catch (e) {
      // ignore if view not ready
    }
  }

  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  open() {
    if (this.disabled) return;
    this.show = true;
    setTimeout(() => this.scrollToSelected(), 100);
  }

  close() {
    this.show = false;
    this.closed.emit();
  }

  done() {
    this.onChange(this.selectedDate.toISOString());
    this.dateSelected.emit(this.selectedDate.toISOString());
    this.close();
  }

  scrollToSelected() {
    // Guard against ViewChild not being ready
    if (!this.dayCol || !this.monthCol || !this.yearCol) return;
    // compute offset so the selected row sits vertically centered
    const dayEl = this.dayCol.nativeElement as HTMLElement;
    const monthEl = this.monthCol.nativeElement as HTMLElement;
    const yearEl = this.yearCol.nativeElement as HTMLElement;

    const computeOffset = (el: HTMLElement) => Math.floor(el.clientHeight / 2 - this.rowHeight / 2) || (2 * this.rowHeight);

    // day() returns 1-31; array has two leading nulls so index = day + 1
    const day = this.selectedDate.getDate();
    const dayIndex = day + 1;
    const dayOffset = computeOffset(dayEl);
    dayEl.scrollTop = dayIndex * this.rowHeight - dayOffset;

    const month = this.selectedDate.getMonth();
    const monthIndex = month + 2; // months array has two leading nulls
    const monthOffset = computeOffset(monthEl);
    monthEl.scrollTop = monthIndex * this.rowHeight - monthOffset;

    const yearIndex = this.years.indexOf(this.selectedDate.getFullYear());
    if (yearIndex >= 0) {
      const yearOffset = computeOffset(yearEl);
      yearEl.scrollTop = yearIndex * this.rowHeight - yearOffset;
    }
  }

  onScroll(type: 'day' | 'month' | 'year') {
    this.isScrolling[type] = true;

    // Clear any pending snap
    if (this.scrollTimeouts[type]) {
      clearTimeout(this.scrollTimeouts[type]);
    }

    // Set a timeout to snap when scrolling stops (after 150ms of no scroll events)
    this.scrollTimeouts[type] = setTimeout(() => {
      this.snapToCenter(type);
      this.isScrolling[type] = false;
    }, 150);
  }

  private snapToCenter(type: 'day' | 'month' | 'year') {
    const scrollEl = {
      day: this.dayCol.nativeElement as HTMLElement,
      month: this.monthCol.nativeElement as HTMLElement,
      year: this.yearCol.nativeElement as HTMLElement
    }[type];

    const offset = Math.floor(scrollEl.clientHeight / 2 - this.rowHeight / 2) || (2 * this.rowHeight);
    const currentScrollPos = scrollEl.scrollTop + offset;
    const closestIndex = Math.round(currentScrollPos / this.rowHeight);
    const targetScrollTop = closestIndex * this.rowHeight - offset;

    // Animate snap to center
    this.animateScroll(scrollEl, targetScrollTop, 300);

    // Update selected date
    if (type === 'day') {
      const val = this.days[closestIndex];
      if (val) this.selectedDate.setDate(val);
    } else if (type === 'month') {
      const val = closestIndex - 2;
      if (val >= 0 && val < 12) this.selectedDate.setMonth(val);
    } else if (type === 'year') {
      const val = this.years[closestIndex];
      if (val) this.selectedDate.setFullYear(val);
    }
  }

  private animateScroll(el: HTMLElement, targetScrollTop: number, duration: number) {
    const startScrollTop = el.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      el.scrollTop = startScrollTop + distance * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  getCurrentDayIndex() {
    const el = this.dayCol?.nativeElement as HTMLElement | undefined;
    if (!el) return 0;
    const offset = Math.floor(el.clientHeight / 2 - this.rowHeight / 2) || (2 * this.rowHeight);
    return Math.round((el.scrollTop + offset) / this.rowHeight);
  }
  getCurrentMonthIndex() {
    const el = this.monthCol?.nativeElement as HTMLElement | undefined;
    if (!el) return 0;
    const offset = Math.floor(el.clientHeight / 2 - this.rowHeight / 2) || (2 * this.rowHeight);
    return Math.round((el.scrollTop + offset) / this.rowHeight);
  }
  getCurrentYearIndex() {
    const el = this.yearCol?.nativeElement as HTMLElement | undefined;
    if (!el) return 0;
    const offset = Math.floor(el.clientHeight / 2 - this.rowHeight / 2) || (2 * this.rowHeight);
    return Math.round((el.scrollTop + offset) / this.rowHeight);
  }

  getMonthLabel(month: string | null): string {
    if (!month || this.variant !== 'figma-purple') return month || '';
    const monthIndex = this.months.indexOf(month) - 2;
    return this.fullMonths[monthIndex] || month;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showTrigger'] && changes['showTrigger']?.currentValue === true) {
      // Only open when showTrigger becomes true
      this.open();
    }

    // If parent passed an initialDate, apply it
    if (changes['initialDate'] && changes['initialDate'].currentValue) {
      this.setSelectedDate(changes['initialDate'].currentValue);
    }
  }
}
