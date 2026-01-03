import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CalendarService } from '../../../services/calendar.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { TimelineEvent } from '../../../models/calendar.model';
import { NavigationContextService } from '../../../services/navigation-context.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  standalone: false
})
export class TimelineComponent implements OnInit, OnDestroy {
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

  private subscriptions = new Subscription();

  constructor(
    private calendarService: CalendarService,
    private router: Router,
    private navigationContext: NavigationContextService,
    private profileSelector: ProfileSelectorService
  ) { }

  ngOnInit() {
    this.loadEvents();
    // Reload when parent switches child
    this.subscriptions.add(
      this.profileSelector.childChanged$.subscribe(() => this.loadEvents())
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadEvents() {
    // Interceptor handles userId - no need to pass manually
    this.calendarService.getUserCalendar(this.selectedDate, 'day').subscribe({
      next: (response) => {
        let events = this.calendarService.transformToTimelineEvents(response);

        // Filter by selected child if parent is viewing
        const selectedChildId = this.profileSelector.getChildId();
        if (selectedChildId !== null) {
          events = events.filter((e: any) => {
            const userId = e.userId ?? e.user_id ?? e.assignedTo ?? e.assigned_to;
            return userId == selectedChildId;
          });
        }

        this.allEvents = events;
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
