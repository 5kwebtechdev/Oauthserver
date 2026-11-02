import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TimelineEvent } from '../models/calendar.model';

export interface TimelineData {
  date: string;
  events: TimelineEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class TimelineDataService {
  private timelineDataSubject = new BehaviorSubject<TimelineData>({
    date: new Date().toISOString().split('T')[0],
    events: []
  });
  
  public timelineData$ = this.timelineDataSubject.asObservable();

  constructor() { }

  /**
   * Update timeline data
   */
  updateTimelineData(date: string, events: TimelineEvent[]): void {
    this.timelineDataSubject.next({
      date,
      events
    });
  }

  /**
   * Get current timeline data
   */
  getTimelineData(): Observable<TimelineData> {
    return this.timelineData$;
  }

  /**
   * Add a new event to the timeline
   */
  addEvent(event: TimelineEvent): void {
    const currentData = this.timelineDataSubject.value;
    const updatedEvents = [...currentData.events, event];
    this.timelineDataSubject.next({
      ...currentData,
      events: updatedEvents
    });
  }

  /**
   * Remove an event from the timeline
   */
  removeEvent(eventId: number): void {
    const currentData = this.timelineDataSubject.value;
    const updatedEvents = currentData.events.filter(event => event.id !== eventId);
    this.timelineDataSubject.next({
      ...currentData,
      events: updatedEvents
    });
  }

  /**
   * Update an existing event
   */
  updateEvent(updatedEvent: TimelineEvent): void {
    const currentData = this.timelineDataSubject.value;
    const updatedEvents = currentData.events.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    );
    this.timelineDataSubject.next({
      ...currentData,
      events: updatedEvents
    });
  }
}