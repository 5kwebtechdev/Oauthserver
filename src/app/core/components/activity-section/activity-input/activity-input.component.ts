import { Component, OnInit, AfterViewInit, ViewChild, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ViewWillEnter } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { SupermeInputsModule } from '../../superme-inputs/superme-inputs.module';
import { SupermeSelectorsComponent } from '../../superme-selectors/superme-selectors.component';
import { SupermeTagsComponent } from '../../superme-selectors/superme-tags/superme-tags.component';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeToggleComponent } from '../../superme-selectors/superme-toggle/superme-toggle.component';
import { SupermePopupComponent, SupermePopupConfig } from '../../superme-popup/superme-popup.component';
import { HabitService } from '../habit.service';
import { HabitApi } from '../../../api/habit.api';
import { TaskApi } from '../../../api/task.api';
import { CalendarApi } from '../../../api/calendar.api';
import { EventApi, EventPayload, EventTypeDto } from '../../../api/event.api';
import { TagsApi } from '../../../api/tags.api';
import { Habit, ReminderOffset } from '../habit.types';
import { Router } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { AuthService } from '../../../services/auth.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { CustomToastService } from '../../../services/custom-toast.service';

type ActivityTab = 'habits' | 'tasks' | 'timetable' | 'events';
type ActivityNavigationTab = ActivityTab | 'planner';
type EventRecurrence = 'ONE_TIME' | 'MONTHLY' | 'YEARLY';

interface ActivityTabOption {
  key: ActivityNavigationTab;
  label: string;
  icon: string;
}

interface PlannerEntry {
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
}

interface EventChoice {
  key: string;
  label: string;
  icon: string;
  id?: number;
  custom?: boolean;
}

