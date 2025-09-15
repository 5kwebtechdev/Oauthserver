import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { Habit } from './habit.types';
import { HabitApi } from '../../api/habit.api';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private habitsSubject = new BehaviorSubject<Habit[]>([]);
  public habits$ = this.habitsSubject.asObservable();

  // Track the currently loaded date to prevent redundant API calls
  private currentLoadedDate: string = '';

  // POST habit to backend (delegates to API layer)
  createHabit(payload: any): Observable<any> {
    return this.habitApi.createHabit(payload);
  }

  constructor(private habitApi: HabitApi) {
    // Load habits for today by default when service is instantiated
    this.loadHabitsForDate(this.formatDateToYYYYMMDD(new Date()));
  }

  /**
   * Load habits for a specific date from the API
   * @param dateStr Date string in YYYY-MM-DD format
   * @returns Observable of the API response
   */
  loadHabitsForDate(dateStr: string): Observable<any> {
    if (this.currentLoadedDate === dateStr) {
      // Return the current habits if we already loaded this date
      return of(this.habitsSubject.value);
    }

    return this.habitApi.getHabitsByDate(dateStr).pipe(
      tap(response => {
        if (response) {
          // Map the API response to our Habit model
          const habits = this.mapApiResponseToHabits(response);
          this.habitsSubject.next(habits);
          this.currentLoadedDate = dateStr;
        }
      }),
      catchError(error => {
        console.error('Error fetching habits:', error);
        // Return empty array on error to prevent breaking the UI
        this.habitsSubject.next([]);
        return of([]);
      })
    );
  }

  /**
   * Map API response to Habit objects
   * @param response Raw API response
   * @returns Array of Habit objects
   */
  private mapApiResponseToHabits(response: any[]): Habit[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response.map(item => {
      // From the API response, get timestamps from startDate, endDate or use current timestamps
      const startTimeStamp = item.startDate ? new Date(item.startDate).getTime() : Date.now();
      const endTimeStamp = item.endDate ? new Date(item.endDate).getTime() : Date.now() + 3600000; // 1 hour later by default

      // Format the time values
      const startTimeFormatted = item.startTime || "07:00:00";
      const endTimeFormatted = item.endTime || "08:00:00";

      return {
        id: item.id || '',
        title: item.title || '',
        notes: item.description || '',
        startDate: new Date(item.startDate || startTimeStamp),
        endDate: new Date(item.endDate || endTimeStamp),
        // Use the formatted time strings from the API directly
        startTime: startTimeFormatted.substring(0, 5), // Take just HH:MM part
        endTime: endTimeFormatted.substring(0, 5),   // Take just HH:MM part
        startTimeStamp: startTimeStamp,
        endTimeStamp: endTimeStamp,
        type: item.type || 'habits',
        isPrivate: !!item.isPrivate,
        selectedRoutine: item.routine || 'MORNING',
        routineTags: item.routineTags || [],
        everyday: item.everyday || false,
        selectedDays: item.daysOfWeek || [],
        priority: item.priority || 'high',
        tags: item.tags || [],
        coinReward: item.coinReward || 0,
        createdAt: new Date(item.createdAt || Date.now())
      };
    });
  }  /**
   * Format a Date object to a time string (HH:MM)
   */
  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Format a Date object to YYYY-MM-DD string
   */
  formatDateToYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  addHabit(habit: Habit): void {
    const currentHabits = this.habitsSubject.value;
    this.habitsSubject.next([...currentHabits, habit]);
  }

  getHabits(): Observable<Habit[]> {
    return this.habits$;
  }

  getHabitById(id: string): Habit | undefined {
    return this.habitsSubject.value.find(h => h.id === id);
  }

  updateHabit(updatedHabit: Habit): void {
    const currentHabits = this.habitsSubject.value;
    const index = currentHabits.findIndex(h => h.id === updatedHabit.id);
    if (index !== -1) {
      currentHabits[index] = updatedHabit;
      this.habitsSubject.next([...currentHabits]);
    }
  }

  deleteHabit(id: string): void {
    const currentHabits = this.habitsSubject.value;
    this.habitsSubject.next(currentHabits.filter(h => h.id !== id));
  }
}