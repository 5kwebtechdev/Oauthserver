import { EventDto, EventTypeDto } from '../../api/event.api';
import { eventCategory, eventOccurrences, upcomingOccurrencesWithinDays, upcomingWithinDays } from './personal-event-occurrences';

const event = (date: string, recurrence: EventDto['recurrence'] = 'ONE_TIME'): EventDto => ({
  id: 1, name: 'Test event', eventDate: date, recurrence, eventType: 'Birthday',
  isPrivate: false, highPriority: false, allDay: true, completed: false,
  createdAt: date, updatedAt: null
});

describe('personal event occurrences', () => {
  it('clamps a monthly 31st to every shorter month and returns twelve upcoming instances', () => {
    const dates = eventOccurrences(event('2026-10-31', 'MONTHLY'), new Date(2026, 9, 22), 'upcoming')
      .map(item => `${item.date.getFullYear()}-${item.date.getMonth() + 1}-${item.date.getDate()}`);
    expect(dates.length).toBe(12);
    expect(dates.slice(0, 5)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-1-31', '2027-2-28']);
  });

  it('handles leap February and does not show an occurrence before the saved start', () => {
    const dates = eventOccurrences(event('2027-12-31', 'MONTHLY'), new Date(2028, 0, 1), 'upcoming');
    expect(dates.map(item => item.date.getDate()).slice(0, 2)).toEqual([31, 29]);
    const beforeStart = eventOccurrences(event('2027-12-31', 'MONTHLY'), new Date(2027, 9, 1), 'upcoming');
    expect(beforeStart[0].date.getTime()).toBe(new Date(2027, 11, 31).getTime());
  });

  it('shows the next yearly instance, rolling forward after this year passes', () => {
    const birthday = event('2020-10-20', 'YEARLY');
    expect(eventOccurrences(birthday, new Date(2026, 9, 19), 'upcoming')[0].date.getFullYear()).toBe(2026);
    expect(eventOccurrences(birthday, new Date(2026, 9, 21), 'upcoming')[0].date.getFullYear()).toBe(2027);
    expect(eventOccurrences(birthday, new Date(2026, 9, 21), 'upcoming').length).toBe(1);
  });

  it('does not expand backend-materialized recurrence segments a second time', () => {
    const segment = { ...event('2026-11-01', 'YEARLY'), seriesId: 42, eventEndDate: '2026-12-31' };
    expect(eventOccurrences(segment, new Date(2026, 9, 27), 'upcoming')
      .map(item => item.date.getTime())).toEqual([new Date(2026, 10, 1).getTime()]);
    expect(eventOccurrences(segment, new Date(2027, 0, 1), 'upcoming')).toEqual([]);
    expect(eventOccurrences(segment, new Date(2026, 10, 15), 'upcoming')[0].date.getTime())
      .toBe(new Date(2026, 10, 15).getTime());
    expect(eventOccurrences(segment, new Date(2026, 10, 15), 'past')).toEqual([]);
  });

  it('keeps distant one-time events but excludes past events older than a year', () => {
    expect(eventOccurrences(event('2030-01-01'), new Date(2026, 9, 22), 'upcoming').length).toBe(1);
    expect(eventOccurrences(event('2025-10-21'), new Date(2026, 9, 22), 'past').length).toBe(0);
    expect(eventOccurrences(event('2025-10-22'), new Date(2026, 9, 22), 'past').length).toBe(1);
  });

  it('uses the selected date for the thirty-day window', () => {
    const future = event('2027-01-12');
    expect(upcomingWithinDays(future, new Date(2026, 9, 22), 30)).toBeNull();
    expect(upcomingWithinDays(future, new Date(2027, 0, 1), 30)?.date.getDate()).toBe(12);
    expect(upcomingOccurrencesWithinDays(event('2026-12-31', 'MONTHLY'), new Date(2027, 0, 30), 30)
      .map(item => item.date.getDate())).toEqual([31, 28]);
  });

  it('treats custom tags as Others, even if their name looks predefined', () => {
    const system: EventTypeDto[] = [{ id: 1, name: 'Birthday', system: true, userId: null }];
    const custom: EventTypeDto[] = [{ id: 2, name: 'Birthday', system: false, userId: 123 }];
    expect(eventCategory(event('2026-10-22'), system)).toBe('birthday');
    expect(eventCategory(event('2026-10-22'), custom)).toBe('other');
  });
});
