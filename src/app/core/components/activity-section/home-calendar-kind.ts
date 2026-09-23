/** Classify records before Home converts them into display cards. */
export function isHomePersonalEvent(item: any): boolean {
  const type = String(item?.originalCalendarType || item?.type || '').trim().toUpperCase();
  if (type === 'EVENT' || type === 'EVENTS') return true;
  if (/TIMETABLE|PLANNER|SCHEDULE/.test(type)) return false;
  if (item?.timetableId != null || item?.timetable_id != null
    || item?.plannerId != null || item?.planner_id != null
    || item?.scheduleId != null || item?.schedule_id != null) return false;
  return Boolean(item?.eventDate || item?.event_date
    || item?.eventType || item?.event_type || item?.allDay === true || item?.all_day === true);
}

export function isHomePlannerSchedule(item: any): boolean {
  if (isHomePersonalEvent(item)) return false;
  const type = String(item?.originalCalendarType || item?.type || '').toUpperCase();
  return /TIMETABLE|PLANNER|SCHEDULE/.test(type)
    || (Array.isArray(item?.activities) && item.activities.length > 0)
    || item?.timetableId != null || item?.timetable_id != null
    || item?.plannerId != null || item?.planner_id != null
    || item?.scheduleId != null || item?.schedule_id != null
    || Boolean(item?.colorCode || item?.color_code || (item?.startTime && item?.endTime));
}
