import { Component, OnInit } from '@angular/core';
import { CalendarService } from '../../../services/calendar.service';
import { TimelineEvent } from '../../../models/calendar.model';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  standalone: false
})
export class TimelineComponent implements OnInit {
  allEvents: TimelineEvent[] = [];
  filteredEvents: TimelineEvent[] = [];
  selectedDate: string = this.formatDate(new Date());
  selectedType: string = 'all';

  constructor(private calendarService: CalendarService) { }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.calendarService.getUserCalendar(this.selectedDate).subscribe({
      next: (response) => {
        this.allEvents = this.calendarService.transformToTimelineEvents(response);
        this.filterEvents();
      },
      error: (error) => {
        console.error('Error fetching calendar events:', error);
        // Handle error appropriately
      }
    });
  }

  keysUpdated(selection: string[]) {
    this.selectedType = selection[0] || 'all';
    this.filterEvents();
  }

  filterEvents() {
    if (this.selectedType === 'all') {
      this.filteredEvents = [...this.allEvents];
    } else {
      this.filteredEvents = this.allEvents.filter(event => event.type === this.selectedType);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onNotesClick(): void {
    // TODO: implement notes action (open notes modal/page)
    console.log('Notes icon clicked');
  }

  onCalendarClick(): void {
    // TODO: implement calendar action (open calendar or navigate)
    console.log('Calendar icon clicked');
  }

  onDateSelected(date: Date): void {
    this.selectedDate = this.formatDate(date);
    this.loadEvents();
  }
}
