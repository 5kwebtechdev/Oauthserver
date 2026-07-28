import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type DayStreakStatus = 'completed' | 'missed' | 'pending';

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
  @Input() title = "Current Week's Streak";
  @Input() days: DayStreak[] = [];
}
