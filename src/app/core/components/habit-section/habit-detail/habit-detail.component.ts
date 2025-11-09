import { Component, Input } from '@angular/core';
import { Habit } from '../habit.types';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { HabitApi } from 'src/app/core/api/habit.api';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulCoinsStatsComponent } from '../../mindful-coins-stats/mindful-coins-stats.component';
import { MindfulCalendarComponent } from '../../mindful-inputs/mindful-calendar/mindful-calendar.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';

@Component({
  standalone: true,

  selector: 'habit-detail',
  templateUrl: './habit-detail.component.html',
  styleUrls: ['./habit-detail.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, MindfulCoinsStatsComponent, MindfulCalendarComponent, MindfulButtonComponent, MindfulInputsModule, MindfulBadgeComponent]
})
export class HabitDetailComponent {
  public title: string = 'Habit Details';

  @Input()
  public habit: Habit | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private HabitApi: HabitApi
  ) { }

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    const stateHabit = nav?.extras?.state?.['habit'];

    if (stateHabit) {
      this.habit = stateHabit;
      console.log('Loaded habit from navigation state:', this.habit);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        console.log('Loading habit by id from URL:', id);
        this.loadHabitDetail(+id);
      } else {
        console.warn('No habit data found in navigation or params');
      }
    }
  }

  /** Fetch habit detail from API */
  loadHabitDetail(id: number) {
    this.HabitApi.getHabitById(id).subscribe({
      next: (res) => {
        this.habit = res;
        console.log('Fetched habit detail:', this.habit);
      },
      error: (err) => {
        console.error('Error loading habit detail:', err);
      }
    });
  }

  get shortDaysOfWeek(): string {
    const days = this.habit?.daysOfWeek || [];

    // 1️⃣ If everyday flag true
    if (this.habit?.everyday) {
      return 'Everyday';
    }

    // 2️⃣ If everyWeekend flag true
    if (this.habit?.everyWeekend) {
      return 'Sat, Sun';
    }

    // 3️⃣ If all 7 days selected
    if (days.length === 7) {
      return 'Everyday';
    }

    // 4️⃣ Default: show comma-separated short forms
    if (days.length > 0) {
      return days.map((d: string) => d.substring(0, 3).charAt(0).toUpperCase() + d.substring(1, 3).toLowerCase())
        .join(', ');
    }

    // 5️⃣ Fallback if no data
    return '—';
  }

  onEdit() {
    // TODO: wire editing flow (open habit-input modal or navigate to edit page)
    console.log('Edit action triggered for habit detail');
  }
}
