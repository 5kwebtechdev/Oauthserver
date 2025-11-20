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
  title = '';
  notes = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  startTime = '';
  endTime = '';
  currentActive: 'habits' | 'tasks' | 'timetable' = 'habits';
  isPrivate = false;
  selectedTags: Array<{ key: string, value: string, type?: string }> = [];

  routineOptions = [
    { key: 'morning', value: 'Morning', type: 'morning' },
    { key: 'evening', value: 'Evening', type: 'evening' },
    { key: 'night', value: 'Night', type: 'night' }
  ];
  selectedRoutine = 'morning';

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
  priority: 'low' | 'medium' | 'high' = 'high';

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
    return this.everyday || (this.selectedDays && this.selectedDays.size > 0);
  }

  onTagAdd(event: any) { if (event?.key && event?.value) this.routineTags.push({ key: event.key.toString(), value: event.value, type: 'habit-input' }); }
  onTagEdit(event: any) { if (!event?.key) return; const idx = this.routineTags.findIndex(t => t.key === event.key.toString()); if (idx > -1) this.routineTags[idx].value = event.value; }
  onTagDelete(key: any) { if (key == null) return; this.routineTags = this.routineTags.filter(t => t.key !== key.toString()); }

  submit() {
    if (!this.title.trim()) { alert('Title is required'); return; }
    if (!this.startDate || !this.endDate) { alert('Please provide start and end dates'); return; }
    if (this.startDate && this.endDate && this.startDate > this.endDate) { alert('Start date must be before or equal to end date'); return; }
    if (!this.everyday && (!this.selectedDays || this.selectedDays.size === 0)) { alert('Please select at least one repeat day or enable Everyday'); return; }

    const to24Hour = (t: string) => {
      if (!t) return '';
      const trimmed = t.trim();
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) { const [hh, mm] = trimmed.split(':'); return `${Number(hh).toString().padStart(2, '0')}:${mm.padStart(2, '0')}:00`; }
      const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (m) { let hh = parseInt(m[1], 10); const mm = m[2]; const ampm = m[3].toUpperCase(); if (ampm === 'PM' && hh !== 12) hh += 12; if (ampm === 'AM' && hh === 12) hh = 0; return `${hh.toString().padStart(2, '0')}:${mm}:00`; }
      return trimmed;
    };

    const formattedStartTime = to24Hour(this.startTime || '');
    const formattedEndTime = to24Hour(this.endTime || '');

    const habit: Habit = {
      id: crypto.randomUUID(), title: this.title, notes: this.notes, startDate: this.startDate, endDate: this.endDate, startTime: formattedStartTime, endTime: formattedEndTime,
      startTimeStamp: this.startDate && formattedStartTime ? new Date(`${this.startDate.toISOString().split('T')[0]}T${formattedStartTime}`).getTime() : 0,
      endTimeStamp: this.endDate && formattedEndTime ? new Date(`${this.endDate.toISOString().split('T')[0]}T${formattedEndTime}`).getTime() : 0,
      type: this.currentActive, isPrivate: this.isPrivate, selectedRoutine: this.selectedRoutine, routineTags: this.routineTags, everyday: this.everyday, selectedDays: Array.from(this.selectedDays), priority: this.priority, routine: this.selectedRoutine, status: 'pending', createdAt: new Date(), activities: this.currentActive === 'timetable' ? this.activities.filter(a => a.name.trim()) : undefined
    };

    const dayMap: any = { S: 'SUNDAY', M: 'MONDAY', T: 'TUESDAY', W: 'WEDNESDAY', Th: 'THURSDAY', F: 'FRIDAY', Sa: 'SATURDAY' };
    const selectedShortDays = Array.from(this.selectedDays);
    let daysOfWeek: string[] = selectedShortDays.map(d => dayMap[d] || d.toString().toUpperCase());
    if (this.everyday) daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    const formatDateStr = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
    const tags = Array.isArray(this.selectedTags) && this.selectedTags.length ? this.selectedTags.map(t => t.value || t.key) : [];
    const priority = (habit.priority || 'medium').toString().toUpperCase();
    const routine = ((habit.selectedRoutine || this.selectedRoutine) || 'MORNING').toString().toUpperCase();

    const fullWeekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    let payload: any;
    if (this.currentActive === 'tasks') {
      // Build API payload to match /tasks/add endpoint (top-level fields)
      payload = {
        title: habit.title,
        description: habit.notes || '',
        status: 'PENDING',
        priority: priority,
        routine: routine,
        tags: tags,
        startDate: formatDateStr(this.startDate) || '',
        startTime: formattedStartTime || '',
        endDate: formatDateStr(this.endDate) || '',
        endTime: formattedEndTime || '',
        everyday: !!habit.everyday,
        rewardCoins: habit.coinReward ?? 5,
        daysOfWeek: this.everyday ? fullWeekDays : daysOfWeek
      };
    } else if (this.currentActive === 'timetable') {
      payload = { title: habit.title, notes: habit.notes || '', tags, everyday: !!habit.everyday, daysOfWeek: this.everyday ? fullWeekDays : daysOfWeek, startTime: formattedStartTime || '', endTime: formattedEndTime || '', startDate: formatDateStr(this.startDate) || '', endDate: formatDateStr(this.endDate) || '', priority };
    } else {
      // Habit API expects top level fields; keep contract consistent
      payload = {
        title: habit.title,
        description: habit.notes || '',
        status: 'PENDING',
        priority: priority,
        routine: routine,
        tags: tags,
        startDate: formatDateStr(this.startDate) || '',
        startTime: formattedStartTime || '',
        endDate: formatDateStr(this.endDate) || '',
        endTime: formattedEndTime || '',
        everyday: !!habit.everyday,
        coinReward: 5,
        daysOfWeek: this.everyday ? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] : daysOfWeek
      };
    }

    if (this.currentActive === 'tasks') {
      this.isSubmitting = true;
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
              selectedDays: Array.isArray(created?.daysOfWeek) ? created.daysOfWeek : (this.everyday ? fullWeekDays : daysOfWeek),
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
              daysOfWeek: Array.isArray(created?.daysOfWeek) ? created.daysOfWeek : (this.everyday ? fullWeekDays : daysOfWeek)
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
          alert('Failed to create task. Please try again.');
        }
      });
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

  toggleDay(d: string) { if (this.selectedDays.has(d)) { this.selectedDays.delete(d); if (this.everyday) this.everyday = false; } else { this.selectedDays.add(d); if (this.selectedDays.size === this.weekdays.length) this.everyday = true; } }
  onEverydayChange(event: any) { const checked = !!(event?.detail?.checked ?? event === true); this.everyday = checked; if (this.everyday) this.weekdays.forEach(d => this.selectedDays.add(d)); else this.selectedDays.clear(); }

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

      // Pop the detail page context (habit-input -> detail) without navigating
      // This allows us to skip the detail page and go back to the origin page
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
          // Backend returns HTTP 200 with error messages in body, but deletion succeeds
          // Check if it's an actual HTTP error (4xx/5xx) or just a 200 with error body
          const isActualError = err?.status && err.status >= 400;
          console.warn('Delete habit response:', err);

          if (isActualError) {
            alert('Failed to delete habit on server. Please try again.');
            this.deleting = false;
          } else {
            // Treat as success - the item is deleted on backend despite error message
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
          // Backend returns HTTP 200 with error messages in body, but deletion succeeds
          // Check if it's an actual HTTP error (4xx/5xx) or just a 200 with error body
          const isActualError = err?.status && err.status >= 400;
          console.warn('Delete task response:', err);

          if (isActualError) {
            alert('Failed to delete task on server. Please try again.');
            this.deleting = false;
          } else {
            // Treat as success - the item is deleted on backend despite error message
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
          // Check if actual error or backend quirk
          const isActualError = err?.status && err.status >= 400;

          if (!isActualError) {
            // Treat as success
            console.log('Treating as successful deletion (backend quirk)');
            finalizeLocalDelete(this.editingId);
            this.deleting = false;
            return;
          }

          console.warn('Primary calendar delete failed, trying alternate path', err);
          // Try alternate delete path
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
        // Backend returns HTTP 200 with error messages in body, but deletion succeeds
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

  selectPriority(p: 'low' | 'medium' | 'high') { this.priority = p; }
  addActivity() { this.activities.push({ name: '', startTime: '', endTime: '' }); }

  onTagsChange(payload: any) {
    if (!Array.isArray(payload) || payload.length === 0) { this.selectedTags = []; return; }
    const first = payload[0];
    if (typeof first === 'number') this.selectedTags = (payload as number[]).map(i => this.routineTags[i]).filter(Boolean);
    else if (typeof first === 'string') this.selectedTags = this.routineTags.filter(tag => (payload as string[]).includes(tag.key));
    else if (typeof first === 'object') this.selectedTags = payload as any[]; else this.selectedTags = [];
  }

  onRoutineSelected(payload: any) { if (!Array.isArray(payload) || payload.length === 0) return; try { this.selectedRoutine = String(payload[0]); } catch (e) { console.warn('Failed to parse routine selection', e); } }

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
