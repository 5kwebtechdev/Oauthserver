import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ActivityPageContentComponent } from '../activity-page-content/activity-page-content.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/**
 * Activity page wrapper component that provides navigation context
 * for the activity page content component.
 */
@Component({
  standalone: true,
  selector: 'activity-page',
  template: `<ion-content>
    <!-- Pull-to-refresh -->
    <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
      <ion-refresher-content
        pullingIcon="chevron-down-circle-outline"
        pullingText="Pull to refresh"
        refreshingSpinner="circles"
        refreshingText="Refreshing...">
      </ion-refresher-content>
    </ion-refresher>

    <mindful-navigator heading="Your Universe" [rightIcon]="'/assets/Icons-Neutral/Icon-Calendar.png'"
        rightIconAlt="Calendar" (rightIconClick)="onOpenCalendar()" (back)="onBack()"></mindful-navigator>

    <activity-page-content #habitContent style="padding:0px 16px;"></activity-page-content>

    <div class="habit-add-btn">
      <mindful-button
        type="add"
        [size]="'large'"
        text="Add"
        (click)="onAddHabit()"
        aria-label="Add habit">
      </mindful-button>
    </div>

</ion-content>`,
    styles: [`
    ion-refresher {
      --background: transparent;
    }
    ion-refresher-content {
      --color: #7471BA;
    }
    .habit-add-btn {
      position: fixed;
      right: 16px;
      bottom: 24px;
      z-index: 1000;
    }
  `],
  imports: [
    CommonModule,
    IonicModule,
    MindfulNavigatorComponent,
    ActivityPageContentComponent,
    MindfulButtonComponent
  ]
})
export class ActivityPageComponent {
  @ViewChild('habitContent') habitContent!: ActivityPageContentComponent;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  onAddHabit(): void {
    this.router.navigate(['/authed/activity-input']).catch(() => { });
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
   * Handle pull-to-refresh event
   * Validates session and refreshes habit/task data
   */
  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    console.log('[HabitPage] Pull to refresh triggered');
    
    try {
      // Validate session and refresh user data
      await this.authService.refreshUserData().toPromise();
      
      // Refresh activity content
      if (this.habitContent) {
        await this.habitContent.refresh();
      }
      
      // Wait a bit to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('[HabitPage] Error during refresh:', error);
    } finally {
      event.target.complete();
    }
  }
}