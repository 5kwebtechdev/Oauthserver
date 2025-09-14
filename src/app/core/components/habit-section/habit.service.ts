import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Habit } from './habit.types';
import { HabitApi } from '../../api/habit.api';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private habitsSubject = new BehaviorSubject<Habit[]>([]);
  public habits$ = this.habitsSubject.asObservable();

  // POST habit to backend (delegates to API layer)
  createHabit(payload: any): Observable<any> {
    return this.habitApi.createHabit(payload);
  }

  constructor(private habitApi: HabitApi) { }

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