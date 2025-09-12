import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulSelectorsComponent } from '../../mindful-selectors/mindful-selectors.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { HabitService } from '../habit.service';
import { Habit } from '../habit.types';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'habit-input',
  templateUrl: './habit-input.component.html',
  styleUrls: ['./habit-input.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule, MindfulButtonComponent, MindfulInputsModule, MindfulSelectorsComponent, MindfulBadgeComponent, MindfulNavigatorComponent]
})
export class HabitInputComponent {
  title = '';
  notes = '';
  // start/end date and time for habit
  startDate: Date | null = null;
  endDate: Date | null = null;
  startTime: string = '';
  endTime: string = '';
  // track the currently active tab to reuse the same toggler behaviour as habit-card
  currentActive: 'habits' | 'tasks' | 'timetable' = 'habits';
  // header toggle state
  isPrivate: boolean = false;

  routineOptions = [
    { key: 'morning', value: 'Morning', type: 'morning' },
    { key: 'evening', value: 'Evening', type: 'evening' },
    { key: 'night', value: 'Night', type: 'night' }
  ];
  selectedRoutine = 'morning';

  // default tags for the tag selector used in the title row
  routineTags = [
    { key: 'exercise', value: 'Exercise', type: 'default' },
    { key: 'running', value: 'running', type: 'default' },
    { key: 'reading', value: 'reading', type: 'default' },
    { key: 'swimming', value: 'swimming', type: 'default' }
  ];

  everyday = false;
  weekdays = ['S','M','T','W','Th','F','Sa'];
  selectedDays = new Set<string>([]);

  priority: 'low' | 'medium' | 'high' = 'medium';

  // For timetable activities
  activities: { name: string; startTime: string; endTime: string }[] = [
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' },
    { name: '', startTime: '', endTime: '' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private habitService: HabitService,
    private router: Router
  ) {}

  submit() {
    if (!this.title.trim()) {
      alert('Title is required');
      return;
    }

    // Calculate timestamps
    let startTimeStamp = 0;
    let endTimeStamp = 0;
    if (this.startDate && this.startTime) {
      const startDateTime = new Date(`${this.startDate.toISOString().split('T')[0]}T${this.startTime}`);
      startTimeStamp = startDateTime.getTime();
    }
    if (this.endDate && this.endTime) {
      const endDateTime = new Date(`${this.endDate.toISOString().split('T')[0]}T${this.endTime}`);
      endTimeStamp = endDateTime.getTime();
    }

    const habit: Habit = {
      id: crypto.randomUUID(),
      title: this.title,
      notes: this.notes,
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: this.startTime,
      endTime: this.endTime,
      startTimeStamp,
      endTimeStamp,
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

    this.habitService.addHabit(habit);
    console.log('Habit created:', habit);
    
    // Navigate to habit-page with the new habit data
    this.modalCtrl.dismiss();
    this.router.navigate(['/habit-page'], { 
      state: { newHabit: habit, showSingleMode: true } 
    });
  }

  toggleDay(d: string) {
    if (this.selectedDays.has(d)) this.selectedDays.delete(d);
    else this.selectedDays.add(d);
  }

  selectPriority(p: 'low'|'medium'|'high'){
    this.priority = p;
  }

  addActivity() {
    this.activities.push({ name: '', startTime: '', endTime: '' });
  }

  onTagsChange(selectedIndices: number[]) {
    this.routineTags = selectedIndices.map(index => this.routineTags[index]).filter(tag => tag);
  }
}
