import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivityInputComponent } from '../activity-input/activity-input.component';
import { SupermeCardHeaderComponent } from '../../../components/superme-navigator/superme-card-header/superme-card-header.component';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { CalendarService } from '../../../services/calendar.service';
import { HabitApi } from '../../../api/habit.api';
import { Activity } from '../activity.types';

@Component({
    selector: 'app-activity-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ActivityInputComponent, SupermeCardHeaderComponent, ActivityCardComponent],
    templateUrl: './activity-dashboard.component.html',
    styleUrls: ['./activity-dashboard.component.scss']
})
export class ActivityDashboardComponent implements OnInit, OnDestroy {
    activities: Activity[] = [];
    tasks: any[] = [];
    timetable: any[] = [];

    isLoading = false;
    hasError = false;

    private destroy$ = new Subject<void>();

    constructor(
        private router: Router,
        private calendarService: CalendarService,
        private habitApi: HabitApi
    ) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load habits, tasks, and timetable for today using the day API
     */
    loadDashboardData(): void {
        this.isLoading = true;
        this.hasError = false;

        const today = new Date().toISOString().split('T')[0];

        // Use viewType=day API to get all data at once
        this.calendarService.getUserCalendar(today, 'day')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    // Process habits
                    this.activities = (response.habits || []).map((h: any) => ({
                        ...h,
                        type: h.type || 'habits',
                        startTimeStamp: this.extractTimestamp(h, today),
                        endTimeStamp: this.extractEndTimestamp(h, today)
                    }));

                    // Process tasks
                    this.tasks = (response.tasks || []).map((t: any) => ({
                        ...t,
                        type: 'tasks',
                        startTimeStamp: this.extractTimestamp(t, today),
                        endTimeStamp: this.extractEndTimestamp(t, today)
                    }));

                    // Process timetable/events
                    this.timetable = (response.events || []).map((e: any) => ({
                        ...e,
                        type: 'timetable',
                        startTimeStamp: this.extractTimestamp(e, today),
                        endTimeStamp: this.extractEndTimestamp(e, today)
                    }));

                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Error loading dashboard data:', err);
                    this.activities = [];
                    this.tasks = [];
                    this.timetable = [];
                    this.hasError = true;
                    this.isLoading = false;
                }
            });
    }

    /**
     * Extract start timestamp from item
     */
    private extractTimestamp(item: any, dateStr: string): number {
        const timeVal = item.startTime || item.start_time || item.time;
        if (!timeVal) return 0;

        if (typeof timeVal === 'number') return timeVal;
        if (typeof timeVal === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal)) {
            const parts = timeVal.split(':');
            const d = new Date(dateStr);
            d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
            return d.getTime();
        }
        const parsed = Date.parse(timeVal);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Extract end timestamp from item
     */
    private extractEndTimestamp(item: any, dateStr: string): number {
        const timeVal = item.endTime || item.end_time;
        if (!timeVal) return 0;

        if (typeof timeVal === 'number') return timeVal;
        if (typeof timeVal === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal)) {
            const parts = timeVal.split(':');
            const d = new Date(dateStr);
            d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
            return d.getTime();
        }
        const parsed = Date.parse(timeVal);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Refresh dashboard data
     */
    refresh(): void {
        this.loadDashboardData();
    }

    showActivityInput = false;

    openAddNew(evt: Event) {
        evt.preventDefault();
        this.showActivityInput = true;
    }

    closeActivityInput() {
        this.showActivityInput = false;
        // Refresh data after adding new habit/task
        this.loadDashboardData();
    }

    /** Emit an event requesting the host page open the habit detail inline (no URL change) */
    @Output() openActivity = new EventEmitter<any | null>();

    /**
     * Navigate to habit-detail page or emit event for inline view
     */
    openActivityView(activity?: Activity | any) {
        if (activity) {
            // Navigate to detail page with activity data
            const itemType = activity.type || 'habits';
            // Format today's date for the API
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
        } else {
            this.openActivity.emit(null);
        }
    }

    toggleHabit(index: number) {
        if (this.activities[index]) {
            (this.activities[index] as any).expanded = !(this.activities[index] as any).expanded;
        }
    }

    toggleTask(index: number) {
        if (this.tasks[index]) {
            this.tasks[index].expanded = !this.tasks[index].expanded;
        }
    }

    onStartHabit(index: number) {
        const habit = this.activities[index];
        if (!habit) return;

        console.log('Start habit', index, habit);

        // Call API to start habit
        this.habitApi.letsGoHabit(habit.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    // Update local state
                    this.activities[index] = { ...habit, status: 'ongoing' };
                    (this.activities[index] as any).expanded = false;
                },
                error: (err) => console.error('Failed to start habit:', err)
            });
    }

    /**
     * Open timetable in edit mode
     */
    openTimetableDetail(timetable: any): void {
        if (!timetable || !timetable.id) {
            console.warn('No timetable or timetable ID available for navigation');
            return;
        }

        console.log('🔵 Navigating to habit-input for timetable edit, ID:', timetable.id);

        this.router.navigate(
            ['/home/habit-input'],
            {
                state: {
                    habit: timetable,
                    type: 'timetable',
                    currentActive: 'timetable'
                }
            }
        ).then(success => {
            if (!success) {
                console.error('❌ Navigation to habit-input failed');
            } else {
                console.log('✅ Navigation to habit-input successful');
            }
        }).catch(err => {
            console.error('Navigation to habit-input failed:', err);
        });
    }

    /**
     * Check if a habit is currently in progress
     */
    isActivityInProgress(activity: Activity): boolean {
        if (!activity) return false;
        const now = Date.now();
        return activity.startTimeStamp <= now && now <= activity.endTimeStamp;
    }

    /**
     * Get formatted time string from timestamp
     */
    getFormattedTime(time: number): string {
        if (!time) return '00:00';
        try {
            const date = new Date(time);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return '00:00';
        }
    }
}
