import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, forkJoin } from 'rxjs';
import { CalendarResponse, TimelineEvent } from '../models/calendar.model';
import { environment } from 'src/environments/environment';
import { EventApi, EventDto } from '../api/event.api';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private readonly apiUrl = `${environment.apiUrl}/calendar`;

    constructor(
        private http: HttpClient,
        private eventApi: EventApi,
        private authService: AuthService
    ) { }

    getUserCalendar(date: string | Date, viewType: 'day' | 'month' = 'day', forceReload: boolean = false): Observable<CalendarResponse> {
        const dateStr = this.formatDateToYYYYMMDD(date);
        const url = `${this.apiUrl}/user-calendar?date=${dateStr}&viewType=${viewType}`;
        const calendar$ = this.http.get<CalendarResponse>(url).pipe(
            catchError(() => of(this.emptyCalendarResponse()))
        );

        // Planner Events have their own API and are not included in
        // /calendar/user-calendar. Only merge them for the Child flow so a
        // parent viewing a selected child never sees the parent's own events.
        const plannerEvents$ = this.authService.getUserRelationship() === 'CHILD'
            ? this.eventApi.getEvents().pipe(catchError(() => of([] as EventDto[])))
            : of([] as EventDto[]);

        return forkJoin({ calendar: calendar$, plannerEvents: plannerEvents$ }).pipe(
            map(({ calendar, plannerEvents }) => ({
                ...calendar,
                events: [
                    ...(calendar.events || []),
                    ...plannerEvents
                        .filter(event => this.eventOccursInView(event, dateStr, viewType))
                        .map(event => this.toCalendarEvent(event))
                ]
            }))
        );
    }

    /** No-op kept for call-site compatibility */
    clearCache(date?: string | Date, viewType?: 'day' | 'month') { }

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

    private eventOccursInView(event: EventDto, targetDate: string, viewType: 'day' | 'month'): boolean {
        const eventDate = String(event?.eventDate || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;

        if (viewType === 'month') {
            const targetMonth = targetDate.slice(0, 7);
            if (event.recurrence === 'ONE_TIME') return eventDate.slice(0, 7) === targetMonth;
            if (eventDate > `${targetMonth}-31`) return false;
            if (event.recurrence === 'YEARLY') return eventDate.slice(5, 7) === targetDate.slice(5, 7);
            return true;
        }

        if (event.recurrence === 'ONE_TIME') return eventDate === targetDate;
        if (eventDate > targetDate) return false;
        if (event.recurrence === 'YEARLY') return eventDate.slice(5) === targetDate.slice(5);
        return eventDate.slice(8) === targetDate.slice(8);
    }

    private toCalendarEvent(event: EventDto): CalendarResponse['events'][number] {
        const eventDate = String(event.eventDate).slice(0, 10);
        const reminderOffset = event.reminderMinutesBefore === 15
            ? 'MINUTES_15'
            : event.reminderMinutesBefore === 30
                ? 'MINUTES_30'
                : event.reminderMinutesBefore === 45
                    ? 'MINUTES_45'
                    : null;

        return {
            id: event.id,
            title: event.name,
            description: event.note || '',
            startDate: eventDate,
            endDate: eventDate,
            startTime: event.startTime || '00:00:00',
            endTime: event.endTime || '23:59:59',
            type: 'EVENT',
            completed: event.completed,
            family: null,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            tags: event.eventType ? [event.eventType] : [],
            daysOfWeek: [],
            priority: event.highPriority ? 'HIGH' : 'MEDIUM',
            everyday: false,
            reminderOffset,
            eventType: event.eventType,
            recurrence: event.recurrence,
            allDay: event.allDay
        };
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
