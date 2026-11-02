import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-task-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Task Manager"
    description="Your day, fully owned. Add your tasks, check them off one by one, and turn even the busiest days into productive wins."
    visualSrc="assets/Landing/22523bc33e99973191d775735225955a40d557f3.png"
    accentColor="#f6ac72"
    visualAspectRatio="752 / 403"
    badge=""
    preCTAText=""
    preCTAMobileText=""
    relatedHref="/productivity-calendar"
    relatedLabel="See tasks in the productivity calendar"
  ></app-feature-wrapper>`,
})
export class TaskPageComponent {}
