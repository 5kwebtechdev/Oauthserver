import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CalendarService } from '../../../services/calendar.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { TimelineEvent } from '../../../models/calendar.model';
import { Subscription, Observable } from 'rxjs';
import { CustomToastService, Toast } from '../../../services/custom-toast.service';
import { ModalController, ViewWillEnter } from '@ionic/angular';
import { HabitService } from '../habit.service';

const CACHE_KEY = 'timeline_events_cache';

@Component({
  selector: 'app-activity-timeline',
  templateUrl: './activity-timeline.component.html',
  styleUrls: ['./activity-timeline.component.scss'],
  standalone: false
})
export class ActivityTimelineComponent implements OnInit, OnDestroy, ViewWillEnter {
  allEvents: TimelineEvent[] = [];
  filteredEvents: TimelineEvent[] = [];
  selectedDate: string = this.formatDate(new Date());
  selectedType: string = 'all';

  totalHabits: number = 0;
  totalHabitsCompleted: number = 0;
  habitCompletionRate: number = 0;
  totalTasks: number = 0;
  totalTasksCompleted: number = 0;

  /** PRD Timeline color: Red 0-49, Yellow 50-79, Green 80-100 */
  timelineColor(pct: number): string {
    if (pct >= 80) return '#4CAF50';
    if (pct >= 50) return '#F0AD4E';
    return '#E74C3C';
  }

  get habitsColor(): string {
    const pct = this.totalHabits > 0 ? (this.totalHabitsCompleted / this.totalHabits * 100) : 0;
    return this.timelineColor(pct);
  }
  get tasksColor(): string {
    const pct = this.totalTasks > 0 ? (this.totalTasksCompleted / this.totalTasks * 100) : 0;
    return this.timelineColor(pct);
  }
  get habitRateColor(): string { return this.timelineColor(this.habitCompletionRate); }
  get taskRateColor(): string  { return this.timelineColor(this.taskCompletionRate); }
  taskCompletionRate: number = 0;

  private subscriptions = new Subscription();
  public toast$: Observable<Toast | null>;

  constructor(
    private calendarService: CalendarService,
    private router: Router,
    private profileSelector: ProfileSelectorService,
    private modalCtrl: ModalController,
    private authService: AuthService,
    private toastService: CustomToastService,
    private habitService: HabitService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.toast$ = this.toastService.toast$;
  }

  isParentUser(): boolean {
    try { return this.authService.isParentUser(); } catch { return false; }
  }

  get isCurrentDateView(): boolean {
    return this.selectedDate === this.formatDate(new Date());
  }

  get initialSelectedKeys(): string[] {
    return [this.selectedType];
  }

  ionViewWillEnter() {
    // Clear API cache and reload every time this screen becomes active —
    // covers ALL user types (regular + parent) on both first load and return navigation.
    this.calendarService.clearCache(this.selectedDate, 'day');
    this.loadEvents();
  }