@Component({
  standalone: true,
  selector: 'activity-input',
  templateUrl: './activity-input.component.html',
  styleUrls: ['./activity-input.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule, SupermeButtonComponent, SupermeInputsModule, SupermeSelectorsComponent, SupermeTagsComponent, SupermeNavigatorComponent, SupermeToggleComponent, SupermePopupComponent]
})
export class ActivityInputComponent implements OnInit, AfterViewInit, ViewWillEnter {
  private static readonly TIME_REGEX = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;
  private static readonly DAY_MAP: Record<string, string> = {
    S: 'SUNDAY', M: 'MONDAY', T: 'TUESDAY', W: 'WEDNESDAY', Th: 'THURSDAY', F: 'FRIDAY', Sa: 'SATURDAY'
  };
  private static readonly DAY_NUM_TO_CODE: Record<number, string> = {
    0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'Th', 5: 'F', 6: 'Sa'
  };
  private static readonly FULL_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  private static readonly PRIORITY_MAP: Record<string, 'low' | 'medium' | 'high'> = { '1': 'low', '2': 'medium', '3': 'high' };

  /**
   * iOS webviews before randomUUID support still need a local id while the
   * activity is being saved. Keep the UUID shape so local Habit types and
   * optimistic UI behaviour remain unchanged.
   */
  private createLocalId(): string {
    const cryptoApi = globalThis.crypto;
    if (typeof cryptoApi?.randomUUID === 'function') {
      return cryptoApi.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (typeof cryptoApi?.getRandomValues === 'function') {
      cryptoApi.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index++) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Input properties for modal usage - allows passing data directly via componentProps
  @Input() editingHabit: any = null;
  @Input() initialTab: ActivityNavigationTab | null = null;

  title = '';
  notes = '';
  private _startDate: Date | null = null;
  private _endDate: Date | null = null;
  startTime = '';
  endTime = '';
  // Tracks whether the user has explicitly picked a Start Time, so date changes
  // only auto-fill it while it's still untouched (see onStartTimeChanged()).
  private startTimeUserSet = false;

  get startDate(): Date | null {
    return this._startDate;
  }

  onNavigatorBack(): void {
    // Persist the active tab so the list page can restore it after navigating back
    try { sessionStorage.setItem('activityInitialTab', String(this.currentActive || 'habits')); } catch (e) { /* ignore */ }

    // Check if we're in a modal first - if so, just dismiss and don't navigate
    this.modalCtrl.getTop().then(topModal => {
      if (topModal) {
        this.modalCtrl.dismiss({ cancelled: true }).catch(() => {});
        return;
      }
      // Always pop the stack — never push a new route.
      // Using navigateByUrl(originUrl) was pushing Detail back on top of Input,
      // causing a back-button loop: Detail → Input → Detail → Input …
      this.navigation.back();
    }).catch(() => {
      this.navigation.back();
    });
  }



  set startDate(value: Date | null) {
    // Allow assigning a start date even if it's after the current end date.
    // Validation will catch and surface the error to the user instead of silently blocking the selection.
    this._startDate = value;
    this.showDaySelectionError = false;
    this.autoAdjustSelectedDays();
    this.applyDefaultStartTimeForDate(value);
    try { const validations = this.computeValidations(); Object.assign(this.errors, validations); this.cd.detectChanges(); } catch (e) { }
  }

  /**
   * Today should default Start Time to right now (so a habit can start
   * immediately); a future date should leave it empty until the user picks
   * one. Only applies while the user hasn't explicitly chosen a time yet,
   * and never while editing an existing entry that already has a real time.
   */
  private applyDefaultStartTimeForDate(date: Date | null): void {
    if (this.startTimeUserSet || this.editingId || !date) return;

    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    if (isToday) {
      const hh = String(today.getHours()).padStart(2, '0');
      const mm = String(today.getMinutes()).padStart(2, '0');
      this.startTime = this.to12Hour(`${hh}:${mm}`);
    } else {
      this.startTime = '';
    }
  }

  get endDate(): Date | null {
    return this._endDate;
  }

  set endDate(value: Date | null) {
    // Allow assigning an end date even if it's before the current start date.
    // We will surface a validation error instead of preventing the user from picking the date.
    this._endDate = value;
    this.showDaySelectionError = false;
    this.autoAdjustSelectedDays();
    try { const validations = this.computeValidations(); Object.assign(this.errors, validations); this.cd.detectChanges(); } catch (e) { }
  }
  currentActive: ActivityTab = 'habits';
  originUrl: string | null = null;

  readonly activityTabs: ReadonlyArray<ActivityTabOption> = [
    { key: 'habits', label: 'Habit', icon: 'assets/icons/Habit.svg' },
    { key: 'tasks', label: 'Task', icon: 'assets/icons/Task.svg' },
    { key: 'timetable', label: 'Time Table', icon: 'assets/figma/child-planner/calendar.svg' },
    { key: 'events', label: 'Event', icon: 'assets/figma/activity-event/event-type.svg' }
  ];

  readonly childActivityTabs: ReadonlyArray<ActivityTabOption> = [
    { key: 'habits', label: 'Habit', icon: 'assets/icons/Habit.svg' },
    { key: 'tasks', label: 'Task', icon: 'assets/icons/Task.svg' },
    { key: 'planner', label: 'Planner', icon: 'assets/figma/child-planner/schedule.svg' }
  ];

  readonly plannerColors = ['#0D47A1', '#B71C1C', '#880E4F', '#1B5E20', '#4A148C'];
  selectedPlannerColor = this.plannerColors[0];

  get isChildPlannerFlow(): boolean {
    // The compact Habit / Task / Planner experience is for independent users.
    // Keep parent-created activities on the full assignment form.
    return (this.isChild || this.isSelf) && !this.isParentCreated;
  }

  get visibleActivityTabs(): ReadonlyArray<ActivityTabOption> {
    return this.isChildPlannerFlow ? this.childActivityTabs : this.activityTabs;
  }

  get isPlannerActive(): boolean {
    return this.currentActive === 'timetable' || this.currentActive === 'events';
  }

  get isTasks(): boolean {
    return this.currentActive === 'tasks';
  }
  isPrivate = false;
  isChild = false;
  isSelf = false;
  isParent = false;
  isParentCreated = false;
  selectedTags: Array<{ key: string, value: string, type?: string }> = [];
  // today's date (date-only) used to prevent past date selection
  today: Date = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  routineOptions = [
    { key: 'morning', value: 'Morning', type: 'morning' },
    { key: 'evening', value: 'Evening', type: 'evening' },
    { key: 'night', value: 'Night', type: 'night' }
  ];
  // start empty so user must explicitly select routine — enables validation error to show
  selectedRoutine = '';

  // Use centralized tags from SupermeTags; keep local container for dynamic additions
  routineTags: Array<{ key: string, value: string, type: string }> = [];
  // API-loaded tag options passed to superme-tags component
  tagOptions: Array<{ key: number; value: string; system?: boolean; editable?: boolean; deletable?: boolean; type?: string }> = [];

  // Quick-pick shortcuts for the End Date picker, each measured from Start Date
  readonly endDateQuickRanges: Array<{ label: string; unit: 'day' | 'month'; amount: number }> = [
    { label: '15 days', unit: 'day', amount: 15 },
    { label: '1 week', unit: 'day', amount: 7 },
    { label: '1 month', unit: 'month', amount: 1 },
    { label: '2 months', unit: 'month', amount: 2 }
  ];

  // Icon lookup for the Category pills, keyed by lowercased tag value
  readonly categoryIcons: Record<string, string> = {
    study: 'assets/icons/Study.svg',
    health: 'assets/icons/Health.svg',
    skill: 'assets/icons/Skill.svg',
    routine: 'assets/icons/Routine.svg',
    personal: 'assets/icons/Personal.svg'
  };

  getCategoryIcon(value: string): string | null {
    return this.categoryIcons[(value || '').trim().toLowerCase()] || null;
  }

  isCategorySelected(key: any): boolean {
    return !!this.selectedTags?.some(t => String(t.key) === String(key));
  }

  selectCategory(key: any) {
    this.tagsComponent?.toggleSelection(key);
  }

  openAddCategory(elRef?: any) {
    this.tagsComponent?.openAdd(elRef);
  }

  everyday = false;
  weekdays = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  selectedDays = new Set<string>();
  priority: '' | 'low' | 'medium' | 'high' = 'high';
  reminderOffset: ReminderOffset | null = null;
  reminderExpanded = false;

  eventDate: Date | null = null;
  eventAllDay = false;
  eventHighPriority = false;
  eventInfoVisible = true;
  selectedEventType = '';
  eventRecurrence: EventRecurrence = 'ONE_TIME';
  addingEventType = false;
  savingEventType = false;
  customEventTypeName = '';
  eventTypeErrorMessage = '';

  eventTypes: EventChoice[] = [];

  readonly recurrenceOptions: ReadonlyArray<EventChoice & { key: EventRecurrence }> = [
    { key: 'ONE_TIME', label: 'One Time', icon: 'assets/figma/activity-event/one-time.svg' },
    { key: 'MONTHLY', label: 'Monthly', icon: 'assets/figma/activity-event/monthly.svg' },
    { key: 'YEARLY', label: 'Yearly', icon: 'assets/figma/activity-event/yearly.svg' }
  ];

  readonly reminderOptions: ReadonlyArray<{ value: ReminderOffset | null; label: string }> = [
    { value: null, label: 'No reminder' },
    { value: 'MINUTES_15', label: '15 minutes before' },
    { value: 'MINUTES_30', label: '30 minutes before' },
    { value: 'MINUTES_45', label: '45 minutes before' }
  ];

  get reminderSummary(): string {
    return this.reminderOptions.find(option => option.value === this.reminderOffset)?.label || 'No reminder';
  }

  toggleReminderOptions(): void {
    this.reminderExpanded = !this.reminderExpanded;
  }

  selectReminderOffset(value: ReminderOffset | null): void {
    this.reminderOffset = value;
    this.reminderExpanded = false;
  }

  private normalizeReminderOffset(value: unknown): ReminderOffset | null {
    const normalized = String(value ?? '').trim().toUpperCase();
    return this.reminderOptions.some(option => option.value === normalized)
      ? normalized as ReminderOffset
      : null;
  }

  private normalizeEventReminderOffset(value: unknown): ReminderOffset | null {
    const minutes = Number(value);
    if (minutes === 15) return 'MINUTES_15';
    if (minutes === 30) return 'MINUTES_30';
    if (minutes === 45) return 'MINUTES_45';
    return this.normalizeReminderOffset(value);
  }

  private getEventReminderMinutes(): number | null {
    switch (this.reminderOffset) {
      case 'MINUTES_15': return 15;
      case 'MINUTES_30': return 30;
      case 'MINUTES_45': return 45;
      default: return null;
    }
  }

  // Tag variant mapping by activity type
  readonly tagVariants: Record<string, 'blue' | 'orange' | 'green' | 'gray'> = { habits: 'blue', tasks: 'orange', timetable: 'green', events: 'gray' };

  // Coin selector
  // coin selector removed for parent accounts

  activities: PlannerEntry[] = [
    { name: '', startTime: '', endTime: '', days: ['S'] },
    { name: '', startTime: '', endTime: '', days: ['S'] }
  ];

  @ViewChild(SupermeTagsComponent) tagsComponent?: SupermeTagsComponent;
  @ViewChild(SupermeSelectorsComponent) selectorsComponent?: SupermeSelectorsComponent;

  // store labels found during init so we can sync them to the child after view init
  private _pendingTagLabels: string[] = [];
  private _tagsSynced: boolean = false;

  editingId?: string;
  originalHabit: any = null;
  isSubmitting = false;
  attemptedSubmit = false;
  // Server-side validation message (e.g., duplicate time/date)
  serverErrorMessage = '';
  showDaySelectionError = false;
  errors = {
    title: false, time: false, date: false, notes: false, tag: false,
    routine: false, weekdays: false, priority: false, pastTime: false,
    endTimeBeforeStart: false, endTimeSingleDay: false,
    startAfterEnd: false, eventType: false
  };

  // Backward compatibility getters
  get showTitleError() { return this.errors.title; }
  get showTimeError() { return this.errors.time; }
  get showDateError() { return this.errors.date; }
  get showNotesError() { return this.errors.notes; }
  get showTagError() { return this.errors.tag; }
  get showRoutineError() { return this.errors.routine; }
  get showWeekdaysError() { return this.errors.weekdays; }
  get showPriorityError() { return this.errors.priority; }
  get showPastTimeError() { return this.errors.pastTime; }
  get showEndTimeSingleDayError() { return this.errors.endTimeSingleDay; }
  get showEndTimeBeforeStart() { return this.errors.endTimeBeforeStart; }
  get showStartAfterEnd() { return this.errors.startAfterEnd; }
  get showEventTypeError() { return this.errors.eventType; }

  // When start date is today and the start time is in the past, but the
  // activity repeats on future days (everyday or selected days beyond today),
  // show a specific instruction to move the start date to tomorrow.
  get showPastTimeForTodayRepeat(): boolean {
    if (!this.showPastTimeError || !this._startDate) return false;
    const startDateOnly = new Date(this._startDate.getFullYear(), this._startDate.getMonth(), this._startDate.getDate());
    const todayOnly = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    if (startDateOnly.getTime() !== todayOnly.getTime()) return false;

    // If it's set to everyday, it repeats in future days
    if (this.everyday) return true;

    // If endDate is after startDate, it's a multi-day range (repeats)
    if (this._endDate && this._endDate.getTime() > this._startDate.getTime()) return true;

    // If any selected weekday other than today's code is selected, it repeats later
    const todayCode = ActivityInputComponent.DAY_NUM_TO_CODE[this._startDate.getDay()];
    for (const d of this.selectedDays) {
      if (d !== todayCode) return true;
    }

    return false;
  }
  // Delete confirmation popup state
  deletePopupVisible = false;
  deletePopupConfig: SupermePopupConfig = {};
  // internal guard to prevent double-delete
  private deleting = false;

  // runtime asset path (served from /assets)
  private readonly DELETE_IMAGE_PATH = 'assets/Images-Transparent/Image-Input-Delete.png';

  // use PNG assets for icons (18px width, height auto)
  readonly _coinSvg = `<img src="assets/Icons-Neutral/Icons-Coins.png" alt="Coins" style="width:18px;height:auto;"/>`;
  private readonly _streakSvg = `<img src="assets/Icons-Neutral/Icon-Streak.png" alt="Streak" style="width:18px;height:auto;"/>`;

  private buildDeletePopupConfig(coin: number, streak: number): SupermePopupConfig {
    const headingHtml = `Delete this activity?<br/><div style="margin-top:12px;font-size:14px;color:#6b656a">This will remove every instance of this activity in the date range you selected.<div style="display:flex;flex-direction:column;gap:8px;align-items: center;margin-top:8px">` +
      `<div style="display:flex;align-items:center;gap:8px">You are about to lose:</div>` +
      `<div style="display:flex;align-items:center;gap:8px">${this._streakSvg}<div style=\"font-weight:600;\">${streak}</div></div>` +
      `</div></div>`;

    return {
      image: this.DELETE_IMAGE_PATH,
      imageAlt: 'Delete activity',
      heading: headingHtml,
      subtitle: '',
      primaryCTA: { text: 'Delete', buttonStyle: 'bronze', buttonMedium: true },
      secondaryCTA: { text: 'Cancel', buttonStyle: 'bronze-transparent', buttonMedium: true },
      backdrop: true,
      ctaDirection: 'row'
    } as SupermePopupConfig;
  }

  constructor(
    private modalCtrl: ModalController,
    private habitService: HabitService,
    private router: Router,
    private taskApi: TaskApi,
    private calendarApi: CalendarApi,
    private eventApi: EventApi,
    private habitApi: HabitApi,
    private navigation: NavigationService,
    private authService: AuthService,
    private profileSelector: ProfileSelectorService,
    private cd: ChangeDetectorRef,
    private toastService: CustomToastService,
    private tagsApi: TagsApi
  ) { }

  get navigatorActions(): Array<{ type: 'edit' | 'icon', src?: string, alt?: string }> {
    return this.editingId ? [{ type: 'icon', alt: 'Delete' }] : [];
  }

  onNavigatorAction(event: { index: number; action: any }) {
    const alt = (event?.action?.alt || '').toString().toLowerCase();
    if (alt.includes('delete')) this.onDelete();
  }

  private loadTagsFromApi(): void {
    this.tagsApi.getTags().subscribe({
      next: (tags) => {
        this.tagOptions = tags.map(t => ({
          key: t.id,
          value: t.name,
          system: t.system,
          editable: false,
          deletable: !t.system,
          type: t.system ? undefined : 'custom'
        }));
        // Re-sync pre-selected tags now that options are available
        this.syncSelectedTagsToComponent();
        try { this.cd.detectChanges(); } catch (e) {}
      },
      error: () => {
        // Fallback to local defaults if API fails
        this.tagOptions = [
          { key: 1, value: 'Study', system: true, editable: false, deletable: false },
          { key: 2, value: 'Health', system: true, editable: false, deletable: false },
          { key: 3, value: 'Skill', system: true, editable: false, deletable: false },
          { key: 4, value: 'Routine', system: true, editable: false, deletable: false },
          { key: 5, value: 'Personal', system: true, editable: false, deletable: false },
        ];
        this.syncSelectedTagsToComponent();
      }
    });
  }

  private loadEventTypes(): void {
    this.eventApi.getEventTypes().subscribe({
      next: (types) => {
        this.eventTypes = (Array.isArray(types) ? types : [])
          .filter(type => !!String(type?.name ?? '').trim())
          .map(type => this.mapEventType(type));
        this.ensureEventTypeOption(this.selectedEventType);
        try { this.cd.detectChanges(); } catch { /* view may not be ready */ }
      },
      error: () => {
        // Keep the required system choices usable if the type request is unavailable.
        this.eventTypes = [
          { key: 'Birthday', label: 'Birthday', icon: 'assets/figma/activity-event/birthday.svg' },
          { key: 'Anniversary', label: 'Anniversary', icon: 'assets/figma/activity-event/anniversary.svg' },
          { key: 'Exam', label: 'Exam', icon: 'assets/figma/activity-event/personal.svg' }
        ];
        this.ensureEventTypeOption(this.selectedEventType);
      }
    });
  }

  private ensureEventTypeOption(key: string): void {
    if (!key || this.eventTypes.some(item => item.key === key)) return;
    this.eventTypes = [...this.eventTypes, {
      key,
      label: key,
      icon: 'assets/figma/activity-event/personal.svg',
      custom: true
    }];
  }

  private mapEventType(type: EventTypeDto): EventChoice {
    const label = String(type.name || '').trim();
    const normalized = label.toLowerCase();
    const icon = normalized === 'birthday'
      ? 'assets/figma/activity-event/birthday.svg'
      : normalized === 'anniversary'
        ? 'assets/figma/activity-event/anniversary.svg'
        : normalized === 'exam'
          ? 'assets/figma/activity-event/personal.svg'
          : 'assets/figma/activity-event/personal.svg';

    return { key: label, label, icon, id: type.id, custom: !type.system };
  }

  selectActivityTab(tab: ActivityNavigationTab): void {
    const nextTab: ActivityTab = tab === 'planner' ? 'timetable' : tab;
    if (this.currentActive === nextTab || (tab === 'planner' && this.isPlannerActive)) return;
    this.currentActive = nextTab;
    if (nextTab === 'timetable' && !this.priority) this.priority = 'low';
    this.attemptedSubmit = false;
    this.serverErrorMessage = '';
    Object.keys(this.errors).forEach(key => (this.errors as any)[key] = false);
  }

  isActivityTabSelected(tab: ActivityNavigationTab): boolean {
    return tab === 'planner' ? this.isPlannerActive : this.currentActive === tab;
  }

  selectPlannerType(type: 'timetable' | 'events'): void {
    this.selectActivityTab(type);
  }

  selectPlannerColor(color: string): void {
    this.selectedPlannerColor = color;
  }

  isPlannerEntryDaySelected(entry: PlannerEntry, day: string): boolean {
    return entry.days.includes(day);
  }

  togglePlannerEntryDay(entry: PlannerEntry, day: string): void {
    entry.days = entry.days.includes(day)
      ? entry.days.filter(value => value !== day)
      : [...entry.days, day];
  }

  removePlannerEntry(index: number): void {
    if (this.activities.length === 1) {
      this.activities[0] = { name: '', startTime: '', endTime: '', days: ['S'] };
      return;
    }
    this.activities.splice(index, 1);
  }

  selectEventType(key: string): void {
    this.selectedEventType = key;
    this.eventTypeErrorMessage = '';
    this.clearError('eventType');
  }

  selectEventRecurrence(key: string): void {
    if (key === 'ONE_TIME' || key === 'MONTHLY' || key === 'YEARLY') {
      this.eventRecurrence = key;
    }
  }

  beginAddEventType(): void {
    this.addingEventType = true;
    this.customEventTypeName = '';
    this.eventTypeErrorMessage = '';
  }

  cancelAddEventType(): void {
    this.addingEventType = false;
    this.savingEventType = false;
    this.customEventTypeName = '';
    this.eventTypeErrorMessage = '';
  }

  saveCustomEventType(): void {
    const label = this.customEventTypeName.trim().slice(0, 20);
    if (!label || this.savingEventType) return;

    const existing = this.eventTypes.find(item => item.label.toLowerCase() === label.toLowerCase());
    if (existing) {
      this.selectEventType(existing.key);
      this.cancelAddEventType();
      return;
    }

    this.savingEventType = true;
    this.eventTypeErrorMessage = '';
    this.eventApi.createEventType(label).subscribe({
      next: (type) => {
        const custom = this.mapEventType(type);
        this.eventTypes = [...this.eventTypes, custom];
        this.selectEventType(custom.key);
        this.savingEventType = false;
        this.cancelAddEventType();
      },
      error: (error) => {
        this.savingEventType = false;
        this.eventTypeErrorMessage = error?.error?.message || error?.message || 'Unable to add this event type. Please try again.';
      }
    });
  }

  dismissEventInfo(): void {
    this.eventInfoVisible = false;
  }

  onEventDateChanged(): void {
    this.clearError('date');
    this.clearError('pastTime');
  }

  onEventAllDayChange(value: any): void {
    this.eventAllDay = !!(value?.detail?.checked ?? value);
    if (this.eventAllDay) {
      this.clearError('time');
      this.clearError('pastTime');
      this.clearError('endTimeBeforeStart');
      this.clearError('endTimeSingleDay');
    }
  }

  onEventPriorityChange(value: any): void {
    this.eventHighPriority = !!(value?.detail?.checked ?? value);
  }

  private syncSelectedTagsToComponent(): void {
    if (!this.tagsComponent || !Array.isArray(this.selectedTags) || !this.selectedTags.length) return;
    const keys = this.selectedTags.map(st => {
      // Match by numeric key first (most reliable)
      const byKey = this.tagOptions.find(o => String(o.key) === String(st.key));
      if (byKey) return byKey.key;
      // Fall back to matching by display value
      const stVal = String((st as any).value || (st as any).name || '').trim().toLowerCase();
      const byVal = this.tagOptions.find(o => String(o.value || '').trim().toLowerCase() === stVal);
      return byVal ? byVal.key : null;
    }).filter(k => k != null);
    if (keys.length) {
      this.tagsComponent.selectedKeys = keys as any[];
      this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
      try { this.cd.detectChanges(); } catch (e) {}
    }
  }

  ngOnInit() {
    this.loadTagsFromApi();
    this.loadEventTypes();
    // Determine whether current user is a child (only children should see Private toggle)
    try {
      const ud = localStorage.getItem('user_data');
      if (ud) {
        const parsed = JSON.parse(ud || '{}');
        const rel = (parsed.relationship || parsed.role || '').toString().toUpperCase();
        this.isChild = rel === 'CHILD';
        this.isSelf = rel === 'SELF';
        console.log('[PrivateToggle][DEBUG] user_data.relationship/role ->', parsed.relationship, '/', parsed.role, '-> isChild =', this.isChild, 'isSelf =', this.isSelf);
      } else {
        console.log('[PrivateToggle][DEBUG] no user_data found in localStorage — isChild stays false');
      }
    } catch (e: any) {
      console.error('[PrivateToggle][DEBUG] failed to parse user_data', e);
    }

    // Determine whether current user is a parent (parent accounts can assign coins)
    try {
      this.isParent = !!(this.authService && this.authService.isParentUser && this.authService.isParentUser());
    } catch (e: any) {
      this.isParent = false;
    }

    this.applyStateForActivity();
  }

  /**
   * Ionic's router-outlet reuses this page's component instance across visits
   * (e.g. tapping "Add" again after creating a task). ngOnInit only runs once,
   * so without this, the previous entry's title/dates/days would stay on screen
   * looking pre-filled/pre-selected on a supposedly brand-new form.
   */
  ionViewWillEnter(): void {
    this.applyStateForActivity();
  }

  private normalizeActivityTab(value: unknown, fallback: ActivityTab = 'habits'): ActivityTab {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'habit' || normalized === 'habits') return 'habits';
    if (normalized === 'task' || normalized === 'tasks') return 'tasks';
    if (normalized === 'event' || normalized === 'events') return 'events';
    if (normalized === 'planner') return 'timetable';
    if (normalized === 'timetable' || normalized === 'time table') return 'timetable';
    return fallback;
  }

  private normalizeEventRecurrence(value: unknown): EventRecurrence {
    const normalized = String(value || '').trim().toUpperCase().replace(/[ -]+/g, '_');
    if (normalized === 'MONTHLY' || normalized === 'YEARLY') return normalized;
    return 'ONE_TIME';
  }

  private applyStateForActivity(): void {
    try {
      // First check @Input() properties (used when opened via modal componentProps)
      // Then fall back to router navigation state or history.state
      const nav = this.router.getCurrentNavigation();
      const stateOrigin = nav?.extras?.state?.['origin'] ?? (history && (history.state as any)?.origin);
      this.originUrl = stateOrigin || null;
      const stateHabit = this.editingHabit ?? nav?.extras?.state?.['habit'] ?? (history && (history.state as any)?.habit);
      const stateSelectedDate = nav?.extras?.state?.['selectedDate'] ?? (history && (history.state as any)?.selectedDate) ?? null;
      // Respect an explicit initialTab passed via componentProps or navigation state even when
      // no `habit` object is provided (creating a new activity). Use habit type as a fallback.
      const stateCurrentActive = this.initialTab ?? nav?.extras?.state?.['currentActive'] ?? (history && (history.state as any)?.currentActive);
      this.currentActive = this.normalizeActivityTab(stateCurrentActive || stateHabit?.type, this.currentActive);
      if (!stateHabit) {
        this.resetForNewEntry();
        return;
      }
      const h: any = stateHabit;
      this.originalHabit = h;
      if (h.id) this.editingId = String(h.id);
      this.title = h.title || h.name || '';
      this.notes = h.notes ?? h.description ?? '';
      this.startDate = h.startDate ? new Date(h.startDate) : (h.startDateEpoch ? new Date(Number(h.startDateEpoch)) : null);
      this.endDate = h.endDate ? new Date(h.endDate) : (h.endDateEpoch ? new Date(Number(h.endDateEpoch)) : null);
      // Convert times to 12-hour format for the timepicker component
      this.startTime = this.to12Hour(h.startTime || h.start_time || '');
      this.endTime = this.to12Hour(h.endTime || h.end_time || '');
      this.reminderOffset = this.normalizeReminderOffset(h.reminderOffset ?? h.reminder_offset);
      this.reminderExpanded = false;
      // Auto-switch to the appropriate tab based on: @Input() initialTab, explicit currentActive in state, or habit type
      // Reuse `stateCurrentActive` declared above and fall back to habit type when editing.
      this.currentActive = this.normalizeActivityTab(stateCurrentActive || h.type, this.currentActive);
      // The habit object passed via navigation state (from the timeline/detail list)
      // doesn't carry the Private-toggle state, so `h.isPrivate` is always undefined.
      // Use it only as a transient fallback while we fetch the authoritative value.
      this.isPrivate = !!h.isPrivate;
      if (this.editingId && this.currentActive === 'habits') {
        const dateForLookup = stateSelectedDate || this.formatDateStr(new Date());
        this.habitApi.getHabitByIdWithDate(Number(this.editingId), dateForLookup).subscribe({
          next: (res: any) => {
            // isToggleOn mirrors isPrivateToChild exactly: true = toggle ON/private.
            this.isPrivate = !!res?.isToggleOn;
            if (res && ('reminderOffset' in res || 'reminder_offset' in res)) {
              this.reminderOffset = this.normalizeReminderOffset(res.reminderOffset ?? res.reminder_offset);
            }
            this.cd.detectChanges();
          },
          error: () => { /* keep the fallback value on error */ }
        });
      }
      const createdById = h.createdById ?? h.createdBy;
      const assignedToId = h.assignedToId ?? h.assignedTo;
      if (createdById != null && assignedToId != null && String(createdById) !== String(assignedToId)) {
        this.isParentCreated = true;
      }
      this.selectedRoutine = h.selectedRoutine || h.routine || (h.getRoutine as any) || this.selectedRoutine;

      // Merge incoming routineTags with default tags instead of replacing
      if (Array.isArray(h.routineTags) && h.routineTags.length > 0) {
        h.routineTags.forEach((incomingTag: any) => {
          const exists = this.routineTags.some(rt =>
            String(rt.key) === String(incomingTag.key) ||
            String(rt.value).toLowerCase() === String(incomingTag.value).toLowerCase()
          );
          if (!exists) {
            this.routineTags.push({
              key: String(incomingTag.key),
              value: incomingTag.value,
              type: incomingTag.type || 'habit-input'
            });
          }
        });
      }

      const incomingDays: string[] = Array.isArray(h.selectedDays) ? h.selectedDays : (Array.isArray(h.daysOfWeek) ? h.daysOfWeek : []);
      const mapFullToShort: any = { SUNDAY: 'S', MONDAY: 'M', TUESDAY: 'T', WEDNESDAY: 'W', THURSDAY: 'Th', FRIDAY: 'F', SATURDAY: 'Sa' };
      const normalizedShorts = incomingDays.map(d => {
        if (!d) return d;
        const up = String(d).toUpperCase();
        return mapFullToShort[up] || (['S', 'M', 'T', 'W', 'TH', 'F', 'SA'].includes(up) ? (up === 'TH' ? 'Th' : (up === 'SA' ? 'Sa' : up)) : up[0]);
      }).filter(Boolean);
      this.selectedDays = new Set<string>(normalizedShorts);

      this.everyday = !!h.everyday;
      if (!this.everyday && this.selectedDays.size === this.weekdays.length) this.everyday = true;
      if (this.everyday) this.weekdays.forEach(d => this.selectedDays.add(d));

      const rawPriority = (h.priority ?? h.priorityLevel ?? '').toString().trim().toLowerCase();
      this.priority = (['low', 'medium', 'high'].includes(rawPriority)
        ? rawPriority
        : ActivityInputComponent.PRIORITY_MAP[rawPriority] || '') as any;

      if (this.currentActive === 'events') {
        this.eventDate = h.eventDate ? new Date(h.eventDate) : this.startDate;
        this.eventAllDay = !!(h.allDay ?? h.all_day);
        this.eventHighPriority = !!(h.highPriority ?? h.high_priority) || rawPriority === 'high' || rawPriority === '3';
        this.selectedEventType = String(h.eventType ?? h.event_type ?? '').trim();
        this.ensureEventTypeOption(this.selectedEventType);
        this.eventRecurrence = this.normalizeEventRecurrence(h.recurrence ?? h.repeatType ?? h.repeat_type);
        this.reminderOffset = this.normalizeEventReminderOffset(
          h.reminderMinutesBefore ?? h.reminder_minutes_before ?? h.reminderOffset ?? h.reminder_offset
        );
      }

      this.activities = Array.isArray(h.activities) && h.activities.length
        ? h.activities.map((entry: any) => ({
          name: String(entry?.name || entry?.title || ''),
          startTime: this.to12Hour(entry?.startTime || entry?.start_time || ''),
          endTime: this.to12Hour(entry?.endTime || entry?.end_time || ''),
          days: this.normalizePlannerEntryDays(entry?.days || entry?.daysOfWeek || h.daysOfWeek)
        }))
        : this.activities;

      // Handle new API format: h.tag = { id, name, system, userId }
      // Also handle legacy format: h.tags = ["Study"] (string array) for backward compat
      if (h.tag && typeof h.tag === 'object' && h.tag.id) {
        this.selectedTags = [{ key: String(h.tag.id), value: h.tag.name }];
      } else if (Array.isArray(h.tags) && h.tags.length) {
        const first = h.tags[0];
        if (typeof first === 'string') {
          this.selectedTags = h.tags.map((t: string, idx: number) => ({ key: String(idx), value: t }));
        } else if (typeof first === 'object') {
          this.selectedTags = h.tags.map((t: any, idx: number) => (t.key && (t.value || t.name || t.title)) ? { key: String(t.key), value: t.value || t.name || t.title, type: t.type } : { key: String(idx), value: t.value || t.name || t.title || JSON.stringify(t) });
        }
      }
      // Pre-select the tag in the child component by ID once tagOptions are loaded
      try {
        if (this.tagsComponent && Array.isArray(this.selectedTags) && this.selectedTags.length) {
          const tagKey = Number(this.selectedTags[0].key);
          if (!isNaN(tagKey)) {
            this.tagsComponent.selectedKeys = [tagKey];
            this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
          }
        }
      } catch (e: any) { console.warn('Failed to sync tag selection with SupermeTags component', e); }
    } catch (e: any) {
      console.warn('Failed to read navigation state for habit-input', e);
    }
  }

  /**
   * Clears every mutable form field back to its pristine "new entry" state.
   * Needed because Ionic reuses this page's component instance across visits,
   * so a stale title/date/day selection from a previous entry must not leak
   * into what looks like a brand-new, untouched form.
   */
  private resetForNewEntry(): void {
    this.editingId = undefined;
    this.originalHabit = null;
    this.title = '';
    this.notes = '';
    this.startDate = null;
    this.endDate = null;
    this.startTime = '';
    this.endTime = '';
    this.startTimeUserSet = false;
    this.isPrivate = false;
    this.isParentCreated = false;
    this.selectedRoutine = '';
    this.routineTags = [];
    this.selectedDays = new Set<string>();
    this.everyday = false;
    this.priority = 'high';
    this.reminderOffset = null;
    this.reminderExpanded = false;
    this.eventDate = null;
    this.eventAllDay = false;
    this.eventHighPriority = false;
    this.eventInfoVisible = true;
    this.selectedEventType = '';
    this.eventRecurrence = 'ONE_TIME';
    this.addingEventType = false;
    this.savingEventType = false;
    this.customEventTypeName = '';
    this.eventTypeErrorMessage = '';
    this.activities = [
      { name: '', startTime: '', endTime: '', days: ['S'] },
      { name: '', startTime: '', endTime: '', days: ['S'] }
    ];
    this.selectedPlannerColor = this.plannerColors[0];
    this.selectedTags = [];
    this.attemptedSubmit = false;
    this.serverErrorMessage = '';
    this.showDaySelectionError = false;
    this.errors = {
      title: false, time: false, date: false, notes: false, tag: false,
      routine: false, weekdays: false, priority: false, pastTime: false,
      endTimeBeforeStart: false, endTimeSingleDay: false,
      startAfterEnd: false, eventType: false
    };
    if (this.tagsComponent) {
      this.tagsComponent.selectedKeys = [];
      this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
    }
  }

  get isFormComplete(): boolean {
    if (this.currentActive === 'events') {
      if (!this.title?.trim() || !this.selectedEventType || !this.eventDate) return false;
      if (this.eventAllDay) return true;
      if (!this.startTime?.trim() || !this.endTime?.trim()) return false;
      if (this.isTimeInPast(this.startTime, this.eventDate)) return false;
      if (this.isEndTimeNotAfterStart(this.startTime, this.endTime)) return false;
      return !this.isEndTimeCrossingMidnight(this.startTime, this.endTime);
    }

    if (this.currentActive === 'timetable' && this.isChildPlannerFlow) {
      return !!this.title?.trim()
        && !!this.startDate
        && !!this.endDate
        && this.startDate <= this.endDate
        && this.activities.some(entry => this.isPlannerEntryComplete(entry));
    }

    if (!this.title?.trim()) return false;
    if (!this.startDate || !this.endDate) return false;
    if (!this.startTime?.trim() || !this.endTime?.trim()) return false;
    if (this.isTimeInPast(this.startTime, this.startDate) || this.isTimeInPast(this.endTime, this.endDate)) return false;
    if (this.isEndTimeNotAfterStart(this.startTime, this.endTime)) return false;
    if (this.isEndTimeCrossingMidnight(this.startTime, this.endTime)) return false;

    // Additional required fields checked by submit validations
    if (!this.selectedTags || this.selectedTags.length === 0) return false;
    if (!this.priority) return false;
    if (!this.notes?.trim()) return false;

    return this.everyday || (this.selectedDays && this.selectedDays.size > 0);
  }

  get hasCompletePlannerEntry(): boolean {
    return this.activities.some(entry => this.isPlannerEntryComplete(entry));
  }

  private normalizePlannerEntryDays(value: unknown): string[] {
    const rawDays = Array.isArray(value) ? value : [];
    const normalized = rawDays.map(day => {
      const key = String(day || '').trim().toUpperCase();
      const match = Object.entries(ActivityInputComponent.DAY_MAP)
        .find(([, fullDay]) => fullDay === key)?.[0];
      const shortCode = this.weekdays.find(code => code.toUpperCase() === key);
      return match || shortCode || '';
    }).filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : ['S'];
  }

  private isPlannerEntryComplete(entry: PlannerEntry): boolean {
    return !!entry.name?.trim()
      && !!entry.startTime?.trim()
      && !!entry.endTime?.trim()
      && entry.days.length > 0
      && !this.isEndTimeNotAfterStart(entry.startTime, entry.endTime)
      && !this.isEndTimeCrossingMidnight(entry.startTime, entry.endTime);
  }

  private syncPlannerScheduleToLegacyFields(): void {
    const entry = this.activities.find(item => this.isPlannerEntryComplete(item)) || this.activities[0];
    if (!entry) return;
    this.startTime = entry.startTime || '';
    this.endTime = entry.endTime || '';
    this.selectedDays = new Set(entry.days || []);
    this.everyday = this.selectedDays.size === this.weekdays.length;
    if (!this.priority) this.priority = 'low';
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } | null {
    const match = ActivityInputComponent.TIME_REGEX.exec(timeStr.trim());
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[4]?.toUpperCase();

    if (period) {
      if (period === 'PM' && hours !== 12) hours += 12;
      else if (period === 'AM' && hours === 12) hours = 0;
    }

    return { hours, minutes };
  }

  // referenceDate defaults to startDate (existing callers), but endTime must be
  // checked against endDate — a habit ending today must end later than now,
  // regardless of what day it started.
  private isTimeInPast(timeStr: string, referenceDate: Date | null = this.startDate): boolean {
    if (this.editingId) return false; // Allow past times in edit mode

    if (!timeStr || !referenceDate) return false;

    const today = new Date();
    const dateOnly = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dateOnly.getTime() !== todayOnly.getTime()) return false;

    const parsed = this.parseTime(timeStr);
    if (!parsed) return false;

    const selectedTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parsed.hours, parsed.minutes);
    return selectedTime < new Date();
  }

  // Return true when end time represents midnight/overflow (i.e., would fall on the next day
  // strictly because it is 00:00 or an invalid time beyond 23:59). This enforces that single-day
  // occurrences must finish before midnight (11:59 PM).
  private isEndTimeCrossingMidnight(startTimeStr: string, endTimeStr: string): boolean {
    if (!startTimeStr || !endTimeStr) return false;

    const start = this.parseTime(startTimeStr);
    const end = this.parseTime(endTimeStr);
    if (!start || !end) return false;

    // Exact midnight (00:00) is considered the next day and therefore invalid
    if (end.hours === 0 && end.minutes === 0) return true;

    // Invalid/overflow times
    if (end.hours > 23 || (end.hours === 23 && end.minutes > 59)) return true;

    // Otherwise, not a midnight overflow case (do not check end <= start here)
    return false;
  }

  // Return true when end time is less than or equal to start time (same-day end must be after start)
  private isEndTimeNotAfterStart(startTimeStr: string, endTimeStr: string): boolean {
    if (!startTimeStr || !endTimeStr) return false;

    const start = this.parseTime(startTimeStr);
    const end = this.parseTime(endTimeStr);
    if (!start || !end) return false;

    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    return endMinutes <= startMinutes;
  }

  onTagAdd(event: any) {
    if (!event?.value) return;
    this.tagsApi.createTag(event.value).subscribe({
      next: (created) => {
        const newOpt = { key: created.id, value: created.name, system: false, editable: false, deletable: true, type: 'custom' };
        this.tagOptions = [newOpt, ...this.tagOptions];
        if (this.tagsComponent) {
          this.tagsComponent.options = [...this.tagOptions];
          this.tagsComponent.toggleSelection(created.id);
        }
        try { this.cd.detectChanges(); } catch (e) {}
      },
      error: (err) => {
        const serverMsg = (err?.error?.message || '').toLowerCase();
        if (serverMsg.includes('already have a tag') || serverMsg.includes('duplicate') || err?.status === 400) {
          const existing = this.tagOptions.find(t =>
            (t.value || '').toLowerCase().trim() === (event.value || '').toLowerCase().trim()
          );
          if (existing && this.tagsComponent) {
            this.tagsComponent.toggleSelection(existing.key);
            this.toastService.success(`"${event.value}" already exists — selected it for you.`);
          } else {
            this.toastService.success(`A tag named "${event.value}" already exists.`);
          }
        } else {
          this.toastService.error('Could not create tag. Please try again.');
        }
      }
    });
  }

  onTagEdit(event: any) { /* editing tags is not supported via API */ }

  onTagDelete(event: any) {
    const id = event?.key ?? event;
    if (id == null) return;
    this.tagsApi.deleteTag(Number(id)).subscribe({
      next: () => {
        this.tagOptions = this.tagOptions.filter(t => t.key !== Number(id));
        if (this.tagsComponent) {
          this.tagsComponent.options = [...this.tagOptions];
          if (this.tagsComponent.selectedKeys.includes(id)) {
            this.tagsComponent.selectedKeys = [];
            this.selectedTags = [];
          }
        }
        try { this.cd.detectChanges(); } catch (e) {}
      },
      error: (err) => {
        const serverMsg = (err?.error?.message || '').toLowerCase();
        if (serverMsg.includes('still attached') || serverMsg.includes('in use')) {
          const tagName = this.tagOptions.find(t => t.key === Number(id))?.value || 'This tag';
          this.toastService.error(`"${tagName}" is in use by a task or habit. Remove it from there first.`);
        } else {
          this.toastService.error('Could not delete tag. Please try again.');
        }
      }
    });
  }

  private to24Hour(t: string): string {
    if (!t) return '';
    const trimmed = t.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [hh, mm] = trimmed.split(':');
      return `${Number(hh).toString().padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
    }
    const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (m) {
      let hh = parseInt(m[1], 10);
      const mm = m[2];
      const ampm = m[3].toUpperCase();
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return `${hh.toString().padStart(2, '0')}:${mm}:00`;
    }
    return trimmed;
  }

  private to12Hour(t: string): string {
    if (!t) return '';
    const trimmed = t.trim();

    // Already in 12-hour format with AM/PM
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
      return trimmed;
    }

    // Convert from 24-hour format (HH:MM:SS or HH:MM)
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = hours >= 12 ? 'PM' : 'AM';

      if (hours === 0) hours = 12;
      else if (hours > 12) hours -= 12;

      return `${hours}:${minutes} ${period}`;
    }

    return trimmed;
  }

  private formatDateStr(d: Date | null): string {
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
  }

  // When providing rangeStart/rangeEnd to the datepicker, always supply
  // the ordered range so the calendar can highlight the trail even if the
  // user has selected start > end. The UI still treats this as a validation
  // error, but we show the visual range between the two dates.
  get rangeStartShown(): Date | null {
    if (!this._startDate && !this._endDate) return null;
    if (!this._startDate) return this._endDate;
    if (!this._endDate) return this._startDate;
    return this._startDate <= this._endDate ? this._startDate : this._endDate;
  }

  get rangeEndShown(): Date | null {
    if (!this._startDate && !this._endDate) return null;
    if (!this._startDate) return this._endDate;
    if (!this._endDate) return this._startDate;
    return this._startDate <= this._endDate ? this._endDate : this._startDate;
  }

  private getSelectedDaysOfWeek(): string[] {
    // When everyday is true AND the date range covers all weekdays, send full week
    // Otherwise, only send the specific selected days
    if (this.everyday) {
      const daysInRange = this.getDaysInRange();
      const coversAllDays = daysInRange.length === 7;
      // Only return FULL_WEEK if the range actually covers all 7 weekdays
      if (coversAllDays) {
        return ActivityInputComponent.FULL_WEEK;
      }
    }
    return Array.from(this.selectedDays).map(d => ActivityInputComponent.DAY_MAP[d] || d.toString().toUpperCase());
  }

  private getTagId(): number | null {
    if (!Array.isArray(this.selectedTags) || this.selectedTags.length === 0) return null;
    const first = this.selectedTags[0] as any;
    const id = Number(first?.key);
    return isNaN(id) ? null : id;
  }

  private showSuccessToast(activityName: string, category: string, isUpdate: boolean = false): void {
    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
    let message: string;

    if (this.isParent) {
      const selectedChild = this.profileSelector.getSelectedChild();
      const avatarName = selectedChild?.name || 'Child';
      if (isUpdate) {
        message = `${activityName} updated successfully for ${avatarName}.`;
      } else {
        message = `${activityName} assigned as ${categoryLabel} to ${avatarName}. Check under the selected dates.`;
      }
    } else {
      message = `${activityName} secured as ${categoryLabel}. Check View all if it is not for today.`;
    }

    this.toastService.successWithIcon(message, 'assets/icons/tick-small.svg', '#2D6830', 4000);
  }


  submit() {
    if (this.currentActive === 'events') {
      this.submitEvent();
      return;
    }

    if (this.currentActive === 'timetable' && this.isChildPlannerFlow) {
      this.syncPlannerScheduleToLegacyFields();
    }

    this.attemptedSubmit = true;
    // clear any previous server-side message
    this.serverErrorMessage = '';
    Object.keys(this.errors).forEach(k => (this.errors as any)[k] = false);

    const validations = this.computeValidations();

    Object.assign(this.errors, validations);
    // Debug: log validation flags and force change detection so template updates immediately
    try { console.log('[Validation] attemptedSubmit=', this.attemptedSubmit, 'validations=', validations, 'errors=', this.errors); } catch (e: any) { }
    try { this.cd.detectChanges(); } catch (e: any) { }
    if (Object.values(validations).some(Boolean)) return;

    const formattedStartTime = this.to24Hour(this.startTime || '');
    const formattedEndTime = this.to24Hour(this.endTime || '');

    const habit: Habit = {
      id: this.createLocalId(),
      title: this.title,
      notes: this.notes,
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      startTimeStamp: this.startDate && formattedStartTime ? new Date(`${this.formatDateStr(this.startDate)}T${formattedStartTime}`).getTime() : 0,
      endTimeStamp: this.endDate && formattedEndTime ? new Date(`${this.formatDateStr(this.endDate)}T${formattedEndTime}`).getTime() : 0,
      type: this.currentActive,
      isPrivate: this.isPrivate,
      selectedRoutine: this.selectedRoutine,
      routineTags: this.routineTags,
      everyday: this.everyday,
      selectedDays: Array.from(this.selectedDays),
      priority: (this.priority || 'medium') as 'low' | 'medium' | 'high',
      routine: this.selectedRoutine,
      status: 'pending',
      createdAt: new Date(),
      reminderOffset: this.reminderOffset,
      activities: this.currentActive === 'timetable' ? this.activities.filter(a => a.name.trim()) : undefined
    };

    const daysOfWeek = this.getSelectedDaysOfWeek();
    const tagId = this.getTagId();
    const priority = (habit.priority || 'medium').toString().toUpperCase();
    const rawRoutine = (habit.selectedRoutine || this.selectedRoutine);
    const routine = rawRoutine ? String(rawRoutine).toUpperCase() : null;

    // Resolve the creator's role at submit time. A parent assigning an activity
    // to a child must always be able to see it; the child privacy toggle is not
    // applicable to parent-created activities.
    const isCreatedByParent = this.authService.isParentUser();
    const sharedWithParent = isCreatedByParent || (this.isChild && !this.isPrivate);
    const isPrivateToChild = isCreatedByParent
      ? false
      : (this.isChild ? this.isPrivate : false);

    // Check if date range covers all weekdays
    const daysInRange = this.getDaysInRange();
    const coversAllDays = daysInRange.length === 7;

    let payload: any;
    if (this.currentActive === 'tasks') {
      payload = {
        title: habit.title,
        description: habit.notes || '',
        status: 'PENDING',
        priority: priority,
        tagId: tagId,
        startDate: this.formatDateStr(this.startDate) || '',
        startTime: formattedStartTime || '',
        endDate: this.formatDateStr(this.endDate) || '',
        endTime: formattedEndTime || '',
        everyday: !!(this.everyday && coversAllDays),
        everyWeekend: false,
        sharedWithParent,
        isPrivateToChild
      };
      // Always include the routine field in the payload. If the user did not select
      // a routine (or explicitly deselected it), `routine` will be `null` and we
      // want to send that so the backend can clear any existing routine value.
      payload.routine = routine;
      // Only include daysOfWeek if NOT everyday
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
      }
    } else if (this.currentActive === 'timetable') {
      payload = {
        title: habit.title,
        notes: habit.notes || '',
        tagId,
        everyday: !!(this.everyday && coversAllDays),
        startTime: formattedStartTime || '',
        endTime: formattedEndTime || '',
        startDate: this.formatDateStr(this.startDate) || '',
        endDate: this.formatDateStr(this.endDate) || '',
        priority,
        sharedWithParent
      };
      if (this.isChildPlannerFlow) {
        payload.colorCode = this.selectedPlannerColor;
        payload.activities = this.activities
          .filter(entry => entry.name.trim())
          .map(entry => ({
            name: entry.name.trim(),
            startTime: this.to24Hour(entry.startTime || ''),
            endTime: this.to24Hour(entry.endTime || ''),
            daysOfWeek: entry.days.map(day => ActivityInputComponent.DAY_MAP[day]).filter(Boolean)
          }));
      }
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
      }
      if (!payload.description) {
        payload.description = payload.notes;
      }
    } else {
      payload = {
        title: habit.title,
        description: habit.notes || '',
        status: 'PENDING',
        priority: priority,
        tagId: tagId,
        startDate: this.formatDateStr(this.startDate) || '',
        startTime: formattedStartTime || '',
        endDate: this.formatDateStr(this.endDate) || '',
        endTime: formattedEndTime || '',
        everyday: !!(this.everyday && coversAllDays),
        everyWeekend: false,
        sharedWithParent,
        isPrivateToChild
      };
      // Always include the routine field so a missing selection is represented
      // explicitly as `null` in the payload.
      payload.routine = routine;
      // Only include daysOfWeek if NOT everyday
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
      }
    }

    // Leave the optional field out of new payloads when no reminder is chosen,
    // preserving the existing API behavior. Updates send null so users can
    // remove a reminder that was saved previously.
    if (this.reminderOffset) {
      payload.reminderOffset = this.reminderOffset;
    } else if (this.editingId) {
      payload.reminderOffset = null;
    }

    // Debug: show computed values to help diagnose server mismatch
    try {
      console.log(
        '[Submit Debug] isCreatedByParent=', isCreatedByParent,
        'isChild=', this.isChild,
        'isPrivate=', this.isPrivate,
        'sharedWithParent=', sharedWithParent,
        'isPrivateToChild=', isPrivateToChild
      );
      console.log('[Submit Debug] Payload before forUserId:', JSON.stringify(payload, null, 2));
    } catch (e: any) { /* ignore logging errors */ }

    // Add forUserId to payload
    // Priority: 1) Child selected by parent, 2) Current user ID
    const selectedChildId = this.profileSelector.getChildId();
    const currentUserId = this.authService.getUserId();
    const forUserId = selectedChildId || currentUserId;

    console.log('[forUserId] selectedChildId:', selectedChildId, 'currentUserId:', currentUserId, 'final forUserId:', forUserId);

    if (forUserId) {
      payload.forUserId = forUserId;
      console.log('[forUserId] Added to payload:', forUserId);
    } else {
      console.log('[forUserId] Warning: No forUserId available');
    }

    if (this.currentActive === 'tasks') {
      this.isSubmitting = true;
      console.log('[Task Submit] Payload:', JSON.stringify(payload, null, 2));

      if (this.editingId) {
        this.taskApi.updateTask(this.editingId, payload).subscribe({
          next: (res) => {
            try {
              const updatedHabit = this.buildHabitFromResponse(res, habit, 'tasks', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.updateHabit(updatedHabit);
              // Notify listeners that a task was updated so the tasks list refreshes
              try { this.habitService.notifyTaskUpdated(); } catch (e) { /* ignore */ }
              this.showSuccessToast(this.title, 'tasks', true);
              this.finalizeAndReturn();
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to update task', err); this.serverErrorMessage = err?.error?.message || err?.message || 'Failed to update task. Please try again.'; }
        });
      } else {
        this.taskApi.createTask(payload).subscribe({
          next: (res) => {
            try {
              const createdHabit = this.buildHabitFromResponse(res, habit, 'tasks', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.addHabit(createdHabit);
              this.habitService.notifyTaskAdded();
              this.showSuccessToast(this.title, 'tasks');
              this.finalizeAndReturn();
            } finally { this.isSubmitting = false; }
          },
          error: (err) => {
            this.isSubmitting = false;
            console.error('Failed to create task', err);
            this.serverErrorMessage = err?.error?.message || err?.message || 'Failed to create task. Please try again.';
          }
        });
      }
    } else if (this.currentActive === 'timetable') {
      this.isSubmitting = true;
      console.log('[Timetable Submit] Payload:', JSON.stringify(payload, null, 2));

      if (this.editingId) {
        this.calendarApi.updateCalendarEvent(this.editingId, payload).subscribe({
          next: (res) => {
            try {
              const updatedHabit = this.buildHabitFromResponse(res, habit, 'timetable', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.updateHabit(updatedHabit, 'planner');
              this.showSuccessToast(this.title, 'timetable', true);
              this.finalizeAndReturn();
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to update timetable', err); alert('Failed to update timetable. Please try again.'); }
        });
      } else {
        this.calendarApi.addCalendarEvent(payload).subscribe({
          next: (res) => {
            try {
              const createdHabit = this.buildHabitFromResponse(res, habit, 'timetable', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.addHabit(createdHabit, 'planner');
              this.showSuccessToast(this.title, 'timetable');
              this.finalizeAndReturn();
            } finally { this.isSubmitting = false; }
          },
          error: (err) => {
            this.isSubmitting = false;
            console.error('Failed to create timetable', err);
            alert(`Failed to create timetable: ${err?.error?.message || err?.message || 'Unknown error'}. Please try again.`);
          }
        });
      }
    } else {
      this.isSubmitting = true;
      if (this.editingId) {
        this.habitApi.updateHabit(this.editingId, payload).subscribe({
          next: (res) => {
            try {
              const updatedHabit = this.buildHabitFromResponse(res, habit, 'habits', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.updateHabit(updatedHabit);
              this.showSuccessToast(this.title, 'habits', true);
              this.finalizeAndReturn();
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to update habit', err); this.serverErrorMessage = err?.error?.message || err?.message || 'Failed to update habit. Please try again.'; }
        });
      } else {
        this.habitApi.createHabit(payload).subscribe({
          next: (res) => {
            try {
              const createdHabit = this.buildHabitFromResponse(res, habit, 'habits', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.addHabit(createdHabit);
              this.showSuccessToast(this.title, 'habits');
              this.finalizeAndReturn();
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to create habit', err); this.serverErrorMessage = err?.error?.message || err?.message || 'Failed to create habit. Please try again.'; }
        });
      }
    }
  }

  private submitEvent(): void {
    if (this.isSubmitting) return;

    this.attemptedSubmit = true;
    this.serverErrorMessage = '';
    Object.keys(this.errors).forEach(key => (this.errors as any)[key] = false);
    const validations = this.computeValidations();
    Object.assign(this.errors, validations);
    if (Object.values(validations).some(Boolean)) {
      try { this.cd.detectChanges(); } catch { /* template will update naturally */ }
      return;
    }

    const eventDate = this.formatDateStr(this.eventDate);
    const formattedStartTime = this.eventAllDay ? '' : this.toEventApiTime(this.startTime);
    const formattedEndTime = this.eventAllDay ? '' : this.toEventApiTime(this.endTime);
    const payload: EventPayload = {
      name: this.title.trim(),
      isPrivate: this.isPrivate,
      highPriority: this.eventHighPriority,
      eventType: this.selectedEventType,
      allDay: this.eventAllDay,
      eventDate,
      recurrence: this.eventRecurrence,
      reminderMinutesBefore: this.getEventReminderMinutes(),
      note: this.notes.trim() || null
    };

    if (!this.eventAllDay) {
      payload.startTime = formattedStartTime;
      payload.endTime = formattedEndTime;
    }

    const localEvent: Habit = {
      id: this.createLocalId(),
      title: this.title.trim(),
      notes: this.notes.trim(),
      startDate: this.eventDate,
      endDate: this.eventDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      startTimeStamp: this.eventDate ? new Date(`${eventDate}T${formattedStartTime}`).getTime() : 0,
      endTimeStamp: this.eventDate ? new Date(`${eventDate}T${formattedEndTime}`).getTime() : 0,
      type: 'events',
      isPrivate: this.isPrivate,
      selectedRoutine: '',
      routineTags: [],
      everyday: false,
      selectedDays: [],
      priority: this.eventHighPriority ? 'high' : 'medium',
      routine: '',
      status: 'pending',
      createdAt: new Date(),
      reminderOffset: this.reminderOffset,
      eventType: this.selectedEventType,
      recurrence: this.eventRecurrence,
      allDay: this.eventAllDay
    };

    this.isSubmitting = true;
    const request$ = this.editingId
      ? this.eventApi.updateEvent(this.editingId, payload)
      : this.eventApi.createEvent(payload);

    request$.subscribe({
      next: (response) => {
        try {
          const savedEvent = this.buildEventFromResponse(
            response,
            localEvent,
            formattedStartTime,
            formattedEndTime
          );
          // Events are rendered by the Planner calendar, so notify the shared
          // Planner refresh channel instead of treating the event as a habit.
          if (this.editingId) this.habitService.updateHabit(savedEvent, 'planner');
          else this.habitService.addHabit(savedEvent, 'planner');
          this.showSuccessToast(this.title.trim(), 'event', !!this.editingId);
          this.finalizeAndReturn();
        } finally {
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.serverErrorMessage = error?.error?.message || error?.message || 'Failed to save the event. Please try again.';
        this.toastService.error(this.serverErrorMessage);
      }
    });
  }

  private finalizeAndReturn(): void {
    // Persist the active tab so the list page can restore it after navigating back
    try { sessionStorage.setItem('activityInitialTab', String(this.currentActive || 'habits')); } catch (e) { /* ignore if storage unavailable */ }

    // Check if we're in a modal first - if so, just dismiss and don't navigate
    this.modalCtrl.getTop().then(topModal => {
      if (topModal) {
        // We're in a modal - just dismiss it
        this.modalCtrl.dismiss({ saved: true }).catch(() => {});
        return;
      }

      // Not in a modal - always pop the stack, never push.
      // If we came from activity-detail (editing), go back 2 levels to skip
      // the stale detail page and land directly on the list.
      const fromDetail = this.originUrl && String(this.originUrl).includes('/authed/activity-detail');
      try {
        const prev = this.navigation.getPreviousUrl && this.navigation.getPreviousUrl();
        const prevIsDetail = prev && String(prev).includes('/authed/activity-detail');
        if (fromDetail || prevIsDetail) {
          this.navigation.backN(2);
        } else {
          this.navigation.back();
        }
      } catch (e) {
        this.navigation.back();
      }
    }).catch(() => {
      // Modal controller check failed, try navigation fallback
      if (this.originUrl) {
        this.router.navigateByUrl(this.originUrl).catch(() => { this.navigation.back(); });
      } else {
        this.navigation.back();
      }
    });
  }

  // selectCoin / isCoinSelected removed

  // Compute validation flags without performing submission; reused by submit() and click-on-disabled handler
  private computeValidations() {
    if (this.currentActive === 'events') {
      return {
        title: !this.title?.trim(),
        tag: false,
        routine: false,
        weekdays: false,
        time: !this.eventAllDay && (!this.startTime?.trim() || !this.endTime?.trim()),
        pastTime: !this.eventAllDay && this.isTimeInPast(this.startTime, this.eventDate),
        endTimeBeforeStart: !this.eventAllDay && this.isEndTimeNotAfterStart(this.startTime, this.endTime),
        endTimeSingleDay: !this.eventAllDay && this.isEndTimeCrossingMidnight(this.startTime, this.endTime),
        date: !this.eventDate,
        startAfterEnd: false,
        priority: false,
        notes: false,
        eventType: !this.selectedEventType
      } as any;
    }

    if (this.currentActive === 'timetable' && this.isChildPlannerFlow) {
      const hasNamedEntry = this.activities.some(entry => !!entry.name.trim());
      const hasEntryTimes = this.activities.some(entry => !!entry.startTime.trim() && !!entry.endTime.trim());
      const hasEntryDays = this.activities.some(entry => entry.days.length > 0);
      return {
        title: !this.title?.trim(),
        tag: false,
        routine: false,
        weekdays: !hasEntryDays,
        time: !hasEntryTimes,
        pastTime: false,
        endTimeBeforeStart: hasEntryTimes && !this.activities.some(entry => this.isPlannerEntryComplete(entry)),
        endTimeSingleDay: false,
        date: !this.startDate || !this.endDate || !!(this.startDate && this.endDate && this.startDate > this.endDate),
        startAfterEnd: !!(this.startDate && this.endDate && this.startDate > this.endDate),
        priority: false,
        notes: false,
        eventType: !hasNamedEntry
      } as any;
    }

    return {
      title: !this.title?.trim(),
      tag: !this.selectedTags?.length,
      routine: !!(this.selectedRoutine && this.startTime && !this.isStartTimeWithinRoutine()),
      weekdays: !this.everyday && !this.selectedDays?.size,
      time: !this.startTime?.trim() || !this.endTime?.trim(),
      pastTime: this.isTimeInPast(this.startTime, this.startDate) || this.isTimeInPast(this.endTime, this.endDate),
      endTimeBeforeStart: this.isSameDateRange() && this.isEndTimeNotAfterStart(this.startTime, this.endTime),
      // Show the "finish before midnight" error when either it's a single-day
      // range and the end time is midnight/overflow, OR when it's a multi-day
      // range but the end time is not after the start time (user likely set
      // an earlier clock time unintentionally).
      endTimeSingleDay: (this.isSameDateRange() && this.isEndTimeCrossingMidnight(this.startTime, this.endTime)) || (!this.isSameDateRange() && this.isEndTimeNotAfterStart(this.startTime, this.endTime)),
      date: !this.startDate || !this.endDate || (this.startDate instanceof Date && this.endDate instanceof Date && this.startDate > this.endDate),
      startAfterEnd: !!(this._startDate && this._endDate && this._startDate > this._endDate),
      priority: !this.priority,
      notes: !this.notes?.trim(),
      eventType: false
    } as any;
  }

  // Click handler on the submit-row container to show validation errors when users tap the disabled button
  onSubmitRowClick(event: MouseEvent) {
    // If form is complete and button enabled, do nothing here and let the button's (click) call submit()
    if (this.isFormComplete && !this.isSubmitting) return;

    // Otherwise, mark attempted and compute validations so the template shows errors
    this.attemptedSubmit = true;
    this.serverErrorMessage = '';
    Object.keys(this.errors).forEach(k => (this.errors as any)[k] = false);
    const validations = this.computeValidations();
    Object.assign(this.errors, validations);
    try { this.cd.detectChanges(); } catch (e: any) { }

    // Prevent further handling if needed
    try { event.stopPropagation(); } catch (e) { }
  }

  private toEventApiTime(value: string): string {
    const normalized = this.to24Hour(value || '');
    return normalized ? normalized.slice(0, 5) : '';
  }

  private buildEventFromResponse(response: any, baseEvent: Habit, fallbackStartTime: string, fallbackEndTime: string): Habit {
    const data = response || {};
    const eventDate = String(data.eventDate || this.formatDateStr(this.eventDate) || '');
    const allDay = !!data.allDay;
    const startTime = String(data.startTime ?? fallbackStartTime ?? '');
    const endTime = String(data.endTime ?? fallbackEndTime ?? '');

    return {
      ...baseEvent,
      id: String(data.id ?? baseEvent.id),
      title: String(data.name ?? baseEvent.title),
      notes: String(data.note ?? baseEvent.notes ?? ''),
      startDate: eventDate ? new Date(eventDate) : baseEvent.startDate,
      endDate: eventDate ? new Date(eventDate) : baseEvent.endDate,
      startTime,
      endTime,
      startTimeStamp: eventDate && startTime ? new Date(`${eventDate}T${startTime}`).getTime() : 0,
      endTimeStamp: eventDate && endTime ? new Date(`${eventDate}T${endTime}`).getTime() : 0,
      priority: data.highPriority ? 'high' : 'medium',
      isPrivate: !!data.isPrivate,
      reminderOffset: this.normalizeEventReminderOffset(data.reminderMinutesBefore),
      eventType: String(data.eventType ?? baseEvent.eventType ?? ''),
      recurrence: this.normalizeEventRecurrence(data.recurrence ?? baseEvent.recurrence),
      allDay,
      createdAt: data.createdAt ? new Date(data.createdAt) : baseEvent.createdAt
    };
  }

  private buildHabitFromResponse(res: any, baseHabit: Habit, type: ActivityTab, formattedStartTime: string, formattedEndTime: string, daysOfWeek: string[]): Habit {
    const data = res || {};
    return {
      id: String(data.id ?? baseHabit.id),
      title: data.title ?? baseHabit.title,
      notes: data.description ?? data.notes ?? baseHabit.notes,
      startDate: data.startDate ? new Date(data.startDate) : baseHabit.startDate,
      endDate: data.endDate ? new Date(data.endDate) : baseHabit.endDate,
      startTime: data.startTime ?? formattedStartTime,
      endTime: data.endTime ?? formattedEndTime,
      startTimeStamp: data.startDate ? new Date(`${data.startDate}T${formattedStartTime}`).getTime() : baseHabit.startTimeStamp,
      endTimeStamp: data.endDate ? new Date(`${data.endDate}T${formattedEndTime}`).getTime() : baseHabit.endTimeStamp,
      type,
      isPrivate: baseHabit.isPrivate,
      selectedRoutine: data.routine ?? baseHabit.selectedRoutine ?? this.selectedRoutine,
      routineTags: this.routineTags,
      everyday: !!data.everyday,
      selectedDays: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : (this.everyday ? ActivityInputComponent.FULL_WEEK : daysOfWeek),
      priority: (data.priority ?? baseHabit.priority) as 'low' | 'medium' | 'high',
      routine: data.routine ?? baseHabit.routine ?? this.selectedRoutine,
      status: data.status ?? baseHabit.status,
      createdAt: data.createdAt ? new Date(data.createdAt) : (this.originalHabit?.createdAt ? new Date(this.originalHabit.createdAt) : new Date()),
      activities: baseHabit.activities,
      tags: Array.isArray(data.tags) ? data.tags : this.selectedTags.map(t => t.value || t.key),
      streak: data.streak ?? data.streakCount ?? 0,
      highestStreak: data.highestStreak ?? 0,
      completionPercentage: data.completionPercentage ?? data.completionRate ?? 0,
      totalCompletedDays: data.totalCompletedDays ?? data.completedDays ?? 0,
      milestoneBadges: data.milestoneBadges ?? data.badgeList ?? null,
      daysOfWeek: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : (this.everyday ? ActivityInputComponent.FULL_WEEK : daysOfWeek),
      reminderOffset: this.normalizeReminderOffset(data.reminderOffset ?? data.reminder_offset ?? baseHabit.reminderOffset),
      eventType: data.eventType ?? data.event_type ?? baseHabit.eventType,
      recurrence: data.recurrence ?? data.repeatType ?? data.repeat_type ?? baseHabit.recurrence,
      allDay: data.allDay ?? data.all_day ?? baseHabit.allDay
    };
  }

  private getDaysInRange(): string[] {
    if (!this._startDate || !this._endDate) return [];

    const daysInRange = new Set<number>();
    const current = new Date(this._startDate);
    const end = new Date(this._endDate);

    while (current <= end) {
      daysInRange.add(current.getDay());
      current.setDate(current.getDate() + 1);
    }

    return Array.from(daysInRange).map(num => ActivityInputComponent.DAY_NUM_TO_CODE[num]);
  }

  private isSameDateRange(): boolean {
    if (!this._startDate || !this._endDate) return false;
    return this._startDate.getFullYear() === this._endDate.getFullYear()
      && this._startDate.getMonth() === this._endDate.getMonth()
      && this._startDate.getDate() === this._endDate.getDate();
  }

  private getSingleDayFromRange(): string | null {
    if (!this.isSameDateRange() || !this._startDate) return null;
    return ActivityInputComponent.DAY_NUM_TO_CODE[this._startDate.getDay()];
  }

  private autoAdjustSelectedDays(): void {
    if (!this._startDate || !this._endDate) return;

    const daysInRange = this.getDaysInRange();
    if (daysInRange.length === 0) return;

    const coversAllDays = daysInRange.length === 7;

    if (this.everyday && !coversAllDays) {
      this.everyday = false;
      console.log('Auto-disabled "Everyday" - date range does not cover all weekdays');
    }

    if (this.everyday && coversAllDays) return;

    // If range covers all days, allow any weekday selection (no auto-adjustment needed)
    if (coversAllDays) return;

    const daysInRangeSet = new Set(daysInRange);
    const currentSelected = Array.from(this.selectedDays);

    if (this.isSameDateRange()) {
      const single = this.getSingleDayFromRange();
      if (single) {
        const hadInvalid = currentSelected.some(d => d !== single);
        if (hadInvalid) {
          // Do not auto-change user's selection; show an error instead
          this.showDaySelectionError = true;
        }
      }
      return;
    }

    const hasInvalidDays = currentSelected.some(day => !daysInRangeSet.has(day));

    if (hasInvalidDays) {
      // Do not auto-adjust the user's selected days. Instead, flag an error
      // so the user can correct their selection to match the new date range.
      this.showDaySelectionError = true;
    }
    // Recompute validations after adjusting selected days
    try {
      const validations = this.computeValidations();
      Object.assign(this.errors, validations);
      try { this.cd.detectChanges(); } catch (e) { }
    } catch (e) { /* ignore */ }
  }

  toggleDay(d: string) {
    if (this._startDate && this._endDate) {
      if (this.isSameDateRange()) {
        const allowed = this.getSingleDayFromRange();
        if (allowed && d !== allowed && !this.selectedDays.has(d)) {
          this.showDaySelectionError = true;
          return;
        }
      } else {
        const daysInRange = this.getDaysInRange();
        const coversAllDays = daysInRange.length === 7;

        // Allow selection if range covers all weekdays OR if day is within range
        const isDayInRange = daysInRange.includes(d);
        if (!coversAllDays && !isDayInRange && !this.selectedDays.has(d)) {
          this.showDaySelectionError = true;
          return;
        }
      }
    }

    this.showDaySelectionError = false;
    this.clearWeekdaysError();

    if (this.selectedDays.has(d)) {
      this.selectedDays.delete(d);
      if (this.everyday) this.everyday = false;
      // If date range is a single date and user deselected the only allowed day,
      // show an explicit day-selection error until they pick a valid day.
      if (this._startDate && this._endDate && this.isSameDateRange() && this.selectedDays.size === 0) {
        this.showDaySelectionError = true;
      }
    } else {
      if (this.isSameDateRange()) {
        const allowed = this.getSingleDayFromRange();
        if (allowed && d !== allowed) {
          this.showDaySelectionError = true;
          return;
        }
        this.selectedDays.clear();
        this.selectedDays.add(d);
      } else {
        this.selectedDays.add(d);
      }
      if (this.selectedDays.size === this.weekdays.length) this.everyday = true;
    }
    // Recompute validations whenever repeat/day selection changes so
    // time-related errors (single-day end<=start) update immediately.
    try {
      const validations = this.computeValidations();
      Object.assign(this.errors, validations);
      try { this.cd.detectChanges(); } catch (e) { }
    } catch (e) { /* ignore */ }
  }

  onEverydayChange(event: any) {
    const checked = !!(event?.detail?.checked ?? event === true);
    this.everyday = checked;

    if (this.everyday) {
      if (this._startDate && this._endDate) {
        if (this.isSameDateRange()) {
          const single = this.getSingleDayFromRange();
          if (single) {
            this.selectedDays.clear();
            this.selectedDays.add(single);
            this.showDaySelectionError = true;
            return;
          }
        }

        const daysInRange = this.getDaysInRange();
        const coversAllDays = daysInRange.length === 7;

        // If range covers all weekdays, allow selecting all days
        if (coversAllDays) {
          this.selectedDays.clear();
          this.weekdays.forEach(d => this.selectedDays.add(d));
          this.showDaySelectionError = false;
          this.clearWeekdaysError();
        } else {
          // Otherwise, only select days within the range
          const daysInRangeSet = new Set(daysInRange);
          this.selectedDays.clear();
          this.weekdays.forEach(d => {
            if (daysInRangeSet.has(d)) this.selectedDays.add(d);
          });
          this.showDaySelectionError = true;
        }
      } else {
        this.weekdays.forEach(d => this.selectedDays.add(d));
        this.showDaySelectionError = false;
      }
    } else {
      // User turned off Everyday: deselect all days (do not auto-populate from date range)
      this.selectedDays.clear();
      this.showDaySelectionError = false;
      this.clearWeekdaysError();
    }
    // Recompute validations when everyday toggle changes
    try {
      const validations = this.computeValidations();
      Object.assign(this.errors, validations);
      try { this.cd.detectChanges(); } catch (e) { }
    } catch (e) { /* ignore */ }
  }

  onDelete() {
    if (!this.editingId) return;
    const coin = 0; // Default coin value since coin assignment is removed
    const streak = Number(this.originalHabit?.streak ?? this.originalHabit?.streakCount ?? 0);
    this.deletePopupConfig = this.buildDeletePopupConfig(coin, streak);
    this.deletePopupVisible = true;
  }

  confirmDelete() {
    if (!this.editingId || this.deleting) return;
    this.deleting = true;

    const possibleIds = [
      this.originalHabit?.id,
      this.originalHabit?.eventId,
      this.originalHabit?.calendarEventId,
      this.originalHabit?.calendarId,
      this.editingId
    ].filter(Boolean).map(String);

    const backendId = possibleIds.length ? possibleIds[0] : undefined;

    const finalizeLocalDelete = (idToRemove?: string) => {
      try { this.habitService.deleteHabit((idToRemove || this.editingId) as string); } catch (e: any) { console.warn('Local delete failed', e); }
      // Persist current tab so list can restore it after returning
      try { sessionStorage.setItem('activityInitialTab', String(this.currentActive || 'habits')); } catch (e) { /* ignore */ }
      
      // Show delete toast before dismissing modal
      const categoryLabel = this.currentActive.charAt(0).toUpperCase() + this.currentActive.slice(1);
      const deleteMessage = this.isParent ? `${this.title} deleted. It's gone from all days.` : `${this.title} deleted from ${categoryLabel}`;
      this.toastService.successWithIcon(deleteMessage, 'assets/icons/tick-small.svg', '#2D6830', 4000);
      
      try { this.modalCtrl.dismiss(); } catch { /* ignore if not modal */ }
      this.deletePopupVisible = false;
      // Use finalize path to persist tab and navigate back/origin
      try { this.finalizeAndReturn(); } catch { try { this.navigation.back(); } catch {} }
    };

    if (!backendId) {
      // No backend id available; fall back to local-only deletion
      finalizeLocalDelete(this.editingId);
      this.deleting = false;
      return;
    }

    if (this.currentActive === 'habits') {
      this.habitApi.deleteHabit(backendId).subscribe({
        next: () => {
          console.log('Habit deleted successfully');
          finalizeLocalDelete(this.editingId);
          this.deleting = false;
        },
        error: (err) => {
          const isActualError = err?.status && err.status >= 400;
          console.warn('Delete habit response:', err);

          if (isActualError) {
            alert('Failed to delete habit on server. Please try again.');
            this.deleting = false;
          } else {
            console.log('Treating as successful deletion (backend quirk)');
            finalizeLocalDelete(this.editingId);
            this.deleting = false;
          }
        }
      });
      return;
    }

    if (this.currentActive === 'tasks') {
      this.taskApi.deleteTask(backendId).subscribe({
        next: () => {
          console.log('Task deleted successfully');
          finalizeLocalDelete(this.editingId);
          this.habitService.notifyTaskDeleted();
          this.deleting = false;
        },
        error: (err) => {
          const isActualError = err?.status && err.status >= 400;
          console.warn('Delete task response:', err);

          if (isActualError) {
            alert('Failed to delete task on server. Please try again.');
            this.deleting = false;
          } else {
            console.log('Treating as successful deletion (backend quirk)');
            finalizeLocalDelete(this.editingId);
            this.habitService.notifyTaskDeleted();
            this.deleting = false;
          }
        }
      });
      return;
    }

    if (this.currentActive === 'events') {
      this.eventApi.deleteEvent(backendId).subscribe({
        next: () => {
          finalizeLocalDelete(this.editingId);
          this.deleting = false;
        },
        error: (err) => {
          this.deleting = false;
          this.toastService.error(err?.error?.message || err?.message || 'Failed to delete the event. Please try again.');
        }
      });
      return;
    }

    if (this.currentActive === 'timetable') {
      this.calendarApi.deleteCalendarEvent(backendId).subscribe({
        next: () => {
          console.log('Calendar event deleted successfully');
          finalizeLocalDelete(this.editingId);
          this.deleting = false;
        },
        error: (err) => {
          const isActualError = err?.status && err.status >= 400;

          if (!isActualError) {
            console.log('Treating as successful deletion (backend quirk)');
            finalizeLocalDelete(this.editingId);
            this.deleting = false;
            return;
          }

          console.warn('Primary calendar delete failed, trying alternate path', err);
          this.calendarApi.deleteCalendarEventV2(backendId).subscribe({
            next: () => {
              console.log('Calendar event deleted via alternate path');
              finalizeLocalDelete(this.editingId);
              this.deleting = false;
            },
            error: (err2) => {
              const isActualError2 = err2?.status && err2.status >= 400;

              if (isActualError2) {
                console.error('Failed to delete calendar event on server', err2);
                alert(`Failed to delete ${this.currentActive === 'events' ? 'event' : 'timetable'} on server. Please try again.`);
                this.deleting = false;
              } else {
                console.log('Treating alternate path as successful deletion');
                finalizeLocalDelete(this.editingId);
                this.deleting = false;
              }
            }
          });
        }
      });
      return;
    }

    this.habitApi.deleteHabit(backendId).subscribe({
      next: () => {
        console.log('Item deleted successfully (fallback)');
        finalizeLocalDelete(this.editingId);
        this.deleting = false;
      },
      error: (err) => {
        const isActualError = err?.status && err.status >= 400;
        console.warn('Delete response (fallback):', err);

        if (isActualError) {
          alert('Failed to delete item on server. Please try again.');
          this.deleting = false;
        } else {
          console.log('Treating as successful deletion (backend quirk)');
          finalizeLocalDelete(this.editingId);
          this.deleting = false;
        }
      }
    });
  }

  cancelDelete() {
    this.deletePopupVisible = false;
  }

  selectPriority(p: 'low' | 'medium' | 'high') { this.priority = p; this.clearPriorityError(); }
  addActivity() { this.activities.push({ name: '', startTime: '', endTime: '', days: ['S'] }); }

  onTagsChange(payload: any) {
    // Normalize payload to an array to support singleSelection emitting a single value
    const values = Array.isArray(payload) ? payload : (payload == null ? [] : [payload]);
    if (!values || values.length === 0) { this.selectedTags = []; this.clearTagError(); return; }

    const first = values[0];
    // Build lookup source: prefer routineTags, then fallback to tagsComponent options
    const sourceOptions = [...(this.routineTags || []), ...((this.tagsComponent && this.tagsComponent.options) || [])];

    if (typeof first === 'number') {
      // numeric keys -> find matching option by key (NOT by array index)
      this.selectedTags = (values as number[]).map(i =>
        sourceOptions.find(o => Number(o.key) === i || String(o.key) === String(i))
      ).filter(Boolean) as any[];
    } else if (typeof first === 'string' || typeof first === 'number') {
      // keys -> find matching options by key
      const keys = (values as any[]).map(v => String(v));
      this.selectedTags = sourceOptions.filter(tag => keys.includes(String(tag.key)));
    } else if (typeof first === 'object') {
      // already full tag objects
      this.selectedTags = values as any[];
    } else {
      this.selectedTags = [];
    }

    // If still empty but superme-tags component exists, try mapping selectedKeys from that component
    if ((!this.selectedTags || this.selectedTags.length === 0) && this.tagsComponent) {
      const keys = values.map(v => String(v));
      this.selectedTags = (this.tagsComponent.options || []).filter(o => keys.includes(String(o.key)));
    }

    this.clearTagError();
  }

  onRoutineSelected(payload: any) {
    if (!Array.isArray(payload) || payload.length === 0) return;
    try {
      const sel = String(payload[0]);
      // Toggle: if user clicks the already-selected routine, deselect it
      if (this.selectedRoutine && String(this.selectedRoutine) === sel) {
        this.selectedRoutine = '';
        // If we have access to child selectors component, clear its selection too
        try {
          if (this.selectorsComponent) {
            this.selectorsComponent.selectedKeys = [] as any[];
            this.selectorsComponent.selectedKeysChange.emit(this.selectorsComponent.selectedKeys);
          }
        } catch (e) { /* ignore child update errors */ }
      } else {
        this.selectedRoutine = sel;
      }

      this.clearRoutineError();
      this.validateRoutineTime();
    } catch (e: any) { console.warn('Failed to parse routine selection', e); }
  }

  private getRoutineRangeInfo(routineKey: string | null): { label: string; startHour: number; startMinute: number; endHour: number; endMinute: number; rangeText: string; wraps: boolean } | null {
    if (!routineKey) return null;
    const key = String(routineKey).toLowerCase();
    if (key === 'morning') {
      return { label: 'Morning', startHour: 5, startMinute: 0, endHour: 12, endMinute: 0, rangeText: '5:00 AM to 12:00 PM', wraps: false };
    }
    if (key === 'evening') {
      return { label: 'Evening', startHour: 12, startMinute: 0, endHour: 19, endMinute: 0, rangeText: '12:00 PM to 7:00 PM', wraps: false };
    }
    if (key === 'night') {
      return { label: 'Night', startHour: 19, startMinute: 0, endHour: 5, endMinute: 0, rangeText: '7:00 PM to 5:00 AM', wraps: true };
    }
    return null;
  }

  private isStartTimeWithinRoutine(): boolean {
    if (!this.selectedRoutine || !this.startTime) return true;
    const parsed = this.parseTime(this.startTime);
    if (!parsed) return true; // if not parseable, skip routine check here

    const info = this.getRoutineRangeInfo(this.selectedRoutine);
    if (!info) return true;

    const hours = parsed.hours;
    const minutes = parsed.minutes;
    // Compare only by hour/minute; convert to minutes since midnight
    const timeMins = hours * 60 + minutes;
    const startMins = info.startHour * 60 + info.startMinute;
    const endMins = info.endHour * 60 + info.endMinute;

    if (!info.wraps) {
      return timeMins >= startMins && timeMins < endMins;
    }
    // wraps (night): valid if >= start (19:00) OR < end (05:00)
    return timeMins >= startMins || timeMins < endMins;
  }

  private validateRoutineTime() {
    try {
      const mismatch = !!(this.selectedRoutine && this.startTime && !this.isStartTimeWithinRoutine());
      this.errors.routine = mismatch;
    } catch (e) { /* ignore */ }
  }

  get routineErrorMessage(): string {
    if (!this.selectedRoutine) return 'When do you want to do this? Pick a routine.';
    const info = this.getRoutineRangeInfo(this.selectedRoutine);
    if (!info) return 'When do you want to do this? Pick a routine.';
    return `Start time doesn’t match the ${info.label} routine. Switch routines or pick a start time between ${info.rangeText}.`;
  }

  onPrivateChange(checked: any) {
    try {
      this.isPrivate = !!(checked?.detail?.checked ?? checked ?? this.isPrivate);
    } catch (e: any) {
      this.isPrivate = !!checked;
    }
  }

  clearError(field: keyof typeof this.errors) { this.errors[field] = false; }
  clearTitleError() { this.clearError('title'); }
  clearTagError() { this.clearError('tag'); }
  clearRoutineError() { this.clearError('routine'); }
  clearWeekdaysError() { this.clearError('weekdays'); }
  clearPriorityError() { this.clearError('priority'); }

  onNotesChange() {
    this.clearError('notes');
  }

  autoExpandTextarea(event: any) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = (scrollHeight > 300 ? 300 : scrollHeight) + 'px';
  }

  clearTimeError() {
    this.clearError('time');
    // Recompute all validations so single-day end<=start errors appear reliably.
    try {
      const validations = this.computeValidations();
      Object.assign(this.errors, validations);
      try { this.cd.detectChanges(); } catch (e) { }
    } catch (e) { /* ignore */ }
  }

  onStartTimeChanged() {
    // Fires only from genuine user interaction with the Start Time picker
    // (never from our own programmatic date-based defaulting below), so this
    // is a safe signal that the user now owns the time — stop auto-filling it.
    this.startTimeUserSet = true;
    this.clearTimeError();
  }

  clearDateError() {
    this.clearError('date');
    try {
      const validations = this.computeValidations();
      Object.assign(this.errors, validations);
      try { this.cd.detectChanges(); } catch (e) { }
    } catch (e) { /* ignore */ }
  }

  hasAnyErrors(): boolean {
    return !!(this.showTitleError || this.showEventTypeError || this.showTagError || this.showRoutineError || this.showWeekdaysError || this.showTimeError || this.showPastTimeError || this.showEndTimeBeforeStart || this.showEndTimeSingleDayError || this.showDateError || this.showPriorityError || this.showNotesError);
  }

  // User-facing message for day-selection errors. If the date range is a single
  // date, the message should explicitly tell the user which weekday is allowed.
  get daySelectionErrorMessage(): string {
    if (!this.showDaySelectionError) return "";
    if (this.isSameDateRange() && this._startDate) {
      const code = ActivityInputComponent.DAY_NUM_TO_CODE[this._startDate.getDay()];
      const full = ActivityInputComponent.DAY_MAP[code] || '';
      return `Your date is set for ${full} only.`;
    }
    return "That day isn't in your chosen date range.";
  }

  orderedErrorMessages(): string[] {
    const msgs: string[] = [];
    if (this.showTitleError) msgs.push('Enter title');
    if (this.showEventTypeError) msgs.push('Select an event type');
    if (this.showTagError) msgs.push('Select a tag');
    if (this.showRoutineError) msgs.push('Select a routine');
    if (this.showWeekdaysError) msgs.push('Select at least one weekday');
    if (this.showTimeError) msgs.push('Add start and end time');
    if (this.showPastTimeError) msgs.push('Cannot set time in the past for today');
    if (this.showEndTimeBeforeStart) msgs.push('End time must be after the start time');
    if (this.showEndTimeSingleDayError) msgs.push('Activities must finish before midnight (11:59 PM).');
    if (this.showStartAfterEnd) msgs.push('End date must be after the start date');
    if (this.showDateError) msgs.push('Add start and end date');
    if (this.showPriorityError) msgs.push('Select priority');
    if (this.showNotesError) msgs.push('Add notes');
    return msgs;
  }

  ngAfterViewInit(): void {
    try {
      if (this.tagsComponent) {
        const keysToSelect: any[] = [];
        if (Array.isArray(this.selectedTags) && this.selectedTags.length) {
          this.selectedTags.forEach(st => {
            // Get the tag value from various possible property names
            const stValue = st.value || (st as any).name || (st as any).title || '';
            // First try to match by value (more reliable for string tags)
            const byVal = this.routineTags.find(t => String(t.value).toLowerCase() === String(stValue).toLowerCase());
            if (byVal) {
              keysToSelect.push(byVal.key);
              return;
            }
            // Then try to match by key
            const byKey = this.routineTags.find(t => String(t.key) === String(st.key));
            if (byKey) {
              keysToSelect.push(byKey.key);
              return;
            }
            // If no match found, the tag should have been added to routineTags in ngOnInit
            // but just in case, try to find any remaining matches
            const fallback = this.routineTags.find(t =>
              String(t.value).toLowerCase().includes(String(stValue || st.key || '').toLowerCase()) ||
              String(stValue || st.key || '').toLowerCase().includes(String(t.value).toLowerCase())
            );
            if (fallback) {
              keysToSelect.push(fallback.key);
            }
          });
        }
        // Only update if we actually resolved keys — never wipe with empty array
        if (keysToSelect.length) {
          this.tagsComponent.selectedKeys = keysToSelect;
          this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
        }
      }
    } catch (e: any) { console.warn('Failed to set tagsComponent selected keys', e); }

    try {
      // build labels to ensure exist in the child component (adds custom tags if needed)
      const labels: string[] = [];
      if (Array.isArray(this.routineTags)) labels.push(...this.routineTags.map(rt => String(rt.value || '').trim()));
      if (Array.isArray(this.selectedTags)) labels.push(...this.selectedTags.map(st => String((st as any).value || (st as any).name || (st as any).title || '').trim()));
      const uniq = Array.from(new Set(labels.map(l => l).filter(Boolean)));
      if (uniq.length) {
        if (this.tagsComponent) {
          try { this.tagsComponent.ensureOptionsForLabels(uniq); } catch (e: any) { /* ignore */ }
        } else {
          // queue for AfterViewInit when ViewChild will be available
          this._pendingTagLabels = uniq;
        }
      }

      // If child is available now, map selectedTags into child component selectedKeys
      if (this.tagsComponent && Array.isArray(this.selectedTags) && this.selectedTags.length) {
        const selectedKeys = (this.selectedTags || []).map(st => {
          const val = String((st as any).value || (st as any).name || (st as any).title || '').trim().toLowerCase();
          const opt = (this.tagsComponent!.options || []).find(o => String(o.value || '').trim().toLowerCase() === val);
          return opt ? opt.key : null;
        }).filter(k => k != null);
        if (selectedKeys.length) {
          this.tagsComponent.selectedKeys = selectedKeys as any[];
          this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
        }
      }
    } catch (e: any) { console.warn('Failed to ensure tagsComponent options or set selected keys', e); }
    
    try {
      if (this.selectorsComponent) {
        let n: any = null;
        if (this.selectedRoutine) {
          const byKey = this.routineOptions.find(o => String(o.key) === String(this.selectedRoutine));
          if (byKey) n = byKey.key;
          else {
            const byVal = this.routineOptions.find(o => String(o.value).toLowerCase() === String(this.selectedRoutine).toLowerCase());
            if (byVal) n = byVal.key;
          }
        }
        if (n != null) {
          this.selectorsComponent.selectedKeys = [n];
          this.selectorsComponent.selectedKeysChange.emit(this.selectorsComponent.selectedKeys);
        }
      }
    } catch (e: any) { console.warn('Failed to set selectorsComponent selected keys', e); }
  } catch(e: any) { console.warn('Failed in ngAfterViewInit tag sync', e); }

}
