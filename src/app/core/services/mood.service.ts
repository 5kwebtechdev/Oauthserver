import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MoodTransition, MoodData } from '../models/mood.model';
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
    // Mapping for the six available mood images
    const moodMap: { [key: string]: string } = {
      'Happy': 'assets/Images-Transparent/Image-Mood-Happy.png',
      'Very Happy': 'assets/Images-Transparent/Image-Mood-Very happy.png',
      'Excited': 'assets/Images-Transparent/Image-Mood-Excited.png',
      'Sad': 'assets/Images-Transparent/Image-Mood-Sad.png',
      'Upset': 'assets/Images-Transparent/Image-Mood-Upset.png',
      'Nervous': 'assets/Images-Transparent/Image-Mood-Nervous.png',
    };

    return moodMap[moodName] || 'assets/Images-Transparent/Image-Mood-Happy.png';
  }
}
