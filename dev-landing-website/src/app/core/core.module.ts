import { NgModule } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer/footer.component';
import { LogoComponent } from './components/logo';
import { SupermeHomeHeaderComponent } from './components/superme-home-header';
import { ChildSafetyCardComponent } from './pages/footer-pages/child-safety-page/child-safety-card/child-safety-card.component';
// Expose activity dashboard so pages that import CoreModule can use it in templates
import { ActivityDashboardComponent } from './pages/activity-section/activity-dashboard/activity-dashboard.component';

@NgModule({
  // Standalone components are not declared; they are imported and re-exported
  declarations: [],
  imports: [
    CommonModule,
    FooterComponent,
    PublicNavbarComponent,
    LogoComponent,
    SupermeHomeHeaderComponent,
    ActivityDashboardComponent,
    ChildSafetyCardComponent
  ],
  exports: [
    FooterComponent,
    PublicNavbarComponent,
    LogoComponent,
    SupermeHomeHeaderComponent,
    ActivityDashboardComponent,
    ChildSafetyCardComponent
  ]
})
export class CoreModule { }
