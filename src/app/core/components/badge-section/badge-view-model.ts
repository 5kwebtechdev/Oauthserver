import { BADGE_CATALOG, BadgeDefinition, Tier, TIERS } from './badge-catalog';
import { BADGE_ART, BadgeArt } from './badge-art.generated';

export interface BadgeCard {
  key: string; name: string; description: string; tier: Tier | null; levelLabel: string;
  progress: number | null; target: number | null; percent: number | null;
  earned: boolean; earnedDate: string | null; art: BadgeArt | null; icon: string | null;
  definition?: BadgeDefinition; tiers: TierState[]; individual: boolean;
}
export interface TierState { name: Tier; target: number; earned: boolean | null; earnedDate: string | null; art: BadgeArt; }
export interface BadgeView {
  progress: BadgeCard[]; top: BadgeCard[]; other: BadgeCard[]; individual: BadgeCard[];
  total: number | null; individualAvailable: boolean; historyAvailable: boolean;
}
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
const text = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
const number = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const tier = (v: unknown): Tier | null => TIERS.find(t => t === v) ?? null;
const date = (v: unknown): string | null => {
  const s = text(v);
  // No epoch fallback, relative date, current date, or timezone-less timestamp.
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(s) || !Number.isFinite(Date.parse(s))) return null;
  const calendarDay = s.slice(0,10);
  return new Date(`${calendarDay}T00:00:00Z`).toISOString().slice(0,10) === calendarDay ? s : null;
};
const icon = (v: unknown): string | null => /^(?:https?:\/\/|\/?assets\/)/.test(text(v)) ? text(v) : null;
// Existing artwork for existing API categories; these are not aliases for the new metrics.
const LEGACY_ICONS: Record<string, string> = {
  'Coin Collector': 'CoinCollector', 'Quiz Ace': 'QuizAce', 'Pet Collector': 'PetCollector',
  'Content Creator': 'ContentCreator', 'Knowledge Seeker': 'KnowledgeSeeker', 'Habit Master': 'HabitMaster',
  'Daily Champion': 'DailyChampion', 'Feature Explorer': 'FeatureExploerer', 'Puzzle Master': 'PuzzleMaster',
  'Pet Stylist': 'PetStylist', 'Learning Enthusiast': 'LearningEnthusiast', 'Social Star': 'SocialStar', 'Streak Keeper': 'StreakKeeper',
};
const legacyIcon = (name: string): string | null => name === 'Task Terminator' ? 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.webp'
  : LEGACY_ICONS[name] ? `assets/Icons-Neutral/Icon-Badge-${LEGACY_ICONS[name]}.webp` : null;
const recent = (a: BadgeCard, b: BadgeCard) => (b.earnedDate ? Date.parse(b.earnedDate) : -Infinity) - (a.earnedDate ? Date.parse(a.earnedDate) : -Infinity) || a.name.localeCompare(b.name);
const rank = (b: BadgeCard) => b.tier ? TIERS.indexOf(b.tier) : -1;
export const emptyBadgeView = (): BadgeView => ({ progress: [], top: [], other: [], individual: [], total: null, individualAvailable: false, historyAvailable: false });

/** Compatibility adapter. Never derives awards from counters or interprets a legacy level as a new tier. */
export function mapBadgeResponse(input: unknown): BadgeView {
  const response = record(input);
  const view = emptyBadgeView();
  // v2 is a proposed, explicit opt-in contract documented in docs/badges-redesign.md.
  const v2 = response['schemaVersion'] === 2;
  const earned: BadgeCard[] = [];
  const seen = new Set<string>();
  for (const raw of array(response['badges'])) {
    const b = record(raw);
    if (b['isActive'] === false || b['type'] === 'TYPE_2') continue;
    const name = text(b['title']);
    if (!name) continue;
    const definition = BADGE_CATALOG.find(d => d.id === b['category'] || d.name === name);
    const categoryKey = text(b['badgeId']) || definition?.id || name;
    if (seen.has(categoryKey)) continue;
    seen.add(categoryKey);
    const workingTier = v2 ? tier(b['nextTier']) : tier(b['levelText']);
    const progress = number(b['progress']);
    const target = number(b['target']);
    const percent = progress !== null && target !== null && target > 0 ? Math.min(100, progress / target * 100) : null;
    const states: TierState[] = definition ? TIERS.map((name, i) => {
      const state = v2 ? array(b['tiers']).map(record).find(t => t['tier'] === name) : undefined;
      const explicitlyEarned = !v2 && b['isEarned'] === true && tier(b['levelText']) === name;
      return { name, target: definition.milestones[i], earned: typeof state?.['earned'] === 'boolean' ? state['earned'] as boolean : explicitlyEarned ? true : null,
        earnedDate: state?.['earned'] === true ? date(state['earnedDate']) : explicitlyEarned ? date(b['earnedDate']) : null, art: BADGE_ART[`${definition.id}-${i+1}`] };
    }) : [];
    const card: BadgeCard = {
      key: categoryKey, name, description: text(b['description']), tier: workingTier,
      levelLabel: workingTier || text(b['levelText']), progress, target, percent,
      earned: b['isEarned'] === true, earnedDate: date(b['earnedDate']),
      art: definition && workingTier ? BADGE_ART[`${definition.id}-${TIERS.indexOf(workingTier)+1}`] : null,
      icon: icon(b['icon']) || legacyIcon(name), definition, tiers: states, individual: false,
    };
    const legendEarned = states.some(t => t.name === 'Legend' && t.earned === true);
    if (!legendEarned && b['isMaxLevel'] !== true) view.progress.push(card);
    if (v2) {
      for (const state of states.filter(t => t.earned === true)) earned.push({ ...card,
        key: `${categoryKey}:${state.name}`, tier: state.name, levelLabel: state.name, earned: true,
        earnedDate: state.earnedDate, art: state.art, target: state.target });
    } else if (card.earned) {
      // Only the single award explicitly supplied by the old API is shown. No inferred history.
      earned.push(card);
    }
  }
  view.progress.sort((a,b) => rank(b)-rank(a) || (b.percent ?? -1)-(a.percent ?? -1) || a.name.localeCompare(b.name));
  earned.sort((a,b) => rank(b)-rank(a) || recent(a,b));
  view.top = earned.slice(0,4);
  view.other = earned.slice(4).sort(recent);
  view.historyAvailable = v2 && response['tierHistoryComplete'] === true;
  const total = number(response['totalEarnedType1']);
  view.total = v2 && total !== null && Number.isInteger(total) && total <= 75 ? total : null;
  view.individualAvailable = v2 && Array.isArray(response['individualBadges']);
  const individualIds = new Set<string>();
  if (view.individualAvailable) for (const raw of array(response['individualBadges'])) {
    const b = record(raw);
    const id = text(b['badgeId']);
    const name = text(b['activityName']);
    if (!id || !name || b['earned'] !== true || individualIds.has(id)) continue;
    individualIds.add(id);
    const type = b['activityType'];
    view.individual.push({ key: id, name, description: '', tier: null, levelLabel: '',
      progress: null, target: null, percent: null, earned: true, earnedDate: date(b['earnedDate']),
      art: type === 'HABIT' || type === 'TASK' ? BADGE_ART[`individual-${String(type).toLowerCase()}`] : null,
      icon: icon(b['icon']), tiers: [], individual: true });
  }
  view.individual.sort(recent);
  return view;
}
