import { of } from 'rxjs';
import { EventApi, EventPayload } from './event.api';

describe('EventApi recurrence response', () => {
  const payload: EventPayload = {
    name: 'Pay rent', isPrivate: false, highPriority: false, eventType: 'medical_test',
    allDay: true, eventStartDate: '2026-01-20', eventEndDate: '2026-03-05',
    recurrence: 'MONTHLY', reminderMinutesBefore: null, note: null
  };

  it('sends the selected date range and normalizes every created series entry', () => {
    const post = jasmine.createSpy('post').and.returnValue(of([
      { id: 1, eventStartDate: '2026-01-20', eventEndDate: '2026-01-31', seriesId: 7 },
      { id: 2, eventStartDate: '2026-02-01', eventEndDate: '2026-02-28', seriesId: 7 }
    ]));
    const api = new EventApi({ post } as any, { getToken: () => 'redacted' } as any);

    api.createEvent(payload).subscribe(events => {
      expect(events.length).toBe(2);
      expect(events.map(event => event.eventDate)).toEqual(['2026-01-20', '2026-02-01']);
      expect(events.map(event => event.eventEndDate)).toEqual(['2026-01-31', '2026-02-28']);
      expect(events.every(event => event.seriesId === 7)).toBeTrue();
    });
    expect(post.calls.mostRecent().args[1]).toEqual(payload);
    expect(post.calls.mostRecent().args[1].eventDate).toBeUndefined();
  });

  it('keeps a legacy single-event response usable', () => {
    const post = jasmine.createSpy('post').and.returnValue(of({ id: 3, eventDate: '2026-10-27' }));
    const api = new EventApi({ post } as any, { getToken: () => null } as any);
    api.createEvent({ ...payload, eventStartDate: '2026-10-27', eventEndDate: '2026-10-27', recurrence: 'ONE_TIME' })
      .subscribe(events => {
        expect(events.length).toBe(1);
        expect(events[0].eventStartDate).toBe('2026-10-27');
        expect(events[0].eventEndDate).toBe('2026-10-27');
      });
  });
});
