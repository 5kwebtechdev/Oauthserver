import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulSelectorsComponent } from '../../mindful-selectors/mindful-selectors.component';
import { MindfulTagsComponent } from '../../mindful-selectors/mindful-tags/mindful-tags.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { HabitService } from '../habit.service';
import { TaskApi } from '../../../api/task.api';
import { Habit } from '../habit.types';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'habit-input',
  templateUrl: './habit-input.component.html',
  styleUrls: ['./habit-input.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule, MindfulButtonComponent, MindfulInputsModule, MindfulSelectorsComponent, MindfulTagsComponent, MindfulBadgeComponent, MindfulNavigatorComponent]
})
export class HabitInputComponent {
  title = '';
  notes = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  startTime: string = '';
  endTime: string = '';
  currentActive: 'habits' | 'tasks' | 'timetable' = 'habits';
  isPrivate: boolean = false;
  addingTag: boolean = false;
  addingValue: string = '';
  addPosition: { left: number; top: number } | null = null;
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
    { key: '8', value: 'Personal', type: 'habit-input' },
  ];

  everyday = false;
  weekdays = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  selectedDays = new Set<string>([]);

  priority: 'low' | 'medium' | 'high' = 'high';

  // For timetable activities
  activities: { name: string; startTime: string; endTime: string }[] = [
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private habitService: HabitService,
    private router: Router,
    private taskApi: TaskApi
  ) { }

  get isFormComplete(): boolean {
    // required fields: title, startDate, startTime, endDate, endTime, and at least one day selected or everyday
    if (!this.title || !this.title.trim()) return false;
    if (!this.startDate) return false;
    if (!this.endDate) return false;
    if (!this.startTime || !this.startTime.trim()) return false;
    if (!this.endTime || !this.endTime.trim()) return false;
    if (this.everyday) return true;
    if (this.selectedDays && this.selectedDays.size > 0) return true;
    return false;
  }

  // tag events from the new MindfulTags component
  onTagAdd(event: any) {
    // event contains { key, value }
    if (event && event.key && event.value) {
      this.routineTags.push({ key: event.key.toString(), value: event.value, type: 'habit-input' });
    }
  }

  onTagEdit(event: any) {
    // event contains { key, value }
    if (event && event.key) {
      const idx = this.routineTags.findIndex(t => t.key === event.key.toString());
      if (idx > -1) this.routineTags[idx].value = event.value;
    }
  }

  onTagDelete(key: any) {
    if (key == null) return;
    this.routineTags = this.routineTags.filter(t => t.key !== key.toString());
  }

  submit() {
    if (!this.title.trim()) {
      alert('Title is required');
      return;
    }

    // compute timestamps and format dates/times for API
    let startDateEpoch = 0;
    let endDateEpoch = 0;
    if (this.startDate) {
      const y = this.startDate.getFullYear();
      const m = this.startDate.getMonth();
      const d = this.startDate.getDate();
      // epoch millis for date at 00:00 UTC
      startDateEpoch = Date.UTC(y, m, d);
    }
    if (this.endDate) {
      const y = this.endDate.getFullYear();
      const m = this.endDate.getMonth();
      const d = this.endDate.getDate();
      endDateEpoch = Date.UTC(y, m, d);
    }

    // Helper: convert time strings like "10:00 AM" or "07:00" -> "HH:MM" (24-hour)
    const to24Hour = (t: string) => {
      if (!t) return '';
      const trimmed = t.trim();
      // if already in HH:MM 24-hour
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
        const parts = trimmed.split(':');
        const hh = Number(parts[0]);
        const mm = parts[1].padStart(2, '0');
        return `${hh.toString().padStart(2, '0')}:${mm}`;
      }
      // AM/PM format
      const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (m) {
        let hh = parseInt(m[1], 10);
        const mm = m[2];
        const ampm = m[3].toUpperCase();
        if (ampm === 'PM' && hh !== 12) hh += 12;
        if (ampm === 'AM' && hh === 12) hh = 0;
        return `${hh.toString().padStart(2, '0')}:${mm}`;
      }
      return trimmed;
    };

    const formattedStartTime = to24Hour(this.startTime || '');
    const formattedEndTime = to24Hour(this.endTime || '');

    const habit: Habit = {
      id: crypto.randomUUID(),
      title: this.title,
      notes: this.notes,
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: this.startTime,
      endTime: this.endTime,
      // keep old stamps if needed locally
      startTimeStamp: this.startDate && this.startTime ? new Date(`${this.startDate.toISOString().split('T')[0]}T${formattedStartTime}`).getTime() : 0,
      endTimeStamp: this.endDate && this.endTime ? new Date(`${this.endDate.toISOString().split('T')[0]}T${formattedEndTime}`).getTime() : 0,
      type: this.currentActive,
      isPrivate: this.isPrivate,
      selectedRoutine: this.selectedRoutine,
      routineTags: this.routineTags,
      everyday: this.everyday,
      selectedDays: Array.from(this.selectedDays),
      priority: this.priority,
      createdAt: new Date(),
      activities: this.currentActive === 'timetable' ? this.activities.filter(a => a.name.trim()) : undefined
    };

    // map short day labels to full uppercase names
    const dayMap: any = {
      'S': 'SUNDAY',
      'M': 'MONDAY',
      'T': 'TUESDAY',
      'W': 'WEDNESDAY',
      'Th': 'THURSDAY',
      'F': 'FRIDAY',
      'Sa': 'SATURDAY'
    };

    const selectedShortDays = Array.from(this.selectedDays);
    let daysOfWeek: string[] = selectedShortDays.map(d => dayMap[d] || d.toString().toUpperCase());
    if (this.everyday) {
      daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    }

    // Build API payload depending on selected tab (habits | tasks | timetable)
    let payload: any;

    // Helper to format Date -> YYYY-MM-DD
    const formatDateStr = (d: Date | null) => {
      if (!d) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Build tag names array from selectedTags (fallback empty)
    const tags = Array.isArray(this.selectedTags) && this.selectedTags.length > 0 ? this.selectedTags.map(t => t.value || t.key) : [];

    // Ensure priority and routine defaults
    const priority = (habit.priority || 'medium').toString().toUpperCase();
    const routine = ((habit.selectedRoutine || this.selectedRoutine) || 'MORNING').toString().toUpperCase();

    if (this.currentActive === 'tasks') {
      // Task payload as requested: inner `task` object + top-level date/time strings
      payload = {
        task: {
          title: habit.title,
          tags: tags,
          description: habit.notes,
          status: 'PENDING',
          coinReward: 5,
          isEveryday: !!habit.everyday,
          isEveryWeekend: false,
          daysOfWeek: daysOfWeek,
          priority: priority,
          routine: routine
        },
        startDate: formatDateStr(this.startDate),
        startTime: formattedStartTime || '',
        endDate: formatDateStr(this.endDate),
        endTime: formattedEndTime || ''
      };
    } else if (this.currentActive === 'timetable') {
      // Habit/timetable payload: inner `habit` object + top-level date/time strings
      payload = {
        habit: {
          title: habit.title,
          tags: tags,
          description: habit.notes,
          priority: priority,
          routine: routine,
          isEveryday: !!habit.everyday,
          isEveryWeekend: false,
          daysOfWeek: daysOfWeek,
          activities: habit.activities || [],
          coinReward: 5
        },
        startDate: formatDateStr(this.startDate),
        startTime: formattedStartTime || '',
        endDate: formatDateStr(this.endDate),
        endTime: formattedEndTime || ''
      };
    } else {
      // Default: habit payload (existing behaviour) but with requested structure
      payload = {
        habit: {
          title: habit.title,
          tags: tags,
          description: habit.notes,
          priority: priority,
          routine: routine,
          status: 'PENDING',
          isEveryday: !!habit.everyday,
          isEveryWeekend: false,
          daysOfWeek: daysOfWeek,
          coinReward: 5
        },
        startDate: formatDateStr(this.startDate),
        startTime: formattedStartTime || '',
        endDate: formatDateStr(this.endDate),
        endTime: formattedEndTime || ''
      };
    }

    // Use TaskApi for tasks, HabitApi for habits/timetable
    if (this.currentActive === 'tasks') {
      this.taskApi.createTask(payload).subscribe({
        next: (res) => {
          console.log('Task API created:', res);
          // add to local store so UI updates immediately
          this.habitService.addHabit(habit);
          this.modalCtrl.dismiss();
          this.router.navigate(['/habit-page'], {
            state: { newHabit: habit, showSingleMode: true, initialTab: 'tasks' }
          });
        },
        error: (err) => {
          console.error('Failed to create task', err);
          alert('Failed to create task. Please try again.');
        }
      });
    } else {
      this.habitService.createHabit(payload).subscribe({
        next: (res) => {
          console.log('API created:', res);
          // update local store for habits/timetable
          this.habitService.addHabit(habit);
          this.modalCtrl.dismiss();
          // navigate to habit page by default
          this.router.navigate(['/habit-page'], {
            state: { newHabit: habit, showSingleMode: true }
          });
        },
        error: (err) => {
          console.error('Failed to create item', err);
          alert('Failed to create. Please try again.');
        }
      });
    }
  }

  toggleDay(d: string) {
    if (this.selectedDays.has(d)) {
      this.selectedDays.delete(d);
      if (this.everyday) this.everyday = false;
    } else {
      this.selectedDays.add(d);
      if (this.selectedDays.size === this.weekdays.length) this.everyday = true;
    }
  }

  onEverydayChange(event: any) {
    const checked = !!(event?.detail?.checked ?? event === true);
    this.everyday = checked;
    if (this.everyday) {
      this.weekdays.forEach(d => this.selectedDays.add(d));
    } else {
      this.selectedDays.clear();
    }
  }

  selectPriority(p: 'low' | 'medium' | 'high') {
    this.priority = p;
  }

  addActivity() {
    this.activities.push({ name: '', startTime: '', endTime: '' });
  }

  onTagsChange(payload: any) {
    // Avoid mutating `routineTags`. Store selected items separately.
    // Support payload shapes: indices (numbers), keys (strings), or full option objects.
    if (!Array.isArray(payload)) {
      this.selectedTags = [];
      return;
    }

    if (payload.length === 0) {
      this.selectedTags = [];
      return;
    }

    const first = payload[0];
    if (typeof first === 'number') {
      // payload are indices into routineTags
      this.selectedTags = (payload as number[]).map(i => this.routineTags[i]).filter(Boolean);
    } else if (typeof first === 'string') {
      // payload are keys
      this.selectedTags = this.routineTags.filter(tag => (payload as string[]).includes(tag.key));
    } else if (typeof first === 'object') {
      // payload are full option objects
      this.selectedTags = payload as any[];
    } else {
      this.selectedTags = [];
    }

    // Do NOT overwrite selectedRoutine from tag selections; tags are independent.
  }
}
