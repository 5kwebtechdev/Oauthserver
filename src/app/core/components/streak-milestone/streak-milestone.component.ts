import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy } from '@angular/core';
import { streakMilestoneWindow } from './streak-milestones';

@Component({
  selector: 'app-streak-milestone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './streak-milestone.component.html',
  styleUrls: ['./streak-milestone.component.scss'],
})
export class StreakMilestoneComponent implements OnChanges, OnDestroy {
  @Input() days = 0;
  @Input() celebrateProgress = false;
  @Input() restoreMode = false;
  @Input() restoreCost = 5;
  @Input() restoreDisabled = false;
  @Input() restoring = false;
  @Input() notice = '';
  @Output() continue = new EventEmitter<void>();
  @Output() restore = new EventEmitter<void>();
  readonly assets = 'assets/figma/streak-milestones/';
  displayedDays = 0;
  celebrating = false;
  private lastDays: number | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  get milestones() { return streakMilestoneWindow(this.displayedDays); }

  ngOnChanges(): void {
    const next = streakMilestoneWindow(Number(this.days)).completedDays;
    if (next === this.lastDays && !this.restoreMode) return;
    this.clearTimers();
    this.celebrating = false;
    const previous = this.lastDays ?? Math.max(0, next - 1);
    this.lastDays = next;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.celebrateProgress || this.restoreMode || next <= previous || reduced) {
      this.displayedDays = next;
      return;
    }
    this.displayedDays = previous;
    this.timers.push(setTimeout(() => {
      this.displayedDays = next;
      this.celebrating = true;
      this.timers.push(setTimeout(() => { this.celebrating = false; }, 1600));
    }, 450));
  }

  private clearTimers(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
  }

  ngOnDestroy(): void { this.clearTimers(); }
}
