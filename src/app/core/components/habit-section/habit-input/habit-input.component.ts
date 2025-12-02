import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
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
  isPrivate = false;
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

  routineTags = [
    { key: '1', value: 'Exercise', type: 'habit-input' },
    { key: '2', value: 'Running', type: 'habit-input' },
    { key: '3', value: 'Reading', type: 'habit-input' },
    { key: '4', value: 'Swimming', type: 'habit-input' },
    { key: '5', value: 'Learning', type: 'habit-input' },
    { key: '6', value: 'Fitness', type: 'habit-input' },
    { key: '7', value: 'Skill', type: 'habit-input' },
    { key: '8', value: 'Personal', type: 'habit-input' }
  ];

  everyday = false;
  weekdays = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  selectedDays = new Set<string>();
  // start empty so user must explicitly select priority — enables validation error to show
  priority: '' | 'low' | 'medium' | 'high' = '';
  showDaySelectionError = false;

  activities: { name: string; startTime: string; endTime: string }[] = [
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' }
  ];

  @ViewChild(MindfulTagsComponent) tagsComponent?: MindfulTagsComponent;
  @ViewChild(MindfulSelectorsComponent) selectorsComponent?: MindfulSelectorsComponent;

  editingId?: string;
  originalHabit: any = null;
  public isSubmitting: boolean = false;

  // UI validation flags to show visual cues when user attempts submit
  attemptedSubmit = false;
  showTitleError = false;
  showTimeError = false;
  showDateError = false;
  showNotesError = false;
  showTagError = false;
  showRoutineError = false;
  showWeekdaysError = false;
  showPriorityError = false;
  showPastTimeError = false;
  showEndTimeSingleDayError = false;
  // Delete confirmation popup state
  deletePopupVisible = false;
  deletePopupConfig: MindfulPopupConfig = {};
  // internal guard to prevent double-delete
  private deleting = false;

  // runtime asset path (served from /assets)
  private readonly DELETE_IMAGE_PATH = 'assets/Images-Transparent/Image-Input-Delete.png';

  // use PNG assets for icons (18px width, height auto)
  private readonly _coinSvg = `<img src="assets/Icons-Neutral/Icons-Coins.png" alt="Coins" style="width:18px;height:auto;"/>`;
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
      primaryCTA: { text: 'Delete', buttonStyle: 'bronze' },
      secondaryCTA: { text: 'Cancel', buttonStyle: 'bronze-transparent', buttonMedium: true },
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
    private navigationContext: NavigationContextService
  ) { }

  get navigatorActions(): Array<{ type: 'edit' | 'icon', src?: string, alt?: string }> {
    return this.editingId ? [{ type: 'icon', alt: 'Delete' }] : [];
  }

  onNavigatorAction(event: { index: number; action: any }) {
    const alt = (event?.action?.alt || '').toString().toLowerCase();
    if (alt.includes('delete')) this.onDelete();
  }

  ngOnInit() {
    try {
      const nav = this.router.getCurrentNavigation();
      const stateHabit = nav?.extras?.state?.['habit'] ?? (history && (history.state as any)?.habit);
      if (!stateHabit) return;
      const h: any = stateHabit;
      this.originalHabit = h;
      if (h.id) this.editingId = String(h.id);
      this.title = h.title || h.name || '';
      this.notes = h.notes ?? h.description ?? '';
      this.startDate = h.startDate ? new Date(h.startDate) : (h.startDateEpoch ? new Date(Number(h.startDateEpoch)) : null);
      this.endDate = h.endDate ? new Date(h.endDate) : (h.endDateEpoch ? new Date(Number(h.endDateEpoch)) : null);
      this.startTime = h.startTime || h.start_time || '';
      this.endTime = h.endTime || h.end_time || '';
      this.currentActive = (h.type as any) || this.currentActive;
      this.isPrivate = !!h.isPrivate;
      this.selectedRoutine = h.selectedRoutine || h.routine || (h.getRoutine as any) || this.selectedRoutine;
      this.routineTags = Array.isArray(h.routineTags) ? h.routineTags : this.routineTags;

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

      const rawPriority = (h.priority ?? h.priorityLevel ?? '').toString();
      const normalized = rawPriority.trim().toLowerCase();
      if (['low', 'medium', 'high'].includes(normalized)) this.priority = normalized as any;
      else if (normalized === '1') this.priority = 'low';
      else if (normalized === '2') this.priority = 'medium';
      else if (normalized === '3') this.priority = 'high';

      this.activities = Array.isArray(h.activities) && h.activities.length ? h.activities : this.activities;

      if (Array.isArray(h.tags) && h.tags.length) {
        const first = h.tags[0];
        if (typeof first === 'string') this.selectedTags = h.tags.map((t: string, idx: number) => ({ key: String(idx), value: t }));
        else if (typeof first === 'object') this.selectedTags = h.tags.map((t: any, idx: number) => (t.key && (t.value || t.name || t.title)) ? { key: String(t.key), value: t.value || t.name || t.title, type: t.type } : { key: String(idx), value: t.value || t.name || t.title || JSON.stringify(t) });
      }
    } catch (e) {
      console.warn('Failed to read navigation state for habit-input', e);
    }
  }

  get isFormComplete(): boolean {
    if (!this.title?.trim()) return false;
    if (!this.startDate || !this.endDate) return false;
    if (!this.startTime?.trim() || !this.endTime?.trim()) return false;
    if (this.isTimeInPast(this.startTime) || this.isTimeInPast(this.endTime)) return false;
    if (this.isEndTimeExceedingSingleDay(this.endTime)) return false;
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

  private isEndTimeExceedingSingleDay(timeStr: string): boolean {
    if (!timeStr || !this.startDate || !this.endDate) return false;

    const startDateOnly = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
    const endDateOnly = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), this.endDate.getDate());

    if (startDateOnly.getTime() !== endDateOnly.getTime()) return false;

    const parsed = this.parseTime(timeStr);
    if (!parsed) return false;

    if (parsed.hours === 0 && parsed.minutes === 0) return true;
    if (parsed.hours > 23 || (parsed.hours === 23 && parsed.minutes > 59)) return true;

    return false;
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

    this.showTitleError = false;
    this.showTimeError = false;
    this.showDateError = false;
    this.showNotesError = false;
    this.showTagError = false;
    this.showRoutineError = false;
    this.showWeekdaysError = false;
    this.showPriorityError = false;
    this.showPastTimeError = false;
    this.showEndTimeSingleDayError = false;

    const titleMissing = !this.title || !this.title.trim();
    const tagMissing = !Array.isArray(this.selectedTags) || this.selectedTags.length === 0;
    const routineMissing = !this.selectedRoutine;
    const weekdaysMissing = !this.everyday && (!this.selectedDays || this.selectedDays.size === 0);
    const timeMissing = !this.startTime?.trim() || !this.endTime?.trim();
    const pastTime = this.isTimeInPast(this.startTime) || this.isTimeInPast(this.endTime);
    const endTimeExceedsSingleDay = this.isEndTimeExceedingSingleDay(this.endTime);
    const dateMissing = !this.startDate || !this.endDate || (this.startDate && this.endDate && this.startDate > this.endDate);
    const priorityMissing = !this.priority;
    const notesMissing = !this.notes || !this.notes.trim();

    this.showTitleError = !!titleMissing;
    this.showTagError = !!tagMissing;
    this.showRoutineError = !!routineMissing;
    this.showWeekdaysError = !!weekdaysMissing;
    this.showTimeError = !!timeMissing;
    this.showPastTimeError = !!pastTime;
    this.showEndTimeSingleDayError = !!endTimeExceedsSingleDay;
    this.showDateError = !!dateMissing;
    this.showPriorityError = !!priorityMissing;
    this.showNotesError = !!notesMissing;

    if (titleMissing || tagMissing || routineMissing || weekdaysMissing || timeMissing || pastTime || endTimeExceedsSingleDay || dateMissing || priorityMissing || notesMissing) {
      return;
    }

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
        rewardCoins: habit.coinReward ?? 5
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
        priority
      };
      // Only include daysOfWeek if NOT everyday
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
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
        coinReward: 5
      };
      // Only include daysOfWeek if NOT everyday
      if (!(this.everyday && coversAllDays)) {
        payload.daysOfWeek = daysOfWeek;
      }
    }

    if (this.currentActive === 'tasks') {
      this.isSubmitting = true;
      console.log('[Task Submit] Payload:', JSON.stringify(payload, null, 2));

      if (this.editingId) {
        // Update existing task
        this.taskApi.updateTask(this.editingId, payload).subscribe({
          next: (res) => {
            try {
              // Build a local Habit model from the task response to keep UI behavior consistent
              const updated = res || {};
              const updatedTaskHabit: Habit = {
                id: String(updated?.id ?? this.editingId),
                title: updated?.title ?? habit.title,
                notes: updated?.description ?? habit.notes,
                startDate: updated?.startDate ? new Date(updated.startDate) : habit.startDate,
                endDate: updated?.endDate ? new Date(updated.endDate) : habit.endDate,
                startTime: updated?.startTime ?? formattedStartTime,
                endTime: updated?.endTime ?? formattedEndTime,
                startTimeStamp: updated?.startDate ? new Date(`${updated.startDate}T${formattedStartTime}`).getTime() : habit.startTimeStamp,
                endTimeStamp: updated?.endDate ? new Date(`${updated.endDate}T${formattedEndTime}`).getTime() : habit.endTimeStamp,
                type: 'tasks',
                isPrivate: habit.isPrivate,
                selectedRoutine: updated?.routine ?? habit.selectedRoutine,
                routineTags: this.routineTags,
                everyday: !!updated?.everyday,
                selectedDays: Array.isArray(updated?.daysOfWeek) ? updated.daysOfWeek : (this.everyday ? HabitInputComponent.FULL_WEEK : daysOfWeek),
                priority: (updated?.priority ?? habit.priority) as any,
                routine: updated?.routine ?? habit.routine,
                status: updated?.status ?? habit.status,
                createdAt: updated?.createdAt ? new Date(updated.createdAt) : (this.originalHabit?.createdAt ? new Date(this.originalHabit.createdAt) : new Date()),
                activities: habit.activities,
                tags: Array.isArray(updated?.tags) ? updated.tags : (Array.isArray(this.selectedTags) ? this.selectedTags.map(t => t.value || t.key) : []),
                coinReward: updated?.rewardCoins ?? updated?.coinReward ?? habit.coinReward ?? 0,
                coinsEarned: updated?.coinsEarned ?? updated?.coins ?? 0,
                streak: updated?.streak ?? updated?.streakCount ?? 0,
                highestStreak: updated?.highestStreak ?? 0,
                completionPercentage: updated?.completionPercentage ?? updated?.completionRate ?? 0,
                totalCompletedDays: updated?.totalCompletedDays ?? updated?.completedDays ?? 0,
                milestoneBadges: updated?.milestoneBadges ?? updated?.badgeList ?? null,
                daysOfWeek: Array.isArray(updated?.daysOfWeek) ? updated.daysOfWeek : (this.everyday ? HabitInputComponent.FULL_WEEK : daysOfWeek)
              };
              this.habitService.updateHabit(updatedTaskHabit);
              this.modalCtrl.dismiss();

              // Pop the detail page context (habit-input -> detail) without navigating
              // This allows us to skip the detail page and go back to the origin page
              this.navigationContext.popContext();
              console.log('[Task Update] Skipped detail page context, navigating to origin page');

              this.navigationContext.navigateBack({ updatedHabit: updatedTaskHabit, showSingleMode: true, initialTab: 'tasks' });
            } finally {
              this.isSubmitting = false;
            }
          },
          error: (err) => {
            this.isSubmitting = false;
            console.error('Failed to update task', err);
            alert('Failed to update task. Please try again.');
          }
        });
      } else {
        // Create new task
        this.taskApi.createTask(payload).subscribe({
          next: (res) => {
            try {
              // Build a local Habit model from the task response to keep UI behavior consistent with habits
              const created = res || {};
              const createdTaskHabit: Habit = {
                id: String(created?.id ?? habit.id),
                title: created?.title ?? habit.title,
                notes: created?.description ?? habit.notes,
                startDate: created?.startDate ? new Date(created.startDate) : habit.startDate,
                endDate: created?.endDate ? new Date(created.endDate) : habit.endDate,
                startTime: created?.startTime ?? formattedStartTime,
                endTime: created?.endTime ?? formattedEndTime,
                startTimeStamp: created?.startDate ? new Date(`${created.startDate}T${formattedStartTime}`).getTime() : habit.startTimeStamp,
                endTimeStamp: created?.endDate ? new Date(`${created.endDate}T${formattedEndTime}`).getTime() : habit.endTimeStamp,
                type: 'tasks',
                isPrivate: habit.isPrivate,
                selectedRoutine: created?.routine ?? habit.selectedRoutine,
                routineTags: this.routineTags,
                everyday: !!created?.everyday,
                selectedDays: Array.isArray(created?.daysOfWeek) ? created.daysOfWeek : (this.everyday ? HabitInputComponent.FULL_WEEK : daysOfWeek),
                priority: (created?.priority ?? habit.priority) as any,
                routine: created?.routine ?? habit.routine,
                status: created?.status ?? habit.status,
                createdAt: created?.createdAt ? new Date(created.createdAt) : new Date(),
                activities: habit.activities,
                tags: Array.isArray(created?.tags) ? created.tags : (Array.isArray(this.selectedTags) ? this.selectedTags.map(t => t.value || t.key) : []),
                coinReward: created?.rewardCoins ?? created?.coinReward ?? habit.coinReward ?? 0,
                coinsEarned: created?.coinsEarned ?? created?.coins ?? 0,
                streak: created?.streak ?? created?.streakCount ?? 0,
                highestStreak: created?.highestStreak ?? 0,
                completionPercentage: created?.completionPercentage ?? created?.completionRate ?? 0,
                totalCompletedDays: created?.totalCompletedDays ?? created?.completedDays ?? 0,
                milestoneBadges: created?.milestoneBadges ?? created?.badgeList ?? null,
                daysOfWeek: Array.isArray(created?.daysOfWeek) ? created.daysOfWeek : (this.everyday ? HabitInputComponent.FULL_WEEK : daysOfWeek)
              };
              this.habitService.addHabit(createdTaskHabit);
              this.modalCtrl.dismiss();
              this.navigationContext.navigateBack({ newHabit: createdTaskHabit, showSingleMode: true, initialTab: 'tasks' });
            } finally {
              this.isSubmitting = false;
            }
          },
          error: (err) => {
            this.isSubmitting = false;
            console.error('Failed to create task', err);
            console.error('Error status:', err?.status);
            console.error('Error message:', err?.message);
            console.error('Error body:', err?.error);
            const errorMsg = err?.error?.message || err?.message || 'Unknown error';
            alert(`Failed to create task: ${errorMsg}. Please try again.`);
          }
        });
      }
    } else if (this.currentActive === 'timetable') {
      this.isSubmitting = true;
      this.calendarApi.addCalendarEvent(payload).subscribe({
        next: (res) => {
          try { this.habitService.addHabit(habit); this.modalCtrl.dismiss(); this.navigationContext.navigateBack({ newHabit: habit, showSingleMode: true, initialTab: 'timetable' }); }
          finally { this.isSubmitting = false; }
        },
        error: (err) => { this.isSubmitting = false; console.error('Failed to create calendar event', err); alert('Failed to create timetable. Please try again.'); }
      });
    } else {
      // Habit create/update: call HabitApi directly and handle mapping
      if (this.editingId) {
        this.isSubmitting = true;
        this.habitApi.updateHabit(this.editingId, payload).subscribe({
          next: (res) => {
            try {
              // Build updated habit from server response
              const updated: Habit = {
                id: String(res?.id ?? this.editingId),
                title: res?.title ?? habit.title,
                notes: res?.description ?? habit.notes,
                startDate: res?.startDate ? new Date(res.startDate) : habit.startDate,
                endDate: res?.endDate ? new Date(res.endDate) : habit.endDate,
                startTime: res?.startTime ?? formattedStartTime,
                endTime: res?.endTime ?? formattedEndTime,
                startTimeStamp: res?.startDate ? new Date(`${res.startDate}T${formattedStartTime}`).getTime() : habit.startTimeStamp,
                endTimeStamp: res?.endDate ? new Date(`${res.endDate}T${formattedEndTime}`).getTime() : habit.endTimeStamp,
                type: 'habits',
                isPrivate: habit.isPrivate,
                selectedRoutine: res?.routine ?? habit.selectedRoutine,
                routineTags: this.routineTags,
                everyday: !!res?.everyday,
                selectedDays: res?.daysOfWeek ?? habit.selectedDays,
                priority: (res?.priority ?? habit.priority) as any,
                routine: res?.routine ?? habit.routine,
                status: res?.status ?? habit.status,
                createdAt: res?.createdAt ? new Date(res.createdAt) : (this.originalHabit?.createdAt ? new Date(this.originalHabit.createdAt) : new Date()),
                activities: habit.activities,
                tags: Array.isArray(this.selectedTags) ? this.selectedTags.map(t => t.value || t.key) : [],
                coinsEarned: res?.coinsEarned ?? res?.coins ?? 0,
                streak: res?.streak ?? res?.streakCount ?? 0,
                highestStreak: res?.highestStreak ?? 0,
                completionPercentage: res?.completionPercentage ?? res?.completionRate ?? 0,
                totalCompletedDays: res?.totalCompletedDays ?? res?.completedDays ?? 0,
                milestoneBadges: res?.milestoneBadges ?? res?.badgeList ?? []
              };
              this.habitService.updateHabit(updated);
              this.modalCtrl.dismiss();

              // Pop the detail page context (habit-input -> detail) without navigating
              // This allows us to skip the detail page and go back to the origin page
              this.navigationContext.popContext();
              console.log('[Habit Update] Skipped detail page context, navigating to origin page');

              this.navigationContext.navigateBack({ updatedHabit: updated, showSingleMode: true });
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to update habit', err); alert('Failed to update habit. Please try again.'); }
        });
      } else {
        this.isSubmitting = true;
        this.habitApi.createHabit(payload).subscribe({
          next: (res) => {
            try {
              const created = res;
              const createdHabit: Habit = {
                id: String(created?.id ?? habit.id),
                title: created?.title ?? habit.title,
                notes: created?.description ?? habit.notes,
                startDate: created?.startDate ? new Date(created.startDate) : habit.startDate,
                endDate: created?.endDate ? new Date(created.endDate) : habit.endDate,
                startTime: created?.startTime ?? formattedStartTime,
                endTime: created?.endTime ?? formattedEndTime,
                startTimeStamp: created?.startDate ? new Date(`${created.startDate}T${formattedStartTime}`).getTime() : habit.startTimeStamp,
                endTimeStamp: created?.endDate ? new Date(`${created.endDate}T${formattedEndTime}`).getTime() : habit.endTimeStamp,
                type: 'habits',
                isPrivate: habit.isPrivate,
                selectedRoutine: created?.routine ?? habit.selectedRoutine,
                routineTags: this.routineTags,
                everyday: !!created?.everyday,
                selectedDays: created?.daysOfWeek ?? habit.selectedDays,
                priority: (created?.priority ?? habit.priority) as any,
                routine: created?.routine ?? habit.routine,
                status: created?.status ?? habit.status,
                createdAt: created?.createdAt ? new Date(created.createdAt) : new Date(),
                activities: habit.activities,
                tags: Array.isArray(this.selectedTags) ? this.selectedTags.map(t => t.value || t.key) : [],
                coinReward: created?.coinReward ?? habit.coinReward,
                coinsEarned: created?.coinsEarned ?? created?.coins ?? 0,
                streak: created?.streak ?? created?.streakCount ?? 0,
                highestStreak: created?.highestStreak ?? 0,
                completionPercentage: created?.completionPercentage ?? created?.completionRate ?? 0,
                totalCompletedDays: created?.totalCompletedDays ?? created?.completedDays ?? 0,
                milestoneBadges: created?.milestoneBadges ?? created?.badgeList ?? []
              };
              this.habitService.addHabit(createdHabit);
              this.modalCtrl.dismiss();
              this.navigationContext.navigateBack({ newHabit: createdHabit, showSingleMode: true });
            } finally { this.isSubmitting = false; }
          },
          error: (err) => { this.isSubmitting = false; console.error('Failed to create habit', err); alert('Failed to create habit. Please try again.'); }
        });
      }
    }
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
      try { this.habitService.deleteHabit((idToRemove || this.editingId) as string); } catch (e) { console.warn('Local delete failed', e); }
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
    if (!Array.isArray(payload) || payload.length === 0) { this.selectedTags = []; this.clearTagError(); return; }
    const first = payload[0];
    if (typeof first === 'number') this.selectedTags = (payload as number[]).map(i => this.routineTags[i]).filter(Boolean);
    else if (typeof first === 'string') this.selectedTags = this.routineTags.filter(tag => (payload as string[]).includes(tag.key));
    else if (typeof first === 'object') this.selectedTags = payload as any[]; else this.selectedTags = [];
    this.clearTagError();
  }

  onRoutineSelected(payload: any) {
    if (!Array.isArray(payload) || payload.length === 0) return;
    try {
      this.selectedRoutine = String(payload[0]);
      this.clearRoutineError();
    } catch (e) { console.warn('Failed to parse routine selection', e); }
  }

  clearTitleError() { this.showTitleError = false; }
  clearTimeError() {
    this.showTimeError = false;
    setTimeout(() => {
      const startTimeInPast = this.startTime ? this.isTimeInPast(this.startTime) : false;
      const endTimeInPast = this.endTime ? this.isTimeInPast(this.endTime) : false;
      this.showPastTimeError = startTimeInPast || endTimeInPast;

      const endTimeExceedsSingleDay = this.endTime ? this.isEndTimeExceedingSingleDay(this.endTime) : false;
      this.showEndTimeSingleDayError = endTimeExceedsSingleDay;

      if (startTimeInPast) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const formattedHours = hours % 12 || 12;
        const period = hours >= 12 ? 'PM' : 'AM';
        this.startTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }

      if (endTimeExceedsSingleDay) {
        this.endTime = '11:59 PM';
      }
    }, 100);
  }
  clearDateError() {
    this.showDateError = false;
    setTimeout(() => {
      if (this.startTime || this.endTime) {
        const startTimeInPast = this.startTime ? this.isTimeInPast(this.startTime) : false;
        const endTimeInPast = this.endTime ? this.isTimeInPast(this.endTime) : false;
        this.showPastTimeError = startTimeInPast || endTimeInPast;

        const endTimeExceedsSingleDay = this.endTime ? this.isEndTimeExceedingSingleDay(this.endTime) : false;
        this.showEndTimeSingleDayError = endTimeExceedsSingleDay;
      } else {
        this.showPastTimeError = false;
        this.showEndTimeSingleDayError = false;
      }
    }, 100);
  }
  clearNotesError() { this.showNotesError = false; }
  clearTagError() { this.showTagError = false; }
  clearRoutineError() { this.showRoutineError = false; }
  clearWeekdaysError() { this.showWeekdaysError = false; }
  clearPriorityError() { this.showPriorityError = false; }

  hasAnyErrors(): boolean {
    return !!(this.showTitleError || this.showTagError || this.showRoutineError || this.showWeekdaysError || this.showTimeError || this.showPastTimeError || this.showEndTimeSingleDayError || this.showDateError || this.showPriorityError || this.showNotesError);
  }

  orderedErrorMessages(): string[] {
    const msgs: string[] = [];
    if (this.showTitleError) msgs.push('Enter title');
    if (this.showTagError) msgs.push('Select a tag');
    if (this.showRoutineError) msgs.push('Select a routine');
    if (this.showWeekdaysError) msgs.push('Select at least one weekday');
    if (this.showTimeError) msgs.push('Add start and end time');
    if (this.showPastTimeError) msgs.push('Cannot set time in the past for today');
    if (this.showEndTimeSingleDayError) msgs.push('End time cannot exceed 11:59 PM for single-day activities');
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
            const byKey = this.routineTags.find(t => String(t.key) === String(st.key));
            if (byKey) { keysToSelect.push(byKey.key); return; }
            const byVal = this.routineTags.find(t => String(t.value).toLowerCase() === String(st.value).toLowerCase());
            if (byVal) { keysToSelect.push(byVal.key); return; }
            keysToSelect.push(st.key);
          });
        }
        this.tagsComponent.selectedKeys = keysToSelect;
        this.tagsComponent.selectedKeysChange.emit(this.tagsComponent.selectedKeys);
      }
    } catch (e) { console.warn('Failed to set tagsComponent selected keys', e); }

    try {
      if (this.selectorsComponent) {
        let selKey: any = null;
        if (this.selectedRoutine) {
          const byKey = this.routineOptions.find(o => String(o.key) === String(this.selectedRoutine));
          if (byKey) selKey = byKey.key;
          else {
            const byVal = this.routineOptions.find(o => String(o.value).toLowerCase() === String(this.selectedRoutine).toLowerCase());
            if (byVal) selKey = byVal.key;
          }
        }
        if (selKey != null) { this.selectorsComponent.selectedKeys = [selKey]; this.selectorsComponent.selectedKeysChange.emit(this.selectorsComponent.selectedKeys); }
      }
    } catch (e) { console.warn('Failed to set selectorsComponent selected keys', e); }
  }
}
