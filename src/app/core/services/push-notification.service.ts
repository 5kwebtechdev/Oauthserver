import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging, Importance, Visibility } from '@capacitor-firebase/messaging';
import { PushNotificationApi } from '../api/push-notification.api';
import { CustomToastService } from './custom-toast.service';
import { CrashlyticsService } from './crashlytics.service';

const STORED_TOKEN_KEY = 'fcm_token';
const ANDROID_NOTIFICATION_CHANNEL_ID = 'superme_ping_v1';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private listenersReady = false;
  private currentToken: string | null = null;

  constructor(
    private platform: Platform,
    private router: Router,
    private zone: NgZone,
    private pushApi: PushNotificationApi,
    private toastService: CustomToastService,
    private crashlytics: CrashlyticsService
  ) {}

  /**
   * Initialize FCM: request permission, get token, register with backend, and
   * attach all message/tap listeners. Safe to call multiple times — listeners
   * are attached only once; the token registration is retried on every call so
   * it succeeds once the user logs in.
   */
  async initialize(): Promise<void> {
    try {
      await this.platform.ready();

      if (!Capacitor.isNativePlatform()) {
        // Web push requires a service worker; handled separately.
        return;
      }

      // Attach listeners only once per app lifecycle.
      if (!this.listenersReady) {
        this.setupForegroundListener();
        this.setupTokenRefreshListener();
        this.setupNotificationTapListener();
        this.listenersReady = true;
      }

      const granted = await this.requestPermission();
      if (!granted) {
        console.log('[FCM] Notification permission not granted.');
        return;
      }

      await this.ensureDefaultAndroidChannel();
      await this.fetchAndRegisterToken();
    } catch (error) {
      console.warn('[FCM] Initialization error:', error);
      this.crashlytics.recordException(error, { area: 'fcm_init' });
    }
  }

  /**
   * Call this on successful login to register a pending token that was
   * obtained before the user authenticated.
   */
  async onAuthenticated(): Promise<void> {
    const stored = localStorage.getItem(STORED_TOKEN_KEY);
    if (stored) {
      await this.ensureDefaultAndroidChannel();
      await this.sendTokenToBackend(stored);
    } else {
      await this.initialize();
    }
  }

  /**
   * Call on logout: removes the FCM token from the backend and invalidates
   * the device token so the user no longer receives notifications.
   */
  async clearToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.currentToken = null;
      localStorage.removeItem(STORED_TOKEN_KEY);
      return;
    }

    try {
      const token = this.currentToken ?? localStorage.getItem(STORED_TOKEN_KEY);
      if (token) {
        await this.pushApi.removeToken(token).toPromise().catch(() => {});
      }
      await FirebaseMessaging.deleteToken().catch(() => {});
    } catch { /* cleanup errors are non-fatal */ }

    this.currentToken = null;
    localStorage.removeItem(STORED_TOKEN_KEY);
  }

  // ---------------------------------------------------------------------------
  // Permission
  // ---------------------------------------------------------------------------

  private async requestPermission(): Promise<boolean> {
    try {
      const { receive: current } = await FirebaseMessaging.checkPermissions();
      if (current === 'granted') return true;
      if (current === 'denied') return false;

      const { receive } = await FirebaseMessaging.requestPermissions();
      return receive === 'granted';
    } catch (error) {
      console.warn('[FCM] Permission request failed:', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Token management
  // ---------------------------------------------------------------------------

  private async fetchAndRegisterToken(): Promise<void> {
    try {
      const { token } = await FirebaseMessaging.getToken();
      if (!token) {
        console.warn('[FCM] Empty token returned from SDK.');
        return;
      }

      // Persist locally so it can be sent to the backend once authenticated.
      localStorage.setItem(STORED_TOKEN_KEY, token);
      this.currentToken = token;

      await this.sendTokenToBackend(token);
    } catch (error) {
      console.warn('[FCM] Failed to fetch token:', error);
    }
  }

  private async ensureDefaultAndroidChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;

    try {
      await FirebaseMessaging.createChannel({
        // Android notification-channel sound settings cannot be changed after
        // a channel has been created on a device. Use a versioned channel ID
        // so existing installations migrate from the old silent channel.
        id: ANDROID_NOTIFICATION_CHANNEL_ID,
        name: 'SuperMeApp',
        description: 'SuperMeApp notifications',
        importance: Importance.High,
        visibility: Visibility.Public,
        sound: 'superme_ping.mp3',
        vibration: true,
        lights: true,
        lightColor: '#EE6621'
      });
    } catch (error) {
      console.warn('[FCM] Default notification channel setup failed:', error);
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    // Only attempt if the user has an auth token (i.e., is logged in).
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.log('[FCM] User not authenticated — token stored locally, will be sent after login.');
      return;
    }

    const deviceType = this.getDeviceType();
    this.pushApi.registerToken(token, deviceType).subscribe({
      next: () => console.log('[FCM] Token registered with backend.'),
      error: (err) => console.warn('[FCM] Backend token registration failed:', err)
    });
  }

  private getDeviceType(): string {
    switch (Capacitor.getPlatform()) {
      case 'android': return 'ANDROID';
      case 'ios':     return 'IOS';
      default:        return 'WEB';
    }
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  private setupForegroundListener(): void {
    FirebaseMessaging.addListener('notificationReceived', (event) => {
      this.zone.run(() => {
        const notification = event.notification ?? {};
        const { title, body } = notification as any;
        const data: Record<string, any> = (notification as any)?.data ?? {};

        console.group('%c[FCM] Foreground Notification Received', 'color: #4CAF50; font-weight: bold;');
        console.log('📬 Title       :', title);
        console.log('📝 Body        :', body);
        console.log('🎯 actionScreen:', data['actionScreen'] ?? '—');
        console.log('🔗 referenceId :', data['referenceId'] ?? '—');
        console.log('📦 Full data   :', data);
        console.groupEnd();

        // Show tappable in-app banner with the notification message.
        // The toast acts as a navigation shortcut — tapping it navigates to
        // the resolved screen just as a background tap would.
        const message = [title, body].filter(Boolean).join('\n') || 'New notification';
        this.toastService.show(message, 'info', 6000);

        // Also navigate immediately for high-priority foreground actions
        // (only if the app is open and the user is already authenticated).
        const authToken = localStorage.getItem('auth_token');
        if (authToken && data['actionScreen']) {
          // Slight delay so the toast is visible first
          setTimeout(() => this.zone.run(() => this.handleNavigation(data)), 300);
        }
      });
    }).catch(err => console.warn('[FCM] foreground listener error:', err));
  }

  private setupTokenRefreshListener(): void {
    FirebaseMessaging.addListener('tokenReceived', (event) => {
      if (!event.token || event.token === this.currentToken) return;

      console.log('[FCM] Token refreshed.');
      this.currentToken = event.token;
      localStorage.setItem(STORED_TOKEN_KEY, event.token);
      this.sendTokenToBackend(event.token);
    }).catch(err => console.warn('[FCM] token refresh listener error:', err));
  }

  private setupNotificationTapListener(): void {
    FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      this.zone.run(() => {
        const notification = (event.notification as any) ?? {};
        const data: Record<string, any> = notification?.data ?? {};

        console.group('%c[FCM] Notification Tapped', 'color: #2196F3; font-weight: bold;');
        console.log('📬 Title       :', notification?.title);
        console.log('📝 Body        :', notification?.body);
        console.log('🎯 actionScreen:', data['actionScreen'] ?? '—');
        console.log('🔗 referenceId :', data['referenceId'] ?? '—');
        console.log('📦 Full data   :', data);
        this.handleNavigation(data);
        console.groupEnd();
      });
    }).catch(err => console.warn('[FCM] tap listener error:', err));
  }

  // ---------------------------------------------------------------------------
  // Navigation from notification data
  // ---------------------------------------------------------------------------

  private handleNavigation(data: Record<string, any>): void {
    const actionScreen: string = (data['actionScreen'] ?? '').toString().toUpperCase();
    const referenceId: string | null = data['referenceId'] ? String(data['referenceId']) : null;

    const target = this.actionScreenToRoute(actionScreen, referenceId);

    console.log(`%c[FCM] Navigating → ${target}  (actionScreen: ${actionScreen})`,
      'color: #FF9800; font-weight: bold;');

    this.router.navigateByUrl(target, { replaceUrl: false }).catch(err => {
      console.warn('[FCM] Navigation failed, falling back to dashboard:', err);
      this.router.navigate(['/authed/user-dashboard']);
    });
  }

  /**
   * Maps every `actionScreen` value from the backend FCM spec to an Angular route.
   *
   * actionScreen → route
   * ─────────────────────────────────────────────────────────
   * HOME                  → /authed/user-dashboard
   * ADD_HABIT_TASK        → /authed/activity-input
   * VIEW_ALL_HABITS_TASKS → /authed/activity-page
   * VIEW_ALL_HABITS       → /authed/activity-page?tab=habits
   * VIEW_ALL_TASKS        → /authed/activity-page?tab=tasks
   * JOURNAL               → /authed/journal-input
   * NOTES                 → /authed/notes
   * QUIZ_HOME             → /authed/content
   * LEARNINGS_HOME        → /authed/content
   * COURSE_LESSON         → /authed/academy/course/:referenceId
   * ACADEMY_HOME          → /authed/academy
   */
  private actionScreenToRoute(actionScreen: string, referenceId: string | null): string {
    switch (actionScreen) {
      case 'HOME':
        return '/authed/user-dashboard';

      case 'ADD_HABIT_TASK':
        return '/authed/activity-input';

      case 'VIEW_ALL_HABITS_TASKS':
        return '/authed/activity-page';

      case 'VIEW_ALL_HABITS':
        return '/authed/activity-page?tab=habits';

      case 'VIEW_ALL_TASKS':
        return '/authed/activity-page?tab=tasks';

      case 'JOURNAL':
        return '/authed/journal-input';

      case 'NOTES':
        return '/authed/notes';

      case 'QUIZ_HOME':
      case 'LEARNINGS_HOME':
        return '/authed/content';

      case 'COURSE_LESSON':
        return referenceId
          ? `/authed/academy/course/${referenceId}`
          : '/authed/academy';

      case 'ACADEMY_HOME':
        return '/authed/academy';

      default:
        console.warn(`[FCM] Unknown actionScreen "${actionScreen}" — falling back to dashboard.`);
        return '/authed/user-dashboard';
    }
  }
}
