import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DateRange, addDays, calendarEnd, dayLabel, fromIso, toIso } from './event-dates';

interface CalendarMonth {
  label: string;
  /** Empty cells before the 1st, so each day falls under its weekday. */
  blanks: number[];
  days: string[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Date picker for the Date filter: from today to the same day two months on (1 Nov to 1 Jan).
 *
 * The first tap picks one day and the second tap makes it a range, in either order. Tapping the same
 * day again clears it, and a tap after a finished range starts a new one.
 */
@Component({
  standalone: true,
  selector: 'app-event-date-calendar',
  templateUrl: './event-date-calendar.component.html',
  styleUrl: './event-date-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDateCalendarComponent {
  readonly range = input<DateRange | null>(null);
  readonly rangeChange = output<DateRange | null>();

  protected readonly weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  protected readonly today = toIso(new Date());
  protected readonly last = toIso(calendarEnd(new Date()));

  protected readonly months: CalendarMonth[] = this.buildMonths();

  protected readonly hint = computed(() => {
    const range = this.range();
    if (!range) {
      return 'Select a start date';
    }
    return range.from === range.to ? 'Select an end date, or apply for this day' : 'Apply to see these dates';
  });

  protected isDisabled(day: string): boolean {
    return day < this.today || day > this.last;
  }

  protected isEnd(day: string): boolean {
    const range = this.range();
    return day === range?.from || day === range?.to;
  }

  protected isBetween(day: string): boolean {
    const range = this.range();
    return !!range && day > range.from && day < range.to;
  }

  protected isRangeStart(day: string): boolean {
    const range = this.range();
    return !!range && range.from !== range.to && day === range.from;
  }

  protected isRangeEnd(day: string): boolean {
    const range = this.range();
    return !!range && range.from !== range.to && day === range.to;
  }

  protected dayOfMonth(day: string): number {
    return fromIso(day).getDate();
  }

  protected ariaLabel(day: string): string {
    return `${dayLabel(day)} ${fromIso(day).getFullYear()}`;
  }

  protected pick(day: string): void {
    const range = this.range();
    if (!range || range.from !== range.to) {
      this.rangeChange.emit({ from: day, to: day });
    } else if (day === range.from) {
      this.rangeChange.emit(null);
    } else {
      this.rangeChange.emit(day < range.from ? { from: day, to: range.from } : { from: range.from, to: day });
    }
  }

  private buildMonths(): CalendarMonth[] {
    const months: CalendarMonth[] = [];
    const start = fromIso(this.today);
    const end = fromIso(this.last);
    for (
      let first = new Date(start.getFullYear(), start.getMonth(), 1);
      first <= end;
      first = new Date(first.getFullYear(), first.getMonth() + 1, 1)
    ) {
      const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      months.push({
        label: `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`,
        blanks: Array.from({ length: first.getDay() }, (_, index) => index),
        days: Array.from({ length }, (_, index) => toIso(addDays(first, index))),
      });
    }
    return months;
  }
}
