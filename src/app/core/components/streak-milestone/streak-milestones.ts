export const STREAK_MILESTONES = [
  { days: 3, coins: 25, name: 'Getting Started' },
  { days: 7, coins: 50, name: 'Week Warrior' },
  { days: 14, coins: 75, name: 'On a Roll' },
  { days: 30, coins: 100, name: 'Consistency Champ' },
  { days: 60, coins: 150, name: 'Habit Hero' },
  { days: 100, coins: 250, name: 'Century Club' },
  { days: 180, coins: 500, name: 'Unstoppable' },
  { days: 365, coins: 750, name: 'Legendary Streak' },
] as const;

export function streakMilestoneWindow(days: number) {
  const completedDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const completed = STREAK_MILESTONES.filter(item => item.days <= completedDays);
  const latest = completed[completed.length - 1] ?? null;
  const start = latest ? STREAK_MILESTONES.indexOf(latest) : 0;
  return { completedDays, latest, visible: STREAK_MILESTONES.slice(start, start + 5) };
}
