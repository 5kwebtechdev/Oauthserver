import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CalendarResponse, TimelineEvent } from '../models/calendar.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private readonly apiUrl = `${environment.apiUrl}/v1/calendar`;

    constructor(private http: HttpClient) { }

    getUserCalendar(date: string): Observable<CalendarResponse> {
        return this.http.get<CalendarResponse>(`${this.apiUrl}/user-calendar?date=${date}`);
    }

    transformToTimelineEvents(response: CalendarResponse): TimelineEvent[] {
        const timelineEvents: TimelineEvent[] = [];

        // Transform events
        response.events.forEach(event => {
            timelineEvents.push({
                id: event.id,
                title: event.title,
                startTime: event.startTime,
                endTime: event.endTime,
                type: 'event',
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
                startTime: task.startTime,
                endTime: task.endTime,
                type: 'task',
                description: task.description,
                tags: task.tags,
                priority: task.priority
            });
        });

        // Transform habits
        response.habits.forEach(habit => {
            timelineEvents.push({
                id: habit.id,
                title: habit.title,
                startTime: habit.startTime.slice(0, 5), // Convert "HH:mm:ss" to "HH:mm"
                endTime: habit.endTime.slice(0, 5),
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