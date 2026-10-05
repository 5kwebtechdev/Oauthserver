import { isCalendarMirrorOfPersonalEvent, isHomePersonalEvent, isHomePlannerSchedule, plannerEditTab } from './home-calendar-kind';

describe('Home calendar separation', () => {
  it('uses plannerType EVENT even when the calendar projection looks like a timetable', () => {
    const item = { plannerType: 'EVENT', type: 'TIMETABLE', timetableId: 42, activities: [{}] };
    expect(plannerEditTab(item)).toBe('events');
    expect(isHomePersonalEvent(item)).toBeTrue();
    expect(isHomePlannerSchedule(item)).toBeFalse();
  });

  it('uses plannerType TIMETABLE even with personal event metadata', () => {
    const item = { plannerType: 'TIMETABLE', type: 'EVENT', name: 'Exam', eventType: 'EXAM' };
    expect(plannerEditTab(item)).toBe('timetable');
    expect(isHomePersonalEvent(item)).toBeFalse();
    expect(isHomePlannerSchedule(item)).toBeTrue();
  });

  it('normalizes planner types and leaves missing or unknown values to legacy handling', () => {
    expect(plannerEditTab({ plannerType: ' event ' })).toBe('events');
    expect(plannerEditTab({ plannerType: 'TIME_TABLE' })).toBe('timetable');
    expect(plannerEditTab({})).toBeUndefined();
    expect(plannerEditTab({ plannerType: 'UNKNOWN' })).toBeUndefined();
  });
  it('keeps a timed personal Event API record out of Planner', () => {
    const event = { name: 'test event', eventDate: '2026-09-23', eventType: 'OTHER', isPrivate: false, allDay: false, startTime: '16:46', endTime: '16:51' };
    expect(isHomePersonalEvent(event)).toBeTrue();
    expect(isHomePlannerSchedule(event)).toBeFalse();
  });

  it('accepts event records without optional privacy or all-day flags', () => {
    const event = { name: 'Birthday', eventDate: '2026-09-23', eventType: 'BIRTHDAY', startTime: '10:00', endTime: '11:00' };
    expect(isHomePersonalEvent(event)).toBeTrue();
    expect(isHomePlannerSchedule(event)).toBeFalse();
  });

  it('keeps a title-only birthday calendar row in Events, not Planner', () => {
    const birthday = {
      type: 'EVENT', title: 'Birthday', eventType: 'BIRTHDAY',
      startDate: '2026-09-30', endDate: '2026-09-30',
      startTime: '00:00', endTime: '23:59', colorCode: '#538083', activities: []
    };
    expect(isHomePersonalEvent(birthday)).toBeTrue();
    expect(isHomePlannerSchedule(birthday)).toBeFalse();
  });

  it('does not turn explicitly identified timetables into events', () => {
    const planner = { type: 'TIMETABLE', title: 'Gym', eventDate: '2026-09-23', eventType: 'OTHER', activities: [{ startTime: '10:00', endTime: '11:00' }] };
    expect(isHomePersonalEvent(planner)).toBeFalse();
    expect(isHomePlannerSchedule(planner)).toBeTrue();
  });

  it('keeps a calendar timetable in Planner even when its generic type is EVENT', () => {
    const viva = {
      id: 42, type: 'EVENT', title: 'Viva', startDate: '2026-09-30', endDate: '2026-09-30',
      activities: [{ name: 'Viva', startTime: '08:00', endTime: '09:00' }]
    };
    expect(isHomePersonalEvent(viva)).toBeFalse();
    expect(isHomePlannerSchedule(viva)).toBeTrue();
  });

  it('keeps a timetable with a planner ID out of Upcoming Events', () => {
    const viva = { type: 'EVENT', timetableId: 42, title: 'Viva', eventDate: '2026-09-30' };
    expect(isHomePersonalEvent(viva)).toBeFalse();
    expect(isHomePlannerSchedule(viva)).toBeTrue();
  });

  it('treats a title-only calendar timetable as a timetable when it has no activity rows', () => {
    const viva = { type: 'EVENT', title: 'Viva', startDate: '2026-09-30', endDate: '2026-09-30', startTime: '08:00', endTime: '09:00', eventDate: '2026-09-30', eventType: 'OTHER', activities: [] };
    expect(isHomePersonalEvent(viva)).toBeFalse();
    expect(isHomePlannerSchedule(viva)).toBeTrue();
  });

  it('does not turn a flat timetable with event-like metadata into an Upcoming Event', () => {
    const viva = { type: 'EVENT', title: 'Viva', startDate: '2026-09-30', endDate: '2026-09-30', startTime: '08:00', endTime: '09:00', eventDate: '2026-09-30', eventType: 'OTHER' };
    expect(isHomePersonalEvent(viva)).toBeFalse();
    expect(isHomePlannerSchedule(viva)).toBeTrue();
  });

  it('keeps recurring legacy schedules in Planner without relying on record IDs or titles', () => {
    const planner = { id: 1, title: 'Birthday', recurrence: 'MONTHLY', startTime: '10:00', endTime: '11:00' };
    const event = { id: 1, name: 'Birthday', recurrence: 'MONTHLY', startTime: '10:00', endTime: '11:00', eventDate: '2026-09-23', eventType: 'BIRTHDAY' };
    expect(isHomePlannerSchedule(planner)).toBeTrue();
    expect(isHomePersonalEvent(event)).toBeTrue();
    expect(isHomePlannerSchedule(event)).toBeFalse();
  });

  it('removes only calendar projections confirmed by the personal Events API', () => {
    const birthday = { name: 'Birthday', eventDate: '2026-09-30', eventType: 'BIRTHDAY', allDay: true };
    const birthdayRow = { type: 'EVENT', title: 'Birthday', startDate: '2026-09-30', startTime: '00:00:00', endTime: '23:59:59' };
    expect(isCalendarMirrorOfPersonalEvent(birthdayRow, birthday)).toBeTrue();

    const timedEvent = { name: 'sasa', eventDate: '2026-09-30', eventType: 'OTHER', allDay: false,
      startTime: '18:30:00', endTime: '18:32:00' };
    const timedRow = { type: 'EVENT', title: 'sasa', startDate: '2026-09-30', startTime: '18:30:00', endTime: '18:32:00' };
    expect(isCalendarMirrorOfPersonalEvent(timedRow, timedEvent)).toBeTrue();
    expect(isCalendarMirrorOfPersonalEvent({ ...timedRow, startDate: new Date(2026, 8, 30) }, timedEvent)).toBeTrue();
    expect(isCalendarMirrorOfPersonalEvent({ ...timedRow, startTime: '19:30:00' }, timedEvent)).toBeFalse();
    expect(isCalendarMirrorOfPersonalEvent({ ...timedRow, timetableId: 42 }, timedEvent)).toBeFalse();
  });
});
