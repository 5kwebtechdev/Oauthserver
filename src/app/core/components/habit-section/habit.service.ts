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

  private mapApiResponseToHabits(response: any[]): Habit[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response.map(item => {
      const startTimeStamp = item.startDate ? new Date(item.startDate).getTime() : Date.now();
      const endTimeStamp = item.endDate ? new Date(item.endDate).getTime() : Date.now() + 3600000;

      const startTimeFormatted = item.startTime || "07:00:00";
      const endTimeFormatted = item.endTime || "08:00:00";

      return {
        id: item.id || '',
        title: item.title || '',
        notes: item.description || '',
        startDate: new Date(item.startDate || startTimeStamp),
        endDate: new Date(item.endDate || endTimeStamp),
        startTime: startTimeFormatted.substring(0, 5),
        endTime: endTimeFormatted.substring(0, 5),
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
  } private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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