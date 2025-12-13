import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { HabitService } from '../habit.service';
import { TaskApi } from '../../../api/task.api';
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';

/**
 * Reusable habit page content component that displays habits and tasks
 * with filtering, sorting, and date selection capabilities.
 * This component is designed to be embedded in any parent layout.
 */
@Component({
    standalone: true,
    selector: 'habit-page-content',
    templateUrl: './habit-page-content.component.html',
    styleUrls: ['./habit-page-content.component.scss'],
    imports: [
        CommonModule,
        IonicModule,
        HabitCardComponent,
        MindfulInputsModule,
        MindfulBadgeComponent
    ]
})
export class HabitPageContentComponent implements OnInit, OnDestroy {
    public currentMainTab: 'habits' | 'tasks' = 'habits';
    public showContent: boolean = true;

    public subFilter: 'journey' | 'priorities' | 'routine' | 'all' = 'journey';
    public journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'all' = 'pending';
    public prioritySubFilter: 'high' | 'medium' | 'low' | 'all' = 'high';
    public routineSubFilter: 'morning' | 'evening' | 'night' | 'all' = 'morning';

    public allHabits: Habit[] = [];
    public filteredHabits: Habit[] = [];
    public tasks: any[] = [];
    public filteredTasks: any[] = [];

    public selectedDate: Date = new Date();
    public currentTimestamp: number = Date.now();
    public loading: boolean = false;

    private subscriptions: Subscription = new Subscription();
    private timestampInterval: any;

    public showSingleMode: boolean = false;
    public singleModeHabit: Habit | null = null;
    public MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

    constructor(
        private habitService: HabitService,
        private taskApi: TaskApi
    ) { }

    ngOnInit(): void {
        this.initializeSubscriptions();
        this.loadInitialData();
        this.startTimestampInterval();
    }

    ngOnDestroy(): void {
        this.cleanupSubscriptions();
    }

    /**
     * Initialize habit service subscriptions
     */
    private initializeSubscriptions(): void {
        this.subscriptions.add(
            this.habitService.getHabits().subscribe(habits => {
                if (!habits?.length) return;
                console.log('[HabitPageContent] Received habits from service:', habits);
                this.allHabits = habits;
                this.applyFilters();
            })
        );
    }

    /**
     * Load initial data for habits and tasks
     */
    private loadInitialData(): void {
        this.loadHabits();
        this.loadTasksForSelectedDate(new Date());
    }

    /**
     * Start interval to update current timestamp for time-based filtering
     */
    private startTimestampInterval(): void {
        this.timestampInterval = setInterval(() => {
            this.currentTimestamp = Date.now();
            this.applyFilters();
        }, 60000);
    }

    /**
     * Clean up subscriptions and intervals
     */
    private cleanupSubscriptions(): void {
        this.subscriptions.unsubscribe();
        if (this.timestampInterval) {
            clearInterval(this.timestampInterval);
        }
    }

    /**
     * Handle date selection from calendar
     */
    onDateSelected(date: Date): void {
        this.selectedDate = date;
        this.loadHabits();
        this.loadTasksForSelectedDate(date);
    }

    /**
     * Load habits for the selected date
     */
    loadHabits(): void {
        this.loading = true;
        const formattedDate = this.habitService.formatDateToYYYYMMDD(this.selectedDate);
        console.log('[HabitPageContent] Loading habits for date:', formattedDate, 'Selected date:', this.selectedDate);

        this.subscriptions.add(
            this.habitService.loadHabitsForDate(formattedDate).subscribe({
                next: (res: any) => {
                    console.log('[HabitPageContent] LOADED HABITS:', res);
                    const habitData = Array.isArray(res) ? res : (res?.data || []);

                    this.allHabits = habitData.map((h: any) => ({
                        ...h,
                        status: h.status?.trim().toLowerCase(),
                        priority: h.priority?.trim().toLowerCase(),
                        routine: h.routine?.trim().toLowerCase(),
                    })) || [];

                    console.log('[HabitPageContent] Mapped habits:', this.allHabits);
                    console.log('[HabitPageContent] Current filters - subFilter:', this.subFilter, 'journeySubFilter:', this.journeySubFilter);
                    this.loading = false;
                    this.applyFilters();
                },
                error: (err) => {
                    console.error('[HabitPageContent] Error loading habits:', err);
                    this.loading = false;
                    this.allHabits = [];
                }
            })
        );
    }

