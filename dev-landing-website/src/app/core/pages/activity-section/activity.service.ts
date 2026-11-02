import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, ReplaySubject } from 'rxjs';
import { Activity } from './activity.types';
import { HabitApi } from '../../api/habit.api';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private activitiesSubject = new BehaviorSubject<Activity[]>([]);
  public activities$ = this.activitiesSubject.asObservable();

  // Use ReplaySubject(1) so late subscribers still receive the last event
  private dataChangedSubject = new ReplaySubject<{ type: 'activity' | 'task', action: 'added' | 'deleted' | 'updated' }>(1);
  public dataChanged$ = this.dataChangedSubject.asObservable();

  private currentLoadedDate: string = '';

  constructor(private habitApi: HabitApi) { }

  createHabit(payload: any): Observable<any> {
    return this.habitApi.createHabit(payload);
  }

  loadHabitsForDate(dateStr: string, forceReload: boolean = false): Observable<any> {
    if (this.currentLoadedDate === dateStr && !forceReload) {
      return of(this.activitiesSubject.value);
    }
    return this.habitApi.getHabitsByDate(dateStr).pipe(
      tap(response => {
        if (response) {
          const flat = this.flattenResponse(response);
          const habits = this.mapApiResponseToActivities(flat);
          this.activitiesSubject.next(habits);
          this.currentLoadedDate = dateStr;
        }
      }),
      catchError(error => {
        console.error('Error fetching habits:', error);
        this.activitiesSubject.next([]);
        return of([]);
      })
    );
  }

  loadHabitsBySearch(filters: any): Observable<any> {
    return this.habitApi.getHabitsBySearch(filters).pipe(
      tap(response => {
        if (response && response.habits) {
          const habits = this.mapApiResponseToActivities(response.habits);
          this.activitiesSubject.next(habits);
        }
      }),
      catchError(error => {
        console.error('Error fetching habits by search:', error);
        this.activitiesSubject.next([]);
        return of([]);
      })
    );
  }

  loadTodayHabits(): Observable<any> {
    return this.habitApi.getTodayHabits().pipe(
      tap(response => {
        if (response) {
          const flat = this.flattenResponse(response);
          const habits = this.mapApiResponseToActivities(flat);
          this.activitiesSubject.next(habits);
        }
      }),
      catchError(error => {
        console.error('Error fetching today\'s habits:', error);
        this.activitiesSubject.next([]);
        return of([]);
      })
    );
  }

  private resolveItemTags(item: any): string[] {
    // events: tags is string[]
    if (Array.isArray(item.tags) && item.tags.length) {
      return item.tags.map((t: any) => (typeof t === 'string' ? t : t?.name || t?.tagName || '')).filter(Boolean);
    }
    // habits/tasks: tag is { id, name } object or null
    if (item.tag && typeof item.tag === 'object' && item.tag.name) {
      return [item.tag.name];
    }
    return [];
  }

  private flattenResponse(response: any): any[] {
    if (Array.isArray(response)) return response;
    const habits = (response.habits || []).map((h: any) => ({ ...h, type: 'habits' }));
    const tasks  = (response.tasks  || []).map((t: any) => ({ ...t, type: 'tasks'  }));
    const events = (response.events || []).map((e: any) => ({ ...e, type: 'timetable' }));
    return [...habits, ...tasks, ...events];
  }

  private mapApiResponseToActivities(response: any): Activity[] {
    if (!Array.isArray(response)) return [];
    return response.map(item => {
      const startTimeFormatted = item.startTime || item.start_time || "07:00:00";
      const endTimeFormatted = item.endTime || item.end_time || "08:00:00";
      const startTimeStamp = item.startDate ? this.combineDateAndTime(item.startDate, startTimeFormatted) : Date.now();
      const endTimeStamp = item.endDate ? this.combineDateAndTime(item.endDate, endTimeFormatted) : Date.now() + 3600000;

      return {
        id: item.id || '',
        title: item.title || '',
        notes: item.description || '',
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        startTimeStamp,
        endTimeStamp,
        type: item.type || 'habits',
        isPrivate: !!item.isPrivate,
        selectedRoutine: item.getRoutine || item.routine || '',
        routineTags: item.routineTags || [],
        everyday: item.everyday || false,
        selectedDays: this.normalizeDaysOfWeek(item.daysOfWeek || item.selectedDays || []),
        priority: item.priority,
        routine: item.routine,
        status: item.status,
        tags: this.resolveItemTags(item),
        coinReward: item.coinReward || item.rewardCoins || 0,
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

  private combineDateAndTime(dateStr: string, timeStr: string): number {
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;
    const date = new Date(dateStr);
    date.setHours(hours, minutes, seconds, 0);
    return date.getTime();
  }

  formatDateToYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  addHabit(activity: Activity): void {
    const current = this.activitiesSubject.value;
    this.activitiesSubject.next([...current, activity]);
    this.dataChangedSubject.next({ type: 'activity', action: 'added' });
  }

  getHabits(): Observable<Activity[]> {
    return this.activities$;
  }

  getcurrentActivities(): Activity[] {
    return this.activitiesSubject.value;
  }

  getHabitById(id: string): Activity | undefined {
    return this.activitiesSubject.value.find(a => a.id === id);
  }

  updateHabit(updatedHabit: Activity): void {
    const current = this.activitiesSubject.value;
    const index = current.findIndex(a => a.id === updatedHabit.id);
    if (index !== -1) {
      current[index] = updatedHabit;
      this.activitiesSubject.next([...current]);
      try { this.dataChangedSubject.next({ type: 'activity', action: 'updated' }); } catch { /* ignore */ }
    }
  }

  deleteHabit(id: string): void {
    const current = this.activitiesSubject.value;
    this.activitiesSubject.next(current.filter(a => a.id !== id));
    this.dataChangedSubject.next({ type: 'activity', action: 'deleted' });
  }

  notifyTaskAdded(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'added' });
  }

  notifyTaskUpdated(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'updated' });
  }

  notifyTaskDeleted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'deleted' });
  }

  notifyHabitCompleted(): void {
    this.dataChangedSubject.next({ type: 'activity', action: 'updated' });
  }

  notifyTaskCompleted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'updated' });
  }

  notifyHabitStarted(): void {
    this.dataChangedSubject.next({ type: 'activity', action: 'updated' });
  }

  notifyTaskStarted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'updated' });
  }

  /** Mark activity as completed - remove from active list */
  completeHabit(id: string): void {
    const current = this.activitiesSubject.value;
    const idx = current.findIndex(a => a.id === id);
    if (idx !== -1) {
      const newList = current.filter(a => a.id !== id);
      this.activitiesSubject.next(newList);
      this.dataChangedSubject.next({ type: 'activity', action: 'updated' });
    }
  }

  /** Mark activity as ongoing */
  letsGoHabit(id: string): void {
    const current = this.activitiesSubject.value;
    const idx = current.findIndex(a => a.id === id);
    if (idx !== -1) {
      const updated = { ...current[idx], status: 'ongoing' } as Activity;
      current[idx] = updated;
      this.activitiesSubject.next([...current]);
      this.dataChangedSubject.next({ type: 'activity', action: 'updated' });
    }
  }

  /** Mark activity as pending (abort) */
  abortHabit(id: string): void {
    const current = this.activitiesSubject.value;
    const idx = current.findIndex(a => a.id === id);
    if (idx !== -1) {
      const updated = { ...current[idx], status: 'pending' } as Activity;
      current[idx] = updated;
      this.activitiesSubject.next([...current]);
      this.dataChangedSubject.next({ type: 'activity', action: 'updated' });
    }
  }
}
