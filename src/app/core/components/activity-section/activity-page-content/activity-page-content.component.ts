import { Component, OnInit, OnDestroy, ChangeDetectorRef, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { SupermeBadgeComponent } from '../../superme-badge/superme-badge.component';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { HabitService } from '../habit.service';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { TaskApi } from '../../../api/task.api';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { AuthService } from '../../../services/auth.service';
import { PetAgeService } from '../../../services/pet-age.service';
import { CustomToastService, Toast } from '../../../services/custom-toast.service';
import { Habit } from '../habit.types';
import { CalendarService } from '../../../services/calendar.service';
import { CalendarResponse } from '../../../models/calendar.model';
import { Observable, Subscription, filter, take } from 'rxjs';

@Component({
    standalone: true,
    selector: 'activity-page-content',
    templateUrl: './activity-page-content.component.html',
    styleUrls: ['./activity-page-content.component.scss'],
    imports: [CommonModule, IonicModule, ActivityCardComponent, SupermeInputsModule, SupermeBadgeComponent, EmptyStateComponent, AdBannerComponent]
})

export class ActivityPageContentComponent implements OnInit, OnDestroy {
    @Output() back = new EventEmitter<void>();

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

    /** Latest Figma calendar controls. These are kept separate from the legacy filters. */
    public childCalendarTab: 'all' | 'habit' | 'task' | 'planner' = 'all';
    public childStatusFilter: 'pending' | 'ongoing' | 'completed' | 'skipped' = 'pending';
    public childDateActivities: Record<string, { habit?: boolean; task?: boolean; planner?: boolean }> = {};
    public childPlannerItems: any[] = [];

    // Normalize timestamps coming from API: if timestamp looks like seconds, convert to ms
    private normalizeTimestamp(ts: any): number {
        if (!ts && ts !== 0) return ts;
        const n = Number(ts) || 0;
        // If timestamp looks like seconds (less than 1e12), convert to milliseconds
        return n > 0 && n < 1e12 ? n * 1000 : n;
    }
    private subscriptions = new Subscription();
    private timestampInterval: any;

    // Observable for shared toast service
    toast$: Observable<Toast | null>;

    constructor(
        private habitService: HabitService,
        private buttonLogic: HabitButtonLogicService,
        private taskApi: TaskApi,
        private calendarService: CalendarService,
        private route: ActivatedRoute,
        private profileSelector: ProfileSelectorService,
        private authService: AuthService,
        private petAgeService: PetAgeService,
        private cdr: ChangeDetectorRef,
        private toastService: CustomToastService
    ) {
        this.toast$ = this.toastService.toast$;
    }

    /** The new calendar design is intentionally limited to linked Child accounts. */
    public get isChildCalendarDesign(): boolean {
        return String(this.authService.getUserRelationship() || '').toUpperCase() === 'CHILD';
    }

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

    public get currentPetBaseImage(): string {
        return this.petAgeService.getPetImagePath('base');
    }

    public get currentPetImageAlt(): string {
        return this.petAgeService.getPetImageAlt();
    }

    get adScreen(): AdScreen {
        try {
            return this.authService.isParentUser() ? 'HOME_PARENTS' : 'HOME';
        } catch (e) {
            return 'HOME';
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
                    this.loadTasksForSelectedDate(this.selectedDate, true); // force-clear task cache
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
                // Allow opening the page with a specific main tab (habits|tasks)
                if (params['tab']) {
                    const t = String(params['tab']).toLowerCase();
                    if (t === 'tasks') {
                        this.currentMainTab = 'tasks';
                        if (this.isChildCalendarDesign) this.childCalendarTab = 'task';
                    } else if (t === 'habits') {
                        this.currentMainTab = 'habits';
                        if (this.isChildCalendarDesign) this.childCalendarTab = 'habit';
                    }
                    // if 'all' or unknown, keep default (habits)
                }
            })
        );
        // Also check sessionStorage for an explicit tab request set by activity input
        try {
            const stored = sessionStorage.getItem('activityInitialTab');
            if (stored) {
                const t = String(stored).toLowerCase();
                if (t === 'tasks') {
                    this.currentMainTab = 'tasks';
                    if (this.isChildCalendarDesign) this.childCalendarTab = 'task';
                } else if (t === 'habits') {
                    this.currentMainTab = 'habits';
                    if (this.isChildCalendarDesign) this.childCalendarTab = 'habit';
                }
                // remove key after consuming
                sessionStorage.removeItem('activityInitialTab');
                try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
            }
        } catch (e) {
            // ignore storage errors
        }
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
                    // refresh habits for current date and ensure habits tab is selected
                    this.loadHabits(true);
                    this.currentMainTab = 'habits';
                    this.applyFilters();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                }
                if (evt.type === 'task') {
                    // refresh tasks for current date and switch to tasks tab so newly-created
                    // or deleted/updated tasks are visible immediately when returning from the create flow
                    // Force reload to bypass TaskApi cache
                    this.loadTasksForSelectedDate(this.selectedDate, true);
                    this.currentMainTab = 'tasks';
                    this.applyFilters();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                }
            })
        );
    }

    private loadInitialData(): void {
        this.loadHabits();
        // Only fetch tasks if Tasks tab is already active (e.g. pre-selected via route param).
        // Otherwise tasks are fetched lazily on first tap of the Tasks tab.
        if (this.currentMainTab === 'tasks' || this.isChildCalendarDesign) {
            this.loadTasksForSelectedDate(this.selectedDate);
        }
        if (this.isChildCalendarDesign) {
            this.loadChildCalendarData();
        }
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
        // Only reload tasks when the Tasks tab is visible — avoids a redundant
        // API call when the user is on the Habits tab and picks a different date.
        if (this.currentMainTab === 'tasks' || this.isChildCalendarDesign) {
            this.loadTasksForSelectedDate(date);
        }
        if (this.isChildCalendarDesign) {
            this.loadChildCalendarData();
        }
    }

    /** Select a category in the new Child calendar without changing legacy tabs. */
    selectChildCalendarTab(tab: 'all' | 'habit' | 'task' | 'planner'): void {
        this.childCalendarTab = tab;
        this.currentMainTab = tab === 'task' ? 'tasks' : 'habits';
        if (tab === 'all' || tab === 'task') {
            this.loadTasksForSelectedDate(this.selectedDate, true);
        }
        this.applyFilters();
    }

    selectChildStatusFilter(filter: 'pending' | 'ongoing' | 'completed' | 'skipped'): void {
        this.childStatusFilter = filter;
    }

    selectChildDate(date: Date): void {
        this.onDateSelected(date);
    }

    moveChildMonth(offset: number): void {
        const target = new Date(this.selectedDate);
        const day = target.getDate();
        target.setDate(1);
        target.setMonth(target.getMonth() + offset);
        target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
        this.onDateSelected(target);
    }

    get childWeekDates(): Date[] {
        const start = new Date(this.selectedDate);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - start.getDay());
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }

    get childMonthLabel(): string {
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.selectedDate);
    }

    isChildDateSelected(date: Date): boolean {
        return this.habitService.formatDateToYYYYMMDD(date) === this.getSelectedDateString();
    }

    getChildDateActivities(date: Date): { habit?: boolean; task?: boolean; planner?: boolean } {
        return this.childDateActivities[this.habitService.formatDateToYYYYMMDD(date)] || {};
    }

    get childHabitItems(): Habit[] {
        return this.sortArrayByUpcoming(this.getHabitsForSelectedDate().filter(item => this.matchesChildStatus(item)));
    }

    get childTaskItems(): any[] {
        return this.sortArrayByUpcoming(this.tasks.filter(item => this.matchesChildStatus(item)));
    }

    get childPlannerItemsForStatus(): any[] {
        // Planner events do not have the Habit/Task state machine, so retain them for every status view.
        return this.childPlannerItems;
    }

    get childVisibleItems(): Array<{ item: any; type: 'habit' | 'task' | 'planner' }> {
        const items: Array<{ item: any; type: 'habit' | 'task' | 'planner' }> = [];
        if (this.childCalendarTab === 'all' || this.childCalendarTab === 'habit') {
            this.childHabitItems.forEach(item => items.push({ item, type: 'habit' }));
        }
        if (this.childCalendarTab === 'all' || this.childCalendarTab === 'task') {
            this.childTaskItems.forEach(item => items.push({ item, type: 'task' }));
        }
        if (this.childCalendarTab === 'planner') {
            this.childPlannerItemsForStatus.forEach(item => items.push({ item, type: 'planner' }));
        }
        return this.sortArrayByUpcoming(items.map(entry => ({
            ...entry,
            startTimeStamp: entry.item.startTimeStamp || this.getTimestampFromTime(entry.item.startTime),
            endTimeStamp: entry.item.endTimeStamp || this.getTimestampFromTime(entry.item.endTime)
        }))) as Array<{ item: any; type: 'habit' | 'task' | 'planner' }>;
    }

    get childHabitCompletedCount(): number {
        return this.getHabitsForSelectedDate().filter(item => this.normalizedItemStatus(item) === 'completed').length;
    }

    get childTaskCompletedCount(): number {
        return this.tasks.filter(item => this.normalizedItemStatus(item) === 'completed').length;
    }

    get childHabitCompletionRate(): number {
        const total = this.getHabitsForSelectedDate().length;
        return total ? Math.round((this.childHabitCompletedCount / total) * 100) : 0;
    }

    get childTaskCompletionRate(): number {
        const total = this.tasks.length;
        return total ? Math.round((this.childTaskCompletedCount / total) * 100) : 0;
    }

    get childPulseDateLabel(): string {
        const day = String(this.selectedDate.getDate()).padStart(2, '0');
        const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(this.selectedDate);
        return `${day} ${month}, ${this.selectedDate.getFullYear()}`;
    }

    getChildItemTitle(item: any): string {
        return item?.title || item?.name || item?.habitName || item?.taskName || 'Untitled';
    }

    getChildItemTag(item: any): string {
        const tags = Array.isArray(item?.tags) ? item.tags : (item?.tag ? [item.tag] : []);
        const tag = tags.find((value: any) => Boolean(value));
        if (typeof tag === 'object') return tag.value || tag.name || tag.title || 'General';
        return tag || 'General';
    }

    getChildItemTime(item: any): string {
        const start = this.formatChildTime(item?.startTime || item?.start_time || item?.startTimeStamp);
        const end = this.formatChildTime(item?.endTime || item?.end_time || item?.endTimeStamp);
        return start && end ? `${start} - ${end}` : (start || end || 'Any time');
    }

    getChildPlannerMeta(item: any): string {
        const eventType = String(item?.eventType || item?.type || 'Planner').replace(/_/g, ' ');
        return eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase();
    }

    private matchesChildStatus(item: any): boolean {
        return this.normalizedItemStatus(item) === this.childStatusFilter;
    }

    private normalizedItemStatus(item: any): 'pending' | 'ongoing' | 'completed' | 'skipped' {
        return this.normalizeStatus(item?.status || (item?.completed ? 'completed' : 'pending'));
    }

    private formatChildTime(value: any): string {
        if (value === null || value === undefined || value === '') return '';
        if (typeof value === 'number') {
            const date = new Date(this.normalizeTimestamp(value));
            return isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
        }
        const match = String(value).match(/(\d{1,2}):(\d{2})/);
        if (!match) return String(value);
        const date = new Date(this.selectedDate);
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
        return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
    }

    private getTimestampFromTime(value: any): number {
        const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
        if (!match) return 0;
        const date = new Date(this.selectedDate);
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
        return date.getTime();
    }

    private loadChildCalendarData(): void {
        const selectedDateString = this.getSelectedDateString();
        this.subscriptions.add(
            this.calendarService.getUserCalendarMonth(selectedDateString).subscribe({
                next: (response: CalendarResponse) => {
                    this.childDateActivities = {};
                    this.recordChildCalendarActivities(response.habits || [], 'habit');
                    this.recordChildCalendarActivities(response.tasks || [], 'task');
                    this.recordChildCalendarActivities(response.events || [], 'planner');
                    this.childPlannerItems = (response.events || [])
                        .filter(event => this.eventOccursOnSelectedDate(event, selectedDateString))
                        .map(event => ({
                            ...event,
                            type: 'timetable',
                            status: event.completed ? 'completed' : 'pending',
                            startTimeStamp: this.getTimestampFromTime(event.startTime),
                            endTimeStamp: this.getTimestampFromTime(event.endTime)
                        }));
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                },
                error: () => {
                    this.childDateActivities = {};
                    this.childPlannerItems = [];
                }
            })
        );
    }

    private recordChildCalendarActivities(items: any[], type: 'habit' | 'task' | 'planner'): void {
        items.forEach(item => {
            this.getItemCalendarDates(item).forEach(date => {
                this.childDateActivities[date] = { ...this.childDateActivities[date], [type]: true };
            });
        });
    }

    private getItemCalendarDates(item: any): string[] {
        const candidates = item?.completionDate ?? item?.completion_date ?? item?.completions ?? item?.startDate ?? item?.start_date;
        const values = Array.isArray(candidates) ? candidates : [candidates];
        return values
            .map(value => value ? new Date(value) : null)
            .filter((date): date is Date => !!date && !isNaN(date.getTime()))
            .map(date => this.habitService.formatDateToYYYYMMDD(date));
    }

    private eventOccursOnSelectedDate(event: any, selectedDate: string): boolean {
        const eventDate = String(event?.startDate || event?.eventDate || '').slice(0, 10);
        if (eventDate === selectedDate) return true;
        if (event?.recurrence === 'YEARLY') return eventDate.slice(5) === selectedDate.slice(5);
        if (event?.recurrence === 'MONTHLY') return eventDate.slice(8) === selectedDate.slice(8);
        return false;
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
                            // Check assignedTo first — tasks/habits created by a parent have userId=parent but assignedTo=child
                            const habitUserId = h.assignedTo ?? h.assigned_to ?? h.userId ?? h.user_id;
                            const belongsToSelectedChild = habitUserId == selectedChildId;
                            // A parent must never see an item the child marked Private
                            // (sharedWithParent === false) — that's the point of the toggle.
                            const isSharedWithParent = h.sharedWithParent !== false;
                            return belongsToSelectedChild && isSharedWithParent;
                        });
                    }

                    this.allHabits = habitData.map((h: any) => ({
                        ...h,
                        type: h.type || 'habits',
                        status: this.normalizeStatus(h.status),
                        priority: h.priority?.trim().toLowerCase(),
                        routine: h.routine?.trim().toLowerCase(),
                        tags: (() => {
                            const raw = Array.isArray(h.tags) && h.tags.length ? h.tags : (h.tag ? [h.tag] : []);
                            const resolved = raw.map((t: any) => {
                                if (!t) return '';
                                if (typeof t === 'string') return t;
                                if (typeof t === 'object') return (t.value || t.name || t.text || t.title || '').toString().trim();
                                return '';
                            }).filter(Boolean);
                            if (resolved.length) return resolved;
                            const tid = h.tagId ?? h.tag_id;
                            if (tid) { const name = this.habitService.resolveTagId(Number(tid)); if (name) return [name]; }
                            return [];
                        })(),
                        // Preserve streak fields from API response
                        currentHabitStreak: Number(h.currentHabitStreak ?? h.streak ?? 0),
                        highestHabitStreak: Number(h.highestHabitStreak ?? h.highestStreak ?? 0),
                                                // Ensure startTimeStamp and endTimeStamp are calculated and normalized for today's date for recurring items
                                                startTimeStamp: (() => {
                                                    const isRecurring = h.daysOfWeek?.length || h.everyday || h.everyWeekend;
                                                    const ts = this.buttonLogic.calculateTimestamps(
                                                        isRecurring ? { ...h, startDate: formattedDate, endDate: formattedDate } : h
                                                    );
                                                    return this.normalizeTimestamp(ts.startTimeStamp);
                                                })(),
                                                endTimeStamp: (() => {
                                                    const isRecurring = h.daysOfWeek?.length || h.everyday || h.everyWeekend;
                                                    const ts = this.buttonLogic.calculateTimestamps(
                                                        isRecurring ? { ...h, startDate: formattedDate, endDate: formattedDate } : h
                                                    );
                                                    return this.normalizeTimestamp(ts.endTimeStamp);
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

    loadTasksForSelectedDate(date: Date, forceReload: boolean = false): void {
        this.loading = true;
        const formatted = this.habitService.formatDateToYYYYMMDD(date);

        this.subscriptions.add(
            this.taskApi.getTasksByDate(formatted, forceReload).subscribe({
                next: (res: any) => {
                    let list = Array.isArray(res?.data || res?.tasks || res) ? res.data || res.tasks || res : [];

                    // ONLY filter by selected child if PARENT is viewing a child profile
                    const isParent = this.authService.isParentUser();
                    const selectedChildId = this.profileSelector.getChildId();
                    if (isParent && selectedChildId !== null) {
                        list = list.filter((t: any) => {
                            // Check assignedTo first — tasks created by a parent have userId=parent but assignedTo=child
                            const taskUserId = t.assignedTo ?? t.assigned_to ?? t.userId ?? t.user_id;
                            const belongsToSelectedChild = taskUserId == selectedChildId;
                            // A parent must never see an item the child marked Private
                            // (sharedWithParent === false) — that's the point of the toggle.
                            const isSharedWithParent = t.sharedWithParent !== false;
                            return belongsToSelectedChild && isSharedWithParent;
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
                            startTimeStamp: this.normalizeTimestamp(timestamps.startTimeStamp),
                            endTimeStamp: this.normalizeTimestamp(timestamps.endTimeStamp),
                            status: this.buttonLogic.normalizeStatus(t.status),
                            priority: t.priority?.trim().toLowerCase(),
                            routine: t.routine?.trim().toLowerCase(),
                            tags: Array.isArray(t.tags) && t.tags.length ? t.tags : (t.tag ? [t.tag] : []),
                            // Normalize reward/streak fields so ActivityCardComponent can read them
                            coinReward: Number(t.coinReward ?? t.rewardCoins ?? t.reward_coins ?? t.rewardsCoins ?? t.rewards?.coins ?? t.rewards?.rewardCoins ?? 0),
                            coinsEarned: Number(t.coinsEarned ?? t.coins ?? t.coins_earned ?? 0),
                            streak: Number(t.streak ?? t.streakCount ?? t.streak_count ?? 0),
                            highestStreak: Number(t.highestStreak ?? t.topStreak ?? t.highest_streak ?? 0),
                            // Preserve task streak fields from API response
                            currentTaskStreak: Number(t.currentTaskStreak ?? t.streak ?? t.streakCount ?? 0),
                            highestTaskStreak: Number(t.highestTaskStreak ?? t.highestStreak ?? t.topStreak ?? 0),
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
        if (tab === 'tasks') {
            // Always fetch fresh tasks when the user taps the Tasks tab.
            // forceReload=true bypasses the TaskApi cache so stale data is never shown.
            this.loadTasksForSelectedDate(this.selectedDate, true);
        }
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

        // Helper to sort arrays by upcoming time.
        // Treat an item as "not past" until its endTimeStamp has passed so
        // items do not shift position immediately when their start time arrives.
        private sortArrayByUpcoming(arr: any[] = []): any[] {
            if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
            const now = Date.now();
            // Consider items with missing endTimeStamp as far-future so they remain in the
            // 'future' group until explicitly ended.
            const future = arr
                .filter(i => (Number(i?.endTimeStamp ?? this.MAX_SAFE_INTEGER) >= now))
                .sort((a, b) => Number(a.startTimeStamp ?? 0) - Number(b.startTimeStamp ?? 0));
            const past = arr
                .filter(i => (Number(i?.endTimeStamp ?? 0) < now))
                .sort((a, b) => Number(b.startTimeStamp ?? 0) - Number(a.startTimeStamp ?? 0));
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
        const selectedDateNormalized = new Date(this.selectedDate);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        return habits.filter(h => {
            const start = h.startDate ? new Date(h.startDate) : selectedDateNormalized;
            const end = h.endDate ? new Date(h.endDate) : selectedDateNormalized;
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            const isInRange = start <= selectedDateNormalized && selectedDateNormalized <= end;
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

    public getHabitsForSelectedDate(): Habit[] {
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
        this.loadTasksForSelectedDate(this.selectedDate, true);
        if (this.isChildCalendarDesign) {
            this.loadChildCalendarData();
        }
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
