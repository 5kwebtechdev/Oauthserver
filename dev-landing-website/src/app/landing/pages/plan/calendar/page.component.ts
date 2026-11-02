import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Productivity Calendar"
    description="Your whole day, at a glance. See your habits, tasks, and time table all in one place so nothing slips through the cracks."
    visualSrc="assets/Landing/a3908ec3550a5fabd131fdab8cfb65681773fcf9.png"
    accentColor="#89b3b6"
    visualAspectRatio="752 / 588"
    badge=""
    preCTAText=""
    preCTAMobileText=""
  ></app-feature-wrapper>`,
})
export class CalendarPageComponent {}
