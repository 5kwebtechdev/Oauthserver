import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CalendarService } from '../../../services/calendar.service';
import { TimelineEvent } from '../../../models/calendar.model';

interface EventPosition extends TimelineEvent {
  _top?: number;
  _height?: number;
  _column?: number;
  _columnCount?: number;
}

@Component({
  selector: 'app-activity-timeline',
  templateUrl: './activity-timeline.component.html',
  styleUrls: ['./activity-timeline.component.scss'],
  standalone: false
})
export class ActivityTimelineComponent implements OnInit, OnDestroy, OnChanges {
  allEvents: TimelineEvent[] = [];
  filteredEvents: EventPosition[] = [];
  selectedDate: string = this.formatDate(new Date());
  selectedType: string = 'all';

  // Completion statistics
  completionStats = {
    totalHabits: 0,
    completedHabits: 0,
    habitCompletionRate: 0,
    totalTasks: 0,
    completedTasks: 0,
    taskCompletionRate: 0
  };

  // Day-level stats for the week strip { 'YYYY-MM-DD': { habits: '3/5', tasks: '2/4' } }
  weekDayStats: { [dateKey: string]: { habits: string; tasks: string } } = {};

  showActivityInput = false;

  // Timeline visualization properties
  timeSlots: string[] = [];
  compressedSlots: { startHour: number, count: number }[] = [];
  hourHeight = 60;

  private destroy$ = new Subject<void>();

  constructor(
    private calendarService: CalendarService,
    private router: Router
  ) { }

