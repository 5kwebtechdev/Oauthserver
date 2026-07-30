import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event as RouterEvent } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { PetAgeService } from './core/services/pet-age.service';
import { LoadingService } from './core/services/loading.service';
import { NavigationService } from './core/services/navigation.service';
import { BadgeSocketService, BadgePopupData } from './core/services/badge-socket.service';
import { BadgePopupService } from './core/services/badge-popup.service';
import { BadgeApi } from './core/api/badge.api';
import { AuthApi } from './core/api/auth.api';
import { UserService } from './core/services/user.service';
import { CustomToastService, Toast } from './core/services/custom-toast.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';

interface InstallReferrerPlugin {
  getReferralCode(): Promise<{ code: string }>;
  clearReferralCode(): Promise<void>;
}
const InstallReferrer = registerPlugin<InstallReferrerPlugin>('InstallReferrer');
import { AnalyticsService } from './core/services/analytics.service';
import { AuthSessionCleanupService } from './core/services/auth-session-cleanup.service';
import { CrashlyticsService } from './core/services/crashlytics.service';
import { DeepLinkService } from './core/services/deep-link.service';
import { AppUpdateBlockReason, AppUpdateService } from './core/services/app-update.service';
import { SupermePopupConfig } from './core/components/superme-popup/superme-popup.component';
import { PushNotificationService } from './core/services/push-notification.service';
import { AuthService as CoreAuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  loading = false;
  toast$: Observable<Toast | null>;
  private _navToken?: string;
  private badgeSubscription = new Subscription();
  private badgeSocketSubscribed = false;
  private activeBadgeToken: string | null = null;
  private lastBadgePopupPollAt = 0;
  private readonly badgePopupPollCooldownMs = 15000;

  // Badge popup state (global popup shown from any screen)
  showBadgePopup = false;
  currentBadge?: BadgePopupData;
  private badgePopupQueue: BadgePopupData[] = [];
  isMonitoringChild = false;
  monitoringChildName = '';
  private monitoringStateListener = () => this.loadMonitoringState();

  // Force update popup state (blocks the app until the user updates)
  isUpdateCheckPending = Capacitor.isNativePlatform();
  showForceUpdatePopup = false;
  private updateBlockReason: AppUpdateBlockReason = null;
  private appStateChangeListener?: PluginListenerHandle;
  private updateCheckInFlight?: Promise<void>;
  forceUpdateConfig: SupermePopupConfig = {
    heading: 'Update Required',
    subtitle: 'A new version of the app is available. Please update the app to continue.',
    primaryCTA: {
      text: 'Update Now',
      buttonStyle: 'green',
      buttonFull: true
    },
    showCloseButton: false,
    backdrop: true,
    ctaDirection: 'column'
  };

  constructor(
    private platform: Platform,
    private router: Router,
    private petAgeService: PetAgeService,
    private loadingService: LoadingService,
    private navigation: NavigationService,
    private badgeSocketService: BadgeSocketService,
    private badgeApi: BadgeApi,
    private badgePopupService: BadgePopupService,
    private authApi: AuthApi,
    private userService: UserService,
    private toastService: CustomToastService,
    private analytics: AnalyticsService,
    private authSessionCleanup: AuthSessionCleanupService,
    private crashlytics: CrashlyticsService,
    private deepLinks: DeepLinkService,
    private appUpdate: AppUpdateService,
    private pushNotifications: PushNotificationService,
    private coreAuthService: CoreAuthService,
  ) {
    this.toast$ = this.toastService.toast$;
  }

  // The toast sits at the highest z-index in the app with no click handler,
  // so it silently swallows taps meant for it (or content behind it) instead
  // of dismissing — it only disappeared once its auto-hide timer elapsed.
  dismissToast(): void {
    this.toastService.hide();
  }

  get isAppUpdateBlocked(): boolean {
    return this.isUpdateCheckPending || this.showForceUpdatePopup;
  }

  ngOnInit() {
    this.loadMonitoringState();
    window.addEventListener('family-monitoring-changed', this.monitoringStateListener);

    this.initializeAppUpdateProtection();

    // On Android, check if app was installed via a referral link (Play Install Referrer)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      InstallReferrer.getReferralCode().then(({ code }) => {
        if (code && code.length > 0) {
          try {
            sessionStorage.setItem('referralCode', code.toUpperCase());
            sessionStorage.setItem('referralCodeLocked', 'true');
          } catch (e) {}
        }
      }).catch(() => {});
    }

    this.deepLinks.initialize();

    this.platform.ready().then(() => {
      if (this.platform.is('capacitor')) {
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        StatusBar.show().catch(() => {});
        if (this.platform.is('android')) {
          // Android: set a background colour and stop the status bar overlaying the WebView.
          StatusBar.setBackgroundColor({ color: '#FFE9D6' }).catch(() => {});
          StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        }
        // iOS: background colour is inherited from the page behind the status bar.
        // setBackgroundColor has no effect on iOS — the peach background of ion-content
        // already shows through because UIViewControllerBasedStatusBarAppearance = true.
        this.authSessionCleanup.initializeGoogleAuth();
        // Initialize FCM: registers permission, gets token, attaches listeners.
        // The service guards against duplicate listener setup internally.
        this.pushNotifications.initialize().catch(err =>
          console.warn('[AppComponent] Push notification init failed:', err)
        );
      }
    });

    // Track app open for pet age progression
    this.recordDailyAppOpen();

    // Subscribe to HTTP-polled badge popups (triggered after badge-earning actions)
    this.badgeSubscription.add(
      this.badgePopupService.onShowPopup().subscribe((badge: BadgePopupData) => {
        this.showBadgeNotification(badge);
      })
    );

    // Initialize badge notifications when a user session already exists.
    this.ensureBadgeNotificationsActive();

    // Block hardware back button while force-update popup is visible
    this.platform.backButton.subscribeWithPriority(9999, (processNextHandler) => {
      if (this.isAppUpdateBlocked) {
        console.log('[AppUpdate] Hardware back button blocked — app update required');
        return;
      }

      processNextHandler();
    });

    // Handle hardware back button on mobile devices
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.navigation.back();
    });

    // show loading on navigation using LoadingService to centralize behaviour
    this.router.events.subscribe((event: RouterEvent) => {
      if (event instanceof NavigationStart) {
        const routePath = event.url.split('?')[0];
        const skipNavigationLoader = routePath === '/home/reset-password';

        if (skipNavigationLoader) {
          if (this._navToken) {
            this.loadingService.hide(this._navToken);
            this._navToken = undefined;
          }
          this.loading = false;
          return;
        }

        // start nav loader (returns token)
        this._navToken = this.loadingService.show(undefined, { delayMs: 80, minVisibleMs: 120 });
        this.loading = true;
      }
      if (event instanceof NavigationEnd) {
        const screen = event.urlAfterRedirects.split('?')[0];
        this.analytics.setScreen(screen);
        this.analytics.logScreenView(screen);
        this.crashlytics.log(`Screen viewed: ${screen}`);
        this.ensureBadgeNotificationsActive(event.urlAfterRedirects);
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
          this.crashlytics.recordException(event.error ?? new Error(`Navigation failed: ${event.url}`), {
            area: 'navigation',
            url: event.url,
          });
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

    if (result.coinsEarned > 0) {
      console.log(`🔥 Day ${petData.currentStreak} streak! Earned ${result.coinsEarned} coins!`);
    }
  }

  ngOnDestroy(): void {
    this.badgeSubscription.unsubscribe();
    this.badgeSocketService.disconnect();
    window.removeEventListener('family-monitoring-changed', this.monitoringStateListener);
    this.appStateChangeListener?.remove().catch(() => {});
  }

  switchBackFromChildView(): void {
    const parentToken = localStorage.getItem('family_parent_token');
    const parentUserDataRaw = localStorage.getItem('family_parent_user_data');

    if (parentToken) {
      this.coreAuthService.replaceAuthToken(parentToken);
    }

    if (parentUserDataRaw) {
      try {
        this.coreAuthService.setUserData(JSON.parse(parentUserDataRaw));
      } catch (error) {
        console.warn('[AppComponent] Failed to restore parent user data:', error);
        this.coreAuthService.updateUserData({ relationship: 'PARENT' });
      }
    } else {
      this.coreAuthService.updateUserData({ relationship: 'PARENT' });
    }

    localStorage.removeItem('family_parent_token');
    localStorage.removeItem('family_parent_user_data');
    localStorage.removeItem('family_monitoring_state');
    this.loadMonitoringState();
    this.router.navigate(['/authed/parent-account'], { replaceUrl: true });
  }

  private loadMonitoringState(): void {
    try {
      const raw = localStorage.getItem('family_monitoring_state');
      const state = raw ? JSON.parse(raw) : null;
      this.isMonitoringChild = state?.isMonitoring === true;
      this.monitoringChildName = state?.monitoringChildName || 'Child';
    } catch {
      this.isMonitoringChild = false;
      this.monitoringChildName = '';
    }
  }

  /**
   * Keeps global badge popups active after login and while moving across
   * authenticated screens. This covers both real-time WebSocket unlocks and
   * any pending popup that was missed while the user was on another screen.
   */
  private ensureBadgeNotificationsActive(url: string = this.router.url): void {
    const userToken = localStorage.getItem('auth_token');
    if (!userToken) {
      const hadBadgeSession = !!this.activeBadgeToken || this.badgeSocketService.isConnected() || this.showBadgePopup;
      this.activeBadgeToken = null;
      if (hadBadgeSession) {
        this.badgeSocketService.disconnect();
        this.badgeSocketService.clearQueue();
        this.badgePopupService.setPopupVisible(false);
        this.showBadgePopup = false;
        this.currentBadge = undefined;
      }
      return;
    }

    if (!this.isBadgePopupEligibleRoute(url)) {
      return;
    }

    const isNewSession = this.activeBadgeToken !== userToken;
    if (isNewSession) {
      this.activeBadgeToken = userToken;
      this.initializeBadgeWebSocket();
      this.checkPendingBadgePopups();
      this.pollNextPendingBadgePopup(true);
      return;
    }

    this.pollNextPendingBadgePopup();
  }

  private pollNextPendingBadgePopup(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastBadgePopupPollAt < this.badgePopupPollCooldownMs) {
      return;
    }

    this.lastBadgePopupPollAt = now;
    this.badgePopupService.check();
  }

  private isBadgePopupEligibleRoute(url: string): boolean {
    if (!url.includes('/authed')) {
      return false;
    }

    const relationship = this.getStoredRelationship();
    return !relationship || relationship === 'CHILD' || relationship === 'SELF';
  }

  private getStoredRelationship(): string | null {
    const profileRelationship = this.userService.getUserProfile()?.relationship;
    if (profileRelationship) {
      return profileRelationship.toString().toUpperCase();
    }

    try {
      const rawUserData = localStorage.getItem('user_data');
      if (rawUserData) {
        const userData = JSON.parse(rawUserData);
        const relationship = userData?.relationship || userData?.role || userData?.relationshipType;
        return relationship ? relationship.toString().toUpperCase() : null;
      }
    } catch (error) {
      console.warn('[AppComponent] Failed to read user relationship for badge popup eligibility:', error);
    }

    return null;
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

    // Safely initialize WebSocket with an error boundary.
    // Prevents badge notification issues from blocking System UI.
    try {
      this.badgeSocketService.connect();

      if (!this.badgeSocketSubscribed) {
        this.badgeSocketSubscribed = true;
        this.badgeSubscription.add(
          this.badgeSocketService.onBadgeReceived().subscribe(
            (badge: BadgePopupData) => {
              console.log('[AppComponent] Received badge notification:', badge);
              this.showBadgeNotification(badge);
            },
            (error) => {
              console.error('[AppComponent] Badge WebSocket error:', error);
              // Silently fail - don't crash the app for badge notifications
            }
          )
        );
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

        const sortedPendingBadges = [...pendingBadges].sort((a: any, b: any) =>
          this.getBadgeDisplayName(a).localeCompare(this.getBadgeDisplayName(b))
        );

        sortedPendingBadges.forEach((badge: any) => {
          if (badge && (badge.badgeId || badge.id)) {
            const currentLevel = Number(badge.currentLevel || badge.level || 1);
            const badgeData: BadgePopupData = {
              badgeId: badge.badgeId || badge.id,
              title: badge.title || badge.name || 'Badge Earned',
              name: badge.name || badge.title || 'Badge Earned',
              levelText: badge.levelText || '',
              description: badge.description || '',
              achievementText: badge.achievementText || '',
              iconUrl: badge.iconUrl || badge.icon || 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
              celebrationTitle: badge.celebrationTitle || `Level ${currentLevel} - Badge Unlocked!`,
              celebrationMessage: badge.celebrationMessage || `You earned a badge!`,
              shareMessage: badge.shareMessage || 'I earned a badge on SuperMe! 🚀',
              currentLevel,
              totalLevels: badge.totalLevels || 1,
              isMaxLevel: badge.isMaxLevel || false
            };
            this.badgeSocketService.enqueueBadge(badgeData);
          }
        });
      },
      error: (error) => {
        console.error('[AppComponent] Failed to fetch pending badge popups:', error);
        this.crashlytics.recordException(error, { area: 'badge_pending_popups' });
      }
    });
  }

  private getBadgeDisplayName(badge: any): string {
    return (badge?.badgeName || badge?.name || badge?.title || '').toString().toLowerCase();
  }

  /**
   * Show badge notification popup
   */
  private showBadgeNotification(badge: BadgePopupData): void {
    this.currentBadge = badge;
    this.showBadgePopup = true;
    this.badgePopupService.setPopupVisible(true);
  }

  /**
   * Handle badge popup close — acks and chains next popup if pendingCount > 1.
   */
  onBadgePopupClose(navigateToBadges = false): void {
    const badge = this.currentBadge;

    this.showBadgePopup = false;
    this.currentBadge = undefined;

    if (badge) {
      const pendingCount = badge.pendingCount ?? 1;
      // badgePopupService handles ack + pending chain; badgeSocketService handles WebSocket queue
      if (badge.pendingCount !== undefined) {
        this.badgePopupService.ack(badge.badgeId, pendingCount);
      } else {
        this.badgeApi.acknowledgeBadgePopup(badge.badgeId).subscribe({
          next: () => console.log('[AppComponent] Badge acked:', badge.badgeId),
          error: (err) => console.warn('[AppComponent] Badge ack failed:', err)
        });
        this.badgeSocketService.popupClosed();
      }
    }

    if (navigateToBadges) {
      this.router.navigate(['/authed/badges']);
    }
  }

  /** Local badge icon map — used as fallback when remote iconUrl fails to load on iOS */
  private readonly LOCAL_BADGE_ICONS: Record<string, string> = {
    'Coin Collector':       'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
    'Quiz Ace':             'assets/Icons-Neutral/Icon-Badge-QuizAce.png',
    'Pet Collector':        'assets/Icons-Neutral/Icon-Badge-PetCollector.png',
    'Content Creator':      'assets/Icons-Neutral/Icon-Badge-ContentCreator.png',
    'Knowledge Seeker':     'assets/Icons-Neutral/Icon-Badge-KnowledgeSeeker.png',
    'Habit Master':         'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
    'Daily Champion':       'assets/Icons-Neutral/Icon-Badge-DailyChampion.png',
    'Feature Explorer':     'assets/Icons-Neutral/Icon-Badge-FeatureExploerer.png',
    'Puzzle Master':        'assets/Icons-Neutral/Icon-Badge-PuzzleMaster.png',
    'Pet Stylist':          'assets/Icons-Neutral/Icon-Badge-PetStylist.png',
    'Task Terminator':      'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png',
    'Learning Enthusiast':  'assets/Icons-Neutral/Icon-Badge-LearningEnthusiast.png',
    'Social Star':          'assets/Icons-Neutral/Icon-Badge-SocialStar.png',
    'Streak Keeper':        'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png',
  };

  getLocalBadgeIcon(name?: string): string {
    return this.LOCAL_BADGE_ICONS[name || ''] || 'assets/Images-Transparent/Image-Badge-Reward.png';
  }

  /**
   * Handle "View all Badges" click
   */
  onViewAllBadges(): void {
    this.onBadgePopupClose(true);
  }

  /**
   * Handle "Awesome" / close click
   */
  onAwesomeClick(): void {
    this.onBadgePopupClose(false);
  }

  /** Check Google Play and Remote Config before allowing app access. */
  private async initializeAppUpdateProtection(): Promise<void> {
    if (this.appUpdate.isNativeMobilePlatform()) {
      try {
        this.appStateChangeListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) this.checkAppUpdate();
        });
      } catch (error) {
        console.warn('[AppComponent] Unable to register app update resume listener:', error);
      }
    }

    await this.checkAppUpdate();
  }

  private checkAppUpdate(): Promise<void> {
    if (this.updateCheckInFlight) return this.updateCheckInFlight;

    this.updateCheckInFlight = (async () => {
      try {
        const result = await this.appUpdate.checkForUpdate();
        this.updateBlockReason = result.blockReason;
        this.showForceUpdatePopup = result.blockReason !== null;

        if (result.updateRequired) {
          this.setUpdateRequiredPopup();
        } else if (result.verificationFailed) {
          this.setUpdateVerificationFailedPopup();
        }

        if (this.showForceUpdatePopup) {
          this.showBadgePopup = false;
          this.badgePopupService.setPopupVisible(false);
        }
      } catch (error) {
        console.warn('[AppComponent] App update check failed:', error);
        if (Capacitor.getPlatform() === 'android') {
          // An unexpected production check error must not silently unlock the
          // app. The retry action lets the user recover when connectivity or
          // Google Play becomes available again.
          this.updateBlockReason = 'verification-failed';
          this.showForceUpdatePopup = true;
          this.setUpdateVerificationFailedPopup();
        }
      } finally {
        this.isUpdateCheckPending = false;
        this.updateCheckInFlight = undefined;
      }
    })();

    return this.updateCheckInFlight;
  }

  /** Handle the primary action on either blocking popup state. */
  async onUpdateNowClick(): Promise<void> {
    if (this.updateBlockReason === 'verification-failed') {
      this.isUpdateCheckPending = true;
      this.showForceUpdatePopup = false;
      await this.checkAppUpdate();
      return;
    }

    const opened = await this.appUpdate.openStore();
    if (!opened) {
      this.forceUpdateConfig = {
        ...this.forceUpdateConfig,
        subtitle: 'Google Play could not be opened. Check your connection and Play Store app, then tap Update Now again.'
      };
    }
  }

  /** The verification-error popup offers the Play Store as a safe fallback. */
  async onUpdateSecondaryAction(): Promise<void> {
    await this.appUpdate.openStore();
  }

  private setUpdateRequiredPopup(): void {
    this.forceUpdateConfig = {
      heading: 'Update Required',
      subtitle: 'A new version of the app is available. Please update the app to continue.',
      primaryCTA: {
        text: 'Update Now',
        buttonStyle: 'green',
        buttonFull: true
      },
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'column'
    };
  }

  private setUpdateVerificationFailedPopup(): void {
    this.forceUpdateConfig = {
      heading: 'Unable to Check for Updates',
      subtitle: 'Connect to the internet and make sure Google Play is available. You must verify your app version before continuing.',
      primaryCTA: {
        text: 'Try Again',
        buttonStyle: 'green',
        buttonFull: true
      },
      secondaryCTA: {
        text: 'Open Google Play',
        buttonStyle: 'magenta-transparent',
        buttonFull: true
      },
      showCloseButton: false,
      backdrop: true,
      ctaDirection: 'column'
    };
  }
}
