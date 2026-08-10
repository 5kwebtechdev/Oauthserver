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
  template: `<ion-content [class.child-activity-page]="isChildActivityRole">
    <superme-navigator *ngIf="!isChildActivityRole" heading="Your Universe" [rightIcon]="'assets/Icons-Neutral/Icon-Calendar.png'"
        rightIconAlt="Calendar" (rightIconClick)="onOpenCalendar()" (back)="onBack()"></superme-navigator>

    <activity-page-content #habitContent (back)="onBack()"
      [style.padding]="isChildActivityRole ? '0' : '0 16px'"></activity-page-content>

    <button *ngIf="isChildActivityRole" type="button" class="child-activity-add" (click)="onAddHabit()"
      aria-label="Add activity">
      <img src="assets/figma/child-activity/add.svg" alt="" />
    </button>

    <div *ngIf="!isChildActivityRole" class="habit-add-btn">
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

    .child-activity-add {
      align-items: center;
      appearance: none;
      background: radial-gradient(circle at 50% 0%, #7341A7 0%, #5B338F 49%, #432477 98%);
      border: 1px solid #432477;
      border-radius: 20px;
      bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      box-shadow: inset -1px -1px 2px #ebe6f5;
      cursor: pointer;
      display: inline-flex;
      height: 64px;
      justify-content: center;
      padding: 13px;
      position: fixed;
      right: 16px;
      width: 64px;
      z-index: 1000;
      -webkit-tap-highlight-color: transparent;
    }

    .child-activity-add:active { transform: scale(.96); }
    .child-activity-add img { height: 24px; width: 24px; }
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

  get isChildActivityRole(): boolean {
    return String(this.authService.getUserRelationship() || '').toUpperCase() === 'CHILD';
  }

  ngOnInit(): void {
    // Register with global pull-to-refresh service
    this.refreshService.registerRefreshHandler('ActivityPage', () => this.onGlobalRefresh());
  }

  ngOnDestroy(): void {
    this.refreshService.unregisterRefreshHandler('ActivityPage');
  }

  onAddHabit(): void {
    // Keep the create form aligned with the visible tab. The child calendar's
    // Planner tab maps to the activity-input timetable/planner form.
    const selectedChildTab = this.habitContent?.childCalendarTab;
    const currentTab = this.isChildActivityRole && selectedChildTab
      ? ({ task: 'tasks', planner: 'timetable', habit: 'habits', all: 'habits' } as const)[selectedChildTab]
      : (this.habitContent?.currentMainTab ?? 'habits');
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
