/** The backend discriminator takes precedence over legacy calendar labels. */
export function plannerEditTab(item: any): 'events' | 'timetable' | undefined {
  const kind = String(item?.plannerType ?? '').trim().toUpperCase().replace(/[ _-]/g, '');
  if (kind === 'EVENT' || kind === 'EVENTS') return 'events';
  if (kind === 'TIMETABLE') return 'timetable';
  return undefined;
}

/** Classify records before Home converts them into display cards. */
export function isHomePersonalEvent(item: any): boolean {
  const plannerTab = plannerEditTab(item);
  if (plannerTab) return plannerTab === 'events';
  const type = String(item?.originalCalendarType || item?.type || '').trim().toUpperCase();
  // Calendar timetable rows can also be labelled EVENT by the calendar API.
  // Their schedule fields are more specific than that generic type label.
  if (/TIMETABLE|PLANNER|SCHEDULE/.test(type)) return false;
  if (item?.timetableId != null || item?.timetable_id != null
    || item?.plannerId != null || item?.planner_id != null
    || item?.scheduleId != null || item?.schedule_id != null) return false;
  if (Array.isArray(item?.activities) && item.activities.length > 0) return false;
  // The calendar API can flatten a personal event into a title-only timed row
  // with an empty activities array. Its saved Event Type still identifies it.
  const eventType = String(item?.eventType || item?.event_type || '').trim().toUpperCase();
  if ((type === 'EVENT' || type === 'EVENTS')
    && /^(BIRTHDAY|ANNIVERSARY|EXAM|HOLIDAY)$/.test(eventType)) return true;
  if (Array.isArray(item?.activities)
    || item?.colorCode || item?.color_code) return false;
  // Personal Event API records are named events; calendar timetables have a
  // title and may also carry eventDate/eventType in some backend responses.
  const hasEventFields = item?.eventDate || item?.event_date
    || item?.eventType || item?.event_type || item?.allDay != null || item?.all_day != null;
  return Boolean((hasEventFields && item?.name)
    || (hasEventFields && (item?.isPrivate != null || item?.is_private != null))
    || ((type === 'EVENT' || type === 'EVENTS') && item?.name && !item?.title));
}

export function isHomePlannerSchedule(item: any): boolean {
  const plannerTab = plannerEditTab(item);
  if (plannerTab) return plannerTab === 'timetable';
  if (isHomePersonalEvent(item)) return false;
  const type = String(item?.originalCalendarType || item?.type || '').toUpperCase();
  return /TIMETABLE|PLANNER|SCHEDULE/.test(type)
    || Array.isArray(item?.activities)
    || item?.timetableId != null || item?.timetable_id != null
    || item?.plannerId != null || item?.planner_id != null
    || item?.scheduleId != null || item?.schedule_id != null
    || Boolean(item?.colorCode || item?.color_code || (item?.startTime && item?.endTime));
}

/** Match a calendar projection to its personal Event API record, not to a similarly named timetable. */
export function isCalendarMirrorOfPersonalEvent(calendar: any, event: any): boolean {
  if (plannerEditTab(calendar) === 'timetable') return false;
  // Explicit schedule IDs beat generic calendar type labels, which can be
  // TIMETABLE even for a projected personal Event.
  if (calendar?.timetableId != null || calendar?.timetable_id != null
    || calendar?.plannerId != null || calendar?.planner_id != null
    || calendar?.scheduleId != null || calendar?.schedule_id != null) return false;

  const name = (value: any) => String(value || '').trim().toLowerCase();
  if (!name(event?.name) || name(calendar?.title || calendar?.name) !== name(event?.name)) return false;

  const day = (value: any) => value && typeof value.getFullYear === 'function'
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value || '').slice(0, 10);
  const calendarDay = day(calendar?.startDate || calendar?.start_date || calendar?.eventDate);
  const eventDay = day(event?.eventDate || event?.event_date);
  if (!calendarDay || !eventDay) return false;
  const eventEndDay = day(event?.eventEndDate || eventDay);
  const recurrence = String(event?.recurrence || '').toUpperCase();
  if (event?.seriesId != null ? calendarDay < eventDay || calendarDay > eventEndDay
    : recurrence === 'YEARLY' ? calendarDay.slice(5) !== eventDay.slice(5)
    : recurrence === 'MONTHLY' ? calendarDay.slice(8) !== eventDay.slice(8)
      : calendarDay !== eventDay) return false;

  const rows = Array.isArray(calendar?.activities) && calendar.activities.length
    ? calendar.activities : [calendar];
  if (rows.length !== 1) return false;
  const time = (value: any) => String(value || '').slice(0, 5);
  const start = time(rows[0]?.startTime || rows[0]?.start_time);
  const end = time(rows[0]?.endTime || rows[0]?.end_time);
  if (event?.allDay === true || event?.all_day === true) {
    return calendar?.allDay === true || (start === '00:00' && end === '23:59');
  }
  return !!start && !!end
    && start === time(event?.startTime || event?.start_time)
    && end === time(event?.endTime || event?.end_time);
}
