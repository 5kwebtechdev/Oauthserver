import { Component, OnInit } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { buttonStyles } from "../core/components/superme-button/button.types";
import { AuthService } from '../core/services/auth.service';
import { RefreshService } from '../core/services/refresh.service';

@Component({
  selector: 'app-authenticated',
  templateUrl: './authenticated.component.html',
  styleUrls: ['./authenticated.component.scss'],
  standalone: false
})
export class AuthenticatedComponent implements OnInit {
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
    private refreshService: RefreshService
  ) {}

  ngOnInit() {}

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
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (error) {
      console.error('[Authenticated] Error during global refresh:', error);
    } finally {
      event.target.complete();
    }
  }

  protected readonly console = console;
}
