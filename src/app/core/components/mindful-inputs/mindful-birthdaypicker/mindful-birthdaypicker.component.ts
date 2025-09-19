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
  selector: 'mindful-birthdaypicker',
  templateUrl: './mindful-birthdaypicker.component.html',
  styleUrls: ['./mindful-birthdaypicker.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MindfulBirthdaypickerComponent),
    multi: true
  }],
  standalone: false
})
export class MindfulBirthdaypickerComponent implements ControlValueAccessor, AfterViewInit, OnChanges {
  @ViewChild('dayCol') dayCol!: ElementRef;
  @ViewChild('monthCol') monthCol!: ElementRef;
  @ViewChild('yearCol') yearCol!: ElementRef;

  @Input()
  public showTrigger: boolean = false;

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

  show = false;
  selectedDate: Date = new Date();

  days = [null, null, ...Array.from({ length: 31 }, (_, i) => i + 1), null, null];
  months = [null, null, ...[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], null, null];
  years = [null, null, ...Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i), null, null];

  rowHeight = 40;

  private onChange = (value: any) => {};
  private onTouched = () => {};

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
    this.show = true;
    setTimeout(() => this.scrollToSelected(), 100);
  }

  close() {
    this.show = false;
  }

  done() {
    this.onChange(this.selectedDate.toISOString());
    this.dateSelected.emit(this.selectedDate.toISOString());
    this.close();
  }

  scrollToSelected() {
    // Guard against ViewChild not being ready
    if (!this.dayCol || !this.monthCol || !this.yearCol) return;

    const offset = 2 * this.rowHeight;

    // day() returns 1-31
    const day = this.selectedDate.getDate();
    this.dayCol.nativeElement.scrollTop = (day + 1) * this.rowHeight - offset;

    const month = this.selectedDate.getMonth();
    this.monthCol.nativeElement.scrollTop = (month + 2) * this.rowHeight - offset;

    const yearIndex = this.years.indexOf(this.selectedDate.getFullYear());
    if (yearIndex >= 0) {
      this.yearCol.nativeElement.scrollTop = (yearIndex) * this.rowHeight - offset;
    }
  }

  onScroll(type: 'day' | 'month' | 'year') {
    const offset = 2 * this.rowHeight;
    const scrollEl = {
      day: this.dayCol.nativeElement,
      month: this.monthCol.nativeElement,
      year: this.yearCol.nativeElement
    }[type];

    const index = Math.round((scrollEl.scrollTop + offset) / this.rowHeight);

    if (type === 'day') {
      const val = this.days[index];
      if (val) this.selectedDate.setDate(val);
    }

    if (type === 'month') {
      const val = index - 2;
      if (val >= 0 && val < 12) this.selectedDate.setMonth(val);
    }

    if (type === 'year') {
      const val = this.years[index];
      if (val) this.selectedDate.setFullYear(val);
    }
  }

  getCurrentDayIndex() {
    return Math.round((this.dayCol?.nativeElement?.scrollTop + 80) / this.rowHeight);
  }
  getCurrentMonthIndex() {
    return Math.round((this.monthCol?.nativeElement?.scrollTop + 80) / this.rowHeight);
  }
  getCurrentYearIndex() {
    return Math.round((this.yearCol?.nativeElement?.scrollTop + 80) / this.rowHeight);
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
