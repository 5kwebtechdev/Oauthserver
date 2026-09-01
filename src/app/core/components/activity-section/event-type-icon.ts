export const EVENT_TYPE_ICONS = {
  birthday: 'assets/figma/activity-event/birthday.svg',
  anniversary: 'assets/figma/activity-event/anniversary.svg',
  exam: 'assets/figma/activity-event/personal.svg',
  holiday: 'assets/figma/activity-event/holiday.svg',
  default: 'assets/figma/activity-event/personal.svg'
} as const;

/** Use the saved Event Type first; title/name is only for legacy events. */
export function getEventTypeIcon(eventType?: unknown, fallbackText?: unknown): string {
  const type = String(eventType || '').trim().toLowerCase();
  const description = String(fallbackText || '').trim().toLowerCase();

  if (type.includes('birthday') || (!type && description.includes('birthday'))) return EVENT_TYPE_ICONS.birthday;
  if (type.includes('anniversary') || (!type && description.includes('anniversary'))) return EVENT_TYPE_ICONS.anniversary;
  if (type.includes('exam') || type.includes('test') || (!type && /\b(exam|test)\b/.test(description))) return EVENT_TYPE_ICONS.exam;
  if (type.includes('holiday') || (!type && description.includes('holiday'))) return EVENT_TYPE_ICONS.holiday;

  return EVENT_TYPE_ICONS.default;
}
