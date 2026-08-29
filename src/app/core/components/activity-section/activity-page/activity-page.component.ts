import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { ActivityPageContentComponent } from '../activity-page-content/activity-page-content.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { Router } from '@angular/router';
import { RefreshService } from '../../../services/refresh.service';

/**
 * Activity page wrapper component that provides navigation context
 * for the activity page content component.
 */
@Component({
  standalone: true,
  selector: 'activity-page',
  template: `<ion-content [class.planner-activity-page]="usesPlannerActivityDesign">
    <superme-navigator *ngIf="!usesPlannerActivityDesign" heading="Your Universe" [rightIcon]="'assets/Icons-Neutral/Icon-Calendar.png'"
        rightIconAlt="Calendar" (rightIconClick)="onOpenCalendar()" (back)="onBack()"></superme-navigator>

    <activity-page-content #habitContent (back)="onBack()"
      [style.padding]="usesPlannerActivityDesign ? '0' : '0 16px'"></activity-page-content>

    <button *ngIf="usesPlannerActivityDesign" type="button" class="child-activity-add" (click)="onAddHabit()"
      aria-label="Add planner activity">
      <img src="assets/figma/planner-daily/add.svg" alt="" />
    </button>

    <div *ngIf="!usesPlannerActivityDesign" class="habit-add-btn">
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

    @media (min-width: 768px) {
      :host-context(html:not(.plt-capacitor)) ion-content.planner-activity-page {
        --background: linear-gradient(135deg, #f5f1ff 0%, #fff8f1 47%, #eefafb 100%);
      }

      :host-context(html:not(.plt-capacitor)) .child-activity-add {
        right: max(32px, calc((100vw - 1180px) / 2 + 30px));
        bottom: 34px;
        border-radius: 22px;
        box-shadow: inset -1px -1px 2px #ebe6f5, 0 14px 30px rgba(67, 36, 119, .28);
        transition: transform 180ms ease, box-shadow 180ms ease;
      }

      :host-context(html:not(.plt-capacitor)) .child-activity-add:hover,
      :host-context(html:not(.plt-capacitor)) .child-activity-add:focus-visible {
        box-shadow: inset -1px -1px 2px #ebe6f5, 0 18px 34px rgba(67, 36, 119, .36);
        transform: translateY(-4px) rotate(3deg);
        outline: 3px solid rgba(115, 65, 167, .18);
        outline-offset: 3px;
      }
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
  private hasEnteredActivityPage = false;

  constructor(
    private router: Router,
    private refreshService: RefreshService
  ) { }

  /** The Figma Planner layout is shared; data selection remains in the content component. */
  get usesPlannerActivityDesign(): boolean {
    return this.habitContent?.isPlannerCalendarDesign ?? true;
  }

  ngOnInit(): void {
    // Register with global pull-to-refresh service
    this.refreshService.registerRefreshHandler('ActivityPage', () => this.onGlobalRefresh());
  }

  ngOnDestroy(): void {
    this.refreshService.unregisterRefreshHandler('ActivityPage');
  }

  ionViewDidEnter(): void {
    // The activity page is cached by Ionic. Refresh it when returning from the
    // add/edit planner flow so newly-created planner entries appear without a
    // manual page refresh. Its first load remains owned by the child component.
    if (this.hasEnteredActivityPage && this.habitContent) {
      void this.habitContent.refresh();
    }
    this.hasEnteredActivityPage = true;
  }

  onAddHabit(): void {
    // The Figma floating action is specifically “Add Planner”, independent of
    // the tab currently used to browse the day. Reuse the existing timetable
    // creation route rather than introducing a second Planner form.
    const currentTab = this.usesPlannerActivityDesign
      ? 'timetable'
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
