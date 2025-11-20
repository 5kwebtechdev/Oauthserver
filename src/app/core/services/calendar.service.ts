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

    constructor(private http: HttpClient) { }

    getUserCalendar(date: string): Observable<CalendarResponse> {
        return this.http.get<CalendarResponse>(`${this.apiUrl}/user-calendar?date=${date}&viewType=month`);
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
            timelineEvents.push({
                id: task.id,
                title: task.title,
                startTime: task.startTime.slice(0, 5),
                endTime: task.endTime.slice(0, 5),
                type: 'task',
                description: task.description,
                tags: task.tags,
                priority: task.priority
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
                status: habit.status
            });
        });

        // Sort events by start time
        return timelineEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
}