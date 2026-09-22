/** Derive time from the schedule, never from the number of timer callbacks. */
export function timerSnapshot(start: number, end: number, now: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= start) return null;
  const duration = end - start;
  const remaining = Math.max(0, Math.min(duration, end - now));
  return { remainingSeconds: Math.ceil(remaining / 1000), progress: 1 - remaining / duration, finished: now >= end };
}

/** Recurrence dates bound the series, not the duration of a single focus session. */
export function focusSchedule(activity: any, now = Date.now()): { start: number; end: number } {
  let start = Number(activity.startTimeStamp);
  let end = Number(activity.endTimeStamp);
  const recurring = activity.everyday || activity.everyWeekend || activity.everyweekend
    || activity.daysOfWeek?.length || activity.selectedDays?.length;
  // Calendar entry points already supply occurrence-specific timestamps. Keep them.
  if (timerSnapshot(start, end, now) && (!recurring || end - start <= 86400000)) return { start, end };
  if (recurring && activity.startTime && activity.endTime) {
    const occurrence = activity.completionDate ? String(activity.completionDate).split('T')[0] : '';
    const dateParts = occurrence.split('-').map(Number);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(occurrence)
      ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]) : new Date(now);
    const atTime = (value: string): number => {
      if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return NaN;
      const [h, m, s = 0] = value.split(':').map(Number);
      if (h > 23 || m > 59 || s > 59) return NaN;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, s).getTime();
    };
    start = atTime(String(activity.startTime));
    end = atTime(String(activity.endTime));
    if (end < start) {
      const nextDay = new Date(end);
      nextDay.setDate(nextDay.getDate() + 1);
      end = nextDay.getTime();
    }
  }
  return { start, end };
}
