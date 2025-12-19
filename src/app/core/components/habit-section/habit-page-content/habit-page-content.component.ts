import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { HabitService } from '../habit.service';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { TaskApi } from '../../../api/task.api';
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';

@Component({
    standalone: true,
    selector: 'habit-page-content',
    templateUrl: './habit-page-content.component.html',
    styleUrls: ['./habit-page-content.component.scss'],
    imports: [CommonModule, IonicModule, HabitCardComponent, MindfulInputsModule, MindfulBadgeComponent]
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
    public filteredHabitsByJourney: Habit[] = [];
    public filteredHabitsByPriority: Habit[] = [];
    public filteredHabitsByRoutine: Habit[] = [];

    public tasks: any[] = [];
    public filteredTasks: any[] = [];
    public filteredTasksByJourney: any[] = [];
    public filteredTasksByPriority: any[] = [];
    public filteredTasksByRoutine: any[] = [];

    public selectedDate: Date = new Date();
    public currentTimestamp: number = Date.now();
    public loading: boolean = false;
    public showSingleMode: boolean = false;
    public singleModeHabit: Habit | null = null;
    public readonly MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

    private subscriptions = new Subscription();
    private timestampInterval: any;

    constructor(
        private habitService: HabitService,
        private buttonLogic: HabitButtonLogicService,
        private taskApi: TaskApi,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.checkRouteParameters();
        this.initializeSubscriptions();
        this.loadInitialData();
        this.startTimestampInterval();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        if (this.timestampInterval) clearInterval(this.timestampInterval);
    }

    private checkRouteParameters(): void {
        this.subscriptions.add(
            this.route.queryParams.subscribe(params => {
                if (params['date']) {
                    const paramDate = new Date(params['date']);
                    if (!isNaN(paramDate.getTime())) this.selectedDate = paramDate;
                }
            })
        );
    }

    private initializeSubscriptions(): void {
        this.subscriptions.add(
            this.habitService.getHabits().subscribe(habits => {
                if (habits?.length) {
                    this.allHabits = habits;
                    this.applyFilters();
                }
            })
        );
    }

    private loadInitialData(): void {
        this.loadHabits();
        this.loadTasksForSelectedDate(new Date());
    }

    private startTimestampInterval(): void {
        this.timestampInterval = setInterval(() => {
            this.currentTimestamp = Date.now();
            this.applyFilters();
        }, 60000);
    }

    onDateSelected(date: Date): void {
        this.selectedDate = date;
        this.loadHabits();
        this.loadTasksForSelectedDate(date);
    }

    loadHabits(forceReload: boolean = false): void {
        this.loading = true;
        const formattedDate = this.habitService.formatDateToYYYYMMDD(this.selectedDate);

        this.subscriptions.add(
            this.habitService.loadHabitsForDate(formattedDate, forceReload).subscribe({
                next: (res: any) => {
                    const habitData = Array.isArray(res) ? res : (res?.data || []);
                    this.allHabits = habitData.map((h: any) => ({
                        ...h,
                        status: this.normalizeStatus(h.status),
                        priority: h.priority?.trim().toLowerCase(),
                        routine: h.routine?.trim().toLowerCase(),
                    }));
                    this.loading = false;
                    this.applyFilters();
                },
                error: () => {
                    this.loading = false;
                    this.allHabits = [];
                }
            })
        );
    }

    loadTasksForSelectedDate(date: Date): void {
        this.loading = true;
        const formatted = this.habitService.formatDateToYYYYMMDD(date);

        this.subscriptions.add(
            this.taskApi.getTasksByDate(formatted).subscribe({
                next: (res: any) => {
                    const list = Array.isArray(res?.data || res?.tasks || res) ? res.data || res.tasks || res : [];
                    this.tasks = list.map((t: any) => {
                        const timestamps = this.buttonLogic.calculateTimestamps({
                            ...t,
                            startDate: t.startDate || formatted,
                            endDate: t.endDate || formatted
                        });
                        return {
                            ...t,
                            type: t.type || 'tasks',
                            startTimeStamp: timestamps.startTimeStamp,
                            endTimeStamp: timestamps.endTimeStamp,
                            status: this.buttonLogic.normalizeStatus(t.status),
                            priority: t.priority?.trim().toLowerCase(),
                            routine: t.routine?.trim().toLowerCase(),
                        };
                    });
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

    private normalizeStatus(status: any): 'pending' | 'ongoing' | 'completed' | 'skipped' {
        return this.buttonLogic.normalizeStatus(status);
    }

    selectMainTab(tab: 'habits' | 'tasks'): void {
        this.currentMainTab = tab;
        this.applyFilters();
    }

    selectSubFilter(filter: 'journey' | 'priorities' | 'routine' | 'all'): void {
        this.subFilter = filter;
        this.applyFilters();
    }

    selectJourneySubFilter(filter: 'pending' | 'ongoing' | 'completed' | 'all'): void {
        this.journeySubFilter = filter;
        this.applyFilters();
    }

    selectPrioritySubFilter(filter: 'high' | 'medium' | 'low' | 'all'): void {
        this.prioritySubFilter = filter;
        this.applyFilters();
    }

    selectRoutineSubFilter(filter: 'morning' | 'evening' | 'night' | 'all'): void {
        this.routineSubFilter = filter;
        this.applyFilters();
    }

    private applyFilters(): void {
        if (this.currentMainTab === 'tasks') {
            this.filteredTasksByJourney = this.filterByStatus(this.tasks);
            this.filteredTasksByPriority = this.filterByPriority(this.tasks);
            this.filteredTasksByRoutine = this.filterByRoutine(this.tasks);
            this.filteredTasks = this.filteredTasksByJourney;
        } else {
            const dateFiltered = this.filterByDate(this.allHabits);
            this.filteredHabitsByJourney = this.filterByStatus(dateFiltered);
            this.filteredHabitsByPriority = this.filterByPriority(dateFiltered);
            this.filteredHabitsByRoutine = this.filterByRoutine(dateFiltered);
            this.filteredHabits = this.filteredHabitsByJourney;
        }
    }

    private filterByStatus(items: any[]): any[] {
        return this.journeySubFilter === 'all' ? items : items.filter(i => i.status === this.journeySubFilter);
    }

    private filterByPriority(items: any[]): any[] {
        return this.prioritySubFilter === 'all' ? items : items.filter(i => (i.priority || '').toLowerCase() === this.prioritySubFilter);
    }

    private filterByRoutine(items: any[]): any[] {
        return this.routineSubFilter === 'all' ? items : items.filter(i => (i.routine || '').toLowerCase() === this.routineSubFilter);
    }

    private filterByDate(habits: Habit[]): Habit[] {
        if (!habits.length) return [];
        const day = this.selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        return habits.filter(h => {
            const start = h.startDate ? new Date(h.startDate) : this.selectedDate;
            const end = h.endDate ? new Date(h.endDate) : this.selectedDate;
            const isInRange = start <= this.selectedDate && this.selectedDate <= end;
            const hasCorrectDay = h.selectedDays?.length > 0 ? h.selectedDays.includes(day) : true;
            return isInRange && hasCorrectDay;
        });
    }

    get habitPrioritySummary() {
        return this.countByPriority(this.getHabitsForSelectedDate());
    }

    get taskPrioritySummary() {
        return this.countByPriority(this.tasks);
    }

    get habitJourneySummary() {
        return this.countByJourney(this.getHabitsForSelectedDate());
    }

    get taskJourneySummary() {
        return this.countByJourney(this.tasks);
    }

    get habitRoutineSummary() {
        return this.countByRoutine(this.getHabitsForSelectedDate());
    }

    get taskRoutineSummary() {
        return this.countByRoutine(this.tasks);
    }

    private getHabitsForSelectedDate(): Habit[] {
        return this.filterByDate(this.allHabits);
    }

    private countByJourney(items: Array<{ status?: string }>) {
        const counts = { pending: 0, ongoing: 0, completed: 0 };
        items?.forEach(item => {
            const s = (item?.status || '').toLowerCase();
            if (s === 'pending' || s === 'skipped') counts.pending++;
            else if (s === 'ongoing') counts.ongoing++;
            else if (s === 'completed') counts.completed++;
        });
        return counts;
    }

    private countByRoutine(items: Array<{ routine?: string }>) {
        const counts = { morning: 0, evening: 0, night: 0 };
        items?.forEach(item => {
            const r = (item?.routine || '').toLowerCase();
            if (r === 'morning') counts.morning++;
            else if (r === 'evening') counts.evening++;
            else if (r === 'night') counts.night++;
        });
        return counts;
    }

    private countByPriority(items: Array<{ priority?: string }>) {
        const counts = { high: 0, medium: 0, low: 0 };
        items?.forEach(item => {
            const p = (item.priority || '').toLowerCase();
            if (p === 'high') counts.high++;
            else if (p === 'medium') counts.medium++;
            else if (p === 'low') counts.low++;
        });
        return counts;
    }
}
