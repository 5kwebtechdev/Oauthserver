import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NavController, RefresherCustomEvent } from '@ionic/angular';
import { buttonStyles } from '../core/components/superme-button/button.types';
import { AuthService } from '../core/services/auth.service';
import { RefreshService } from '../core/services/refresh.service';
import { OnboardingStateService } from '../core/services/onboarding-state.service';

@Component({
  selector: 'app-authenticated',
  templateUrl: './authenticated.component.html',
  styleUrls: ['./authenticated.component.scss'],
  standalone: false,
})
export class AuthenticatedComponent implements OnInit {
  /**
   * The Figma website chrome belongs to the browser build only. Native
   * Android/iOS builds keep their existing mobile header and bottom tabs.
   */
  public readonly isWebBrowser = !Capacitor.isNativePlatform();
  public currentActive: any = 'habits';
  buttonStylesArray: buttonStyles[] = [
    'lavendar',
    'lavendar-transparent',
    'violet',
    'orange',
    'orange-transparent',
    'green',
    'magenta',
    'magenta-transparent',
    'mango',
    'plum',
    'red',
    'gold',
    'aqua',
    'coral',
  ];

  constructor(
    private authService: AuthService,
    private refreshService: RefreshService,
    private onboardingState: OnboardingStateService,
    private navCtrl: NavController,
  ) {}

  ngOnInit(): void {
    // Local user_data enables immediate startup. Refresh in the background so
    // the backend onboardingStep remains authoritative if it changed while
    // the app was closed.
    this.authService.refreshUserData().subscribe({
      next: () => {
        const user = this.authService.getUserData();
        const resume = this.onboardingState.getResumeNavigation(user);
        if (resume) {
          void this.navCtrl.navigateRoot(resume.url, {
            queryParams: resume.queryParams,
            animated: false,
          });
        } else if (this.onboardingState.getOnboardingStep(user) === 6) {
          this.onboardingState.clearRegistrationDraft();
        }
      },
    });
  }

  /**
   * Global pull-to-refresh handler.
   * 1. Validates / refreshes session via AuthService
   * 2. Delegates to every active page through RefreshService
   */
  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    console.log('[Authenticated] Global pull-to-refresh triggered');
    try {
      // Validate session & refresh user data from API
      await this.authService.refreshUserData().toPromise();

      // Trigger all registered page-level refresh handlers
      await this.refreshService.triggerRefresh();

      // Brief delay so the spinner is visible
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (error) {
      console.error('[Authenticated] Error during global refresh:', error);
    } finally {
      event.target.complete();
    }
  }

  protected readonly console = console;
}
