import { Component, OnInit, OnDestroy, ChangeDetectorRef, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
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
import { EventApi } from '../../../api/event.api';
import { Observable, Subscription, filter, skip, take, forkJoin, of, catchError } from 'rxjs';
import { LongPressDirective } from '../../../directives/gestureControlDirective';
import { getEventTypeIcon } from '../event-type-icon';
import { isCalendarMirrorOfPersonalEvent, isHomePersonalEvent, isHomePlannerSchedule, plannerEditTab } from '../home-calendar-kind';
import { clampedMonthDay, localDay, upcomingOccurrencesWithinDays } from '../personal-event-occurrences';

interface PlannerScheduleCard {
    id: string;
    source: any;
    color: string;
    entries: any[];
    otherEntries: any[];
    totalEntries: number;
}

@Component({
    standalone: true,
    selector: 'activity-page-content',
    templateUrl: './activity-page-content.component.html',
    styleUrls: ['./activity-page-content.component.scss'],
    imports: [CommonModule, IonicModule, ActivityCardComponent, SupermeInputsModule, SupermeBadgeComponent, EmptyStateComponent, AdBannerComponent, LongPressDirective]
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
    public plannerLoading: boolean = false;
    public plannerLoadError: boolean = false;
    public showSingleMode: boolean = false;
    public singleModeHabit: Habit | null = null;
    private expandedChildActivityKey: string | null = null;
    private lastChildActivityLongPress = { key: '', at: 0 };
    public readonly MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

    /** Latest Figma calendar controls, shared by Child, Self, and parent-child contexts. */
    public childCalendarTab: 'all' | 'habit' | 'task' | 'planner' = 'all';
    public childStatusFilter: 'pending' | 'ongoing' | 'completed' | 'skipped' = 'pending';
    public childDateActivities: Record<string, { habit?: boolean; task?: boolean; planner?: boolean }> = {};
    public childPlannerItems: any[] = [];
    public childEventItems: any[] = [];
    /** First date currently visible in the seven-day carousel. */
    private childCarouselStartDate: Date | null = null;
    private childCarouselPointerStartX: number | null = null;
    private lastChildDatePointerSelection = { key: '', at: 0 };
    private readonly plannerExpansion = new Map<string, boolean>();
    private habitRequestId = 0;
    private taskRequestId = 0;
    private plannerRequestId = 0;

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
        private eventApi: EventApi,
        private route: ActivatedRoute,
        private router: Router,
        private profileSelector: ProfileSelectorService,
        private authService: AuthService,
        private petAgeService: PetAgeService,
        private cdr: ChangeDetectorRef,
        private toastService: CustomToastService
    ) {
        this.toast$ = this.toastService.toast$;
    }

    /**
     * The Planner screen follows one Figma layout for every role. The data it
     * renders is still scoped to the active user or currently selected child.
     */
    public get isPlannerCalendarDesign(): boolean {
        return true;
    }

    /** Backward-compatible name for existing template and route logic. */
    public get isChildCalendarDesign(): boolean {
        return this.isPlannerCalendarDesign;
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
        this.resetPlannerContext();
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
                this.profileSelector.childChanged$.pipe(skip(1)).subscribe(() => {
                    this.resetPlannerContext();
                    this.loadInitialData(true);
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
                // Allow opening the page with a specific tab from Today at a Glance.
                if (params['tab']) {
                    const t = String(params['tab']).toLowerCase();
                    if (t === 'tasks') {
                        this.currentMainTab = 'tasks';
                        if (this.isChildCalendarDesign) this.childCalendarTab = 'task';
                    } else if (t === 'habits') {
                        this.currentMainTab = 'habits';
                        if (this.isChildCalendarDesign) this.childCalendarTab = 'habit';
                    } else if ((t === 'timetable' || t === 'planner') && this.isChildCalendarDesign) {
                        // Planner items use the legacy `timetable` type internally.
                        this.currentMainTab = 'habits';
                        this.childCalendarTab = 'planner';
                    }
                    // if 'all' or unknown, keep the default tab
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
                } else if ((t === 'timetable' || t === 'planner') && this.isChildCalendarDesign) {
                    this.currentMainTab = 'habits';
                    this.childCalendarTab = 'planner';
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
                // The Planner screen always issues a context-scoped request.  The
                // shared HabitService stream may still contain a previous child
                // or account, so it must not overwrite the guarded result here.
                if (this.isPlannerCalendarDesign) return;
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
                if (evt.type === 'planner') {
                    // A timetable save returns to this screen with the Planner
                    // tab selected. Refresh the active profile rather than
                    // relying on a cached list from the previous context.
                    this.childCalendarTab = 'planner';
                    this.currentMainTab = 'habits';
                    this.loadChildCalendarData();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                }
            })
        );
    }

    private loadInitialData(forceReload: boolean = false): void {
        // The enhanced calendar always fetches fresh data for its active
        // profile context. HabitService's old date-only cache is not allowed
        // to carry a previous account or child's entries into this screen.
        this.loadHabits(forceReload || this.isPlannerCalendarDesign);
        // Only fetch tasks if Tasks tab is already active (e.g. pre-selected via route param).
        // Otherwise tasks are fetched lazily on first tap of the Tasks tab.
        if (this.currentMainTab === 'tasks' || this.isChildCalendarDesign) {
            this.loadTasksForSelectedDate(this.selectedDate, forceReload || this.isPlannerCalendarDesign);
        }
        if (this.isChildCalendarDesign) {
            this.loadChildCalendarData();
        }
    }

    private startTimestampInterval(): void {
        // Recalculate Planner countdowns and passed states every minute.
        this.timestampInterval = setInterval(() => {
            this.currentTimestamp = Date.now();
            this.applyFilters();
            try { this.cdr.markForCheck(); } catch (e) { /* ignore */ }
        }, 60000);
    }

    onDateSelected(date: Date): void {
        const nextDate = this.startOfDay(date);
        const changedDate = this.getSelectedDateString() !== this.habitService.formatDateToYYYYMMDD(nextDate);
        const visibleWindowStart = this.startOfDay(this.childCarouselStartDate || this.selectedDate);
        const visibleWindowEnd = new Date(visibleWindowStart);
        visibleWindowEnd.setDate(visibleWindowEnd.getDate() + 6);
        this.selectedDate = nextDate;
        if (changedDate) this.expandedChildActivityKey = null;
        // Keep an on-screen date in its existing position. Only move the
        // seven-day window when the requested date is outside the current
        // range (for example an arrow/month action or a deep link).
        if (nextDate < visibleWindowStart || nextDate > visibleWindowEnd) {
            this.childCarouselStartDate = new Date(nextDate);
        } else if (!this.childCarouselStartDate) {
            this.childCarouselStartDate = visibleWindowStart;
        }
        if (changedDate && this.isPlannerCalendarDesign) {
            // Keep month dots stable, but remove selected-day content until the
            // correct date has been loaded. This avoids displaying yesterday's
            // (or another child's) schedules under the new date label.
            this.habitRequestId++;
            this.taskRequestId++;
            this.allHabits = [];
            this.tasks = [];
            this.childPlannerItems = [];
            this.childEventItems = [];
        }
        this.loadHabits(this.isPlannerCalendarDesign);
        // Only reload tasks when the Tasks tab is visible — avoids a redundant
        // API call when the user is on the Habits tab and picks a different date.
        if (this.currentMainTab === 'tasks' || this.isChildCalendarDesign) {
            this.loadTasksForSelectedDate(nextDate, this.isPlannerCalendarDesign);
        }
        if (this.isChildCalendarDesign) {
            this.loadChildCalendarData();
        }
    }

    /** Select a category in the new Child calendar without changing legacy tabs. */
    selectChildCalendarTab(tab: 'all' | 'habit' | 'task' | 'planner'): void {
        if (this.childCalendarTab !== tab) this.expandedChildActivityKey = null;
        this.childCalendarTab = tab;
        this.currentMainTab = tab === 'task' ? 'tasks' : 'habits';
        this.ensureChildStatusFilterHasResults();

        // Always pull the latest data for whatever this tab shows instead of
        // trusting a possibly-stale earlier fetch.
        if (tab === 'all' || tab === 'habit') {
            this.loadHabits(true);
        }
        if (tab === 'all' || tab === 'task') {
            this.loadTasksForSelectedDate(this.selectedDate, true);
        }
        if (tab === 'all' || tab === 'planner') {
            this.loadChildCalendarData();
        }

        this.applyFilters();
    }

    selectChildStatusFilter(filter: 'pending' | 'ongoing' | 'completed' | 'skipped'): void {
        this.childStatusFilter = filter;
    }

    selectChildDate(date: Date): void {
        // Do not let a preceding/cancelled pointer gesture block date
        // selection. On desktop browsers a normal button click can arrive
        // after a pointer-cancel, which previously made every other date
        // appear unclickable.
        this.onDateSelected(date);
        this.syncChildDateInUrl(date);
    }

    onChildDateButtonPointerUp(event: PointerEvent, date: Date): void {
        const startX = this.childCarouselPointerStartX;
        this.childCarouselPointerStartX = null;
        event.stopPropagation();

        const distance = startX === null ? 0 : event.clientX - startX;
        const key = this.dateKey(date);
        this.lastChildDatePointerSelection = { key, at: Date.now() };
        if (Math.abs(distance) >= 40) {
            this.moveChildDateCarousel(distance < 0 ? 1 : -1);
            return;
        }
        if (Math.abs(distance) > 12) return;

        this.selectChildDate(date);
    }

    onChildDateButtonClick(event: MouseEvent, date: Date): void {
        event.stopPropagation();
        const key = this.dateKey(date);
        // Touch/mouse browsers emit a synthetic click immediately after the
        // pointer event. Ignore only that duplicate; keyboard-generated clicks
        // still select the date normally.
        if (this.lastChildDatePointerSelection.key === key
            && Date.now() - this.lastChildDatePointerSelection.at < 500) return;
        this.selectChildDate(date);
    }

    private syncChildDateInUrl(date: Date): void {
        const tab = this.childCalendarTab === 'habit' ? 'habits'
            : this.childCalendarTab === 'task' ? 'tasks'
            : this.childCalendarTab === 'planner' ? 'planner'
            : 'all';
        const urlTree = this.router.createUrlTree([], {
            relativeTo: this.route,
            queryParams: { tab, date: this.dateKey(date) },
            queryParamsHandling: 'merge',
        });
        // A same-page Router navigation emits NavigationStart and therefore
        // shows the native app loader. Replace only the address-bar state so
        // selecting a date remains an in-place UI update with no page reload.
        window.history.replaceState(window.history.state, '', this.router.serializeUrl(urlTree));
    }

    moveChildMonth(offset: number): void {
        // A new month must always open from its first day instead of retaining
        // today's day number (for example, 12 September).
        const target = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + offset, 1);
        target.setHours(0, 0, 0, 0);
        this.childCarouselStartDate = target;
        this.selectChildDate(target);
    }

    /** Move and select exactly one day while keeping a seven-day window visible. */
    moveChildDateByDay(offset: -1 | 1): void {
        const target = new Date(this.selectedDate);
        target.setDate(target.getDate() + offset);
        target.setHours(0, 0, 0, 0);
        this.selectChildDate(target);
    }

    /** Move the calendar rail by one complete seven-day window. */
    moveChildWeek(direction: -1 | 1): void {
        this.moveChildDateCarousel(direction);
    }

    onChildDateCarouselPointerDown(event: PointerEvent): void {
        this.childCarouselPointerStartX = event.clientX;
    }

    onChildDateCarouselPointerUp(event: PointerEvent): void {
        const startX = this.childCarouselPointerStartX;
        this.childCarouselPointerStartX = null;
        if (startX === null) return;

        const distance = event.clientX - startX;
        if (Math.abs(distance) < 40) return;
        this.moveChildDateCarousel(distance < 0 ? 1 : -1);
    }

    private moveChildDateCarousel(direction: 1 | -1): void {
        const start = new Date(this.childCarouselStartDate || this.selectedDate);
        const target = new Date(start);
        target.setDate(target.getDate() + (direction * 7));
        target.setHours(0, 0, 0, 0);
        this.childCarouselStartDate = target;
        this.selectChildDate(target);
    }

    get childWeekDates(): Date[] {
        const start = new Date(this.childCarouselStartDate || this.selectedDate);
        start.setHours(0, 0, 0, 0);
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

    childDateActivityCount(date: Date): number {
        const activities = this.getChildDateActivities(date);
        return Number(!!activities.habit) + Number(!!activities.task) + Number(!!activities.planner);
    }

    get childHabitItems(): Habit[] {
        return this.sortArrayByUpcoming(this.getHabitsForSelectedDate());
    }

    get childTaskItems(): any[] {
        return this.sortArrayByUpcoming(this.tasks);
    }

    /** Planner cards are grouped schedules, not one card per schedule row. */
    get childPlannerCards(): PlannerScheduleCard[] {
        return this.mergeDuplicatePlannerSchedules(this.childPlannerItems)
            .filter(item => this.plannerOccursOnSelectedDate(item))
            .map((source, index) => {
                const allEntries = this.getPlannerEntries(source);
                const entries = this.getPlannerEntriesForSelectedDate(source, allEntries);
                return {
                    id: String(source?.id ?? source?.calendarId ?? source?.title ?? index),
                    source,
                    color: this.getPlannerColor(source),
                    entries,
                    otherEntries: allEntries.filter(entry => !entries.includes(entry)),
                    totalEntries: allEntries.length
                };
            })
            .filter(card => card.entries.length > 0)
            .sort((left, right) => this.getPlannerStartTimestamp(left.source) - this.getPlannerStartTimestamp(right.source));
    }

    get childVisibleItems(): Array<{ item: any; type: 'habit' | 'task' }> {
        const items: Array<{ item: any; type: 'habit' | 'task' }> = [];
        if (this.childCalendarTab === 'all' || this.childCalendarTab === 'habit') {
            this.childHabitItems.forEach(item => items.push({ item, type: 'habit' }));
        }
        if (this.childCalendarTab === 'all' || this.childCalendarTab === 'task') {
            this.childTaskItems.forEach(item => items.push({ item, type: 'task' }));
        }
        // The status filter (Pending/Ongoing/Completed/Skipped) only appears
        // for the single-type Habit/Task views, so it only narrows those.
        const scoped = this.showsChildStatusFilters
            ? items.filter(entry => this.matchesChildStatus(entry.item))
            : items;
        return this.sortArrayByUpcoming(scoped.map(entry => ({
            ...entry,
            startTimeStamp: entry.item.startTimeStamp || this.getTimestampFromTime(entry.item.startTime),
            endTimeStamp: entry.item.endTimeStamp || this.getTimestampFromTime(entry.item.endTime)
        }))) as Array<{ item: any; type: 'habit' | 'task' }>;
    }

    /** Status filters only make sense while looking at one type at a time. */
    get showsChildStatusFilters(): boolean {
        return this.childCalendarTab === 'habit' || this.childCalendarTab === 'task';
    }

    get childStatusCounts(): { pending: number; ongoing: number; completed: number; skipped: number } {
        const source: any[] = this.childCalendarTab === 'task' ? this.childTaskItems : this.childHabitItems;
        const counts = { pending: 0, ongoing: 0, completed: 0, skipped: 0 };
        source.forEach(item => { counts[this.normalizedItemStatus(item)]++; });
        return counts;
    }

    get showsPlannerEvents(): boolean {
        return this.childCalendarTab === 'all' || this.childCalendarTab === 'planner';
    }

    get hasChildCalendarContent(): boolean {
        if (this.childCalendarTab === 'habit' || this.childCalendarTab === 'task') {
            return this.childVisibleItems.length > 0;
        }
        if (this.childCalendarTab === 'planner') return this.childPlannerCards.length > 0 || this.childEventItems.length > 0;
        return this.childVisibleItems.length > 0 || this.childPlannerCards.length > 0 || this.childEventItems.length > 0;
    }

    openAllEvents(): void {
        const childId = this.authService.isParentUser() ? this.profileSelector.getChildId() : null;
        // Parent Calendar receives the selected child's events from the calendar
        // endpoint. Keep those real records available if /events/all omits them.
        const calendarEvents = childId == null ? [] : this.childEventItems.map(({ __plannerEventDate, ...event }) => ({
            ...event,
            name: event.name || event.title,
            eventDate: event.eventDate || event.event_date || event.startDate || event.start_date
                || (__plannerEventDate ? this.dateKey(__plannerEventDate) : null)
        }));
        // Use the canonical route: the legacy /authed guard redirects and
        // drops navigation extras, including the selected child's records.
        void this.router.navigate(['/events-list'], {
            state: { origin: this.router.url, childId, calendarEvents }
        });
    }

    openChildEventDetail(event: any): void {
        void this.router.navigate(['/authed/event-detail', event.id], {
            state: { event, origin: this.router.url }
        });
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

    getChildItemTag(item: any): string | null {
        const tags = item?.tag ? [item.tag] : (Array.isArray(item?.tags) ? item.tags : []);
        const tag = tags.find((value: any) => Boolean(value));
        if (!tag) return null;
        if (typeof tag === 'object') return tag.value || tag.name || tag.title || null;
        return String(tag).trim() || null;
    }

    getChildItemTime(item: any): string {
        const start = this.formatChildTime(item?.startTime || item?.start_time || item?.startTimeStamp);
        const end = this.formatChildTime(item?.endTime || item?.end_time || item?.endTimeStamp);
        return start && end ? `${start} - ${end}` : (start || end || 'Any time');
    }

    getChildEventSubtitle(event: any): string {
        const eventDate = this.getLocalDate(event?.__plannerEventDate || event?.startDate || event?.eventDate);
        if (!eventDate) return event?.allDay ? 'All day' : this.getChildItemTime(event);

        const today = this.startOfDay(this.selectedDate);
        const eventDay = this.startOfDay(eventDate);
        const difference = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
        if (difference === 0) return 'Today';
        if (difference === 1) return 'Tomorrow';
        if (difference > 1) return `In ${difference} days`;
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(eventDay);
    }

    getChildEventIcon(event: any): string {
        // Keep View All consistent with the event cards on Home. Some calendar
        // responses omit eventType, so reuse the already-loaded Home event
        // metadata by id without issuing another /events/all request here.
        const cachedEvent = this.eventApi.getCachedEvent(event?.id);
        const eventType = event?.eventType || event?.event_type || cachedEvent?.eventType;
        const fallback = `${event?.title || cachedEvent?.name || ''} ${event?.name || cachedEvent?.name || ''}`;
        return getEventTypeIcon(eventType, fallback);
    }

    private matchesChildStatus(item: any): boolean {
        return this.normalizedItemStatus(item) === this.childStatusFilter;
    }

    private normalizedItemStatus(item: any): 'pending' | 'ongoing' | 'completed' | 'skipped' {
        return this.normalizeStatus(item?.status || (item?.completed ? 'completed' : 'pending'), item);
    }

    private formatChildTime(value: any): string {
        if (value === null || value === undefined || value === '') return '';

        if (typeof value === 'number') {
            const date = new Date(this.normalizeTimestamp(value));
            return isNaN(date.getTime())
                ? ''
                : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }

        const rawValue = String(value).trim();
        const timeMatch = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([ap]m)?$/i);
        if (timeMatch) {
            let hours = Number(timeMatch[1]);
            const minutes = Number(timeMatch[2]);
            const meridiem = timeMatch[3]?.toLowerCase();

            if (meridiem === 'am' && hours === 12) hours = 0;
            if (meridiem === 'pm' && hours !== 12) hours += 12;

            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
        }

        const numericTimestamp = /^\d{10,13}$/.test(rawValue) ? Number(rawValue) : NaN;
        const date = new Date(Number.isNaN(numericTimestamp) ? rawValue : this.normalizeTimestamp(numericTimestamp));
        return isNaN(date.getTime())
            ? rawValue
            : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    private getTimestampFromTime(value: any): number {
        const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
        if (!match) return 0;
        const date = new Date(this.selectedDate);
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
        return date.getTime();
    }

    isPlannerExpanded(card: PlannerScheduleCard, index: number): boolean {
        return this.plannerExpansion.has(card.id) ? !!this.plannerExpansion.get(card.id) : index === 0;
    }

    togglePlannerCard(card: PlannerScheduleCard, index: number): void {
        this.plannerExpansion.set(card.id, !this.isPlannerExpanded(card, index));
    }

    editPlannerEntry(source: any, entry: any, event: Event): void {
        this.plannerHeldAt = Date.now();
        event?.stopPropagation();
        const editTab = plannerEditTab(source) ?? 'timetable';
        const planner = {
            ...source,
            type: editTab,
            activities: Array.isArray(source?.activities) && source.activities.length
                ? source.activities
                : [entry]
        };
        void this.router.navigate(['/activity-input'], {
            state: {
                habit: planner,
                currentActive: editTab,
                selectedDate: this.getSelectedDateString(),
                origin: this.router.url
            }
        });
    }

    trackPlannerCard(_index: number, card: PlannerScheduleCard): string {
        return card.id;
    }

    private plannerHeldAt = 0;
    async viewPlanner(source: any, entry: any, event: Event): Promise<void> {
        event.stopPropagation();
        if (Date.now() - this.plannerHeldAt < 1000) return;
        await this.router.navigate(['/activity-detail', source.id], {
            queryParams: { type: 'timetable' },
            state: { habit: { ...source, type: 'timetable' }, plannerEntry: entry, type: 'timetable', selectedDate: this.getSelectedDateString() }
        });
    }

    trackPlannerEntry(index: number, entry: any): string | number {
        return entry?.id ?? entry?.activityId ?? `${entry?.name ?? entry?.title ?? 'entry'}-${entry?.startTime ?? index}`;
    }

    getPlannerDateRange(source: any): string {
        const start = this.getLocalDate(source?.startDate || source?.start_date);
        const end = this.getLocalDate(source?.endDate || source?.end_date) || start;
        if (!start) return '';
        const format = (date: Date) => new Intl.DateTimeFormat('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).format(date);
        return end && this.dateKey(start) !== this.dateKey(end) ? `${format(start)} - ${format(end)}` : format(start);
    }

    getPlannerEntryTime(entry: any): string {
        const format = (value: any): string => {
            const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
            if (!match) return '';
            return `${Number(match[1])}.${match[2]}`;
        };
        const start = format(entry?.startTime || entry?.start_time);
        const end = format(entry?.endTime || entry?.end_time);
        return start && end ? `${start} - ${end}` : (start || end || 'Any time');
    }

    isPlannerEntryPassed(entry: any): boolean {
        const end = this.getPlannerEntryTimestamp(entry, 'end');
        return end > 0 && end < this.currentTimestamp;
    }

    getPlannerEntryCountdown(entry: any): string | null {
        const start = this.getPlannerEntryTimestamp(entry, 'start');
        const end = this.getPlannerEntryTimestamp(entry, 'end');
        if (!start || start <= this.currentTimestamp) {
            return end >= this.currentTimestamp ? 'Now' : null;
        }

        const diffMinutes = Math.ceil((start - this.currentTimestamp) / 60000);
        const days = Math.floor(diffMinutes / 1440);
        const hours = Math.floor((diffMinutes % 1440) / 60);
        const minutes = diffMinutes % 60;
        if (days > 0) return `In ${days}d${hours ? ` ${hours}h` : ''}`;
        if (hours > 0) return `In ${hours}h ${minutes} min`;
        return `In ${Math.max(minutes, 1)} min`;
    }

    private loadChildCalendarData(): void {
        const selectedDateString = this.getSelectedDateString();
        const requestId = ++this.plannerRequestId;
        const contextKey = this.getPlannerContextKey(selectedDateString);
        const visibleMonths = new Map<string, Date>();
        [this.selectedDate, ...this.childWeekDates].forEach(date => {
            const month = new Date(date.getFullYear(), date.getMonth(), 1);
            visibleMonths.set(this.dateKey(month), month);
        });
        const windowEnd = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate() + 30);
        const endMonth = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), 1);
        visibleMonths.set(this.dateKey(endMonth), endMonth);
        const months = [...visibleMonths.values()];
        this.plannerLoading = true;
        this.subscriptions.add(
            // A seven-day window can cross a month/year boundary. Personal
            // Planner events are saved by /events/add and may not be included
            // in /calendar/user-calendar, so fetch them for the self account.
            // Parent-child views must stay scoped to the selected child.
            forkJoin({ calendars: forkJoin(months.map(month => this.calendarService.getUserPlannerCalendarMonth(
                month.getFullYear() === this.selectedDate.getFullYear()
                    && month.getMonth() === this.selectedDate.getMonth()
                    ? selectedDateString : this.dateKey(month)
            ))), personalEvents: this.authService.isParentUser()
                ? of([])
                : this.eventApi.getEvents().pipe(catchError(() => of([]))) }).subscribe({
                next: ({ calendars: responses, personalEvents }) => {
                    if (!this.isCurrentPlannerRequest(requestId, contextKey, selectedDateString)) return;
                    const response = responses[0];
                    const allEvents = response.events || [];
                    const plannerItems = allEvents.filter(item => this.isPlannerSchedule(item));
                    const eventItems = responses.reduce<any[]>((all, month) => all.concat(month.events || []), []).filter(item => this.isPersonalEventRecord(item)
                        && !personalEvents.some(event => isCalendarMirrorOfPersonalEvent(item, event)));

                    responses.forEach((monthResponse, index) => {
                        if (monthResponse.loadError) return;
                        const monthActivities: Record<string, { habit?: boolean; task?: boolean; planner?: boolean }> = {};
                        const month = months[index];
                        this.recordChildCalendarActivities(monthResponse.habits || [], 'habit', monthActivities, month);
                        this.recordChildCalendarActivities(monthResponse.tasks || [], 'task', monthActivities, month);
                        this.recordChildCalendarActivities(monthResponse.events || [], 'planner', monthActivities, month);
                        this.recordChildCalendarActivities(personalEvents, 'planner', monthActivities, month);
                        this.replaceChildCalendarMonth(monthActivities, month);
                    });
                    this.childPlannerItems = this.mergeDuplicatePlannerSchedules(plannerItems);
                    this.childEventItems = [...personalEvents, ...eventItems]
                        .reduce<any[]>((items, event) => {
                            const normalized = { ...event, eventDate: event.eventDate || event.event_date || event.startDate || event.start_date };
                            return items.concat(upcomingOccurrencesWithinDays(normalized, this.selectedDate, 30)
                                .map(occurrence => ({ ...event, __plannerEventDate: occurrence.date })));
                        }, [])
                        .filter((event, index, list) => list.findIndex(candidate => String(candidate.id) === String(event.id)
                            && String(candidate.name || candidate.title) === String(event.name || event.title)
                            && String(candidate.__plannerEventDate) === String(event.__plannerEventDate)) === index)
                        .sort((left, right) => left.__plannerEventDate.getTime() - right.__plannerEventDate.getTime());
                    this.plannerLoadError = !!response.loadError;
                    this.plannerLoading = false;
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                },
                error: () => {
                    if (!this.isCurrentPlannerRequest(requestId, contextKey, selectedDateString)) return;
                    // Keep existing Habit/Task indicators when the optional
                    // planner request fails. The displayed dots still reflect
                    // the activities already loaded for this profile.
                    this.childPlannerItems = [];
                    this.childEventItems = [];
                    this.plannerLoadError = true;
                    this.plannerLoading = false;
                }
            })
        );
    }

    private recordChildCalendarActivities(
        items: any[],
        type: 'habit' | 'task' | 'planner',
        target: Record<string, { habit?: boolean; task?: boolean; planner?: boolean }> = this.childDateActivities,
        month: Date = this.selectedDate
    ): void {
        items.forEach(item => {
            this.getItemCalendarDates(item, month).forEach(date => {
                target[date] = { ...target[date], [type]: true };
            });
        });
    }

    private replaceChildCalendarMonth(monthActivities: Record<string, { habit?: boolean; task?: boolean; planner?: boolean }>, month: Date = this.selectedDate): void {
        const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-`;
        const retained: Record<string, { habit?: boolean; task?: boolean; planner?: boolean }> = {};
        Object.entries(this.childDateActivities).forEach(([date, activities]) => {
            if (!date.startsWith(prefix)) retained[date] = activities;
        });
        this.childDateActivities = { ...retained, ...monthActivities };
    }

    /**
     * A selected status with no records should never hide an entire tab.
     * Fall back to the first populated status so scheduled/skipped/completed
     * activities remain visible for every role.
     */
    private ensureChildStatusFilterHasResults(): void {
        if (!this.showsChildStatusFilters) return;
        const source = this.childCalendarTab === 'task' ? this.childTaskItems : this.childHabitItems;
        if (!source.length || source.some(item => this.matchesChildStatus(item))) return;

        const available = (['pending', 'ongoing', 'completed', 'skipped'] as const)
            .find(status => source.some(item => this.normalizedItemStatus(item) === status));
        if (available) this.childStatusFilter = available;
    }

    private getItemCalendarDates(item: any, month: Date = this.selectedDate): string[] {
        const selectedMonth = month.getMonth();
        const selectedYear = month.getFullYear();
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        const explicitCandidates = item?.completionDate ?? item?.completion_date ?? item?.completions;
        const values = Array.isArray(explicitCandidates) ? explicitCandidates : [explicitCandidates];
        const explicitDates = values
            .map(value => this.getLocalDate(value))
            .filter((date): date is Date => !!date && !isNaN(date.getTime()))
            .filter(date => date >= monthStart && date <= monthEnd)
            .map(date => this.dateKey(date));
        if (explicitDates.length) return explicitDates;

        const start = this.getLocalDate(this.isPersonalEventRecord(item)
            ? (item?.eventDate ?? item?.event_date ?? item?.startDate ?? item?.start_date)
            : (item?.startDate ?? item?.start_date ?? item?.eventDate ?? item?.event_date));
        const end = this.getLocalDate(item?.endDate ?? item?.end_date) || start;
        if (!start) return [];

        const recurrence = String(item?.recurrence || '').toUpperCase();
        // Repeating personal events are returned once by the events API, so
        // derive the occurrence for the visible month rather than only marking
        // their original creation date.
        if (recurrence === 'MONTHLY' || recurrence === 'YEARLY') {
            if (recurrence === 'YEARLY' && start.getMonth() !== selectedMonth) return [];
            const visibleMonthStartsBeforeEvent = new Date(selectedYear, selectedMonth, 1) < new Date(start.getFullYear(), start.getMonth(), 1);
            if (visibleMonthStartsBeforeEvent) return [];
            const occurrence = new Date(selectedYear, selectedMonth, Math.min(start.getDate(), monthEnd.getDate()));
            return occurrence >= start ? [this.dateKey(occurrence)] : [];
        }

        const dates: string[] = [];
        const from = start > monthStart ? start : monthStart;
        const to = end && end < monthEnd ? end : monthEnd;
        for (let date = this.startOfDay(from); date <= to; date.setDate(date.getDate() + 1)) {
            const snapshot = new Date(date);
            if (recurrence && !this.eventOccursOnSelectedDate(item, this.dateKey(snapshot))) continue;
            if (this.isPlannerSchedule(item) && !this.plannerOccursOnDate(item, snapshot)) continue;
            dates.push(this.dateKey(snapshot));
        }
        return dates;
    }

    private eventOccursOnSelectedDate(event: any, selectedDate: string): boolean {
        const original = localDay(event?.eventDate || event?.event_date || event?.startDate || event?.start_date);
        const selected = localDay(selectedDate);
        if (!original || !selected || selected < original) return false;
        const recurrence = String(event?.recurrence || '').toUpperCase();
        if (recurrence === 'YEARLY' && original.getMonth() === selected.getMonth()) {
            return clampedMonthDay(selected.getFullYear(), original.getMonth(), original.getDate()).getTime() === selected.getTime();
        }
        if (recurrence === 'MONTHLY') {
            return clampedMonthDay(selected.getFullYear(), selected.getMonth(), original.getDate()).getTime() === selected.getTime();
        }
        return original.getTime() === selected.getTime();
    }

    private isPlannerSchedule(item: any): boolean {
        return isHomePlannerSchedule(item);
    }

    private isPersonalEventRecord(item: any): boolean {
        return isHomePersonalEvent(item);
    }

    private plannerOccursOnSelectedDate(item: any): boolean {
        return this.plannerOccursOnDate(item, this.selectedDate);
    }

    private plannerOccursOnDate(item: any, date: Date): boolean {
        const candidate = this.startOfDay(date);
        const start = this.startOfDay(this.getLocalDate(item?.startDate || item?.start_date) || candidate);
        const end = this.startOfDay(this.getLocalDate(item?.endDate || item?.end_date) || start);
        if (candidate < start || candidate > end) return false;

        // For a one-day timetable the parent date is authoritative. Some API
        // records contain stale/inconsistent activity weekdays even though the
        // day endpoint correctly returns the timetable for this exact date.
        if (this.dateKey(start) === this.dateKey(end)
            && this.dateKey(candidate) === this.dateKey(start)) return true;

        const entries = Array.isArray(item?.activities) && item.activities.length
            ? item.activities
            : [item];
        return entries.some((entry: any) => this.entryOccursOnDate(entry, candidate, item?.daysOfWeek));
    }

    private getPlannerEntries(item: any): any[] {
        const entries = Array.isArray(item?.activities) && item.activities.length ? item.activities : [item];
        const uniqueEntries = new Map<string, any>();
        entries.forEach((entry: any, index: number) => {
            const key = this.plannerEntryIdentity(entry, index);
            if (!uniqueEntries.has(key)) uniqueEntries.set(key, entry);
        });
        return Array.from(uniqueEntries.values())
            .sort((left: any, right: any) => this.getPlannerEntryTimestamp(left, 'start') - this.getPlannerEntryTimestamp(right, 'start'));
    }

    private getPlannerEntriesForSelectedDate(item: any, allEntries = this.getPlannerEntries(item)): any[] {
        const parentStart = this.getLocalDate(item?.startDate || item?.start_date);
        const parentEnd = this.getLocalDate(item?.endDate || item?.end_date) || parentStart;
        const isExactSingleDate = !!parentStart && !!parentEnd
            && this.dateKey(parentStart) === this.dateKey(parentEnd)
            && this.dateKey(parentStart) === this.getSelectedDateString();
        return allEntries
            .filter((entry: any) => isExactSingleDate
                || this.entryOccursOnDate(entry, this.selectedDate, item?.daysOfWeek));
    }

    getPlannerEntryDaysLabel(entry: any, source: any): string {
        const rawDays = entry?.daysOfWeek ?? entry?.days ?? source?.daysOfWeek;
        const days = Array.isArray(rawDays) ? rawDays : [];
        const labels: Record<string, string> = {
            SUNDAY: 'Sun', MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed',
            THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat'
        };
        const result = days.map((value: any) => {
            const day = String(value || '').trim().toUpperCase();
            return labels[day] || (day === 'TH' ? 'Thu' : day === 'SA' ? 'Sat' : day.slice(0, 3));
        }).filter(Boolean);
        return result.length ? result.join(', ') : 'Other day';
    }

    /**
     * Month responses may repeat the same timetable once per occurrence or
     * activity. Collapse those records into one schedule card and merge only
     * genuinely distinct rows, so a timetable never appears multiple times.
     */
    private mergeDuplicatePlannerSchedules(items: any[]): any[] {
        const schedules = new Map<string, any>();
        (items || []).forEach((item: any, index: number) => {
            const key = this.plannerScheduleIdentity(item, index);
            const existing = schedules.get(key);
            const incomingEntries = Array.isArray(item?.activities) && item.activities.length
                ? item.activities
                : [item];

            if (!existing) {
                schedules.set(key, { ...item, activities: [...incomingEntries] });
                return;
            }

            const mergedEntries = [...(existing.activities || []), ...incomingEntries];
            const uniqueEntries = new Map<string, any>();
            mergedEntries.forEach((entry: any, entryIndex: number) => {
                const entryKey = this.plannerEntryIdentity(entry, entryIndex);
                if (!uniqueEntries.has(entryKey)) uniqueEntries.set(entryKey, entry);
            });
            existing.activities = Array.from(uniqueEntries.values());
        });
        return Array.from(schedules.values());
    }

    private plannerScheduleIdentity(item: any, index: number): string {
        const parentId = item?.timetableId ?? item?.timetable_id ?? item?.plannerId
            ?? item?.planner_id ?? item?.scheduleId ?? item?.schedule_id ?? item?.seriesId ?? item?.series_id;
        if (parentId !== null && parentId !== undefined && parentId !== '') return `schedule:${parentId}`;

        const title = this.getChildItemTitle(item).trim().toLowerCase();
        const start = String(item?.startDate ?? item?.start_date ?? '').slice(0, 10);
        const end = String(item?.endDate ?? item?.end_date ?? '').slice(0, 10);
        const color = String(item?.colorCode ?? item?.color_code ?? '').toLowerCase();
        const fallback = `${title}|${start}|${end}|${color}`;
        return fallback.replace(/\|/g, '') ? `details:${fallback}` : `row:${item?.id ?? item?.calendarId ?? index}`;
    }

    private plannerEntryIdentity(entry: any, index: number): string {
        const id = entry?.entryId ?? entry?.entry_id ?? entry?.activityId ?? entry?.activity_id;
        if (id !== null && id !== undefined && id !== '') return `entry:${id}`;
        const name = this.getChildItemTitle(entry).trim().toLowerCase();
        const start = String(entry?.startTime ?? entry?.start_time ?? '');
        const end = String(entry?.endTime ?? entry?.end_time ?? '');
        const rawDays = entry?.daysOfWeek ?? entry?.days ?? [];
        const days = (Array.isArray(rawDays) ? rawDays : [rawDays]).map(String).sort().join(',');
        const fallback = `${name}|${start}|${end}|${days}`;
        return fallback.replace(/\|/g, '') ? `details:${fallback}` : `row:${entry?.id ?? index}`;
    }

    private entryOccursOnDate(entry: any, date: Date, inheritedDays?: any): boolean {
        const rawDays = entry?.daysOfWeek ?? entry?.days ?? inheritedDays;
        const days = Array.isArray(rawDays) ? rawDays : [];
        if (!days.length) return true;
        const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        return days.some((value: any) => {
            const normalized = String(value || '').trim().toUpperCase();
            return normalized === day
                || normalized === day.slice(0, 3)
                || normalized === day.slice(0, 1)
                || (day === 'THURSDAY' && (normalized === 'TH' || normalized === 'THU'))
                || (day === 'SATURDAY' && normalized === 'SA');
        });
    }

    private getPlannerEntryTimestamp(entry: any, part: 'start' | 'end'): number {
        const field = part === 'start' ? 'startTime' : 'endTime';
        const time = entry?.[field] ?? entry?.[`${field}_time`] ?? entry?.[`${part}Time`];
        return this.timestampForDateAndTime(this.selectedDate, time);
    }

    private getPlannerStartTimestamp(item: any): number {
        const start = this.getLocalDate(item?.startDate || item?.start_date);
        return start ? start.getTime() : Number.MAX_SAFE_INTEGER;
    }

    private getPlannerColor(item: any): string {
        // The calendar endpoint may attach the planner colour to the parent
        // schedule or to one of its recurring activity rows. Use the chosen
        // colour for the visual dot in either response shape.
        const rows = [item, ...(Array.isArray(item?.activities) ? item.activities : [])];
        for (const row of rows) {
            const color = String(row?.colorCode ?? row?.color_code ?? row?.color ?? '').trim();
            if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
        }
        return '#537C81';
    }

    private timestampForDateAndTime(date: Date, time: any): number {
        const match = String(time || '').match(/(\d{1,2}):(\d{2})/);
        if (!match) return 0;
        const timestamp = this.startOfDay(date);
        timestamp.setHours(Number(match[1]), Number(match[2]), 0, 0);
        return timestamp.getTime();
    }

    private getLocalDate(value: any): Date | null {
        if (!value) return null;
        if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value.getTime());
        const text = String(value);
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        const parsed = new Date(text);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    private startOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    private dateKey(date: Date): string {
        return this.habitService.formatDateToYYYYMMDD(date);
    }

    private getPlannerContextKey(date: string = this.getSelectedDateString()): string {
        const accountId = this.authService.getUserId() ?? 'anonymous';
        const relationship = String(this.authService.getUserRelationship() || 'SELF').toUpperCase();
        const selectedChildId = this.authService.isParentUser() ? (this.profileSelector.getChildId() ?? 'none') : 'self';
        return `${accountId}:${relationship}:${selectedChildId}:${date}`;
    }

    private isCurrentPlannerRequest(requestId: number, contextKey: string, date: string): boolean {
        return requestId === this.plannerRequestId
            && contextKey === this.getPlannerContextKey(date)
            && date === this.getSelectedDateString();
    }

    /**
     * Clear every view-specific collection before a profile/context changes.
     * This prevents a slower response for Child A (or a previous login) from
     * being rendered while Child B is being loaded.
     */
    private resetPlannerContext(): void {
        this.habitRequestId++;
        this.taskRequestId++;
        this.plannerRequestId++;
        this.allHabits = [];
        this.tasks = [];
        this.filteredHabits = [];
        this.filteredTasks = [];
        this.childDateActivities = {};
        this.childPlannerItems = [];
        this.childEventItems = [];
        this.plannerExpansion.clear();
        this.loading = false;
        this.plannerLoading = false;
        this.plannerLoadError = false;
    }

    retryPlannerData(): void {
        this.loadInitialData(true);
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
        const requestId = ++this.habitRequestId;
        const contextKey = this.getPlannerContextKey(formattedDate);

        this.subscriptions.add(
            this.habitService.loadHabitsForDate(formattedDate, forceReload).subscribe({
                next: (res: any) => {
                    if (this.isPlannerCalendarDesign &&
                        (requestId !== this.habitRequestId || contextKey !== this.getPlannerContextKey(formattedDate) || formattedDate !== this.getSelectedDateString())) {
                        return;
                    }
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
                        status: this.normalizeStatus(h.status, h),
                        priority: h.priority?.trim().toLowerCase(),
                        routine: h.routine?.trim().toLowerCase(),
                        tags: (() => {
                            const raw = h.tag ? [h.tag] : (Array.isArray(h.tags) ? h.tags : []);
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
                    this.ensureChildStatusFilterHasResults();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                },
                error: () => {
                    if (this.isPlannerCalendarDesign &&
                        (requestId !== this.habitRequestId || contextKey !== this.getPlannerContextKey(formattedDate) || formattedDate !== this.getSelectedDateString())) {
                        return;
                    }
                    this.loading = false;
                    this.allHabits = [];
                }
            })
        );
    }

    loadTasksForSelectedDate(date: Date, forceReload: boolean = false): void {
        this.loading = true;
        const formatted = this.habitService.formatDateToYYYYMMDD(date);
        const requestId = ++this.taskRequestId;
        const contextKey = this.getPlannerContextKey(formatted);

        this.subscriptions.add(
            this.taskApi.getTasksByDate(formatted, forceReload).subscribe({
                next: (res: any) => {
                    if (this.isPlannerCalendarDesign &&
                        (requestId !== this.taskRequestId || contextKey !== this.getPlannerContextKey(formatted) || formatted !== this.getSelectedDateString())) {
                        return;
                    }
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
                            type: 'tasks',
                            startTimeStamp: this.normalizeTimestamp(timestamps.startTimeStamp),
                            endTimeStamp: this.normalizeTimestamp(timestamps.endTimeStamp),
                            status: this.normalizeStatus(t.status, t),
                            priority: t.priority?.trim().toLowerCase(),
                            routine: t.routine?.trim().toLowerCase(),
                            tags: t.tag ? [t.tag] : (Array.isArray(t.tags) ? t.tags : []),
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
                    this.ensureChildStatusFilterHasResults();
                    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
                },
                error: () => {
                    if (this.isPlannerCalendarDesign &&
                        (requestId !== this.taskRequestId || contextKey !== this.getPlannerContextKey(formatted) || formatted !== this.getSelectedDateString())) {
                        return;
                    }
                    this.tasks = [];
                    this.loading = false;
                    this.applyFilters();
                }
            })
        );
    }

    private normalizeStatus(status: any, _item?: any): 'pending' | 'ongoing' | 'completed' | 'skipped' {
        const normalized = this.buttonLogic.normalizeStatus(status);
        // A missed activity remains actionable for the rest of its scheduled
        // day. Some calendar responses mark it skipped immediately at end
        // time, so present it as pending until the next local calendar day.
        if (normalized === 'skipped' && this.isSelectedDateToday()) {
            return 'pending';
        }
        return normalized;
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
    onCardTap(habit: any, entryType?: 'habit' | 'task', event?: Event): void {
        const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
        const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
        event?.preventDefault();
        if (this.isChildCalendarDesign && entryType) {
            const key = this.getChildActivityKey(habit, entryType);
            if (this.lastChildActivityLongPress.key === key
                && Date.now() - this.lastChildActivityLongPress.at < 800) return;
            const status = String(habit?.status || '').toLowerCase();
            if (status === 'ongoing') {
                this.openActivityDetail(habit, entryType, false);
                return;
            }
            if (status === 'completed' || habit?.completed === true) {
                this.openActivityDetail(habit, entryType, false);
                return;
            }
            this.expandedChildActivityKey = key;
            try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
            this.restoreScrollPosition(scrollX, scrollY);
            return;
        }

        this.singleModeHabit = habit;
        this.showSingleMode = true;
        try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
        this.restoreScrollPosition(scrollX, scrollY);
    }

    private restoreScrollPosition(scrollX: number, scrollY: number): void {
        if (typeof window === 'undefined') return;
        requestAnimationFrame(() => {
            window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' });
            requestAnimationFrame(() => window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' }));
        });
    }

    /** Open the full action/detail screen from the compact calendar cards. */
    onCardLongPress(habit: any, entryType?: 'habit' | 'task'): void {
        if (entryType) {
            this.lastChildActivityLongPress = {
                key: this.getChildActivityKey(habit, entryType),
                at: Date.now()
            };
        }
        this.openActivityDetail(habit, entryType, true);
    }

    isChildActivityExpanded(habit: any, entryType: 'habit' | 'task'): boolean {
        return this.expandedChildActivityKey === this.getChildActivityKey(habit, entryType);
    }

    readonly trackChildActivity = (_index: number, entry: { item: any; type: 'habit' | 'task' }): string => {
        // The visible-list getter creates wrappers on each change detection.
        // Keep card instances (and their open confirmations/timers) stable.
        return `${this.getSelectedDateString()}:${this.getChildActivityKey(entry.item, entry.type)}`;
    };

    private getChildActivityKey(habit: any, entryType: 'habit' | 'task'): string {
        return `${entryType}:${habit?.id ?? habit?.habitId ?? habit?.taskId ?? ''}`;
    }

    private openActivityDetail(habit: any, entryType?: 'habit' | 'task', fromLongPress = false): void {
        const itemId = Number(habit?.id ?? habit?.habitId ?? habit?.taskId);
        if (!Number.isFinite(itemId) || itemId <= 0) return;

        const activityType = entryType === 'task' || String(habit?.type || '').toLowerCase().includes('task')
            ? 'tasks'
            : 'habits';

        this.router.navigate(['/activity-detail', itemId], {
            state: {
                habit: { ...habit, type: activityType },
                type: activityType,
                fromLongPress,
                selectedDate: this.getSelectedDateString()
            },
            queryParams: { type: activityType, date: this.getSelectedDateString() }
        }).catch(error => console.error('[HabitPageContent] Unable to open activity detail:', error));
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
