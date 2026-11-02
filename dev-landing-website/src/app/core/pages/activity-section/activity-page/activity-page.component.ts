import { Component, AfterViewInit, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivityService } from '../activity.service';
import { TaskApi } from '../../../api/task.api';
import { Activity } from '../activity.types';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { SupermeInputsModule } from '../../../components/superme-inputs/superme-inputs.module';
import { SupermeSelectorsComponent } from '../../../components/superme-selectors/superme-selectors.component';
import { SupermeBadgeComponent } from '../../../components/superme-badge/superme-badge.component';
import { SupermeWeekComponent } from '../../../components/superme-inputs/superme-week/superme-week.component';
import { FooterComponent } from 'src/app/core/components/footer';
@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [
    CommonModule,
    NgForOf,
    NgIf,
    IonicModule,
    SupermeInputsModule,
    SupermeBadgeComponent,
    SupermeSelectorsComponent,
    ActivityCardComponent,
    PublicNavbarComponent,
    FooterComponent
  ],
  templateUrl: './activity-page.component.html',
  styleUrls: ['./activity-page.component.scss']
})
export class ActivityPageComponent implements OnInit, OnDestroy, AfterViewInit {
  activities: Activity[] = [];
  tasks: any[] = [];

  // Loading states
  isLoadingHabits = false;
  isLoadingTasks = false;

  // UI state
  currentMainTab: 'all' | 'habits' | 'tasks' = 'habits';
  selectedDate: Date = new Date();

  // Filter sub-state (journey / priority / routine)
  journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'skipped' | 'all' = 'all';
  prioritySubFilter: 'high' | 'medium' | 'low' | 'all' = 'all';
  routineSubFilter: 'morning' | 'evening' | 'night' | 'all' = 'all';

  // timestamp used for calculating inProgress badges
  currentTimestamp: number = Date.now();

  // Single-mode (expanded) view
  showSingleMode: boolean = false;
  singleModeActivity: Activity | null = null;

  // Summary counts for filters
  journeySummary = { pending: 0, ongoing: 0, completed: 0, skipped: 0 };
  prioritySummary = { high: 0, medium: 0, low: 0 };
  routineSummary = { morning: 0, evening: 0, night: 0 };

  private destroy$ = new Subject<void>();

  constructor(
    private activityService: ActivityService,
    private taskApi: TaskApi,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    console.log('[HabitPage] constructor');
  }

  ngOnInit(): void {
    console.log('[HabitPage] ngOnInit');
    this.loadDataForSelectedDate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load habits and tasks for the selected date
   */
  loadDataForSelectedDate(): void {
    const dateStr = this.formatDate(this.selectedDate);
    this.loadHabits(dateStr);
    this.loadTasks(dateStr);
  }

  /**
   * Load habits from backend for given date
   */
  loadHabits(dateStr: string): void {
    this.isLoadingHabits = true;
    this.activityService.loadHabitsForDate(dateStr, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (habits: any) => {
          this.activities = (habits || []).map((h: any) => ({
            ...h,
            type: h.type || 'habits'
          }));
          this.updateSummaries();
          this.isLoadingHabits = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('[HabitPage] Error loading habits:', err);
          this.activities = [];
          this.isLoadingHabits = false;
        }
      });
  }

