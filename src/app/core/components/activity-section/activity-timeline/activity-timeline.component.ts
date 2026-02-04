import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { TimelineEvent } from '../../../models/calendar.model';
import { Subscription, Observable } from 'rxjs';
import { CustomToastService, Toast } from '../../../services/custom-toast.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-activity-timeline',
  templateUrl: './activity-timeline.component.html',
  styleUrls: ['./activity-timeline.component.scss'],
  standalone: false
})
export class ActivityTimelineComponent implements OnInit, OnDestroy {
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
  public toast$: Observable<Toast | null>;

  constructor(
    private calendarService: CalendarService,
    private router: Router,
    private profileSelector: ProfileSelectorService,
    private modalCtrl: ModalController,
    private authService: AuthService
    , private toastService: CustomToastService
  ) {
    this.toast$ = this.toastService.toast$;
  }

  /** Expose parent-check for template */
  isParentUser(): boolean {
    try { return this.authService.isParentUser(); } catch { return false; }
  }

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
    this.router.navigateByUrl('/authed/activity-calendar');
  }

  onDateSelected(date: Date): void {
    this.selectedDate = this.formatDate(date);
    this.loadEvents();
  }

  onAddClick(): void {
    // Map current selector to ActivityInput tab keys and pass via navigation state
    const map: Record<string, string> = {
      all: 'habits',
      habit: 'habits',
      task: 'tasks',
      timetable: 'timetable'
    };
    const currentActive = map[this.selectedType] || 'habits';
    this.router.navigate(['/authed/activity-input'], { state: { currentActive } });
  }

  /**
   * Handle long-press on timetable event in activity-timeline
   */
  async onTimetableLongPress(event: TimelineEvent): Promise<void> {
    if (!event || !event.id) {
      return;
    }

    const eventType = event.type;

    // For timetable events, open activity-input in edit mode
    if (eventType === 'timetable') {
      const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
    const modal = await this.modalCtrl.create({
      component: ActivityInputComponent,
      componentProps: {
        editingHabit: event,
        initialTab: 'timetable'
      }
    });

    await modal.present();

    // Reload events when modal is dismissed
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadEvents();
    }
      return;
    }

    // For habits and tasks, navigate to activity-detail page
    if (eventType === 'habit' || eventType === 'task') {
      const itemType = eventType === 'habit' ? 'habits' : 'tasks';
      const itemId = Number(event.id);

      this.router.navigate(['/authed/activity-detail', itemId], {
        state: { 
          habit: event, 
          type: itemType, 
          fromLongPress: true,
          selectedDate: this.selectedDate 
        },
        queryParams: { type: itemType }
      }).catch(err => {
        console.error('Navigation to habit detail failed:', err);
      });
    }
  }
}
