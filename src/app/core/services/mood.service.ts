import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MoodTransition, MoodData, MOOD_EMOJI_MAP } from '../models/mood.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MoodService {
  private readonly apiUrl = `${environment.apiUrl}/mood`;

  constructor(private http: HttpClient) { }

  /**
   * Fetch mood transitions for a specific month
   * @param year Year (e.g., 2025)
   * @param month Month (1-12)
   * @returns Observable of mood transitions array
   */
  getMoodTransitionsMonthly(year: number, month: number): Observable<MoodTransition[]> {
    return this.http.get<MoodTransition[]>(
      `${this.apiUrl}/vibes/transition/monthly?year=${year}&month=${month}`
    );
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
}
