import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { HabitService } from '../habit.service';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { TaskApi } from '../../../api/task.api';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { AuthService } from '../../../services/auth.service';
import { Habit } from '../habit.types';
import { Subscription, filter, take } from 'rxjs';

@Component({
    standalone: true,
    selector: 'activity-page-content',
    templateUrl: './activity-page-content.component.html',
    styleUrls: ['./activity-page-content.component.scss'],
    imports: [CommonModule, IonicModule, ActivityCardComponent, MindfulInputsModule, MindfulBadgeComponent, EmptyStateComponent]
})

export class ActivityPageContentComponent implements OnInit, OnDestroy {
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
        private route: ActivatedRoute,
        private profileSelector: ProfileSelectorService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) { }

    /**
     * Whether to show the pet illustration in empty states.
     * Pets are hidden for parent accounts.
     */
    public get showPet(): boolean {
        try {
            return !this.authService || !this.authService.isParentUser ? true : !this.authService.isParentUser();
        } catch (e) {
            return true;
        }
    }

    ngOnInit(): void {
        // Ensure we show today's data by default when component opens
        this.selectedDate = new Date();
        this.checkRouteParameters();
        this.initializeSubscriptions();

        // If parent user, wait for a child to be selected before loading data
        // Otherwise load immediately
        if (this.authService.isParentUser()) {
            // Check if child already selected
            if (this.profileSelector.hasSelectedChild()) {
                this.loadInitialData();
            } else {
                // Wait for first child selection, then load data
                this.subscriptions.add(
                    this.profileSelector.child$.pipe(
                        filter(childId => childId !== null),
                        take(1)
                    ).subscribe(() => {
                        this.loadInitialData();
                    })
                );
            }

            // Reload when selected child changes (parent switches child)
            this.subscriptions.add(
                this.profileSelector.childChanged$.subscribe(() => {
                    this.loadHabits(true);
                    this.loadTasksForSelectedDate(this.selectedDate);
                })
            );
        } else {
            // Regular user - load immediately
            this.loadInitialData();
        }

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
                    // Interceptor already filters by selected child - no manual filtering needed
                    this.allHabits = habits;
                    this.applyFilters();
                }
            })
        );
        // Reload when habits/tasks are added/changed elsewhere (create/update/delete)
        this.subscriptions.add(
            this.habitService.dataChanged$.subscribe(evt => {
                if (!evt) return;
                if (evt.type === 'habit') {
                    // refresh habits for current date
                    this.loadHabits(true);
                }
                if (evt.type === 'task') {
                    this.loadTasksForSelectedDate(this.selectedDate);
                }
            })
        );
    }

    private loadInitialData(): void {
        this.loadHabits();
        this.loadTasksForSelectedDate(new Date());
    }

    private startTimestampInterval(): void {
        // Reduced polling from 1 minute to 5 minutes to prevent excessive change detection
        // Using markForCheck() instead of detectChanges() to avoid forced cycles
        this.timestampInterval = setInterval(() => {
            this.currentTimestamp = Date.now();
            this.applyFilters();
            try { this.cdr.markForCheck(); } catch (e) { /* ignore */ }
        }, 300000);
    }

    onDateSelected(date: Date): void {
        this.selectedDate = date;
        this.loadHabits();
        this.loadTasksForSelectedDate(date);
    }

    /**
     * Get the selected date as a YYYY-MM-DD string
     */
    getSelectedDateString(): string {
        const date = this.selectedDate;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    loadHabits(forceReload: boolean = false): void {
        this.loading = true;
        const formattedDate = this.habitService.formatDateToYYYYMMDD(this.selectedDate);

        this.subscriptions.add(
            this.habitService.loadHabitsForDate(formattedDate, forceReload).subscribe({
                next: (res: any) => {
                    let habitData = Array.isArray(res) ? res : (res?.data || []);

                    // ONLY filter by selected child if PARENT is viewing a child profile
                    const isParent = this.authService.isParentUser();
                    const selectedChildId = this.profileSelector.getChildId();
                    if (isParent && selectedChildId !== null) {
                        habitData = habitData.filter((h: any) => {
                            const habitUserId = h.userId ?? h.user_id ?? h.assignedTo ?? h.assigned_to;
                            return habitUserId == selectedChildId;
                        });
                    }

                    this.allHabits = habitData.map((h: any) => ({
                        ...h,
                        status: this.normalizeStatus(h.status),
                        priority: h.priority?.trim().toLowerCase(),
                        routine: h.routine?.trim().toLowerCase(),
                        // Ensure startTimeStamp is calculated for today's date for recurring items
                        startTimeStamp: (() => {
                          const isRecurring = h.daysOfWeek?.length || h.everyday || h.everyWeekend;
                          const ts = this.buttonLogic.calculateTimestamps(
                            isRecurring ? { ...h, startDate: formattedDate, endDate: formattedDate } : h
                          );
                          return ts.startTimeStamp;
                        })(),
                        endTimeStamp: (() => {
                          const isRecurring = h.daysOfWeek?.length || h.everyday || h.everyWeekend;
                          const ts = this.buttonLogic.calculateTimestamps(
                            isRecurring ? { ...h, startDate: formattedDate, endDate: formattedDate } : h
                          );
                          return ts.endTimeStamp;
                        })()
                    }));
                    this.loading = false;
                    this.applyFilters();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
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
                    let list = Array.isArray(res?.data || res?.tasks || res) ? res.data || res.tasks || res : [];

                    // ONLY filter by selected child if PARENT is viewing a child profile
                    const isParent = this.authService.isParentUser();
                    const selectedChildId = this.profileSelector.getChildId();
                    if (isParent && selectedChildId !== null) {
                        list = list.filter((t: any) => {
                            const taskUserId = t.userId ?? t.user_id ?? t.assignedTo ?? t.assigned_to;
                            return taskUserId == selectedChildId;
                        });
                    }

                    this.tasks = list.map((t: any) => {
                        // For recurring items, use today's date to calculate correct timestamps
                        const isRecurring = t.daysOfWeek?.length || t.everyday || t.everyWeekend;
                        const itemForTimestamp = isRecurring ? { ...t, startDate: formatted, endDate: formatted } : { ...t, startDate: t.startDate || formatted, endDate: t.endDate || formatted };
                        const timestamps = this.buttonLogic.calculateTimestamps(itemForTimestamp);
                        return {
                            ...t,
                            type: t.type || 'tasks',
                            startTimeStamp: timestamps.startTimeStamp,
                            endTimeStamp: timestamps.endTimeStamp,
                            status: this.buttonLogic.normalizeStatus(t.status),
                            priority: t.priority?.trim().toLowerCase(),
                            routine: t.routine?.trim().toLowerCase(),
                            // Normalize reward/streak fields so ActivityCardComponent can read them
                            coinReward: Number(t.coinReward ?? t.rewardCoins ?? t.reward_coins ?? t.rewardsCoins ?? t.rewards?.coins ?? t.rewards?.rewardCoins ?? 0),
                            coinsEarned: Number(t.coinsEarned ?? t.coins ?? t.coins_earned ?? 0),
                            streak: Number(t.streak ?? t.streakCount ?? t.streak_count ?? 0),
                            highestStreak: Number(t.highestStreak ?? t.topStreak ?? t.highest_streak ?? 0),
                        };
                    });
                    this.loading = false;
                    this.applyFilters();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
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

            // Ensure each rendered list is ordered by upcoming time
            this.filteredTasksByJourney = this.sortArrayByUpcoming(this.filteredTasksByJourney);
            this.filteredTasksByPriority = this.sortArrayByUpcoming(this.filteredTasksByPriority);
            this.filteredTasksByRoutine = this.sortArrayByUpcoming(this.filteredTasksByRoutine);

            // Maintain a unified filteredTasks reference based on current subFilter
            switch (this.subFilter) {
                case 'priorities':
                    this.filteredTasks = this.filteredTasksByPriority;
                    break;
                case 'routine':
                    this.filteredTasks = this.filteredTasksByRoutine;
                    break;
                case 'all':
                    this.filteredTasks = this.sortArrayByUpcoming(this.tasks.slice());
                    break;
                default:
                    this.filteredTasks = this.filteredTasksByJourney;
            }
        } else {
            const dateFiltered = this.filterByDate(this.allHabits);
            this.filteredHabitsByJourney = this.filterByStatus(dateFiltered);
            this.filteredHabitsByPriority = this.filterByPriority(dateFiltered);
            this.filteredHabitsByRoutine = this.filterByRoutine(dateFiltered);

            // Ensure each rendered list is ordered by upcoming time
            this.filteredHabitsByJourney = this.sortArrayByUpcoming(this.filteredHabitsByJourney);
            this.filteredHabitsByPriority = this.sortArrayByUpcoming(this.filteredHabitsByPriority);
            this.filteredHabitsByRoutine = this.sortArrayByUpcoming(this.filteredHabitsByRoutine);

            switch (this.subFilter) {
                case 'priorities':
                    this.filteredHabits = this.filteredHabitsByPriority;
                    break;
                case 'routine':
                    this.filteredHabits = this.filteredHabitsByRoutine;
                    break;
                case 'all':
                    this.filteredHabits = this.sortArrayByUpcoming(dateFiltered.slice());
                    break;
                default:
                    this.filteredHabits = this.filteredHabitsByJourney;
            }
        }
    }

        // Helper to sort arrays by upcoming startTimeStamp
        private sortArrayByUpcoming(arr: any[] = []): any[] {
            if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
            const now = Date.now();
            const future = arr.filter(i => (Number(i?.startTimeStamp || 0) >= now)).sort((a,b) => Number(a.startTimeStamp || 0) - Number(b.startTimeStamp || 0));
            const past = arr.filter(i => (Number(i?.startTimeStamp || 0) < now)).sort((a,b) => Number(b.startTimeStamp || 0) - Number(a.startTimeStamp || 0));
            return future.concat(past);
        }

    private filterByStatus(items: any[]): any[] {
        if (this.journeySubFilter === 'all') return items;

        // When viewing 'pending' journey, include both 'pending' and 'skipped' statuses
        if (this.journeySubFilter === 'pending') {
            return items.filter(i => {
                const s = (i?.status || '').toLowerCase();
                return s === 'pending' || s === 'skipped';
            });
        }

        return items.filter(i => (i?.status || '').toLowerCase() === this.journeySubFilter);
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

    /**
     * Check if the selected date is today
     */
    isSelectedDateToday(): boolean {
        if (!this.selectedDate) return false;
        const today = new Date();
        return this.habitService.formatDateToYYYYMMDD(this.selectedDate) === this.habitService.formatDateToYYYYMMDD(today);
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

    /**
     * Public method to refresh all data (called from parent on pull-to-refresh)
     */
    public async refresh(): Promise<void> {
        console.log('[HabitPageContent] Refreshing data...');
        this.loadHabits(true);
        this.loadTasksForSelectedDate(this.selectedDate);
    }

    /**
     * Handle single tap on a habit/task card - open single mode view
     */
    onCardTap(habit: any): void {
        this.singleModeHabit = habit;
        this.showSingleMode = true;
        try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
    }

    /**
     * Handle long press on a habit/task card
     * Navigation is already handled by activity-card component
     */
    onCardLongPress(habit: any): void {
        // Long press navigation is handled by activity-card component
        // This handler can be used for parent-level logic if needed
        console.log('[HabitPageContent] Card long-pressed:', habit?.title);
    }

    /**
     * Close single mode view
     */
    closeSingleMode(): void {
        this.showSingleMode = false;
        this.singleModeHabit = null;
        try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
    }
}
