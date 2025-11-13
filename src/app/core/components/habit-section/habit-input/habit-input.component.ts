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
      primaryCTA: { text: 'Delete', buttonStyle: 'bronze', buttonMedium: true },
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
    private habitApi: HabitApi
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

    const to24Hour = (t: string) => {
      if (!t) return '';
      const trimmed = t.trim();
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) { const [hh, mm] = trimmed.split(':'); return `${Number(hh).toString().padStart(2, '0')}:${mm.padStart(2, '0')}`; }
      const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (m) { let hh = parseInt(m[1], 10); const mm = m[2]; const ampm = m[3].toUpperCase(); if (ampm === 'PM' && hh !== 12) hh += 12; if (ampm === 'AM' && hh === 12) hh = 0; return `${hh.toString().padStart(2, '0')}:${mm}`; }
      return trimmed;
    };

    const formattedStartTime = to24Hour(this.startTime || '');
    const formattedEndTime = to24Hour(this.endTime || '');

    const habit: Habit = {
      id: crypto.randomUUID(), title: this.title, notes: this.notes, startDate: this.startDate, endDate: this.endDate, startTime: this.startTime, endTime: this.endTime,
      startTimeStamp: this.startDate && this.startTime ? new Date(`${this.startDate.toISOString().split('T')[0]}T${formattedStartTime}`).getTime() : 0,
      endTimeStamp: this.endDate && this.endTime ? new Date(`${this.endDate.toISOString().split('T')[0]}T${formattedEndTime}`).getTime() : 0,
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

    let payload: any;
    if (this.currentActive === 'tasks') payload = { task: { title: habit.title, tags, description: habit.notes, status: 'PENDING', coinReward: 5, isEveryday: !!habit.everyday, daysOfWeek, priority, routine }, startDate: formatDateStr(this.startDate), startTime: formattedStartTime || '', endDate: formatDateStr(this.endDate), endTime: formattedEndTime || '' };
    else if (this.currentActive === 'timetable') payload = { title: habit.title, notes: habit.notes || '', tags, everyday: !!habit.everyday, everyWeekend: false, daysOfWeek: this.everyday ? [] : daysOfWeek, startTime: formattedStartTime || '', endTime: formattedEndTime || '', startDate: formatDateStr(this.startDate) || '', endDate: formatDateStr(this.endDate) || '', priority };
    else payload = { habit: { title: habit.title, tags, description: habit.notes, priority, routine, status: 'PENDING', isEveryday: !!habit.everyday, daysOfWeek, coinReward: 5 }, startDate: formatDateStr(this.startDate), startTime: formattedStartTime || '', endDate: formatDateStr(this.endDate), endTime: formattedEndTime || '' };

    if (this.currentActive === 'tasks') {
      this.taskApi.createTask(payload).subscribe({ next: () => { this.habitService.addHabit(habit); this.modalCtrl.dismiss(); this.router.navigate(['/habit-page'], { state: { newHabit: habit, showSingleMode: true, initialTab: 'tasks' } }); }, error: (err) => { console.error('Failed to create task', err); alert('Failed to create task. Please try again.'); } });
    } else if (this.currentActive === 'timetable') {
      this.calendarApi.addCalendarEvent(payload).subscribe({ next: () => { this.habitService.addHabit(habit); this.modalCtrl.dismiss(); this.router.navigate(['/habit-page'], { state: { newHabit: habit, showSingleMode: true, initialTab: 'timetable' } }); }, error: (err) => { console.error('Failed to create calendar event', err); alert('Failed to create timetable. Please try again.'); } });
    } else {
      if (this.editingId) {
        this.habitApi.updateHabit(this.editingId, payload).subscribe({ next: () => { const updatedHabit: Habit = { id: this.editingId || habit.id, title: habit.title, notes: habit.notes, startDate: habit.startDate, endDate: habit.endDate, startTime: habit.startTime, endTime: habit.endTime, startTimeStamp: habit.startTimeStamp, endTimeStamp: habit.endTimeStamp, type: habit.type, isPrivate: habit.isPrivate, selectedRoutine: habit.selectedRoutine, routineTags: habit.routineTags, everyday: habit.everyday, selectedDays: habit.selectedDays, priority: habit.priority, routine: habit.routine, status: habit.status, createdAt: this.originalHabit?.createdAt ? new Date(this.originalHabit.createdAt) : new Date(), activities: habit.activities, tags: Array.isArray(this.selectedTags) ? this.selectedTags.map(t => t.value || t.key) : [] }; this.habitService.updateHabit(updatedHabit); this.modalCtrl.dismiss(); this.router.navigate(['/habit-page'], { state: { updatedHabit, showSingleMode: true } }); }, error: (err) => { console.error('Failed to update habit', err); alert('Failed to update habit. Please try again.'); } });
      } else {
        this.habitService.createHabit(payload).subscribe({ next: () => { this.habitService.addHabit(habit); this.modalCtrl.dismiss(); this.router.navigate(['/habit-page'], { state: { newHabit: habit, showSingleMode: true } }); }, error: (err) => { console.error('Failed to create habit', err); alert('Failed to create habit. Please try again.'); } });
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
    try {
      // HabitService.deleteHabit is sync (updates local subject)
      this.habitService.deleteHabit(this.editingId);
      try { this.modalCtrl.dismiss(); } catch { /* ignore if not modal */ }
      this.deletePopupVisible = false;
      this.router.navigate(['/habit-page'], { state: { deletedId: this.editingId } });
    } catch (e) {
      console.error('Failed to delete habit', e);
      alert('Failed to delete habit. Please try again.');
    } finally {
      this.deleting = false;
    }
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
