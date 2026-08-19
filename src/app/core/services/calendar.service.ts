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

    getUserCalendar(date: string | Date, viewType: 'day' | 'week' | 'month' = 'day', forceReload: boolean = false): Observable<CalendarResponse> {
        const includePersonalEvents = this.authService.getUserRelationship() === 'CHILD';
        return this.getCalendar(date, viewType, includePersonalEvents);
    }

    /**
     * The Figma Planner is available to Child, Self, and parent-selected-child
     * contexts. It is the only view that needs personal events merged for all
     * of those contexts; legacy calendar consumers retain their old behavior.
     */
    getUserPlannerCalendar(date: string | Date, viewType: 'day' | 'week' | 'month' = 'day'): Observable<CalendarResponse> {
        return this.getCalendar(date, viewType, true);
    }

    private getCalendar(date: string | Date, viewType: 'day' | 'week' | 'month', includePersonalEvents: boolean): Observable<CalendarResponse> {
        const dateStr = this.formatDateToYYYYMMDD(date);
        const url = `${this.apiUrl}/user-calendar?date=${dateStr}&viewType=${viewType}`;
        const calendar$ = this.http.get<CalendarResponse>(url).pipe(
            catchError(() => of({ ...this.emptyCalendarResponse(), loadError: true }))
        );

        // Personal events use their existing endpoint while Planner schedules
        // come from /calendar/user-calendar. The profile-selector interceptor
        // scopes this request to a selected child when a parent is viewing one.
        const plannerEvents$ = includePersonalEvents
            ? this.eventApi.getEvents().pipe(catchError(() => of([] as EventDto[])))
            : of([] as EventDto[]);

        return forkJoin({ calendar: calendar$, plannerEvents: plannerEvents$ }).pipe(
            map(({ calendar, plannerEvents }) => ({
                ...calendar,
                // The calendar API marks finished records with `expired: true`.
                // Exclude them before any screen builds its All/Habit/Task/Planner
                // lists or day indicators. Missing `expired` remains compatible with
                // older responses and is treated as active.
                habits: this.excludeExpired(calendar.habits),
                tasks: this.excludeExpired(calendar.tasks),
                events: [
                    ...this.excludeExpired(calendar.events),
                    ...plannerEvents
                        .filter(event => this.eventOccursInView(event, dateStr, viewType))
                        .map(event => this.toCalendarEvent(event))
                ]
            }))
        );
    }

    private excludeExpired<T>(items: T[] | null | undefined): T[] {
        return (items || []).filter((item: any) => {
            const expired = item?.expired;
            return expired !== true && String(expired).toLowerCase() !== 'true';
        });
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

    private eventOccursInView(event: EventDto, targetDate: string, viewType: 'day' | 'week' | 'month'): boolean {
        const eventDate = String(event?.eventDate || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;

        if (viewType === 'month') {
            const targetMonth = targetDate.slice(0, 7);
            if (event.recurrence === 'ONE_TIME') return eventDate.slice(0, 7) === targetMonth;
            if (eventDate > `${targetMonth}-31`) return false;
            if (event.recurrence === 'YEARLY') return eventDate.slice(5, 7) === targetDate.slice(5, 7);
            return true;
        }

        if (viewType === 'week') {
            const { start, end } = this.getWeekRange(targetDate);
            if (event.recurrence === 'ONE_TIME') return eventDate >= start && eventDate <= end;
            if (eventDate > end) return false;
            // Recurring events can't be range-matched by date string alone —
            // keep them visible for the week and let daily filtering downstream
            // (e.g. the day-of-week/anniversary check) narrow it further.
            return true;
        }

        if (event.recurrence === 'ONE_TIME') return eventDate === targetDate;
        if (eventDate > targetDate) return false;
        if (event.recurrence === 'YEARLY') return eventDate.slice(5) === targetDate.slice(5);
        return eventDate.slice(8) === targetDate.slice(8);
    }

    /** Monday–Sunday week (ISO week) containing `targetDate` (YYYY-MM-DD). */
    private getWeekRange(targetDate: string): { start: string; end: string } {
        const [year, month, day] = targetDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const isoDayIndex = (date.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6

        const monday = new Date(date);
        monday.setDate(date.getDate() - isoDayIndex);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return { start: this.formatDateToYYYYMMDD(monday), end: this.formatDateToYYYYMMDD(sunday) };
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

    getUserPlannerCalendarMonth(date: string): Observable<CalendarResponse> {
        return this.getUserPlannerCalendar(date, 'month');
    }

    getUserPlannerCalendarWeek(date: string): Observable<CalendarResponse> {
        return this.getUserPlannerCalendar(date, 'week');
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
