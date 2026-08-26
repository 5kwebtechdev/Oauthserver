import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type DayStreakStatus = 'completed' | 'missed' | 'pending' | 'neutral';

export interface DayStreak {
  label: string;
  status: DayStreakStatus;
}

@Component({
  selector: 'week-streak-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-streak-section.component.html',
  styleUrls: ['./week-streak-section.component.scss']
})
export class WeekStreakSectionComponent {
  @Input() title = 'Last 7-Day Streak';
  @Input() days: DayStreak[] = [];
  @Input() rewardCoins = 10;

  get completedDays(): number {
    return this.days.filter(day => day.status === 'completed').length;
  }

  get remainingDays(): number {
    return Math.max(0, 7 - this.completedDays);
  }
}
