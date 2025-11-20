import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CalendarService } from '../../../services/calendar.service';
import { TimelineEvent } from '../../../models/calendar.model';
import { NavigationContextService } from '../../../services/navigation-context.service';

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
  
  // Completion statistics
  totalHabits: number = 0;
  totalHabitsCompleted: number = 0;
  habitCompletionRate: number = 0;
  totalTasks: number = 0;
  totalTasksCompleted: number = 0;
  taskCompletionRate: number = 0;

  constructor(
    private calendarService: CalendarService,
    private router: Router,
    private navigationContext: NavigationContextService
  ) { }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.calendarService.getUserCalendar(this.selectedDate).subscribe({
      next: (response) => {
        this.allEvents = this.calendarService.transformToTimelineEvents(response);
        this.filterEvents();
        
        // Update completion statistics
        this.totalHabits = response.totalHabits || 0;
        this.totalHabitsCompleted = response.totalHabitsCompleted || 0;
        this.habitCompletionRate = response.habitCompletionRate || 0;
        this.totalTasks = response.totalTasks || 0;
        this.totalTasksCompleted = response.totalTasksCompleted || 0;
        this.taskCompletionRate = response.taskCompletionRate || 0;
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
    this.router.navigateByUrl('/authed/notes');
  }

  onCalendarClick(): void {
    // TODO: implement calendar action (open calendar or navigate)
    console.log('Calendar icon clicked');
  }

  onDateSelected(date: Date): void {
    this.selectedDate = this.formatDate(date);
    this.loadEvents();
  }

  onAddClick(): void {
    // Store the timeline route context before navigating
    this.navigationContext.pushContext('/authed/timeline', { selectedDate: this.selectedDate, selectedType: this.selectedType });
    this.router.navigateByUrl('/authed/habit-input');
  }
}
