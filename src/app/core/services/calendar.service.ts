import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { CalendarResponse, TimelineEvent } from '../models/calendar.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private readonly apiUrl = `${environment.apiUrl}/calendar`;

    constructor(private http: HttpClient) { }

    getUserCalendar(date: string | Date, viewType: 'day' | 'week' | 'month' = 'day', forceReload: boolean = false): Observable<CalendarResponse> {
        return this.getCalendar(date, viewType);
    }

    /**
     * Planner screens must use only `/calendar/user-calendar`. Personal events
     * from `/events/all` belong to a separate flow and must not be merged into
     * the Planner list, otherwise they appear as extra/duplicate planner cards.
     */
    getUserPlannerCalendar(date: string | Date, viewType: 'day' | 'week' | 'month' = 'day'): Observable<CalendarResponse> {
        return this.getCalendar(date, viewType);
    }

    private getCalendar(
        date: string | Date,
        viewType: 'day' | 'week' | 'month'
    ): Observable<CalendarResponse> {
        const dateStr = this.formatDateToYYYYMMDD(date);
        const url = `${this.apiUrl}/user-calendar?date=${dateStr}&viewType=${viewType}`;
        const calendar$ = this.http.get<CalendarResponse>(url).pipe(
            catchError(() => of({ ...this.emptyCalendarResponse(), loadError: true }))
        );

        // Planner entries are already returned by /calendar/user-calendar.
        // Do not merge /events/all here: that endpoint belongs to a separate
        // flow and caused duplicate planner cards and an unnecessary request.
        return calendar$.pipe(
            map(calendar => ({
                ...calendar,
                // Expired means the scheduled time has passed, not that the
                // record was deleted. Keep history for dots and selected-day
                // lists, consistent with the totals returned by the API.
                habits: calendar.habits || [],
                tasks: calendar.tasks || [],
                events: calendar.events || []
            }))
        );
    }

    /** No-op kept for call-site compatibility */
    clearCache(date?: string | Date, viewType?: 'day' | 'week' | 'month') { }

    private formatDateToYYYYMMDD(date: string | Date): string {
        // String already in YYYY-MM-DD — use directly to avoid UTC-midnight timezone shift
        if (typeof date === 'string') return date.split('T')[0];
        const d = date;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    private emptyCalendarResponse(): CalendarResponse {
        return {
            events: [],
            tasks: [],
            habits: [],
            totalTasks: 0,
            totalTasksCompleted: 0,
            taskCompletionRate: 0,
            totalHabits: 0,
            totalHabitsCompleted: 0,
            habitCompletionRate: 0
        };
    }

    /**
     * Convenience wrapper to fetch month view
     */
    getUserCalendarMonth(date: string): Observable<CalendarResponse> {
        return this.getUserCalendar(date, 'month');
    }

    getUserPlannerCalendarMonth(date: string): Observable<CalendarResponse> {
        return this.getUserPlannerCalendar(date, 'month');
    }

    getUserPlannerCalendarWeek(date: string): Observable<CalendarResponse> {
        return this.getCalendar(date, 'week');
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
                priority: event.priority,
                reminderOffset: event.reminderOffset ?? (event as any).reminder_offset ?? null
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
                createdBy: (task as any).createdBy ?? (task as any).created_by ?? (task as any).created_by_id ?? undefined,
                sharedWithParent: (task as any).sharedWithParent,
                reminderOffset: (task as any).reminderOffset ?? (task as any).reminder_offset ?? null
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
                createdBy: (habit as any).createdBy ?? (habit as any).created_by ?? (habit as any).created_by_id ?? undefined,
                sharedWithParent: (habit as any).sharedWithParent,
                reminderOffset: (habit as any).reminderOffset ?? (habit as any).reminder_offset ?? null
            });
        });

        // Sort events by start time
        return timelineEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
}
