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
export class MindfulBirthdaypickerComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('dayCol') dayCol!: ElementRef;
  @ViewChild('monthCol') monthCol!: ElementRef;
  @ViewChild('yearCol') yearCol!: ElementRef;

  @Input()
  public showTrigger: boolean = false;


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
    const offset = 2 * this.rowHeight;

    this.dayCol.nativeElement.scrollTop = (this.selectedDate.getDate() + 1) * this.rowHeight - offset;
    this.monthCol.nativeElement.scrollTop = (this.selectedDate.getMonth() + 2) * this.rowHeight - offset;
    const yearIndex = this.years.indexOf(this.selectedDate.getFullYear());
    this.yearCol.nativeElement.scrollTop = (yearIndex) * this.rowHeight - offset;
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
    if (changes['showTrigger'] && changes['showTrigger']?.previousValue != changes['showTrigger']?.currentValue) {
      // Do Something triggered by the parent button.
      this.open();
    }
  }
}
