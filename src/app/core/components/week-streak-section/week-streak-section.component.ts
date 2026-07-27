import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DayStreakStatus = 'completed' | 'missed' | 'pending';

export interface DayStreak {
  /** Short day label shown above the marker, e.g. 'S', 'M', 'Th' */
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

  // TODO: hardcoded for now — replace with the weekly streak API response once available.
  @Input() days: DayStreak[] = [
    { label: 'S', status: 'completed' },
    { label: 'M', status: 'completed' },
    { label: 'T', status: 'missed' },
    { label: 'W', status: 'completed' },
    { label: 'Th', status: 'completed' },
    { label: 'F', status: 'missed' },
    { label: 'Sa', status: 'pending' }
  ];
}