  ngOnInit() {
    try {
      const savedType = sessionStorage.getItem('activity-timeline-selected-type');
      if (savedType && ['all', 'habit', 'task', 'timetable'].includes(savedType)) {
        this.selectedType = savedType;
      }
    } catch (e) { /* ignore */ }

    // Show stale localStorage cache instantly while fresh data loads
    this.loadFromCache();

    // Reload when parent switches to a different child (distinct change only — not initial selection)
    this.subscriptions.add(
      this.profileSelector.childChanged$.subscribe(() => {
        this.calendarService.clearCache(this.selectedDate, 'day');
        this.loadEvents();
      })
    );

    // Reload when habits/tasks are added/changed/deleted
    this.subscriptions.add(
      this.habitService.dataChanged$.subscribe(() => {
        this.calendarService.clearCache(this.selectedDate, 'day');
        this.loadEvents();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadEvents() {
    console.log('[Timeline][DEBUG] loadEvents() fetching for date ->', this.selectedDate);
    this.calendarService.getUserCalendar(this.selectedDate, 'day').subscribe({
      next: (response) => {
        console.log('[Timeline][DEBUG] loadEvents() response for', this.selectedDate, '->', JSON.stringify(response));
        // NgZone.run ensures Angular change detection fires even if the HTTP
        // callback arrives outside Angular's zone (common on Capacitor/Android)
        this.ngZone.run(() => {
          // The ProfileSelectorInterceptor already sends forUserId to the server,
          // so the response is already scoped to the selected child.
          const events = this.calendarService.transformToTimelineEvents(response);

          // A parent must never see an item the child explicitly marked
          // Private (sharedWithParent === false) — that's the whole point
          // of the Private toggle. Items with no such flag (events/timetable)
          // are left untouched.
          const visibleEvents = this.isParentUser()
            ? events.filter(e => e.sharedWithParent !== false)
            : events;

          this.allEvents = [...visibleEvents];
          this.filteredEvents = this.selectedType === 'all'
            ? [...visibleEvents]
            : [...visibleEvents.filter(e => e.type === this.selectedType)];

          this.totalHabits = response.totalHabits || 0;
          this.totalHabitsCompleted = response.totalHabitsCompleted || 0;
          this.habitCompletionRate = response.habitCompletionRate || 0;
          this.totalTasks = response.totalTasks || 0;
          this.totalTasksCompleted = response.totalTasksCompleted || 0;
          this.taskCompletionRate = response.taskCompletionRate || 0;

          // Persist to localStorage so next visit shows data instantly
          this.saveToCache(visibleEvents, response);

          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('[Timeline][DEBUG] Error fetching calendar events for', this.selectedDate, '->', error);
      }
    });
  }

  private loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (cached.date !== this.selectedDate) return; // stale date — ignore
      const events: TimelineEvent[] = cached.events || [];
      this.allEvents = [...events];
      this.filteredEvents = this.selectedType === 'all'
        ? [...events]
        : [...events.filter((e: TimelineEvent) => e.type === this.selectedType)];
      this.totalHabits = cached.totalHabits || 0;
      this.totalHabitsCompleted = cached.totalHabitsCompleted || 0;
      this.habitCompletionRate = cached.habitCompletionRate || 0;
      this.totalTasks = cached.totalTasks || 0;
      this.totalTasksCompleted = cached.totalTasksCompleted || 0;
      this.taskCompletionRate = cached.taskCompletionRate || 0;
      this.cdr.detectChanges();
    } catch (e) { /* ignore */ }
  }

  private saveToCache(events: TimelineEvent[], response: any) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        date: this.selectedDate,
        events,
        totalHabits: response.totalHabits || 0,
        totalHabitsCompleted: response.totalHabitsCompleted || 0,
        habitCompletionRate: response.habitCompletionRate || 0,
        totalTasks: response.totalTasks || 0,
        totalTasksCompleted: response.totalTasksCompleted || 0,
        taskCompletionRate: response.taskCompletionRate || 0,
      }));
    } catch (e) { /* ignore */ }
  }

  keysUpdated(selection: string[]) {
    this.selectedType = selection[0] || 'all';
    try {
      sessionStorage.setItem('activity-timeline-selected-type', this.selectedType);
    } catch (e) { /* ignore */ }
    this.filterEvents();
  }

  filterEvents() {
    this.filteredEvents = this.selectedType === 'all'
      ? [...this.allEvents]
      : [...this.allEvents.filter(event => event.type === this.selectedType)];
    this.cdr.detectChanges();
  }

  trackByEvent(_index: number, event: TimelineEvent) {
    return event.id;
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
    console.log('[Timeline][DEBUG] date selected ->', this.selectedDate);
    this.calendarService.clearCache(this.selectedDate, 'day');
    this.loadEvents();
  }

  onAddClick(): void {
    try {
      sessionStorage.setItem('activity-timeline-selected-type', this.selectedType);
    } catch (e) { /* ignore */ }

    const map: Record<string, string> = {
      all: 'habits', habit: 'habits', task: 'tasks', timetable: 'timetable'
    };
    const currentActive = map[this.selectedType] || 'habits';
    const origin = this.router.url || '/home';
    this.router.navigate(['/activity-input'], { state: { currentActive, origin } });
  }

  async onTimetableLongPress(event: TimelineEvent): Promise<void> {
    if (!event || !event.id) return;

    if (event.type === 'timetable') {
      const { ActivityInputComponent } = await import('../activity-input/activity-input.component');
      const modal = await this.modalCtrl.create({
        component: ActivityInputComponent,
        componentProps: { editingHabit: event, initialTab: 'timetable' }
      });
      await modal.present();
      const { data } = await modal.onWillDismiss();
      if (data) this.loadEvents();
      return;
    }

    if (event.type === 'habit' || event.type === 'task') {
      const itemType = event.type === 'habit' ? 'habits' : 'tasks';
      this.router.navigate(['/authed/activity-detail', Number(event.id)], {
        state: { habit: event, type: itemType, fromLongPress: true, selectedDate: this.selectedDate },
        queryParams: { type: itemType }
      }).catch(err => console.error('Navigation to habit detail failed:', err));
    }
  }
}
