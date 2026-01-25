import { Component, OnInit, AfterViewInit, ViewChild, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulSelectorsComponent } from '../../mindful-selectors/mindful-selectors.component';
import { MindfulTagsComponent } from '../../mindful-selectors/mindful-tags/mindful-tags.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulToggleComponent } from '../../mindful-selectors/mindful-toggle/mindful-toggle.component';
import { MindfulPopupComponent, MindfulPopupConfig } from '../../mindful-popup/mindful-popup.component';
import { HabitService } from '../habit.service';
import { HabitApi } from '../../../api/habit.api';
import { TaskApi } from '../../../api/task.api';
import { CalendarApi } from '../../../api/calendar.api';
import { Habit } from '../habit.types';
import { Router } from '@angular/router';
import { NavigationContextService } from '../../../services/navigation-context.service';
import { AuthService } from '../../../services/auth.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';

@Component({
  standalone: true,
  selector: 'habit-input',
  templateUrl: './habit-input.component.html',
  styleUrls: ['./habit-input.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule, MindfulButtonComponent, MindfulInputsModule, MindfulSelectorsComponent, MindfulTagsComponent, MindfulBadgeComponent, MindfulNavigatorComponent, MindfulToggleComponent, MindfulPopupComponent]
})
export class HabitInputComponent implements OnInit, AfterViewInit {
  private static readonly TIME_REGEX = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;
  private static readonly DAY_MAP: Record<string, string> = {
    S: 'SUNDAY', M: 'MONDAY', T: 'TUESDAY', W: 'WEDNESDAY', Th: 'THURSDAY', F: 'FRIDAY', Sa: 'SATURDAY'
  };
  private static readonly DAY_NUM_TO_CODE: Record<number, string> = {
    0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'Th', 5: 'F', 6: 'Sa'
  };
  private static readonly FULL_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  private static readonly PRIORITY_MAP: Record<string, 'low' | 'medium' | 'high'> = { '1': 'low', '2': 'medium', '3': 'high' };

  // Input properties for modal usage - allows passing data directly via componentProps
  @Input() editingHabit: any = null;
  @Input() initialTab: 'habits' | 'tasks' | 'timetable' | null = null;

  title = '';
  notes = '';
  private _startDate: Date | null = null;
  private _endDate: Date | null = null;
  startTime = '';
  endTime = '';

  get startDate(): Date | null {
    return this._startDate;
  }



  set startDate(value: Date | null) {
    if (value && this._endDate && value > this._endDate) {
      console.warn('Start date cannot be after end date');
      return;
    }
    this._startDate = value;
    this.showDaySelectionError = false;
    this.autoAdjustSelectedDays();
  }

  get endDate(): Date | null {
    return this._endDate;
  }

  set endDate(value: Date | null) {
    if (value && this._startDate && value < this._startDate) {
      console.warn('End date cannot be before start date');
      return;
    }
    this._endDate = value;
    this.showDaySelectionError = false;
    this.autoAdjustSelectedDays();
  }
  currentActive: 'habits' | 'tasks' | 'timetable' = 'habits';

  get isTasks(): boolean {
    return this.currentActive === 'tasks';
  }
  isPrivate = false;
  isChild = false;
  isParent = false;
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

  // Use centralized tags from MindfulTags; keep local container for dynamic additions
  routineTags: Array<{ key: string, value: string, type: string }> = [];

  everyday = false;
  weekdays = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  selectedDays = new Set<string>();
  priority: '' | 'low' | 'medium' | 'high' = '';

  // Priority options for template
  readonly priorities = [
    { key: 'high' as const, text: 'High', type: 'red' },
    { key: 'medium' as const, text: 'Medium', type: 'yellow' },
    { key: 'low' as const, text: 'Low', type: 'green' }
  ];

  // Tag variant mapping by activity type
  readonly tagVariants: Record<string, 'blue' | 'orange' | 'green' | 'gray'> = { habits: 'blue', tasks: 'orange', timetable: 'green' };

  // Coin selector
  coinOptions = [10, 20, 30, 40, 50];
  coinReward: number = 5;

  activities: { name: string; startTime: string; endTime: string }[] = [
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' }
  ];

  @ViewChild(MindfulTagsComponent) tagsComponent?: MindfulTagsComponent;
  @ViewChild(MindfulSelectorsComponent) selectorsComponent?: MindfulSelectorsComponent;

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
    endTimeBeforeStart: false, endTimeSingleDay: false
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
    const todayCode = HabitInputComponent.DAY_NUM_TO_CODE[this._startDate.getDay()];
    for (const d of this.selectedDays) {
      if (d !== todayCode) return true;
    }

    return false;
  }
  // Delete confirmation popup state
  deletePopupVisible = false;
  deletePopupConfig: MindfulPopupConfig = {};
  // internal guard to prevent double-delete
  private deleting = false;

  // runtime asset path (served from /assets)
  private readonly DELETE_IMAGE_PATH = 'assets/Images-Transparent/Image-Input-Delete.png';

  // use PNG assets for icons (18px width, height auto)
  readonly _coinSvg = `<img src="assets/Icons-Neutral/Icons-Coins.png" alt="Coins" style="width:18px;height:auto;"/>`;
  private readonly _streakSvg = `<img src="assets/Icons-Neutral/Icon-Streak.png" alt="Streak" style="width:18px;height:auto;"/>`;

  private buildDeletePopupConfig(coin: number, streak: number): MindfulPopupConfig {
    const headingHtml = `Delete this activity?<br/><div style="margin-top:12px;font-size:14px;color:#6b656a">You are about to lose:<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">` +
      `<div style="display:flex;align-items:center;gap:8px">${this._coinSvg}<div style=\"flex:1;\">Coins</div><div style=\"font-weight:600;\">${coin}</div></div>` +
      `<div style="display:flex;align-items:center;gap:8px">${this._streakSvg}<div style=\"flex:1;\">Streak</div><div style=\"font-weight:600;\">${streak}</div></div>` +
      `</div></div>`;

    return {
      image: this.DELETE_IMAGE_PATH,
      imageAlt: 'Delete activity',
      heading: headingHtml,
      subtitle: '',
      primaryCTA: { text: 'Delete', buttonStyle: 'bronze', buttonSmall: true },
      secondaryCTA: { text: 'Cancel', buttonStyle: 'bronze-transparent', buttonSmall: true },
      backdrop: true,
      ctaDirection: 'row'
    } as MindfulPopupConfig;
  }

  constructor(
    private modalCtrl: ModalController,
    private habitService: HabitService,
    private router: Router,
    private taskApi: TaskApi,
    private calendarApi: CalendarApi,
    private habitApi: HabitApi,
    private navigationContext: NavigationContextService,
    private authService: AuthService,
    private profileSelector: ProfileSelectorService,
    private cd: ChangeDetectorRef
  ) { }

  get navigatorActions(): Array<{ type: 'edit' | 'icon', src?: string, alt?: string }> {
    return this.editingId ? [{ type: 'icon', alt: 'Delete' }] : [];
  }

  onNavigatorAction(event: { index: number; action: any }) {
    const alt = (event?.action?.alt || '').toString().toLowerCase();
    if (alt.includes('delete')) this.onDelete();
  }

  ngOnInit() {
    // Determine whether current user is a child (only children should see Private toggle)
    try {
      const ud = localStorage.getItem('user_data');
      if (ud) {
        const parsed = JSON.parse(ud || '{}');
        const rel = (parsed.relationship || parsed.role || '').toString().toUpperCase();
        this.isChild = rel === 'CHILD';
      }
    } catch (e: any) {
      // ignore parsing errors and leave isChild = false
    }

    // Determine whether current user is a parent (parent accounts can assign coins)
    try {
      this.isParent = !!(this.authService && this.authService.isParentUser && this.authService.isParentUser());
    } catch (e: any) {
      this.isParent = false;
    }

    try {
      // First check @Input() properties (used when opened via modal componentProps)
      // Then fall back to router navigation state or history.state
      const nav = this.router.getCurrentNavigation();
      const stateHabit = this.editingHabit ?? nav?.extras?.state?.['habit'] ?? (history && (history.state as any)?.habit);
      if (!stateHabit) return;
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
      // Auto-switch to the appropriate tab based on: @Input() initialTab, explicit currentActive in state, or habit type
      const stateCurrentActive = this.initialTab ?? nav?.extras?.state?.['currentActive'] ?? (history && (history.state as any)?.currentActive);
      this.currentActive = stateCurrentActive || (h.type as any) || this.currentActive;
      this.isPrivate = !!h.isPrivate;
      this.coinReward = Number(h?.coinReward ?? h?.rewardCoins ?? h?.coin ?? 5);
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
        : HabitInputComponent.PRIORITY_MAP[rawPriority] || '') as any;

      this.activities = Array.isArray(h.activities) && h.activities.length ? h.activities : this.activities;

      if (Array.isArray(h.tags) && h.tags.length) {
        const first = h.tags[0];
        if (typeof first === 'string') {
          this.selectedTags = h.tags.map((t: string, idx: number) => ({ key: String(idx), value: t }));
          h.tags.forEach((tagValue: string) => {
            const exists = this.routineTags.some(rt => rt.value.toLowerCase() === tagValue.toLowerCase());
            if (!exists) {
              this.routineTags.push({ key: String(Date.now() + Math.random()), value: tagValue, type: 'habit-input' });
            }
          });
        } else if (typeof first === 'object') {
          this.selectedTags = h.tags.map((t: any, idx: number) => (t.key && (t.value || t.name || t.title)) ? { key: String(t.key), value: t.value || t.name || t.title, type: t.type } : { key: String(idx), value: t.value || t.name || t.title || JSON.stringify(t) });
          h.tags.forEach((tag: any) => {
            const tagValue = tag.value || tag.name || tag.title;
            if (tagValue) {
              const exists = this.routineTags.some(rt => rt.value.toLowerCase() === tagValue.toLowerCase());
              if (!exists) {
                this.routineTags.push({ key: String(tag.key || Date.now() + Math.random()), value: tagValue, type: tag.type || 'habit-input' });
              }
            }
          });
        }
      }
      // Ensure the MindfulTags component contains these tags and select them.
      try {
        if (this.tagsComponent) {
          const labels: string[] = [];
          if (Array.isArray(this.routineTags)) labels.push(...this.routineTags.map(rt => String(rt.value || '').trim()));
          if (Array.isArray(this.selectedTags)) labels.push(...this.selectedTags.map(st => String((st as any).value || (st as any).name || (st as any).title || '').trim()));
          const uniq = Array.from(new Set(labels.map(l => l).filter(Boolean)));
          if (uniq.length) {
            this.tagsComponent.ensureOptionsForLabels(uniq);
          }

          // Map selectedTags into child component selectedKeys
          if (Array.isArray(this.selectedTags) && this.selectedTags.length) {
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
        }
      } catch (e: any) { console.warn('Failed to sync routine tags with MindfulTags component', e); }
    } catch (e: any) {
      console.warn('Failed to read navigation state for habit-input', e);
    }
  }

  get isFormComplete(): boolean {
    if (!this.title?.trim()) return false;
    if (!this.startDate || !this.endDate) return false;
    if (!this.startTime?.trim() || !this.endTime?.trim()) return false;
    if (this.isTimeInPast(this.startTime) || this.isTimeInPast(this.endTime)) return false;
    if (this.isEndTimeNotAfterStart(this.startTime, this.endTime)) return false;
    if (this.isEndTimeCrossingMidnight(this.startTime, this.endTime)) return false;

    // Additional required fields checked by submit validations
    if (!this.selectedTags || this.selectedTags.length === 0) return false;
    if (!this.priority) return false;
    if (!this.notes?.trim()) return false;

    return this.everyday || (this.selectedDays && this.selectedDays.size > 0);
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } | null {
    const match = HabitInputComponent.TIME_REGEX.exec(timeStr.trim());
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

  private isTimeInPast(timeStr: string): boolean {
    if (!timeStr || !this.startDate) return false;

    const today = new Date();
    const startDateOnly = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (startDateOnly.getTime() !== todayOnly.getTime()) return false;

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

  onTagAdd(event: any) { if (event?.key && event?.value) this.routineTags.push({ key: event.key.toString(), value: event.value, type: 'habit-input' }); }
  onTagEdit(event: any) { if (!event?.key) return; const idx = this.routineTags.findIndex(t => t.key === event.key.toString()); if (idx > -1) this.routineTags[idx].value = event.value; }
  onTagDelete(key: any) { if (key == null) return; this.routineTags = this.routineTags.filter(t => t.key !== key.toString()); }

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

  private getSelectedDaysOfWeek(): string[] {
    // When everyday is true AND the date range covers all weekdays, send full week
    // Otherwise, only send the specific selected days
    if (this.everyday) {
      const daysInRange = this.getDaysInRange();
      const coversAllDays = daysInRange.length === 7;
      // Only return FULL_WEEK if the range actually covers all 7 weekdays
      if (coversAllDays) {
        return HabitInputComponent.FULL_WEEK;
      }
    }
    return Array.from(this.selectedDays).map(d => HabitInputComponent.DAY_MAP[d] || d.toString().toUpperCase());
  }

  private getTagValues(): string[] {
    return Array.isArray(this.selectedTags) && this.selectedTags.length ? this.selectedTags.map(t => t.value || t.key) : [];
  }

  submit() {
    this.attemptedSubmit = true;
    // clear any previous server-side message
    this.serverErrorMessage = '';
    Object.keys(this.errors).forEach(k => (this.errors as any)[k] = false);

    const validations = {
      title: !this.title?.trim(),
      tag: !this.selectedTags?.length,
      routine: !!(this.selectedRoutine && this.startTime && !this.isStartTimeWithinRoutine()),
      weekdays: !this.everyday && !this.selectedDays?.size,
      time: !this.startTime?.trim() || !this.endTime?.trim(),
      pastTime: this.isTimeInPast(this.startTime) || this.isTimeInPast(this.endTime),
      endTimeBeforeStart: this.isEndTimeNotAfterStart(this.startTime, this.endTime),
      endTimeSingleDay: this.isEndTimeCrossingMidnight(this.startTime, this.endTime),
      date: !this.startDate || !this.endDate || this.startDate > this.endDate,
      priority: !this.priority,
      notes: !this.notes?.trim()
    };

    Object.assign(this.errors, validations);
    // Debug: log validation flags and force change detection so template updates immediately
    try { console.log('[Validation] attemptedSubmit=', this.attemptedSubmit, 'validations=', validations, 'errors=', this.errors); } catch (e: any) { }
    try { this.cd.detectChanges(); } catch (e: any) { }
    if (Object.values(validations).some(Boolean)) return;

    const formattedStartTime = this.to24Hour(this.startTime || '');
    const formattedEndTime = this.to24Hour(this.endTime || '');

    const habit: Habit = {
      id: crypto.randomUUID(),
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
      activities: this.currentActive === 'timetable' ? this.activities.filter(a => a.name.trim()) : undefined
      ,
      coinReward: this.coinReward ?? 5
    };

    const daysOfWeek = this.getSelectedDaysOfWeek();
    const tags = this.getTagValues();
    const priority = (habit.priority || 'medium').toString().toUpperCase();
    const routine = ((habit.selectedRoutine || this.selectedRoutine) || 'MORNING').toString().toUpperCase();

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
        routine: routine,
        tags: tags,
        startDate: this.formatDateStr(this.startDate) || '',
        startTime: formattedStartTime || '',
        endDate: this.formatDateStr(this.endDate) || '',
        endTime: formattedEndTime || '',
        everyday: !!(this.everyday && coversAllDays),
        everyWeekend: false,
        rewardCoins: habit.coinReward ?? 5,
        sharedWithParent: this.isChild ? !this.isPrivate : false
      };
      // Only include daysOfWeek if NOT everyday
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
      }
    } else if (this.currentActive === 'timetable') {
      payload = {
        title: habit.title,
        notes: habit.notes || '',
        tags,
        everyday: !!(this.everyday && coversAllDays),
        startTime: formattedStartTime || '',
        endTime: formattedEndTime || '',
        startDate: this.formatDateStr(this.startDate) || '',
        endDate: this.formatDateStr(this.endDate) || '',
        priority,
        sharedWithParent: this.isChild ? !this.isPrivate : false
      };
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
        routine: routine,
        tags: tags,
        startDate: this.formatDateStr(this.startDate) || '',
        startTime: formattedStartTime || '',
        endDate: this.formatDateStr(this.endDate) || '',
        endTime: formattedEndTime || '',
        everyday: !!(this.everyday && coversAllDays),
        everyWeekend: false,
        coinReward: 5,
        sharedWithParent: this.isChild ? !this.isPrivate : false
      };
      // Only include daysOfWeek if NOT everyday
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
      }
    }
    // Debug: show computed values to help diagnose server mismatch
    try {
      console.log('[Submit Debug] isChild=', this.isChild, 'isPrivate=', this.isPrivate, 'sharedWithParent=', (this.isChild ? !this.isPrivate : false));
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
              this.modalCtrl.dismiss();
              this.navigationContext.popContext();
              this.navigationContext.navigateBack({ updatedHabit, showSingleMode: true, initialTab: 'tasks' });
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
              this.modalCtrl.dismiss();
              this.navigationContext.navigateBack({ newHabit: createdHabit, showSingleMode: true, initialTab: 'tasks' });
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
              this.habitService.updateHabit(updatedHabit);
              this.modalCtrl.dismiss();
              this.navigationContext.popContext();
              this.navigationContext.navigateBack({ updatedHabit, showSingleMode: true, initialTab: 'timetable' });
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to update timetable', err); alert('Failed to update timetable. Please try again.'); }
        });
      } else {
        this.calendarApi.addCalendarEvent(payload).subscribe({
          next: (res) => {
            try {
              const createdHabit = this.buildHabitFromResponse(res, habit, 'timetable', formattedStartTime, formattedEndTime, daysOfWeek);
              this.habitService.addHabit(createdHabit);
              this.modalCtrl.dismiss();
              this.navigationContext.navigateBack({ newHabit: createdHabit, showSingleMode: true, initialTab: 'timetable' });
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
              this.modalCtrl.dismiss();
              this.navigationContext.popContext();
              this.navigationContext.navigateBack({ updatedHabit, showSingleMode: true });
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
              this.modalCtrl.dismiss();
              this.navigationContext.navigateBack({ newHabit: createdHabit, showSingleMode: true });
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to create habit', err); this.serverErrorMessage = err?.error?.message || err?.message || 'Failed to create habit. Please try again.'; }
        });
      }
    }
  }

  selectCoin(value: number) { this.coinReward = value; }
  isCoinSelected(value: number) { return this.coinReward === value; }

  private buildHabitFromResponse(res: any, baseHabit: Habit, type: 'habits' | 'tasks' | 'timetable', formattedStartTime: string, formattedEndTime: string, daysOfWeek: string[]): Habit {
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
      selectedDays: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : (this.everyday ? HabitInputComponent.FULL_WEEK : daysOfWeek),
      priority: (data.priority ?? baseHabit.priority) as 'low' | 'medium' | 'high',
      routine: data.routine ?? baseHabit.routine ?? this.selectedRoutine,
      status: data.status ?? baseHabit.status,
      createdAt: data.createdAt ? new Date(data.createdAt) : (this.originalHabit?.createdAt ? new Date(this.originalHabit.createdAt) : new Date()),
      activities: baseHabit.activities,
      tags: Array.isArray(data.tags) ? data.tags : this.selectedTags.map(t => t.value || t.key),
      coinReward: data.rewardCoins ?? data.coinReward ?? baseHabit.coinReward ?? 0,
      coinsEarned: data.coinsEarned ?? data.coins ?? 0,
      streak: data.streak ?? data.streakCount ?? 0,
      highestStreak: data.highestStreak ?? 0,
      completionPercentage: data.completionPercentage ?? data.completionRate ?? 0,
      totalCompletedDays: data.totalCompletedDays ?? data.completedDays ?? 0,
      milestoneBadges: data.milestoneBadges ?? data.badgeList ?? null,
      daysOfWeek: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : (this.everyday ? HabitInputComponent.FULL_WEEK : daysOfWeek)
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

    return Array.from(daysInRange).map(num => HabitInputComponent.DAY_NUM_TO_CODE[num]);
  }

  private isSameDateRange(): boolean {
    if (!this._startDate || !this._endDate) return false;
    return this._startDate.getFullYear() === this._endDate.getFullYear()
      && this._startDate.getMonth() === this._endDate.getMonth()
      && this._startDate.getDate() === this._endDate.getDate();
  }

  private getSingleDayFromRange(): string | null {
    if (!this.isSameDateRange() || !this._startDate) return null;
    return HabitInputComponent.DAY_NUM_TO_CODE[this._startDate.getDay()];
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
        this.selectedDays.clear();
        this.selectedDays.add(single);
        if (hadInvalid) {
          this.showDaySelectionError = true;
        }
      }
      return;
    }

    const hasInvalidDays = currentSelected.some(day => !daysInRangeSet.has(day));

    if (hasInvalidDays) {
      const validSelectedDays = currentSelected.filter(day => daysInRangeSet.has(day));
      this.selectedDays.clear();
      validSelectedDays.forEach(day => this.selectedDays.add(day));
      console.log(`Auto-adjusted days: ${currentSelected.join(', ')} → ${validSelectedDays.join(', ')}`);
      this.showDaySelectionError = true;
    }
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
      this.selectedDays.clear();
      if (this._startDate && this._endDate) {
        const daysInRange = this.getDaysInRange();
        daysInRange.forEach(day => this.selectedDays.add(day));
      }
      this.showDaySelectionError = false;
      this.clearWeekdaysError();
    }
  }

  onDelete() {
    if (!this.editingId) return;
    const coin = Number(this.originalHabit?.coinReward ?? this.originalHabit?.coin ?? 0);
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
      try { this.modalCtrl.dismiss(); } catch { /* ignore if not modal */ }
      this.deletePopupVisible = false;


      this.navigationContext.popContext();
      console.log('[Delete] Skipped detail page context, navigating to origin page');

      this.navigationContext.navigateBack({ deletedId: idToRemove || this.editingId });
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
                alert('Failed to delete timetable on server. Please try again.');
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
  addActivity() { this.activities.push({ name: '', startTime: '', endTime: '' }); }

  onTagsChange(payload: any) {
    // Normalize payload to an array to support singleSelection emitting a single value
    const values = Array.isArray(payload) ? payload : (payload == null ? [] : [payload]);
    if (!values || values.length === 0) { this.selectedTags = []; this.clearTagError(); return; }

    const first = values[0];
    // Build lookup source: prefer routineTags, then fallback to tagsComponent options
    const sourceOptions = [...(this.routineTags || []), ...((this.tagsComponent && this.tagsComponent.options) || [])];

    if (typeof first === 'number') {
      // numeric indices -> map to sourceOptions
      this.selectedTags = (values as number[]).map(i => sourceOptions[i]).filter(Boolean);
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

    // If still empty but mindful-tags component exists, try mapping selectedKeys from that component
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
    setTimeout(() => {
      this.errors.pastTime = this.isTimeInPast(this.startTime) || this.isTimeInPast(this.endTime);
      this.errors.endTimeBeforeStart = this.isEndTimeNotAfterStart(this.startTime, this.endTime);
      this.errors.endTimeSingleDay = this.isEndTimeCrossingMidnight(this.startTime, this.endTime);
      // Do not auto-adjust startTime or endTime here. Let user correct times manually when an error occurs.
      // Validate routine/time mismatch
      this.validateRoutineTime();
    }, 100);
  }

  clearDateError() {
    this.clearError('date');
    setTimeout(() => {
      if (this.startTime || this.endTime) {
        this.errors.pastTime = this.isTimeInPast(this.startTime) || this.isTimeInPast(this.endTime);
        this.errors.endTimeBeforeStart = this.isEndTimeNotAfterStart(this.startTime, this.endTime);
        this.errors.endTimeSingleDay = this.isEndTimeCrossingMidnight(this.startTime, this.endTime);
        this.validateRoutineTime();
      } else {
        this.errors.pastTime = this.errors.endTimeBeforeStart = this.errors.endTimeSingleDay = false;
      }
    }, 100);
  }

  hasAnyErrors(): boolean {
    return !!(this.showTitleError || this.showTagError || this.showRoutineError || this.showWeekdaysError || this.showTimeError || this.showPastTimeError || this.showEndTimeBeforeStart || this.showEndTimeSingleDayError || this.showDateError || this.showPriorityError || this.showNotesError);
  }

  // User-facing message for day-selection errors. If the date range is a single
  // date, the message should explicitly tell the user which weekday is allowed.
  get daySelectionErrorMessage(): string {
    if (!this.showDaySelectionError) return "";
    if (this.isSameDateRange() && this._startDate) {
      const code = HabitInputComponent.DAY_NUM_TO_CODE[this._startDate.getDay()];
      const full = HabitInputComponent.DAY_MAP[code] || '';
      return `Your date is set for ${full} only.`;
    }
    return "That day isn't in your chosen date range.";
  }

  orderedErrorMessages(): string[] {
    const msgs: string[] = [];
    if (this.showTitleError) msgs.push('Enter title');
    if (this.showTagError) msgs.push('Select a tag');
    if (this.showRoutineError) msgs.push('Select a routine');
    if (this.showWeekdaysError) msgs.push('Select at least one weekday');
    if (this.showTimeError) msgs.push('Add start and end time');
    if (this.showPastTimeError) msgs.push('Cannot set time in the past for today');
    if (this.showEndTimeBeforeStart) msgs.push('End time must be after the start time');
    if (this.showEndTimeSingleDayError) msgs.push('Activities must finish before midnight (11:59 PM).');
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
        this.tagsComponent.selectedKeys = keysToSelect;
        this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
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
  } catch(e: any) { console.warn('Failed in ngAfterViewInit tag sync', e); }

}