    /**
     * Load tasks for the specified date
     */
    loadTasksForSelectedDate(date: Date): void {
        this.loading = true;
        const formatted = this.habitService.formatDateToYYYYMMDD(date);

        this.subscriptions.add(
            this.taskApi.getTasksByDate(formatted).subscribe({
                next: (res: any) => {
                    console.log('[HabitPageContent] LOADED TASKS:', res);
                    const list = Array.isArray(res?.data || res?.tasks || res)
                        ? res.data || res.tasks || res
                        : [];

                    this.tasks = list.map((t: any) => ({
                        ...t,
                        type: t.type || 'tasks',
                        startTimeStamp: this.getTaskStartTimestamp(t),
                        endTimeStamp: this.getTaskEndTimestamp(t),
                        status: t.status?.trim().toLowerCase(),
                        priority: t.priority?.trim().toLowerCase(),
                        routine: t.routine?.trim().toLowerCase(),
                    }));

                    this.loading = false;
                    this.applyFilters();
                },
                error: () => {
                    this.tasks = [];
                    this.loading = false;
                    this.applyFilters();
                }
            })
        );
    }

    /**
     * Parse task start timestamp
     */
    private getTaskStartTimestamp(task: any): number {
        const dt = new Date(`${task.startDate}T${task.startTime}`);
        return isNaN(dt.getTime()) ? 0 : dt.getTime();
    }

    /**
     * Parse task end timestamp
     */
    private getTaskEndTimestamp(task: any): number {
        const dt = new Date(`${task.endDate}T${task.endTime}`);
        return isNaN(dt.getTime()) ? Number.MAX_SAFE_INTEGER : dt.getTime();
    }

    /**
     * Switch between habits and tasks tabs
     */
    selectMainTab(tab: 'habits' | 'tasks'): void {
        this.currentMainTab = tab;
        this.applyFilters();
    }

    /**
     * Set sub-filter category
     */
    selectSubFilter(filter: 'journey' | 'priorities' | 'routine' | 'all'): void {
        this.subFilter = filter;
        this.applyFilters();
    }

    /**
     * Set journey filter (pending/ongoing/completed)
     */
    selectJourneySubFilter(filter: 'pending' | 'ongoing' | 'completed' | 'all'): void {
        this.journeySubFilter = filter;
        this.subFilter = 'journey';
        this.applyFilters();
    }

    /**
     * Set priority filter (high/medium/low)
     */
    selectPrioritySubFilter(filter: 'high' | 'medium' | 'low' | 'all'): void {
        this.prioritySubFilter = filter;
        this.subFilter = 'priorities';
        this.applyFilters();
    }

    /**
     * Set routine filter (morning/evening/night)
     */
    selectRoutineSubFilter(filter: 'morning' | 'evening' | 'night' | 'all'): void {
        this.routineSubFilter = filter;
        this.subFilter = 'routine';
        this.applyFilters();
    }

    /**
     * Apply all active filters to habits or tasks
     */
    private applyFilters(): void {
        if (this.currentMainTab === 'tasks') {
            this.filteredTasks = this.filterTasks();
        } else {
            this.filteredHabits = this.filterHabits();
        }
    }

