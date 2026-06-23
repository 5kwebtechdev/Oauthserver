/**
 * Typed interface for child/family member profile data.
 * Single source of truth for child selection across the app.
 */
export interface ChildInfo {
  id: string | number | null;
  name: string;
  avatarUrl: string;
  relationship?: string;
  mood?: string;
  // Stats
  coins?: number;
  streak?: number;
  trophies?: number;
  badges?: number;
  completionRate?: number;
  consistencyRate?: number;
  improvementRate?: number;
  appScore?: number;
  // Progress
  totalHabits?: number;
  completedHabits?: number;
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  // Vibe fields
  vibeTitle?: string;
  vibeDescription?: string;
  emptyStateDescription?: string;
  completedStateDescription?: string;
}

/**
 * Maps API VibesDisplayResponse to ChildInfo
 */
export function mapVibeToChildInfo(d: any, avatarUrl: string): ChildInfo {
  // Extract id from common fields returned by API. Preserve string ids like 'child000'
  const rawId = d?.userId ?? d?.id ?? d?.assignedTo ?? d?.memberId ?? null;
  let id: string | number | null = null;
  if (rawId !== undefined && rawId !== null) {
    // Normalize numeric-like strings to their string form but avoid 'NaN'
    const str = String(rawId).trim();
    if (str !== '' && str.toLowerCase() !== 'nan') {
      // keep numeric-looking strings as-is (string) to preserve original id format
      id = str;
    } else {
      id = null;
    }
  } else {
    id = null;
  }
  return {
    id,
    name: d.userName || 'Child',
    avatarUrl: avatarUrl || 'assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png',
    relationship: d.relationship || 'Child',
    mood: d.mood || null,
    coins: d.coins ?? 0,
    streak: d.streak ?? 0,
    trophies: d.trophies ?? 0,
    badges: d.badges ?? 0,
    completionRate: Math.round(d.completionRate ?? 0),
    consistencyRate: Math.round(d.consistencyRate ?? 0),
    improvementRate: Math.round(d.improvementRate ?? 0),
    appScore: Math.round(d.appScore ?? 0),
    totalHabits: d.totalHabits ?? 0,
    completedHabits: d.completedHabits ?? 0,
    totalTasks: d.totalTasks ?? 0,
    completedTasks: d.completedTasks ?? 0,
    progressPercentage: d.progressPercentage ?? 0,
    vibeTitle: d.title || '',
    vibeDescription: d.description || '',
    emptyStateDescription: d.emptyStateDescription || '',
    completedStateDescription: d.completedStateDescription || ''
  };
}
