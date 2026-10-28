import { EventDto, EventTypeDto } from '../../api/event.api';

export type EventListMode = 'upcoming' | 'past';
export type EventCategory = 'birthday' | 'anniversary' | 'exam' | 'holiday' | 'other';

export interface PersonalEventOccurrence {
  event: EventDto;
  date: Date;
  key: string;
}

export const EVENT_CATEGORIES: ReadonlyArray<{ key: EventCategory; label: string; icon: string | null }> = [
  { key: 'birthday', label: 'Birthday', icon: 'assets/figma/activity-event/birthday.svg' },
  { key: 'anniversary', label: 'Anniversary', icon: 'assets/figma/activity-event/anniversary.svg' },
  { key: 'exam', label: 'Exam', icon: 'assets/figma/activity-event/personal.svg' },
  { key: 'holiday', label: 'Holiday', icon: 'assets/figma/activity-event/holiday.svg' },
  { key: 'other', label: 'Others', icon: null }
];

/** Only backend-confirmed system types receive a predefined category/icon. */
export function eventCategory(event: EventDto, types: EventTypeDto[]): EventCategory {
  const name = String(event.eventType ?? '').trim().toLowerCase();
  const type = types.find(item => item.name.trim().toLowerCase() === name);
  if (!type?.system) return 'other';
  return EVENT_CATEGORIES.some(category => category.key === name && name !== 'other')
    ? name as EventCategory : 'other';
}

export function localDay(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const match = String(value ?? '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

export function clampedMonthDay(year: number, month: number, day: number): Date {
  const first = new Date(year, month, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, last));
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Resolve a saved event into visible calendar instances; never alter its original date. */
export function eventOccurrences(event: EventDto, reference: Date, mode: EventListMode): PersonalEventOccurrence[] {
  const start = localDay(event.eventDate);
  if (!start) return [];
  const today = localDay(reference)!;
  const oldest = clampedMonthDay(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const recurrence = String(event.recurrence ?? 'ONE_TIME').toUpperCase();
  const candidates: Date[] = [];

  if (event.seriesId != null) {
    // The current Events API materializes each recurrence segment as its own
    // record. Expanding one again would create duplicate future events.
    const end = localDay(event.eventEndDate) || start;
    const inMode = mode === 'upcoming' ? end >= today : end < today && end >= oldest;
    if (!inMode) return [];
    const visibleDate = mode === 'upcoming' && start < today ? today : start;
    return [{ event, date: visibleDate, key: `${event.id}-${dateKey(start)}` }];
  }

  if (recurrence === 'MONTHLY') {
    // Include enough months on either side of today to keep twelve future
    // occurrences and the full one-year past window, including short months.
    for (let offset = -12; offset <= 12; offset++) {
      candidates.push(clampedMonthDay(today.getFullYear(), today.getMonth() + offset, start.getDate()));
    }
  } else if (recurrence === 'YEARLY') {
    for (let year = today.getFullYear() - 1; year <= Math.max(today.getFullYear() + 1, start.getFullYear()); year++) {
      candidates.push(clampedMonthDay(year, start.getMonth(), start.getDate()));
    }
  } else {
    candidates.push(start);
  }

  const visible = candidates.filter(date => date >= start && (mode === 'upcoming'
    ? date >= today
    : date >= oldest && date < today));
  visible.sort((left, right) => mode === 'upcoming'
    ? left.getTime() - right.getTime()
    : right.getTime() - left.getTime());
  const limited = mode === 'upcoming' && recurrence === 'YEARLY' ? visible.slice(0, 1)
    : mode === 'upcoming' && recurrence === 'MONTHLY' ? visible.slice(0, 12)
      : visible;
  return limited.map(date => ({ event, date, key: `${event.id}-${dateKey(date)}` }));
}

/** Home uses today; Planner passes the selected date. Both include day 30. */
export function upcomingWithinDays(event: EventDto, reference: Date, days: number): PersonalEventOccurrence | null {
  return upcomingOccurrencesWithinDays(event, reference, days)[0] ?? null;
}

export function upcomingOccurrencesWithinDays(event: EventDto, reference: Date, days: number): PersonalEventOccurrence[] {
  const from = localDay(reference);
  if (!from) return [];
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return eventOccurrences(event, from, 'upcoming').filter(item => item.date <= end);
}
