
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Routing
import { ActivitySectionRoutingModule } from './activity-section-routing.module';

// Components
import { ActivityPageComponent } from './activity-page/activity-page.component';
import { ActivityDetailComponent } from './activity-detail/activity-detail.component';
import { ActivityTimelineComponent } from './activity-timeline/activity-timeline.component';
import { ActivityCardComponent } from './activity-card/activity-card.component';
import { ActivityCalendarComponent } from './activity-calendar/activity-calendar.component';
import { ActivityDashboardComponent } from './activity-dashboard/activity-dashboard.component';
import { SupermeButtonComponent } from '../../components/superme-button/superme-button.component';
import { SupermeInputsModule } from '../../components/superme-inputs/superme-inputs.module';
import { SupermeSelectorsComponent } from '../../components/superme-selectors/superme-selectors.component';
import { ActivityInputComponent } from './activity-input/activity-input.component';

// Services
import { ActivityService } from './activity.service';

@NgModule({
  declarations: [
    // Only non-standalone components must be declared
    ActivityTimelineComponent,
    // NOTE: `SupermeTimelineComponent` was merged into `TimelineComponent` and removed
  ],
  exports: [
    // export TimelineComponent so other standalone pages (like Home) can use its selector
    ActivityTimelineComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ActivitySectionRoutingModule,
    // Import standalone components used in templates
    // Note: Standalone components are imported directly in components that use them
    // ActivityDetailComponent,
    // ActivityCardComponent,
    // ActivityCalendarComponent,
    // ActivityDashboardComponent,
    // selectors used inside TimelineComponent template
    SupermeSelectorsComponent,

    // Import module that exports input building blocks (week, completion, etc.)
    SupermeInputsModule,

    // Core standalone building blocks used by TimelineComponent template
    SupermeButtonComponent,
    ActivityInputComponent
  ],
  providers: [
    // ActivityService is providedIn: 'root'
  ]
})
export class ActivitySectionModule { }