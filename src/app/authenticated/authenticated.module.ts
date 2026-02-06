import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthenticatedComponent } from "./authenticated.component";
import { AuthenticatedRoutingModule } from "./authenticated.routing.module";
import { FooterComponent } from "../core/components/footer/footer.component";
import { ActivityCardComponent } from "../core/components/activity-section/activity-card/activity-card.component";
import { LongPressDirective } from "../core/directives/gestureControlDirective";
import { MindfulButtonComponent } from "../core/components/mindful-button/mindful-button.component";
import { IonicModule } from "@ionic/angular";
import { MindfulBadgeComponent } from "../core/components/mindful-badge/mindful-badge.component";
import { UserDashboardComponent } from "./user-dashboard/user-dashboard.component";
import { MindfulInputsModule } from "../core/components/mindful-inputs/mindful-inputs.module";
import { MindfulTimelineComponent } from "../core/components/mindful-timeline/mindful-timeline.component";
import { ActivityTimelineComponent } from "../core/components/activity-section/activity-timeline/activity-timeline.component";
import { MindfulSelectorsComponent } from "../core/components/mindful-selectors/mindful-selectors.component";
import { MindfulNavigatorComponent } from "../core/components/mindful-navigator/mindful-navigator.component";
import { UserProfileComponent } from "../core/components/user-profile/user-profile.component";
import { SupermeTimerComponent } from '../core/components/superme-timer/superme-timer.component';
import { StreaksSectionComponent } from '../core/components/streaks-section/streaks-section.component';
import { CoinPurchaseComponent } from '../core/components/coin-section/coin-purchase/coin-purchase.component';

@NgModule({
  declarations: [
    AuthenticatedComponent,
    MindfulTimelineComponent,
    ActivityTimelineComponent
  ],
  exports: [
    MindfulTimelineComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    AuthenticatedRoutingModule,
    LongPressDirective,
    ActivityCardComponent,
    MindfulButtonComponent,
    MindfulBadgeComponent,
    UserDashboardComponent,
    IonicModule,
    MindfulInputsModule,
    MindfulSelectorsComponent,
    SupermeTimerComponent,
    StreaksSectionComponent,
    MindfulNavigatorComponent,
    CoinPurchaseComponent
  ]
})
export class AuthenticatedModule { }
