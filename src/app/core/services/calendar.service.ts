import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, shareReplay, tap } from 'rxjs';
import { CalendarResponse, TimelineEvent } from '../models/calendar.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private readonly apiUrl = `${environment.apiUrl}/calendar`;
    // Simple cache to avoid duplicate network calls for the same date+viewType
    private cache = new Map<string, Observable<CalendarResponse>>();

    constructor(private http: HttpClient) { }

    /**
     * Get user calendar. The ProfileSelectorInterceptor automatically adds userId
     * when a child is selected by the parent.
     */
    /**
     * Get user calendar. Accepts a Date or date string (YYYY-MM-DD). Returns a cached shared observable
     * to prevent multiple duplicate HTTP requests for the same date/viewType.
     * Use `forceReload=true` to bypass cache and re-fetch.
     */
    getUserCalendar(date: string | Date, viewType: 'day' | 'month' = 'day', forceReload: boolean = false): Observable<CalendarResponse> {
        const dateStr = this.formatDateToYYYYMMDD(date);
        const key = `${dateStr}|${viewType}`;

        if (!forceReload && this.cache.has(key)) {
            return this.cache.get(key) as Observable<CalendarResponse>;
        }

        const url = `${this.apiUrl}/user-calendar?date=${dateStr}&viewType=${viewType}`;
        const request$ = this.http.get<CalendarResponse>(url).pipe(
            // keep a shared replay so multiple subscribers share same network result
            shareReplay({ bufferSize: 1, refCount: true }),
            // if error, remove from cache so subsequent calls can retry
            catchError(err => {
                this.cache.delete(key);
                return of({ events: [], tasks: [], habits: [], totalTasks: 0, totalTasksCompleted: 0, taskCompletionRate: 0, totalHabits: 0, totalHabitsCompleted: 0, habitCompletionRate: 0 } as CalendarResponse);
            })
        );

        this.cache.set(key, request$);
        return request$;
    }

    /** Clear cached entry for a date/viewType or clear all when called without args */
    clearCache(date?: string | Date, viewType?: 'day' | 'month') {
        if (!date) {
            this.cache.clear();
            return;
        }
        const d = this.formatDateToYYYYMMDD(date);
        const key = `${d}|${viewType || 'day'}`;
        this.cache.delete(key);
    }

    private formatDateToYYYYMMDD(date: string | Date): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * Convenience wrapper to fetch month view
     */
    getUserCalendarMonth(date: string): Observable<CalendarResponse> {
        return this.getUserCalendar(date, 'month');
    }

    transformToTimelineEvents(response: CalendarResponse): TimelineEvent[] {
        const timelineEvents: TimelineEvent[] = [];

        // Transform events
        response.events.forEach(event => {
            timelineEvents.push({
                id: event.id,
                title: event.title,
                startTime: event.startTime.slice(0, 5), // Convert "HH:mm:ss" to "HH:mm"
                endTime: event.endTime.slice(0, 5),
                type: 'timetable', // Changed from 'event' to 'timetable' to match the filter
                description: event.description,
                tags: event.tags,
                priority: event.priority
            });
        });

        // Transform tasks
        response.tasks.forEach(task => {
            const rawStatus = (task as any).status || (task.completed ? 'completed' : 'pending');
            timelineEvents.push({
                id: task.id,
                title: task.title,
                startTime: task.startTime.slice(0, 5),
                endTime: task.endTime.slice(0, 5),
                type: 'task',
                description: task.description,
                tags: task.tags,
                priority: task.priority,
                status: rawStatus.toLowerCase(),
                // Preserve creator id if provided by backend (createdBy or created_by)
                createdBy: (task as any).createdBy ?? (task as any).created_by ?? (task as any).created_by_id ?? undefined
            });
        });

        // Transform habits
        response.habits.forEach(habit => {
            const startTime = habit.startTime.slice(0, 5); // Convert "HH:mm:ss" to "HH:mm"
            let endTime = habit.endTime.slice(0, 5);

            // Fix endTime if it appears to be before startTime (likely AM/PM issue)
            const [startHour] = startTime.split(':').map(Number);
            const [endHour] = endTime.split(':').map(Number);

            if (endHour < startHour && endHour < 12) {
                // Convert to PM by adding 12 hours
                endTime = `${(endHour + 12).toString().padStart(2, '0')}:${endTime.split(':')[1]}`;
            }

            timelineEvents.push({
                id: habit.id,
                title: habit.title,
                startTime: startTime,
                endTime: endTime,
                type: 'habit',
                description: habit.description,
                tags: habit.tags,
                priority: habit.priority,
                status: habit.status,
                // Preserve creator id if provided by backend
                createdBy: (habit as any).createdBy ?? (habit as any).created_by ?? (habit as any).created_by_id ?? undefined
            });
        });

        // Sort events by start time
        return timelineEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
}