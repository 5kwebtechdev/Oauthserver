import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event } from '@angular/router';
import { Subscription } from 'rxjs';
import { PetAgeService } from './core/services/pet-age.service';
import { LoadingService } from './core/services/loading.service';
import { NavigationService } from './core/services/navigation.service';
import { BadgeSocketService, BadgePopupData } from './core/services/badge-socket.service';
import { BadgeApi } from './core/api/badge.api';
import { AuthApi } from './core/api/auth.api';
import { UserService } from './core/services/user.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  loading = false;
  private _navToken?: string;
  private badgeSubscription?: Subscription;

  // Badge popup state (global popup shown from any screen)
  showBadgePopup = false;
  currentBadge?: BadgePopupData;
  private badgePopupQueue: BadgePopupData[] = [];

  constructor(
    private platform: Platform,
    private router: Router,
    private petAgeService: PetAgeService,
    private loadingService: LoadingService,
    private navigation: NavigationService,
    private badgeSocketService: BadgeSocketService,
    private badgeApi: BadgeApi,
    private authApi: AuthApi,
    private userService: UserService,
  ) { }

  ngOnInit() {
    // Track app open for pet age progression
    this.recordDailyAppOpen();

    // Initialize WebSocket connection for real-time badge notifications
    this.initializeBadgeWebSocket();

    // Handle hardware back button on mobile devices
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.navigation.back();
    })

    // show loading on navigation using LoadingService to centralize behaviour
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        // start nav loader (returns token)
        this._navToken = this.loadingService.show(undefined, { delayMs: 80, minVisibleMs: 120 });
        this.loading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        // hide nav loader immediately
        if (this._navToken) {
          this.loadingService.hide(this._navToken);
          this._navToken = undefined;
        }

        // Wait a bit longer to respect minVisibleMs, then hide the loading indicator
        setTimeout(() => {
          this.loading = false;
        }, 150);

        // Extra safety: if navigation failed, ensure loader is reset
        if (event instanceof NavigationError) {
          console.warn('[AppComponent] Navigation error detected, ensuring loader is reset');
          setTimeout(() => this.loadingService.reset(), 300);
        }
      }
    });
  }

  /**
   * Record daily app open to track pet age progression and streaks
   */
  private recordDailyAppOpen(): void {
    const result = this.petAgeService.recordAppOpen();
    const petData = this.petAgeService.getCurrentPetData();

    // Check if pet aged up today
    if (result.ageIncreased && result.newAge) {
      console.log(`🎉 Your pet grew to Age ${result.newAge}! You earned ${result.coinsEarned} coins!`);
      // TODO: Show age-up notification/animation to user
      // You can emit an event or show a toast/modal here
    } else if (result.coinsEarned > 0) {
      console.log(`🔥 Day ${petData.currentStreak} streak! Earned ${result.coinsEarned} coins!`);
    }
  }

  ngOnDestroy(): void {
    this.badgeSubscription?.unsubscribe();
    this.badgeSocketService.disconnect();
  }

  /**
   * Initialize WebSocket connection for real-time badge notifications
   */
  private initializeBadgeWebSocket(): void {
    // Only connect if a real user token exists (do not use environment fallback)
    const userToken = localStorage.getItem('auth_token');
    if (!userToken) {
      console.log('[AppComponent] No user auth token in localStorage, skipping badge WebSocket initialization');
      return;
    }

    // Safely initialize WebSocket with timeout and error boundary
    // Prevents WebSocket connection issues from blocking System UI
    try {
      // Connect to WebSocket with a safety timeout
      const connectionTimeout = setTimeout(() => {
        console.warn('[AppComponent] Badge WebSocket connection timeout - disconnecting to prevent ANR');
        this.badgeSocketService.disconnect();
      }, 8000); // 8 second timeout for WebSocket to establish

      // Connect to WebSocket
      this.badgeSocketService.connect();

      // Subscribe to badge notifications for global popup
      this.badgeSubscription = this.badgeSocketService.onBadgeReceived().subscribe(
        (badge: BadgePopupData) => {
          clearTimeout(connectionTimeout);
          console.log('[AppComponent] Received badge notification:', badge);
          this.showBadgeNotification(badge);
        },
        (error) => {
          console.error('[AppComponent] Badge WebSocket error:', error);
          clearTimeout(connectionTimeout);
          // Silently fail - don't crash the app for badge notifications
        }
      );

      // Clear timeout if connection succeeds
      setTimeout(() => clearTimeout(connectionTimeout), 8000);

      // Check for any pending badge popups that were missed while offline
      const profile = this.userService.getUserProfile();
      if (userToken && profile && (profile.relationship === 'CHILD' || profile.relationship === 'SELF')) {
        this.checkPendingBadgePopups();
      } else {
        console.log('[AppComponent] Skipping pending badge popups for non-child/self account or missing user token');
      }
    } catch (error) {
      console.error('[AppComponent] Failed to initialize badge WebSocket:', error);
      // Silently fail - don't crash the app for badge notifications
    }
  }

  /**
   * Check for pending badge popups from API
   */
  private checkPendingBadgePopups(): void {
    this.badgeApi.getPendingPopups().subscribe({
      next: (response: any) => {
        console.log('[AppComponent] Pending popups response:', response);
        // Handle array of pending badges or single badge
        const pendingBadges = Array.isArray(response) ? response : (response?.badges || []);
        
        pendingBadges.forEach((badge: any) => {
          if (badge && (badge.badgeId || badge.id)) {
            const badgeData: BadgePopupData = {
              badgeId: badge.badgeId || badge.id,
              title: badge.title || badge.name || 'Badge Earned',
              name: badge.name || badge.title || 'Badge Earned',
              levelText: badge.levelText || '',
              description: badge.description || '',
              achievementText: badge.achievementText || '',
              iconUrl: badge.iconUrl || badge.icon || 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
              celebrationTitle: badge.celebrationTitle || 'Badge Unlocked!',
              celebrationMessage: badge.celebrationMessage || `You earned a badge!`,
              shareMessage: badge.shareMessage || 'I earned a badge on SuperMe! 🚀',
              currentLevel: badge.currentLevel || 1,
              totalLevels: badge.totalLevels || 1,
              isMaxLevel: badge.isMaxLevel || false
            };
            this.badgeSocketService.enqueueBadge(badgeData);
          }
        });
      },
      error: (error) => {
        console.error('[AppComponent] Failed to fetch pending badge popups:', error);
      }
    });
  }

  /**
   * Show badge notification popup
   */
  private showBadgeNotification(badge: BadgePopupData): void {
    this.currentBadge = badge;
    this.showBadgePopup = true;
  }

  /**
   * Handle badge popup close
   */
  onBadgePopupClose(): void {
    if (this.currentBadge) {
      // Acknowledge the badge popup to backend
      this.badgeApi.acknowledgeBadgePopup(this.currentBadge.badgeId).subscribe({
        next: () => {
          console.log('[AppComponent] Badge popup acknowledged:', this.currentBadge?.badgeId);
        },
        error: (error) => {
          console.error('[AppComponent] Failed to acknowledge badge popup:', error);
        }
      });
    }

    this.showBadgePopup = false;
    this.currentBadge = undefined;

    // Notify socket service to show next badge in queue
    this.badgeSocketService.popupClosed();
  }

  /**
   * Handle "View all Badges" click
   */
  onViewAllBadges(): void {
    this.onBadgePopupClose();
    this.router.navigate(['/authenticated/badges']);
  }

  /**
   * Handle "Awesome" click
   */
  onAwesomeClick(): void {
    this.onBadgePopupClose();
  }
}
