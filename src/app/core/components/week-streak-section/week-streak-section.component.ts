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
  @Input() currentStreak: number | null = null;
  @Input() nextMilestoneDay: number | null = null;
  @Input() daysToNextMilestone: number | null = null;
  @Input() nextMilestoneCoins: number | null = null;

  get completedDays(): number {
    return this.days.filter(day => day.status === 'completed').length;
  }

  get remainingDays(): number {
    return Math.max(0, 7 - this.completedDays);
  }

  get milestoneCompletedLabel(): string {
    if (this.currentStreak != null && this.nextMilestoneDay != null) {
      return `${this.currentStreak}/${this.nextMilestoneDay} days completed`;
    }
    return `${this.completedDays}/7 days completed`;
  }

  get milestoneRewardLabel(): string {
    if (this.daysToNextMilestone != null && this.nextMilestoneCoins != null) {
      return `${this.daysToNextMilestone} more ${this.daysToNextMilestone === 1 ? 'day' : 'days'} to earn ${this.nextMilestoneCoins} coins`;
    }
    return `${this.remainingDays} more ${this.remainingDays === 1 ? 'day' : 'days'} to earn ${this.rewardCoins} coins`;
  }
}
