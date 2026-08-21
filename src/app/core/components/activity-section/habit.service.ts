import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, ReplaySubject } from 'rxjs';
import { Habit } from './habit.types';
import { HabitApi } from '../../api/habit.api';
import { TagsApi } from '../../api/tags.api';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private habitsSubject = new BehaviorSubject<Habit[]>([]);
  public habits$ = this.habitsSubject.asObservable();

  // Use ReplaySubject(1) so late subscribers (navigating back) still receive
  // the last change event even if it was emitted before they subscribed.
  // Extend actions to include 'updated' for edit flows.
  private dataChangedSubject = new ReplaySubject<{ type: 'habit' | 'task' | 'planner', action: 'added' | 'deleted' | 'updated' }>(1);
  public dataChanged$ = this.dataChangedSubject.asObservable();

  private currentLoadedDate: string = '';
  private tagsMap = new Map<number, string>();

  createHabit(payload: any): Observable<any> {
    return this.habitApi.createHabit(payload);
  }

  resolveTagId(id: number): string {
    return this.tagsMap.get(id) || '';
  }

  constructor(private habitApi: HabitApi, private tagsApi: TagsApi) {
    this.tagsApi.getTags().subscribe({
      next: (tags) => tags.forEach(t => this.tagsMap.set(t.id, t.name)),
      error: () => {}
    });
  }

    loadHabitsForDate(dateStr: string, forceReload: boolean = false): Observable<any> {
    if (this.currentLoadedDate === dateStr && !forceReload) {
      return of(this.habitsSubject.value);
    }

    // Interceptor handles userId - no need to pass manually
    return this.habitApi.getHabitsByDate(dateStr, forceReload).pipe(
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

  loadTodayHabits(force: boolean = false): Observable<any> {
    return this.habitApi.getTodayHabits(force).pipe(
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
        tags: (() => {
            const raw = Array.isArray(item.tags) && item.tags.length ? item.tags : (item.tag ? [item.tag] : []);
            const resolved = raw.map((t: any) => {
                if (!t) return '';
                if (typeof t === 'string') return t;
                if (typeof t === 'object') {
                    const name = (t.value || t.name || t.text || t.title || t.label || '').toString().trim();
                    if (name) return name;
                    if (t.tag && typeof t.tag === 'object') return (t.tag.value || t.tag.name || t.tag.title || '').toString().trim();
                }
                return String(t);
            }).filter(Boolean);
            if (resolved.length) return resolved;
            // calendar API only returns tagId — resolve from cached tags list
            const tid = item.tagId ?? item.tag_id;
            if (tid && this.tagsMap.has(Number(tid))) return [this.tagsMap.get(Number(tid))!];
            return [];
        })(),
        coinReward: Number(item.coinReward ?? item.rewardCoins ?? item.reward_coins ?? item.rewardsCoins ?? (item.rewards?.coins ?? item.rewards?.rewardCoins) ?? item.coins ?? 0),
        coinsEarned: item.coinsEarned || item.coins || 0,
        streak: item.streak || item.streakCount || 0,
        highestStreak: item.highestStreak || item.topStreak || 0,
        currentHabitStreak: item.currentHabitStreak || 0,
        highestHabitStreak: item.highestHabitStreak || 0,
        currentTaskStreak: item.currentTaskStreak || 0,
        highestTaskStreak: item.highestTaskStreak || 0,
        completionPercentage: item.completionPercentage || item.completionRate || 0,
        totalCompletedDays: item.totalCompletedDays || item.completedDays || 0,
        milestoneBadges: item.milestoneBadges || item.badges || [],
        reminderOffset: item.reminderOffset ?? item.reminder_offset ?? null,
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

  addHabit(habit: Habit, dataType: 'habit' | 'planner' = 'habit'): void {
    const currentHabits = this.habitsSubject.value;
    this.habitsSubject.next([...currentHabits, habit]);
    this.dataChangedSubject.next({ type: dataType, action: 'added' });
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

  updateHabit(updatedHabit: Habit, dataType: 'habit' | 'planner' = 'habit'): void {
    const currentHabits = this.habitsSubject.value;
    const index = currentHabits.findIndex(h => h.id === updatedHabit.id);
    if (index !== -1) {
      currentHabits[index] = updatedHabit;
      this.habitsSubject.next([...currentHabits]);
      // Notify subscribers that a habit was updated so lists can refresh
      try { this.dataChangedSubject.next({ type: dataType, action: 'updated' }); } catch (e) { /* ignore */ }
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

  notifyTaskUpdated(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'updated' });
  }

  notifyTaskDeleted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'deleted' });
  }

  notifyHabitCompleted(): void {
    this.dataChangedSubject.next({ type: 'habit', action: 'updated' });
  }

  notifyTaskCompleted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'updated' });
  }

  notifyHabitStarted(): void {
    this.dataChangedSubject.next({ type: 'habit', action: 'updated' });
  }

  notifyTaskStarted(): void {
    this.dataChangedSubject.next({ type: 'task', action: 'updated' });
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
      // Notify subscribers that data has changed
      this.dataChangedSubject.next({ type: 'habit', action: 'updated' });
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
      // Notify subscribers that data has changed
      this.dataChangedSubject.next({ type: 'habit', action: 'updated' });
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
      // Notify subscribers that data has changed
      this.dataChangedSubject.next({ type: 'habit', action: 'updated' });
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
