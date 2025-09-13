import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {AuthenticatedComponent} from "./authenticated.component";
import {AuthenticatedRoutingModule} from "./authenticated.routing.module";
import {FooterComponent} from "../core/components/footer/footer.component";
import {HabitCardComponent} from "../core/components/habit-section/habit-card/habit-card.component";
import {LongPressDirective} from "../core/directives/gestureControlDirective";
import {MindfulButtonComponent} from "../core/components/mindful-button/mindful-button.component";
import {IonicModule} from "@ionic/angular";
import {MindfulBadgeComponent} from "../core/components/mindful-badge/mindful-badge.component";
import {UserDashboardComponent} from "./user-dashboard/user-dashboard.component";
import {ChallengeCardComponent} from "../core/components/challenge-card/challenge-card.component";
import {TypicalPageComponent} from "../core/components/typical-page/typical-page.component";
import {ProfileComponent} from "./profile/profile.component";
import {ProfileHomeComponent} from "./profile/profile-home/profile-home.component";
import {MindfulInputsModule} from "../core/components/mindful-inputs/mindful-inputs.module";
import {MindfulTimelineComponent} from "../core/components/mindful-timeline/mindful-timeline.component";
import {TimelineComponent} from "../core/components/timeline/timeline.component";
import {MindfulSelectorsComponent} from "../core/components/mindful-selectors/mindful-selectors.component";
import {AddCalendarComponent} from "./add-calendar/add-calendar.component";

@NgModule({
  declarations: [
    AuthenticatedComponent,
    ProfileComponent,
    ProfileHomeComponent,
    MindfulTimelineComponent,
    TimelineComponent,
  // AddCalendarComponent is now standalone and imported where needed
  ],
  exports: [
  MindfulTimelineComponent
  ],
  imports: [
    CommonModule,
    AuthenticatedRoutingModule,
  LongPressDirective,
  HabitCardComponent,
  MindfulButtonComponent,
  MindfulBadgeComponent,
  TypicalPageComponent,
  ChallengeCardComponent,
  UserDashboardComponent,
  IonicModule,
  MindfulInputsModule,
  MindfulSelectorsComponent
  ]
})
export class AuthenticatedModule { }