    /**
     * Filter habits based on active filters
     */
    private filterHabits(): Habit[] {
        let list = this.filterByDate(this.allHabits);
        console.log('[HabitPageContent] After date filtering:', list);

        switch (this.subFilter) {
            case 'journey':
                if (this.journeySubFilter !== 'all') {
                    list = list.filter(h => h.status === this.journeySubFilter);
                    console.log('[HabitPageContent] After journey filtering (' + this.journeySubFilter + '):', list);
                }
                break;

            case 'priorities':
                if (this.prioritySubFilter !== 'all') {
                    list = list.filter(h => (h.priority || '').toLowerCase() === this.prioritySubFilter);
                    console.log('[HabitPageContent] After priority filtering (' + this.prioritySubFilter + '):', list);
                }
                break;

            case 'routine':
                if (this.routineSubFilter !== 'all') {
                    list = list.filter(h => (h.routine || '').toLowerCase() === this.routineSubFilter);
                    console.log('[HabitPageContent] After routine filtering (' + this.routineSubFilter + '):', list);
                }
                break;

            default:
                console.log('[HabitPageContent] No additional filtering (showing all)');
                break;
        }

        console.log('[HabitPageContent] Final filtered habits:', list);
        return list;
    }

    /**
     * Filter tasks based on active filters
     */
    private filterTasks(): any[] {
        let list = [...this.tasks];

        switch (this.subFilter) {
            case 'journey':
                if (this.journeySubFilter !== 'all') {
                    list = list.filter(t => t.status === this.journeySubFilter);
                }
                break;

            case 'priorities':
                if (this.prioritySubFilter !== 'all') {
                    list = list.filter(t => (t.priority || '').toLowerCase() === this.prioritySubFilter);
                }
                break;

            case 'routine':
                if (this.routineSubFilter !== 'all') {
                    list = list.filter(t => (t.routine || '').toLowerCase() === this.routineSubFilter);
                }
                break;
        }

        return list;
    }

    /**
     * Filter habits by selected date and day of week
     */
    private filterByDate(habits: Habit[]): Habit[] {
        if (!habits.length) return [];

        const selected = this.selectedDate;
        const day = selected
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toUpperCase();

        console.log('[HabitPageContent] Filtering by date:', selected, 'Day of week:', day);

        return habits.filter(h => {
            const start = h.startDate ? new Date(h.startDate) : selected;
            const end = h.endDate ? new Date(h.endDate) : selected;

            console.log('[HabitPageContent] Checking habit:', h.title, 'Start:', start, 'End:', end, 'Selected:', selected, 'Day:', day);
            console.log('[HabitPageContent] Habit selectedDays:', h.selectedDays);
            console.log('[HabitPageContent] Start date valid:', !isNaN(start.getTime()), 'End date valid:', !isNaN(end.getTime()));

            const isInRange = start <= selected && selected <= end;
            const hasCorrectDay = h.selectedDays && h.selectedDays.length > 0
                ? h.selectedDays.includes(day)
                : true;

            console.log('[HabitPageContent] Is in range:', isInRange, 'Has correct day:', hasCorrectDay);

            const result = isInRange && hasCorrectDay;
            console.log('[HabitPageContent] Including habit:', h.title, '?', result);

            return result;
        });
    }

    /**
     * Get habit priority summary for current date
     */
    get habitPrioritySummary() {
        return this.countByPriority(this.getHabitsForSelectedDate());
    }

    /**
     * Get task priority summary
     */
    get taskPrioritySummary() {
        return this.countByPriority(this.tasks);
    }

    /**
     * Get habits filtered by selected date
     */
    private getHabitsForSelectedDate(): Habit[] {
        if (!this.allHabits.length) return [];

        const selected = this.selectedDate;
        const day = selected
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toUpperCase();

        return this.allHabits.filter(habit => {
            const start = habit.startDate ? new Date(habit.startDate) : selected;
            const end = habit.endDate ? new Date(habit.endDate) : selected;
            const isInRange = start <= selected && selected <= end;
            const hasCorrectDay = habit.selectedDays && habit.selectedDays.length > 0
                ? habit.selectedDays.includes(day)
                : true;

            return isInRange && hasCorrectDay;
        });
    }

    /**
     * Count items by priority level
     */
    private countByPriority(items: Array<{ priority?: string }>) {
        const counts = { high: 0, medium: 0, low: 0 };

        items.forEach(item => {
            const priority = (item.priority || '').toLowerCase();
            if (priority === 'high') counts.high++;
            if (priority === 'medium') counts.medium++;
            if (priority === 'low') counts.low++;
        });

        return counts;
    }
}
