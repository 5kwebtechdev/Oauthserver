import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { HabitPageContentComponent } from '../habit-page-content/habit-page-content.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/**
 * Habit page wrapper component that provides navigation context
 * for the habit page content component.
 */
@Component({
  standalone: true,
  selector: 'habit-page',
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

    <habit-page-content #habitContent style="padding:0px 16px;"></habit-page-content>
</ion-content>`,
  styles: [`
    ion-refresher {
      --background: transparent;
    }
    ion-refresher-content {
      --color: #7471BA;
    }
  `],
  imports: [
    CommonModule,
    IonicModule,
    MindfulNavigatorComponent,
    HabitPageContentComponent
  ]
})
export class HabitPageComponent {
  @ViewChild('habitContent') habitContent!: HabitPageContentComponent;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  /**
   * Navigate to calendar main page
   */
  onOpenCalendar(): void {
    this.router.navigateByUrl('/authed/calendar-main');
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
      
      // Refresh habit content
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