export const STREAK_MILESTONES = [
  { days: 3, coins: 25, name: 'Getting Started' },
  { days: 7, coins: 40, name: 'Week Warrior' },
  { days: 14, coins: 90, name: 'On a Roll' },
  { days: 30, coins: 200, name: 'Consistency Champ' },
  { days: 60, coins: 410, name: 'Habit Hero' },
  { days: 100, coins: 750, name: 'Century Club' },
  { days: 180, coins: 1200, name: 'Unstoppable' },
  { days: 365, coins: 2600, name: 'Legendary Streak' },
] as const;

export function streakMilestoneWindow(days: number) {
  const completedDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const completed = STREAK_MILESTONES.filter(item => item.days <= completedDays);
  const latest = completed[completed.length - 1] ?? null;
  const start = latest ? STREAK_MILESTONES.indexOf(latest) : 0;
  const reachedToday = STREAK_MILESTONES.find(item => item.days === completedDays) ?? null;
  return { completedDays, latest, reachedToday, visible: STREAK_MILESTONES.slice(start, start + 5) };
}
