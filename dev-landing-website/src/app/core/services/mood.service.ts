import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, shareReplay, of, tap } from 'rxjs';
import { MoodTransition, MoodData, MOOD_EMOJI_MAP, VibesDisplayResponse } from '../models/mood.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MoodService {
    private readonly apiUrl = `${environment.apiUrl}/mood`;
    private vibesDisplayCache$: Observable<VibesDisplayResponse[]> | null = null;
    private vibesSubject$ = new BehaviorSubject<VibesDisplayResponse[] | null>(null);
    vibesDisplay$ = this.vibesSubject$.asObservable();

    constructor(private http: HttpClient) { }

    /**
     * Fetch mood transitions for a specific month.
     * The ProfileSelectorInterceptor automatically adds userId when a child is selected.
     */
    getMoodTransitionsMonthly(year: number, month: number): Observable<MoodTransition[]> {
        const url = `${this.apiUrl}/vibes/transition/monthly?year=${year}&month=${month}`;
        return this.http.get<MoodTransition[]>(url);
    }

    /**
     * Transform mood transitions array into a date-keyed object for easy lookup
     * @param transitions Array of mood transitions
     * @returns Object with dates as keys
     */
    transformToMoodData(transitions: MoodTransition[]): MoodData {
        const moodData: MoodData = {};
        transitions.forEach(transition => {
            moodData[transition.date] = transition;
        });
        return moodData;
    }

    /**
     * Get mood emoji path based on mood name
     * @param moodName Name of the mood
     * @returns Path to the mood emoji image
     */
    getMoodEmojiPath(moodName: string): string {
        // Normalize input from backend: handle case/spacing/underscores/dashes consistently
        const normalize = (s: string) => s
            .trim()
            .toLowerCase()
            .replace(/[_\-\s]+/g, ' ') // collapse separators to single space
            .replace(/\s+/g, ' ');

        const canonicalByNormalized: { [key: string]: keyof typeof MOOD_EMOJI_MAP } = {
            'happy': 'Happy',
            'very happy': 'Very Happy',
            'excited': 'Excited',
            'sad': 'Sad',
            'upset': 'Upset',
            'nervous': 'Nervous',
        };

        const DEFAULT = MOOD_EMOJI_MAP['Happy'];
        if (!moodName) return DEFAULT;

        const norm = normalize(String(moodName));
        const canonical = canonicalByNormalized[norm];
        if (canonical && MOOD_EMOJI_MAP[canonical]) {
            return MOOD_EMOJI_MAP[canonical];
        }

        // Fallback: try direct key match (if already properly cased)
        if (MOOD_EMOJI_MAP[moodName as keyof typeof MOOD_EMOJI_MAP]) {
            return MOOD_EMOJI_MAP[moodName as keyof typeof MOOD_EMOJI_MAP];
        }

        return DEFAULT;
    }

    /**
     * Fetch vibes display data containing user stats (coins, trophies, streaks, badges, etc.)
     * Uses caching to prevent duplicate API calls - multiple subscribers will share the same request
     * @returns Observable of VibesDisplayResponse array
     */
    getVibesDisplay(): Observable<VibesDisplayResponse[]> {
        if (!this.vibesDisplayCache$) {
            this.vibesDisplayCache$ = this.http.get<VibesDisplayResponse[]>(`${this.apiUrl}/vibes/display`).pipe(
                tap(data => this.vibesSubject$.next(data)),
                shareReplay(1)
            );
        }
        return this.vibesDisplayCache$;
    }

    refreshRewardStats(): void {
        this.vibesDisplayCache$ = null;
        this.http.get<VibesDisplayResponse[]>(`${this.apiUrl}/vibes/display`).subscribe({
            next: (data) => {
                this.vibesSubject$.next(data);
                this.vibesDisplayCache$ = of(data).pipe(shareReplay(1));
            }
        });
    }

    getVibesDisplayForUser(userId: number): Observable<VibesDisplayResponse[]> {
        return this.http.get<VibesDisplayResponse[]>(
            `${this.apiUrl}/vibes/display`, { params: { forUserId: userId.toString() } }
        );
    }

    /** Always fetches fresh parent-view data (no cache, no forUserId) */
    getParentVibesDisplay(): Observable<VibesDisplayResponse[]> {
        return this.http.get<VibesDisplayResponse[]>(`${this.apiUrl}/vibes/display`);
    }

    /**
     * Override the cached vibes display with a provided array.
     * Useful when parent selects a specific child and we want to show
     * that child's vibe as the primary entry to other components.
     */
    setVibesDisplayOverride(vibes: VibesDisplayResponse[] | null): void {
        if (!vibes) {
            this.vibesDisplayCache$ = null;
            return;
        }
        this.vibesDisplayCache$ = of(vibes);
    }

    /**
     * Clear the vibes display cache to force a fresh API call on next request
     * Call this after updating mood or when you need fresh data
     */
    clearVibesDisplayCache(): void {
        this.vibesDisplayCache$ = null;
    }
}
