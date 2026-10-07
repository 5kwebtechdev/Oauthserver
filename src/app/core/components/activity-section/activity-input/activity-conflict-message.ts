/** Rephrase the API's conflict details without guessing missing activity data. */
export function activityConflictMessage(message: string): string {
  const introduction = 'Choose a different time or date for this activity.';
  // API format: This time overlaps with habit 'Run' (09:15 - 09:30).
  // Pick a different slot. [September 28, 2026 - October 13, 2026]
  const conflict = message.match(/overlaps? with\s+(?:the\s+)?(habit|task|planner|timetable|event)\s+['"](.+?)['"]\s*\(([^)]+)\)/i);
  const dates = message.match(/\[([^\]]+?)\s+-\s+([^\]]+)\]/);
  if (!conflict) return `${introduction}\n${message}`;
  const [, type, name, time] = conflict;
  const range = dates ? ` from ${dates[1].trim()} to ${dates[2].trim()}` : '';
  return `${introduction}\nIt overlaps with the ${type.toLowerCase()} "${name}", scheduled for (${time.trim()})${range}.`;
}
