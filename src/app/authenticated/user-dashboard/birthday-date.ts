/** Compare the calendar month/day from a profile DOB without shifting ISO dates across time zones. */
export function isBirthdayToday(dob: unknown, today = new Date()): boolean {
  if (dob == null || dob === '') return false;
  let month: number;
  let day: number;
  if (typeof dob === 'string') {
    const iso = dob.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
    if (iso) {
      month = Number(iso[2]);
      day = Number(iso[3]);
    } else {
      const parsed = new Date(dob);
      if (Number.isNaN(parsed.getTime())) return false;
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  } else if (typeof dob === 'number' || dob instanceof Date) {
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return false;
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  } else {
    return false;
  }
  return month === today.getMonth() + 1 && day === today.getDate();
}