  /**
   * Load tasks from backend for given date
   */
  loadTasks(dateStr: string): void {
    this.isLoadingTasks = true;
    this.taskApi.getTasksByDate(dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = (tasks || []).map((t: any) => ({
            ...t,
            type: 'tasks'
          }));
          this.isLoadingTasks = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('[HabitPage] Error loading tasks:', err);
          this.tasks = [];
          this.isLoadingTasks = false;
        }
      });
  }

  /**
   * Update summary counts for journey, priority, and routine filters
   */
  updateSummaries(): void {
    // Reset summaries
    this.journeySummary = { pending: 0, ongoing: 0, completed: 0, skipped: 0 };
    this.prioritySummary = { high: 0, medium: 0, low: 0 };
    this.routineSummary = { morning: 0, evening: 0, night: 0 };

    for (const h of this.activities) {
      // Journey (status) count
      const status = (h.status || 'pending').toLowerCase();
      if (status === 'pending') this.journeySummary.pending++;
      else if (status === 'ongoing') this.journeySummary.ongoing++;
      else if (status === 'completed') this.journeySummary.completed++;
      else if (status === 'skipped') this.journeySummary.skipped++;

      // Priority count
      const priority = (h.priority || 'medium').toLowerCase();
      if (priority === 'high') this.prioritySummary.high++;
      else if (priority === 'medium') this.prioritySummary.medium++;
      else if (priority === 'low') this.prioritySummary.low++;

      // Routine count
      const routine = (h.selectedRoutine || h.routine || '').toLowerCase();
      if (routine === 'morning') this.routineSummary.morning++;
      else if (routine === 'evening') this.routineSummary.evening++;
      else if (routine === 'night') this.routineSummary.night++;
    }
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Simple tab switcher
  selectMainTab(tab: 'all' | 'habits' | 'tasks') {
    this.currentMainTab = tab;
    // Load tasks if switching to tasks tab and not yet loaded
    if (tab === 'tasks' && this.tasks.length === 0 && !this.isLoadingTasks) {
      this.loadTasks(this.formatDate(this.selectedDate));
    }
  }

  // Filter selection handlers (used by the template)
  selectJourneySubFilter(filter: 'pending' | 'ongoing' | 'completed' | 'skipped' | 'all') {
    this.journeySubFilter = filter;
  }

  selectPrioritySubFilter(filter: 'high' | 'medium' | 'low' | 'all') {
    this.prioritySubFilter = filter;
  }

  selectRoutineSubFilter(filter: 'morning' | 'evening' | 'night' | 'all') {
    this.routineSubFilter = filter;
  }

  // Receive date from superme-week
  onDateSelected(date: Date) {
    this.selectedDate = date || new Date();
    this.loadDataForSelectedDate();
  }

  @ViewChild(SupermeWeekComponent) weekComponent?: SupermeWeekComponent;

  ngAfterViewInit(): void {
    console.log('[HabitPage] ngAfterViewInit');
    if (this.weekComponent) {
      this.weekComponent.setWeek(this.selectedDate);
      this.cdr.detectChanges();
    }
  }

  /** Move the selectedDate back by 7 days and update the week */
  prevWeek(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() - 7);
    this.selectedDate = d;
    this.weekComponent?.setWeek(this.selectedDate);
    this.loadDataForSelectedDate();
  }

  /** Move the selectedDate forward by 7 days and update the week */
  nextWeek(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + 7);
    this.selectedDate = d;
    this.weekComponent?.setWeek(this.selectedDate);
    this.loadDataForSelectedDate();
  }

  openCalendar() {
    this.router.navigateByUrl('/home/calendar-main');
  }

  /**
   * Navigate to Activity input page
   */
  openHabitInput(): void {
    this.router.navigateByUrl('/home/Activity-input');
  }

  /**
   * Navigate to timeline page
   */
  openTimeline(): void {
    this.router.navigateByUrl('/home/timeline');
  }

  // Apply filters to habits list
  get filteredActivities(): Activity[] {
    if (this.currentMainTab === 'tasks') return [];
    let list = this.activities || [];

    // Apply journey (status) filter
    if (this.journeySubFilter !== 'all') {
      list = list.filter(h => {
        const status = (h.status || 'pending').toLowerCase();
        return status === this.journeySubFilter;
      });
    }

    // Apply priority filter
    if (this.prioritySubFilter !== 'all') {
      list = list.filter(h => {
        const priority = (h.priority || 'medium').toLowerCase();
        return priority === this.prioritySubFilter;
      });
    }

    // Apply routine filter
    if (this.routineSubFilter !== 'all') {
      list = list.filter(h => {
        const routine = (h.selectedRoutine || h.routine || '').toLowerCase();
        return routine === this.routineSubFilter;
      });
    }

    return list;
  }

  get filteredTasks(): any[] {
    if (this.currentMainTab === 'habits') return [];
    return this.tasks || [];
  }

  /**
   * Check if a Activity is currently in progress based on timestamps
   */
  isActivityInProgress(activity: Activity): boolean {
    if (!activity) return false;
    const now = Date.now();
    return activity.startTimeStamp <= now && now <= activity.endTimeStamp;
  }

  /**
   * Navigate to Activity detail page
   */
  openActivityDetail(activity: Activity): void {
    const itemType = activity.type || 'habits';
    const today = new Date();
    const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.router.navigate(
      ['/home/activity-detail', activity.id],
      {
        state: {
          habit: activity,
          type: itemType,
          selectedDate: selectedDate
        },
        queryParams: { type: itemType }
      }
    );
  }

  openSingleMode(Activity: Activity) {
    this.singleModeActivity = Activity;
    this.showSingleMode = true;
  }

  closeSingleMode() {
    this.showSingleMode = false;
    this.singleModeActivity = null;
  }
}
