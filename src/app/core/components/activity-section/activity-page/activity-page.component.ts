import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { ActivityPageContentComponent } from '../activity-page-content/activity-page-content.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RefreshService } from '../../../services/refresh.service';

/**
 * Activity page wrapper component that provides navigation context
 * for the activity page content component.
 */
@Component({
  standalone: true,
  selector: 'activity-page',
  template: `<ion-content>
    <superme-navigator heading="Your Universe" [rightIcon]="'/assets/Icons-Neutral/Icon-Calendar.png'"
        rightIconAlt="Calendar" (rightIconClick)="onOpenCalendar()" (back)="onBack()"></superme-navigator>

    <activity-page-content #habitContent style="padding:0px 16px;"></activity-page-content>

    <div class="habit-add-btn">
      <superme-button
        type="add"
        [size]="'large'"
        text="Add"
        (click)="onAddHabit()"
        aria-label="Add habit">
      </superme-button>
    </div>

</ion-content>`,
    styles: [`
    .habit-add-btn {
      position: fixed;
      right: 16px;
      bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      z-index: 1000;
    }
  `],
  imports: [
    CommonModule,
    IonicModule,
    SupermeNavigatorComponent,
    ActivityPageContentComponent,
    SupermeButtonComponent
  ]
})
export class ActivityPageComponent implements OnInit, OnDestroy {
  @ViewChild('habitContent') habitContent!: ActivityPageContentComponent;

  constructor(
    private router: Router,
    private authService: AuthService,
    private refreshService: RefreshService
  ) { }

  ngOnInit(): void {
    // Register with global pull-to-refresh service
    this.refreshService.registerRefreshHandler('ActivityPage', () => this.onGlobalRefresh());
  }

  ngOnDestroy(): void {
    this.refreshService.unregisterRefreshHandler('ActivityPage');
  }

  onAddHabit(): void {
    const currentTab = this.habitContent?.currentMainTab ?? 'habits';
    const origin = this.router.url || '/authed/user-dashboard';
    this.router.navigate(['/authed/activity-input'], { state: { currentActive: currentTab, origin } }).catch(() => { });
  }

  /**
   * Navigate to activity calendar page
   */
  onOpenCalendar(): void {
    this.router.navigateByUrl('/authed/activity-calendar');
  }

  /**
   * Navigate back to user dashboard
   */
  onBack(): void {
    this.router.navigate(['/authed/user-dashboard']).catch(() => {
      this.router.navigateByUrl('/authed');
    });
  }

  /**
   * Called by the global RefreshService when the user pulls to refresh.
   * Session validation is already handled by the authenticated shell.
   */
  private async onGlobalRefresh(): Promise<void> {
    console.log('[ActivityPage] Global refresh triggered');
    if (this.habitContent) {
      await this.habitContent.refresh();
    }
  }
}