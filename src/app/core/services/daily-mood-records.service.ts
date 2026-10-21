import { Injectable } from '@angular/core';
import { combineLatest, fromEvent, merge, Observable, of, timer, forkJoin } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, scan, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { MoodService } from './mood.service';
import { ProfileSelectorService } from './profile-selector-service';
import { normalizeHomeMood, HomeMood } from '../components/home-mood-header/home-mood-header.component';

export interface DailyMoodRecord {
  mood: HomeMood;
  label: string;
  image: string;
  tone: 'great' | 'okay' | 'low';
}

export function moodDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dailyMoodRecord(value: string | null | undefined): DailyMoodRecord | null {
  const mood = normalizeHomeMood(value);
  if (!mood) return null;
  return {
    mood,
    label: mood.charAt(0).toUpperCase() + mood.slice(1),
    image: `assets/figma/child-home/moods/${mood === 'calm' ? 'Calm' : mood}.svg`,
    tone: mood === 'sad' ? 'low' : mood === 'anxious' || mood === 'frustrated' ? 'okay' : 'great',
  };
}

/** Read-only projection of Home's mood APIs and confirmed saves. Never writes Journal mood. */
@Injectable({ providedIn: 'root' })
export class DailyMoodRecordsService {
  constructor(
    private readonly moods: MoodService,
    private readonly auth: AuthService,
    private readonly profiles: ProfileSelectorService,
  ) {}

  watch(months: () => Date[] = () => []): Observable<Record<string, DailyMoodRecord | null>> {
    const identity$ = combineLatest([this.auth.userData$, this.profiles.child$]).pipe(
      map(([user, childId]) => ({
        userId: String(childId ?? this.auth.getUserId() ?? user?.userId ?? user?.id ?? ''),
        selectedChild: childId != null,
      })),
      distinctUntilChanged((a, b) => a.userId === b.userId && a.selectedChild === b.selectedChild),
    );
    // Check the date, not a new daily counter. No network polling within the same day.
    const day$ = timer(0, 30_000).pipe(map(() => moodDateKey()), distinctUntilChanged());
    return combineLatest([identity$, day$]).pipe(
      switchMap(([identity, today]) => {
        const { userId, selectedChild } = identity;
        if (!userId) return of({});
        const refresh$ = merge(
          of(null),
          fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
          fromEvent(window, 'focus'),
        );
        return refresh$.pipe(switchMap(() => {
          const uniqueMonths = new Map(months().map(date => [`${date.getFullYear()}-${date.getMonth()}`, date]));
          const history$ = uniqueMonths.size
            ? forkJoin([...uniqueMonths.values()].map(date =>
              this.moods.getMoodTransitionsMonthly(date.getFullYear(), date.getMonth() + 1, userId).pipe(catchError(() => of([])))))
            : of([]);
          const snapshot$ = forkJoin({
            history: history$,
            current: this.moods.getVibesDisplay(userId).pipe(catchError(() => of([]))),
          }).pipe(map(({ history, current }) => {
            const records: Record<string, DailyMoodRecord | null> = {};
            history.forEach(month => (Array.isArray(month) ? month : []).filter(item => String(item?.userId) === userId).forEach(item => {
              records[item.date] = dailyMoodRecord(item.toMood || item.fromMood);
            }));
            const vibes = Array.isArray(current) ? current : [];
            // The self-scoped endpoint can return a single record without the
            // same id as auth profile data. Never use this fallback for an
            // explicitly selected child, where it could show another mood.
            const vibe = vibes.find(item => String(item?.userId ?? item?.assignedTo) === userId)
              ?? (!selectedChild && vibes.length === 1 ? vibes[0] : undefined);
            if (vibe) {
              const count = Number(vibe.moodSetCountToday);
              const hasMood = vibe.moodSetCountToday != null && Number.isFinite(count)
                ? count > 0
                : !!vibe.mood && vibe.mood.toUpperCase() !== 'NEUTRAL';
              records[today] = hasMood ? dailyMoodRecord(vibe.mood) : null;
            } else {
              records[today] = null;
            }
            return { kind: 'snapshot' as const, records };
          }));
          const updates$ = this.moods.dailyMoodStateUpdated$.pipe(
            filter(update => !selectedChild
              && update.storageKey === `vibe_daily_state_${this.auth.getUserId() ?? userId}_${today}`),
            map(update => ({ kind: 'update' as const, mood: update.count > 0 ? dailyMoodRecord(update.mood) : null })),
          );
          // A confirmed save can arrive before an older display request finishes.
          // Preserve that newer value rather than reverting the journal card.
          return merge(snapshot$, updates$).pipe(
            scan((state, event) => event.kind === 'update'
              ? { records: { ...state.records, [today]: event.mood }, updated: true }
              : { records: state.updated ? { ...event.records, [today]: state.records[today] } : event.records, updated: state.updated },
            { records: {} as Record<string, DailyMoodRecord | null>, updated: false }),
            map(state => state.records),
          );
        }), startWith({} as Record<string, DailyMoodRecord | null>));
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
