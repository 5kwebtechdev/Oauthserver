import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FirebaseMessaging, Importance, Visibility } from '@capacitor-firebase/messaging';
import { PushNotificationApi } from '../api/push-notification.api';
import { CustomToastService } from './custom-toast.service';
import { CrashlyticsService } from './crashlytics.service';
import { NotificationNavigationService } from './notification-navigation.service';

const STORED_TOKEN_KEY = 'fcm_token';
const ANDROID_NOTIFICATION_CHANNEL_ID = 'superme_ping_v1';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private messaging = FirebaseMessaging;
  private localNotifications = LocalNotifications;
  private listenersReady = false;
  private localNotificationId = Date.now() % 2147483647;
  private currentToken: string | null = null;

  constructor(
    private platform: Platform,
    private router: Router,
    private zone: NgZone,
    private pushApi: PushNotificationApi,
    private toastService: CustomToastService,
    private crashlytics: CrashlyticsService,
    private notificationNavigation: NotificationNavigationService
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
        this.setupLocalNotificationTapListener();
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
    this.notificationNavigation.resume();
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
    this.notificationNavigation.cancelPending();
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
        // Match the backend and manifest. Existing channel sound settings
        // cannot be changed by recreating the same channel ID.
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
      const { channels } = await FirebaseMessaging.listChannels();
      console.log('[FCM] Installed Android channels:', JSON.stringify(channels, null, 2));
      const channel = channels.find(item => item.id === ANDROID_NOTIFICATION_CHANNEL_ID);
      if (channel && (!channel.sound || (channel.importance !== undefined && channel.importance < Importance.Default))) {
        console.warn('[FCM] Android channel is silent or low importance. Check this channel in Android notification settings.');
      }
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
    let appBuildNumber: string | undefined;
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo();
        if (/^\d+$/.test(info.build)) appBuildNumber = info.build;
      } catch {
        // Registration must still work; an unknown build stays ineligible for
        // birthday data-only rollout on the backend.
        console.warn('[FCM] Installed build unavailable; registering without build metadata.');
      }
    }
    this.pushApi.registerToken(token, deviceType, appBuildNumber).subscribe({
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
    this.messaging.addListener('notificationReceived', (event) => {
      this.zone.run(() => {
        const notification = event.notification ?? {};
        this.notificationNavigation.changed$.next();
        const { title, body } = notification as any;
        const data: Record<string, any> = (notification as any)?.data ?? {};

        // The native Firebase service owns valid birthday data-only messages in
        // every app state. Do not create a second local notification or toast.
        if (Capacitor.getPlatform() === 'android' && !title && !body &&
            ['BIRTHDAY_SELF', 'CHILD_BIRTHDAY_PARENT'].includes(data['type']) &&
            ['notificationId', 'title', 'body', 'actionScreen', 'referenceId'].every(
              key => typeof data[key] === 'string' && data[key].trim().length > 0)) return;

        console.group('%c[FCM] Foreground Notification Received', 'color: #4CAF50; font-weight: bold;');
        console.log('📬 Title       :', title);
        console.log('📝 Body        :', body);
        console.log('🎯 actionScreen:', data['actionScreen'] ?? '—');
        console.log('🔗 referenceId :', data['referenceId'] ?? '—');
        console.log('📦 Full data   :', data);
        console.groupEnd();

        // Receipt only displays the alert. Navigation belongs exclusively to
        // notificationActionPerformed/localNotificationActionPerformed, which
        // require an explicit user tap.
        const message = [title, body].filter(Boolean).join('\n') || 'New notification';
        this.toastService.show(message, 'info', 6000);
        void this.showAndroidForegroundNotification(title, body, data);
      });
    }).catch(err => console.warn('[FCM] foreground listener error:', err));
  }

  private async showAndroidForegroundNotification(
    title: string | undefined,
    body: string | undefined,
    data: Record<string, any>
  ): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      // Background notification messages are already displayed by FCM.
      const { isActive } = await App.getState();
      if (!isActive) return;
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') return;
      await this.ensureDefaultAndroidChannel();
      this.localNotificationId = (this.localNotificationId % 2147483646) + 1;
      await LocalNotifications.schedule({
        notifications: [{
          id: this.localNotificationId,
          title: title || 'SuperMe',
          body: body || 'New notification',
          channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
          sound: 'superme_ping.mp3',
          smallIcon: 'ic_stat_notification',
          iconColor: '#EE6621',
          extra: data
        }]
      });
    } catch (error) {
      console.warn('[FCM] Foreground Android notification failed:', error);
    }
  }

  private setupLocalNotificationTapListener(): void {
    if (Capacitor.getPlatform() !== 'android') return;
    this.localNotifications.addListener('localNotificationActionPerformed', event => {
      const data: Record<string, any> = event.notification.extra ?? {};
      this.zone.run(() => this.handleNavigation(data));
    }).catch(error => console.warn('[FCM] Local notification tap listener failed:', error));
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
    this.messaging.addListener('notificationActionPerformed', (event) => {
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
    this.notificationNavigation.open(data);
  }

}
