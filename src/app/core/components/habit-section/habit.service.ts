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

  private currentLoadedDate: string = '';

  createHabit(payload: any): Observable<any> {
    return this.habitApi.createHabit(payload);
  }

  constructor(private habitApi: HabitApi) {
    this.loadHabitsForDate(this.formatDateToYYYYMMDD(new Date()));
  }

  loadHabitsForDate(dateStr: string): Observable<any> {
    if (this.currentLoadedDate === dateStr) {
      return of(this.habitsSubject.value);
    }

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

  private mapApiResponseToHabits(response: any[]): Habit[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response.map(item => {
      const startTimeStamp = item.startDate ? new Date(item.startDate).getTime() : Date.now();
      const endTimeStamp = item.endDate ? new Date(item.endDate).getTime() : Date.now() + 3600000;

      const startTimeFormatted = item.startTime || item.start_time || "07:00:00";
      const endTimeFormatted = item.endTime || item.end_time || "08:00:00";

      return {
        id: item.id || '',
        title: item.title || '',
        notes: item.description || '',
        startDate: new Date(item.startDate || startTimeStamp),
        endDate: new Date(item.endDate || endTimeStamp),
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
  } private formatTime(date: Date): string {
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
  }

  completeHabit(id: string): void {
    const currentHabits = this.habitsSubject.value;
    this.habitsSubject.next(currentHabits.filter(h => h.id !== id));
  }
}