  ngOnInit() {
    this.initializeTimeline();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filteredEvents'] && !changes['filteredEvents'].firstChange) {
      this.initializeTimeline();
    }
  }

  loadEvents() {
    this.calendarService.getUserCalendar(this.selectedDate, 'day')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allEvents = this.calendarService.transformToTimelineEvents(response);
          this.filterEvents();
          this.calculateCompletionStats(response);
        },
        error: (error) => {
          console.error('Error fetching calendar events:', error);
          this.allEvents = [];
          this.filteredEvents = [];
        }
      });
  }

  /**
   * Calculate completion statistics from the calendar response
   */
  calculateCompletionStats(response: any): void {
    const habits = response.habits || [];
    const tasks = response.tasks || [];

    // Habits statistics
    this.completionStats.totalHabits = habits.length;
    this.completionStats.completedHabits = habits.filter(
      (h: any) => h.status?.toLowerCase() === 'completed'
    ).length;
    this.completionStats.habitCompletionRate = this.completionStats.totalHabits > 0
      ? Math.round((this.completionStats.completedHabits / this.completionStats.totalHabits) * 100)
      : 0;

    // Tasks statistics
    this.completionStats.totalTasks = tasks.length;
    this.completionStats.completedTasks = tasks.filter(
      (t: any) => t.status?.toLowerCase() === 'completed'
    ).length;
    this.completionStats.taskCompletionRate = this.completionStats.totalTasks > 0
      ? Math.round((this.completionStats.completedTasks / this.completionStats.totalTasks) * 100)
      : 0;

    // Update the day cell stats for the week strip
    this.weekDayStats = {
      ...this.weekDayStats,
      [this.selectedDate]: {
        habits: `${this.completionStats.completedHabits}/${this.completionStats.totalHabits}`,
        tasks: `${this.completionStats.completedTasks}/${this.completionStats.totalTasks}`
      }
    };
  }

  keysUpdated(selection: string[]) {
    this.selectedType = selection[0] || 'all';
    this.filterEvents();
  }

  filterEvents() {
    if (this.selectedType === 'all') {
      this.filteredEvents = [...this.allEvents] as EventPosition[];
    } else {
      this.filteredEvents = this.allEvents.filter(event => event.type === this.selectedType) as EventPosition[];
    }
    this.initializeTimeline();
  }

  /**
   * Initialize timeline visualization (generate slots, compress empty blocks, assign positions)
   */
  private initializeTimeline(): void {
    this.generateTimeSlots();
    this.compressEmptyBlocks();
    this.assignEventPositions();
  }

  /**
   * Generate 24-hour time slots (00:00 to 23:00)
   */
  private generateTimeSlots(): void {
    this.timeSlots = Array.from({ length: 24 }, (_, i) =>
      `${i.toString().padStart(2, '0')}:00`
    );
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private parseTime(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Assign event positions (top, height, column) for timeline rendering
   */
  private assignEventPositions(): void {
    this.filteredEvents.sort((a, b) => this.parseTime(a.startTime) - this.parseTime(b.startTime));

    let currentGroup: EventPosition[] = [];
    let groupMaxEnd = 0;

    for (const event of this.filteredEvents) {
      const eventStart = this.parseTime(event.startTime);
      const eventEnd = this.parseTime(event.endTime);

      if (currentGroup.length === 0 || groupMaxEnd > eventStart) {
        currentGroup.push(event);
        groupMaxEnd = Math.max(groupMaxEnd, eventEnd);
      } else {
        this.assignColumns(currentGroup);
        currentGroup = [event];
        groupMaxEnd = eventEnd;
      }
    }

    if (currentGroup.length > 0) {
      this.assignColumns(currentGroup);
    }

    this.filteredEvents.forEach(event => {
      event._top = this.getCompressedTop(this.parseTime(event.startTime));
      const duration = this.parseTime(event.endTime) - this.parseTime(event.startTime);
      event._height = Math.max((duration / 60) * this.hourHeight, 36);
    });
  }

  /**
   * Assign column positions to overlapping events
   */
  private assignColumns(events: EventPosition[]): void {
    const slots: EventPosition[][] = [];

    for (const event of events) {
      let placed = false;
      for (const slot of slots) {
        if (this.parseTime(slot[slot.length - 1].endTime) <= this.parseTime(event.startTime)) {
          slot.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        slots.push([event]);
      }
    }

    const total = slots.length;
    slots.forEach((slot, colIndex) => {
      slot.forEach(e => {
        e._column = colIndex;
        e._columnCount = total;
      });
    });
  }

  /**
   * Identify and compress empty time blocks (5+ consecutive hours with no events)
   */
  private compressEmptyBlocks(): void {
    // If no events, don't compress - show full timeline
    if (!this.filteredEvents || this.filteredEvents.length === 0) {
      this.compressedSlots = [];
      return;
    }

    const occupied = new Set<number>();
    this.filteredEvents.forEach(e => {
      const startHour = Math.floor(this.parseTime(e.startTime) / 60);
      const endHour = Math.ceil(this.parseTime(e.endTime) / 60);
      for (let h = startHour; h < endHour; h++) {
        occupied.add(h);
      }
    });

    this.compressedSlots = [];
    let i = 0;

    while (i < 24) {
      if (!occupied.has(i)) {
        let start = i;
        while (i < 24 && !occupied.has(i)) i++;
        const gap = i - start;
        if (gap >= 5) {
          this.compressedSlots.push({ startHour: start, count: gap });
        }
      } else {
        i++;
      }
    }
  }

  /**
   * Calculate top position accounting for compressed blocks
   */
  getCompressedTop(minutes: number): number {
    const hour = Math.floor(minutes / 60);
    const skipHeight = 60; // compressed block height
    let top = 0;

    // Calculate top position considering compressed blocks
    for (let h = 0; h < hour; h++) {
      const compressedBlock = this.compressedSlots.find(
        block => h >= block.startHour && h < block.startHour + block.count
      );

      if (compressedBlock && h === compressedBlock.startHour) {
        // Add compressed height for the entire block
        top += skipHeight;
        h += compressedBlock.count - 1; // Skip the rest of compressed hours
      } else if (!compressedBlock) {
        // Add normal hour height
        top += this.hourHeight;
      }
    }

    // Add the minutes offset for the current hour
    const minuteOffset = minutes % 60;
    top += (minuteOffset / 60) * this.hourHeight;

    return top;
  }

  /**
   * Check if hour is part of a compressed block
   */
  isCompressedSlot(hour: number): boolean {
    return this.compressedSlots.some(
      block => hour >= block.startHour && hour < block.startHour + block.count
    );
  }

  /**
   * Get height of a compressed block
   */
  getCompressedHeight(hour: number): number {
    const block = this.compressedSlots.find(s => hour === s.startHour);
    if (!block) return 0;
    return 60; // compressed visual height
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onDateSelected(date: Date): void {
    this.selectedDate = this.formatDate(date);
    this.loadEvents();
  }

  onAddClick(): void {
    this.showActivityInput = true;
  }

  closeActivityInput(): void {
    this.showActivityInput = false;
    this.loadEvents();
  }

  /**
   * Navigate to habit detail page when an event is clicked
   */
  onEventClick(event: TimelineEvent): void {
    if (!event || !event.id) return;

    const itemType = event.type || 'habits';

    // Don't navigate for timetable items
    if (itemType === 'timetable') {
      console.log('Timetable item clicked, no detail page');
      return;
    }

    this.router.navigate(
      ['/home/habit-detail', event.id],
      {
        state: {
          habit: event,
          type: itemType
        },
        queryParams: { type: itemType }
      }
    );
  }
}
