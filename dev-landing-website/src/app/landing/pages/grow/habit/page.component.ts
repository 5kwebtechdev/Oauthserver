import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-habit-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Habit Tracker"
    description="Small habits. Big rewards. Turn your daily habits into quests, earn coins with every completion, and watch your streak grow day by day."
    visualSrc="assets/Landing/3523b09bf448e9de4649729067ac45a0d0364d3e.png"
    accentColor="#8b8dcb"
    visualAspectRatio="752 / 403"
    badge=""
    preCTAText=""
    preCTAMobileText=""
    relatedHref="/routine-planner"
    relatedLabel="Plan your habits with the daily routine planner"
  ></app-feature-wrapper>`,
})
export class HabitPageComponent {}
