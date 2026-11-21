/**
 * Date helpers for the Date filter. Dates are local 'YYYY-MM-DD' strings, which compare correctly as
 * plain text and don't shift between time zones.
 */

export interface DateRange {
  from: string;
  to: string;
}

export type DatePreset = 'today' | 'tomorrow' | 'weekend';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SATURDAY = 6;
const SUNDAY = 0;

/** How far ahead the calendar reaches. */
export const CALENDAR_MONTHS_AHEAD = 2;

const pad = (value: number) => String(value).padStart(2, '0');

export function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The same day two months on, or the month's last day if it has no such day (31 Dec -> 28 Feb). */
export function calendarEnd(today: Date): Date {
  const end = new Date(today.getFullYear(), today.getMonth() + CALENDAR_MONTHS_AHEAD, today.getDate());
  return end.getDate() === today.getDate() ? end : new Date(end.getFullYear(), end.getMonth(), 0);
}

/** "This weekend" is the coming Saturday and Sunday. On a Sunday, only what is left of it: today. */
export function presetRange(preset: DatePreset, today: Date): DateRange {
  if (preset === 'today') {
    return { from: toIso(today), to: toIso(today) };
  }
  if (preset === 'tomorrow') {
    const tomorrow = toIso(addDays(today, 1));
    return { from: tomorrow, to: tomorrow };
  }
  if (today.getDay() === SUNDAY) {
    return { from: toIso(today), to: toIso(today) };
  }
  const saturday = addDays(today, SATURDAY - today.getDay());
  return { from: toIso(saturday), to: toIso(addDays(saturday, 1)) };
}

export function sameRange(a: DateRange | null, b: DateRange | null): boolean {
  return a?.from === b?.from && a?.to === b?.to;
}

/** "05 Nov" */
export function dayLabel(iso: string): string {
  const date = fromIso(iso);
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

/** "05 Nov – 12 Nov", or "05 Nov" for a single day. */
export function rangeLabel(range: DateRange): string {
  return range.from === range.to ? dayLabel(range.from) : `${dayLabel(range.from)} – ${dayLabel(range.to)}`;
}

/** "Sat,05 Aug, 7:00PM", from a date and a 24-hour 'HH:mm' time. */
export function dateTimeLabel(iso: string, time: string): string {
  const date = fromIso(iso);
  const [hour, minute] = time.split(':').map(Number);
  const period = hour < 12 ? 'AM' : 'PM';
  return `${WEEKDAYS[date.getDay()]},${dayLabel(iso)}, ${hour % 12 || 12}:${pad(minute)}${period}`;
}
