/**
 * Typed interface for child/family member profile data.
 * Single source of truth for child selection across the app.
 */
export interface ChildInfo {
  id: string | number | null;
  name: string;
  avatarUrl: string;
  relationship?: string;
  age?: number;
  dateOfBirth?: string;
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
  // Family and vibe endpoints do not always return the child fields at the
  // same level. Normalise the actual child profile first so callers never
  // have to fall back to the signed-in parent's age.
  const profile = d?.user ?? d?.profile ?? d?.member ?? d;
  // Extract id from common fields returned by API. Preserve string ids like 'child000'
  const rawId = d?.userId ?? d?.id ?? d?.assignedTo ?? d?.memberId
    ?? profile?.userId ?? profile?.id ?? profile?.memberId ?? null;
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
  const rawAge = d?.age ?? d?.childAge ?? profile?.age ?? profile?.childAge;
  const parsedAge = rawAge === null || rawAge === undefined || String(rawAge).trim() === ''
    ? Number.NaN
    : Number(rawAge);
  const dateOfBirth = String(
    d?.dateOfBirth
    ?? d?.dob
    ?? d?.birthDate
    ?? profile?.dateOfBirth
    ?? profile?.dob
    ?? profile?.birthDate
    ?? ''
  ).trim();
  const ageFromDateOfBirth = calculateAgeFromDateOfBirth(dateOfBirth);
  return {
    id,
    name: d?.userName || d?.name || profile?.userName || profile?.name || 'Child',
    avatarUrl: avatarUrl || 'assets/figma/avatars/below-11-male-1.webp',
    relationship: d?.relationship || profile?.relationship || 'Child',
    // DOB belongs to the actual member and is more reliable than the age on
    // aggregate vibe responses, which has previously carried the viewer's
    // (parent's) age for a selected child row.
    age: ageFromDateOfBirth
      ?? (Number.isFinite(parsedAge) && parsedAge >= 0 ? Math.floor(parsedAge) : undefined),
    dateOfBirth: dateOfBirth || undefined,
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

function calculateAgeFromDateOfBirth(value: string): number | undefined {
  if (!value) return undefined;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : undefined;
}
