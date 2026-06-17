import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthenticatedComponent } from "./authenticated.component";
import { AuthenticatedRoutingModule } from "./authenticated.routing.module";
import { FooterComponent } from "../core/components/footer/footer.component";
import { ActivityCardComponent } from "../core/components/activity-section/activity-card/activity-card.component";
import { LongPressDirective } from "../core/directives/gestureControlDirective";
import { SupermeButtonComponent } from "../core/components/superme-button/superme-button.component";
import { IonicModule } from "@ionic/angular";
import { SupermeBadgeComponent } from "../core/components/superme-badge/superme-badge.component";
import { UserDashboardComponent } from "./user-dashboard/user-dashboard.component";
import { SupermeInputsModule } from "../core/components/superme-inputs/superme-inputs.module";
import { SupermeTimelineComponent } from "../core/components/superme-timeline/superme-timeline.component";
import { ActivityTimelineComponent } from "../core/components/activity-section/activity-timeline/activity-timeline.component";
import { SupermeSelectorsComponent } from "../core/components/superme-selectors/superme-selectors.component";
import { SupermeNavigatorComponent } from "../core/components/superme-navigator/superme-navigator.component";
import { UserProfileComponent } from "../core/components/user-profile/user-profile.component";
import { SupermeTimerComponent } from '../core/components/superme-timer/superme-timer.component';
import { StreaksSectionComponent } from '../core/components/streaks-section/streaks-section.component';
import { CoinPurchaseComponent } from '../core/components/coin-section/coin-purchase/coin-purchase.component';

@NgModule({
  declarations: [
    AuthenticatedComponent,
    SupermeTimelineComponent,
    ActivityTimelineComponent
  ],
  exports: [
    SupermeTimelineComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    AuthenticatedRoutingModule,
    LongPressDirective,
    ActivityCardComponent,
    SupermeButtonComponent,
    SupermeBadgeComponent,
    UserDashboardComponent,
    IonicModule,
    SupermeInputsModule,
    SupermeSelectorsComponent,
    SupermeTimerComponent,
    StreaksSectionComponent,
    SupermeNavigatorComponent,
    CoinPurchaseComponent,
    FooterComponent
  ]
})
export class AuthenticatedModule { }
