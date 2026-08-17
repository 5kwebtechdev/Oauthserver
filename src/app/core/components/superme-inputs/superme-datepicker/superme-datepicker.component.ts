import {
  Component, forwardRef, Input, ElementRef, HostListener
} from '@angular/core';
import {
  ControlValueAccessor, NG_VALUE_ACCESSOR
} from '@angular/forms';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-datepicker',
  templateUrl: './superme-datepicker.component.html',
  styleUrls: ['./superme-datepicker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SupermeDatepickerComponent),
      multi: true
    }
  ],
  standalone: false
})
export class SupermeDatepickerComponent implements ControlValueAccessor {
  @Input() type: 'date' | 'range' = 'date';
  @Input() placeholder: string = '';
  @Input() minDate: Date | null = null;
  // Optional external range endpoints to allow highlighting when this is used as a single-date picker
  @Input() rangeStart: Date | null = null;
  @Input() rangeEnd: Date | null = null;
  // Label shown in the popup title as "Set {label}" (e.g. "Start Date").
  @Input() label: string = 'Date';
  // Base date the quick-range pills add to (e.g. seed End Date from Start Date). Falls back to
  // this picker's own current value, then minDate, then today.
  @Input() seedDate: Date | null = null;
  // Optional quick-pick ranges shown as pills below the calendar — each jumps
  // straight to seedDate + amount. Omitted (null) hides the row entirely.
  @Input() quickRanges: Array<{ label: string; unit: 'day' | 'month'; amount: number }> | null = null;

  isOpen = false;
  currentMonth = new Date();
  selectingStart = true;
  startDate: Date | null = null;
  endDate: Date | null = null;
  selectedRangeLabel: string | null = null;

  private onChange = (_: any) => { };
  private onTouched = () => { };

  constructor(private eRef: ElementRef) { }

  toggleCalendar() {
    const wasOpen = this.isOpen;
    this.isOpen = !this.isOpen;

    if (!wasOpen && this.isOpen) {
      // When opening, set currentMonth to show the appropriate month.
      // Prefer the currently set date, otherwise prefer minDate (useful for end-date picker),
      // otherwise fall back to today. Do NOT pre-select a date here — the user must
      // explicitly pick a date to change the model.
      if (this.startDate) {
        this.currentMonth = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
      } else if (this.minDate) {
        this.currentMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
      } else {
        this.currentMonth = new Date();
      }

      // If the current value happens to equal one of the quick-range
      // shortcuts (measured from seedDate), pre-highlight that pill.
      this.selectedRangeLabel = this.quickRanges?.find(r => {
        const target = this.computeRangeDate(r);
        return this.startDate && this.isSameDay(this.startDate, target);
      })?.label ?? null;
    }
  }

  /**
   * A datepicker is often rendered inside a clickable picker card.  Let the
   * input own its click so the card does not immediately toggle the calendar
   * closed again through event bubbling.
   */
  openCalendar(event: MouseEvent): void {
    event.stopPropagation();
    this.onTouched();
    if (!this.isOpen) this.toggleCalendar();
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
    // A manual day tap overrides whatever quick-range pill was selected.
    this.selectedRangeLabel = null;

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

  confirmSelection(event?: Event) {
    // The picker can live inside a clickable date card. Stop this tap before
    // removing the overlay, otherwise the same mobile click reaches that card
    // and immediately opens the calendar again.
    event?.stopPropagation();
    this.isOpen = false;
    if (this.type === 'date') {
      // Only emit when a date is actually selected (prevents accidental defaulting
      // when the picker was opened but the user didn't choose a date).
      if (this.startDate) this.onChange(this.startDate);
    } else {
      this.onChange({ start: this.startDate, end: this.endDate });
    }
    this.onTouched();
  }

  private computeRangeDate(range: { unit: 'day' | 'month'; amount: number }): Date {
    const base = this.seedDate || this.startDate || this.minDate || new Date();
    const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    if (range.unit === 'month') {
      return new Date(b.getFullYear(), b.getMonth() + range.amount, b.getDate());
    }
    b.setDate(b.getDate() + range.amount);
    return b;
  }

  /** Jumps straight to seedDate + range — a genuine user pick, so it commits immediately. */
  selectQuickRange(range: { label: string; unit: 'day' | 'month'; amount: number }) {
    let target = this.computeRangeDate(range);
    if (this.minDate) {
      const min = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), this.minDate.getDate());
      if (target < min) target = min;
    }
    this.startDate = target;
    this.currentMonth = new Date(target.getFullYear(), target.getMonth(), 1);
    this.selectedRangeLabel = range.label;
    this.onChange(this.startDate);
  }

  cancelSelection(event?: Event) {
    event?.stopPropagation();
    this.isOpen = false;
    this.onTouched();
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

  /** Display a selected date without a weekday prefix (for example, Aug 17, 2026). */
  formatDisplayDate(date: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  /**
   * Return the month days but omit the final week if it contains NO dates
   * from the current month (prevents showing an unnecessary faded week).
   */
  getVisibleMonthDays(): Date[] {
    const days = this.getMonthDays();
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    while (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1];
      const anyInCurrent = lastWeek.some(d => this.isDateinCurrentMonth(d));
      if (anyInCurrent) break;
      weeks.pop();
    }

    // Flatten back to a single array
    return weeks.reduce((acc: Date[], wk: Date[]) => acc.concat(wk), [] as Date[]);
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

  /**
   * Check if the provided date is today
   */
  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }
}
