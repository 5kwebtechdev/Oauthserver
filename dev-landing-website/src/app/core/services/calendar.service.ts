import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CalendarResponse, TimelineEvent } from '../models/calendar.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private readonly apiUrl = `${environment.apiUrl}/calendar`;
    private readonly moodApiUrl = `${environment.apiUrl}/mood`;

    constructor(private http: HttpClient) { }

    /**
     * Get user calendar data for a specific date
     * @param date - Date in YYYY-MM-DD format
     * @param viewType - 'day' for single day data, 'month' for month overview (dots)
     */
    getUserCalendar(date: string, viewType: 'day' | 'month' = 'day', childId?: number | null): Observable<CalendarResponse> {
        let url = `${this.apiUrl}/user-calendar?date=${date}&viewType=${viewType}`;
        if (childId) url += `&childId=${childId}`;
        return this.http.get<CalendarResponse>(url);
    }

    getUserCalendarMonth(date: string, childId?: number | null): Observable<CalendarResponse> {
        return this.getUserCalendar(date, 'month', childId);
    }

    /**
     * Get mood vibes/transition data for a month
     * @param year - Year (e.g., 2026)
     * @param month - Month (1-12)
     */
    getMoodTransitionMonthly(year: number, month: number): Observable<any> {
        return this.http.get<any>(`${this.moodApiUrl}/vibes/transition/monthly?year=${year}&month=${month}`);
    }

    /**
     * Extract all dates from an item's date range, considering daysOfWeek if present
     */
    getDateRangeFromItem(item: any): string[] {
        const dates: string[] = [];

        // Get start and end dates
        const startDateStr = item.startDate || item.start_date || item.date;
        const endDateStr = item.endDate || item.end_date || item.date;

        if (!startDateStr) return dates;

        const startDate = new Date(startDateStr);
        const endDate = endDateStr ? new Date(endDateStr) : startDate;

        // If item has daysOfWeek, only include those specific days
        const daysOfWeek = item.daysOfWeek;
        const dayMap: { [key: string]: number } = {
            'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
            'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        };

        // Iterate through all dates in range
        const current = new Date(startDate);
        while (current <= endDate) {
            // If daysOfWeek is specified, check if current day is included
            if (daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
                const currentDayOfWeek = current.getDay();
                const isIncluded = daysOfWeek.some((day: string) => dayMap[day] === currentDayOfWeek);

                if (isIncluded) {
                    dates.push(this.formatDateToYYYYMMDD(current));
                }
            } else {
                // No daysOfWeek restriction, include all dates
                dates.push(this.formatDateToYYYYMMDD(current));
            }

            // Move to next day
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * Format a date to YYYY-MM-DD string
     */
    formatDateToYYYYMMDD(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    transformToTimelineEvents(response: CalendarResponse): TimelineEvent[] {
        const timelineEvents: TimelineEvent[] = [];

        // Transform events
        (response.events || []).forEach(event => {
            timelineEvents.push({
                id: event.id,
                title: event.title,
                startTime: event.startTime?.slice(0, 5) || '00:00',
                endTime: event.endTime?.slice(0, 5) || '00:00',
                type: 'timetable',
                description: event.description,
                tags: event.tags,
                priority: event.priority
            });
        });

        // Transform tasks
        (response.tasks || []).forEach(task => {
            timelineEvents.push({
                id: task.id,
                title: task.title,
                startTime: task.startTime?.slice(0, 5) || '00:00',
                endTime: task.endTime?.slice(0, 5) || '00:00',
                type: 'task',
                description: task.description,
                tags: task.tags,
                priority: task.priority
            });
        });

        // Transform habits
        (response.habits || []).forEach(habit => {
            timelineEvents.push({
                id: habit.id,
                title: habit.title,
                startTime: habit.startTime?.slice(0, 5) || '00:00',
                endTime: habit.endTime?.slice(0, 5) || '00:00',
                type: 'habit',
                description: habit.description,
                tags: habit.tags,
                priority: habit.priority,
                status: habit.status
            });
        });

        // Sort events by start time
        return timelineEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
}