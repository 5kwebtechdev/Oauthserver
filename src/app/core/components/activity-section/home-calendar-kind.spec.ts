import { isHomePersonalEvent, isHomePlannerSchedule } from './home-calendar-kind';

describe('Home calendar separation', () => {
  it('keeps a timed event out of Planner even with an empty activities array', () => {
    const event = { type: 'EVENT', title: 'test event', startDate: '2026-09-23', startTime: '16:46', endTime: '16:51', activities: [] };
    expect(isHomePersonalEvent(event)).toBeTrue();
    expect(isHomePlannerSchedule(event)).toBeFalse();
  });

  it('accepts event records without optional privacy or all-day flags', () => {
    const event = { title: 'Birthday', eventDate: '2026-09-23', eventType: 'BIRTHDAY', startTime: '10:00', endTime: '11:00' };
    expect(isHomePersonalEvent(event)).toBeTrue();
    expect(isHomePlannerSchedule(event)).toBeFalse();
  });

  it('does not turn explicitly identified timetables into events', () => {
    const planner = { type: 'TIMETABLE', title: 'Gym', eventDate: '2026-09-23', eventType: 'OTHER', activities: [{ startTime: '10:00', endTime: '11:00' }] };
    expect(isHomePersonalEvent(planner)).toBeFalse();
    expect(isHomePlannerSchedule(planner)).toBeTrue();
  });

  it('keeps recurring legacy schedules in Planner without relying on record IDs or titles', () => {
    const planner = { id: 1, title: 'Birthday', recurrence: 'MONTHLY', startTime: '10:00', endTime: '11:00' };
    const event = { ...planner, eventDate: '2026-09-23', eventType: 'BIRTHDAY' };
    expect(isHomePlannerSchedule(planner)).toBeTrue();
    expect(isHomePersonalEvent(event)).toBeTrue();
    expect(isHomePlannerSchedule(event)).toBeFalse();
  });
});
