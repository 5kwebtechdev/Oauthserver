import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, Subject } from 'rxjs';
import { Habit } from './habit.types';
import { HabitApi } from '../../api/habit.api';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private habitsSubject = new BehaviorSubject<Habit[]>([]);
  public habits$ = this.habitsSubject.asObservable();

  private dataChangedSubject = new Subject<{ type: 'habit' | 'task', action: 'added' | 'deleted' }>();
  public dataChanged$ = this.dataChangedSubject.asObservable();

  private currentLoadedDate: string = '';

  createHabit(payload: any): Observable<any> {
    return this.habitApi.createHabit(payload);
  }

  constructor(private habitApi: HabitApi) {
    // Don't auto-load - let components decide when to load based on context
    // (e.g., parent account needs to wait for child selection first)
  }

  loadHabitsForDate(dateStr: string, forceReload: boolean = false): Observable<any> {
    if (this.currentLoadedDate === dateStr && !forceReload) {
      return of(this.habitsSubject.value);
    }

    // Interceptor handles userId - no need to pass manually
    return this.habitApi.getHabitsByDate(dateStr).pipe(
      tap(response => {
        if (response) {
          const habits = this.mapApiResponseToHabits(response);
          this.habitsSubject.next(habits);
          this.currentLoadedDate = dateStr;
        }
      }),
      catchError(error => {
        console.error('Error fetching habits:', error);
        this.habitsSubject.next([]);
        return of([]);
      })
    );
  }

  loadHabitsBySearch(filters: any): Observable<any> {
    return this.habitApi.getHabitsBySearch(filters).pipe(
      tap(response => {
        if (response && response.habits) {
          const habits = this.mapApiResponseToHabits(response.habits);
          this.habitsSubject.next(habits);
        }
      }),
      catchError(error => {
        console.error('Error fetching habits by search:', error);
        this.habitsSubject.next([]);
        return of([]);
      })
    );
  }

  loadTodayHabits(): Observable<any> {
    return this.habitApi.getTodayHabits().pipe(
      tap(response => {
        if (response) {
          const habits = this.mapApiResponseToHabits(response);
          this.habitsSubject.next(habits);
        }
      }),
      catchError(error => {
        console.error('Error fetching today\'s habits:', error);
        this.habitsSubject.next([]);
        return of([]);
      })
    );
  }

  private mapApiResponseToHabits(response: any[]): Habit[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response.map(item => {
      const startTimeFormatted = item.startTime || item.start_time || "07:00:00";
      const endTimeFormatted = item.endTime || item.end_time || "08:00:00";

      // Combine date and time to create proper timestamps
      const startTimeStamp = item.startDate ? this.combineDateAndTime(item.startDate, startTimeFormatted) : Date.now();
      const endTimeStamp = item.endDate ? this.combineDateAndTime(item.endDate, endTimeFormatted) : Date.now() + 3600000;

      return {
        id: item.id || '',
        title: item.title || '',
        notes: item.description || '',
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
        // Keep HH:MM:SS format; many UI locations expect HH:MM or HH:MM:SS, so keep full seconds
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        startTimeStamp: startTimeStamp,
        endTimeStamp: endTimeStamp,
        type: item.type || 'habits',
        isPrivate: !!item.isPrivate,
        selectedRoutine: item.getRoutine,
        routineTags: item.routineTags || [],
        everyday: item.everyday || false,
        selectedDays: this.normalizeDaysOfWeek(item.daysOfWeek || item.selectedDays || []),
        priority: item.priority,
        routine: item.routine,
        status: item.status,
        tags: item.tags || [],
        coinReward: item.coinReward || 0,
        coinsEarned: item.coinsEarned || item.coins || 0,
        streak: item.streak || item.streakCount || 0,
        highestStreak: item.highestStreak || item.topStreak || 0,
        completionPercentage: item.completionPercentage || item.completionRate || 0,
        totalCompletedDays: item.totalCompletedDays || item.completedDays || 0,
        milestoneBadges: item.milestoneBadges || item.badges || [],
        createdAt: new Date(item.createdAt || Date.now())
      };
    });
  }
  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private normalizeDaysOfWeek(days: any[]): string[] {
    if (!Array.isArray(days)) return [];
    const mapFullToCanonical: Record<string, string> = {
      SUN: 'SUNDAY', SUNDAY: 'SUNDAY', 'S': 'SUNDAY',
      MON: 'MONDAY', MONDAY: 'MONDAY', 'M': 'MONDAY',
      TUE: 'TUESDAY', TUESDAY: 'TUESDAY', 'T': 'TUESDAY',
      WED: 'WEDNESDAY', WEDNESDAY: 'WEDNESDAY', 'W': 'WEDNESDAY',
      THU: 'THURSDAY', THURSDAY: 'THURSDAY', 'TH': 'THURSDAY', 'THUR': 'THURSDAY',
      FRI: 'FRIDAY', FRIDAY: 'FRIDAY', 'F': 'FRIDAY',
      SAT: 'SATURDAY', SATURDAY: 'SATURDAY', 'SA': 'SATURDAY'
    };
    return days.map(d => {
      if (!d) return d;
      const s = String(d).trim().toUpperCase();
      return mapFullToCanonical[s] || s;
    }).filter(Boolean);
  }

  formatDateToYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  addHabit(habit: Habit): void {
    const currentHabits = this.habitsSubject.value;
    this.habitsSubject.next([...currentHabits, habit]);
    this.dataChangedSubject.next({ type: 'habit', action: 'added' });
  }

  getHabits(): Observable<Habit[]> {
    return this.habits$;
  }

  getCurrentHabits(): Habit[] {
    return this.habitsSubject.value;
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
    this.dataChangedSubject.next({ type: 'habit', action: 'deleted' });
  }

  notifyTaskAdded(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'added' });
  }

  notifyTaskDeleted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'deleted' });
  }

  completeHabit(id: string): void {
    // Mark habit as completed and remove from today's active list so it disappears from Home
    const currentHabits = this.habitsSubject.value;
    const idx = currentHabits.findIndex(h => h.id === id);
    if (idx !== -1) {
      const updated = { ...currentHabits[idx], status: 'completed' } as Habit;
      // Update internal list to remove it from active view (completed moves to completed lists)
      const newList = currentHabits.filter(h => h.id !== id);
      this.habitsSubject.next(newList);
    }
  }

  letsGoHabit(id: string): void {
    // Mark habit as ongoing in the current habits list
    const currentHabits = this.habitsSubject.value;
    const idx = currentHabits.findIndex(h => h.id === id);
    if (idx !== -1) {
      const updated = { ...currentHabits[idx], status: 'ongoing' } as Habit;
      currentHabits[idx] = updated;
      this.habitsSubject.next([...currentHabits]);
    }
  }

  abortHabit(id: string): void {
    // Set habit status to pending (do not remove from Home). The card should remain until scheduled end time.
    const currentHabits = this.habitsSubject.value;
    const idx = currentHabits.findIndex(h => h.id === id);
    if (idx !== -1) {
      const updated = { ...currentHabits[idx], status: 'pending' } as Habit;
      currentHabits[idx] = updated;
      this.habitsSubject.next([...currentHabits]);
    }
  }

  /**
   * Combine date string (YYYY-MM-DD) with time string (HH:MM:SS) to create timestamp
   */
  private combineDateAndTime(dateStr: string, timeStr: string): number {
    // Parse time components (format: "HH:MM:SS" or "HH:MM")
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;

    // Create date from date string and set time components
    const date = new Date(dateStr);
    date.setHours(hours, minutes, seconds, 0);

    const timestamp = date.getTime();

    console.log('combineDateAndTime:', {
      dateStr,
      timeStr,
      hours,
      minutes,
      seconds,
      resultDate: date.toLocaleString(),
      timestamp
    });

    return timestamp;
  }

}