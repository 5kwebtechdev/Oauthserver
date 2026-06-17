import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { PushNotificationApi } from '../api/push-notification.api';
import { CustomToastService } from './custom-toast.service';
import { CrashlyticsService } from './crashlytics.service';

const STORED_TOKEN_KEY = 'fcm_token';

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
        const { title, body } = event.notification ?? {};
        const message = [title, body].filter(Boolean).join(': ') || 'New notification';
        // Show as an in-app toast since the OS suppresses system banners when
        // the app is in the foreground.
        this.toastService.show(message, 'info', 5000);
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
        const data: Record<string, any> = (event.notification as any)?.data ?? {};
        this.handleNavigation(data);
      });
    }).catch(err => console.warn('[FCM] tap listener error:', err));
  }

  // ---------------------------------------------------------------------------
  // Navigation from notification data
  // ---------------------------------------------------------------------------

  /**
   * Resolves a navigation target from the notification's custom data payload.
   *
   * Supported payload keys (in priority order):
   *   route   — explicit Angular route, e.g. "/authed/user-dashboard"
   *   screen  — shorthand screen name, e.g. "academy", "badges", "lessons"
   *   type    — notification category used when neither route nor screen is set
   */
  private handleNavigation(data: Record<string, any>): void {
    const target = this.resolveRoute(data);
    if (!target) return;

    this.router.navigateByUrl(target).catch(() => {
      this.router.navigate(['/authed/user-dashboard']);
    });
  }

  private resolveRoute(data: Record<string, any>): string | null {
    // 1. Explicit route wins.
    if (data['route']) {
      const r = String(data['route']);
      return r.startsWith('/') ? r : `/${r}`;
    }

    // 2. Screen shorthand.
    const screen = data['screen'] ? String(data['screen']).toLowerCase() : null;
    if (screen) return this.screenToRoute(screen, data);

    // 3. Type-based fallback.
    const type = data['type'] ? String(data['type']).toLowerCase() : null;
    if (type) return this.typeToRoute(type, data);

    return null;
  }

  private screenToRoute(screen: string, data: Record<string, any>): string {
    const id = data['id'] ? String(data['id']) : null;
    switch (screen) {
      case 'dashboard':     return '/authed/user-dashboard';
      case 'academy':       return '/authed/academy';
      case 'course':        return id ? `/authed/academy/course/${id}` : '/authed/academy';
      case 'badges':        return '/authed/badges';
      case 'notes':         return '/authed/notes';
      case 'learning':      return '/authed/content';
      case 'tasks':         return '/authed/tasks';
      case 'profile':       return '/authed/profile';
      case 'family':        return '/authed/family';
      default:              return '/authed/user-dashboard';
    }
  }

  private typeToRoute(type: string, data: Record<string, any>): string {
    const id = data['id'] ? String(data['id']) : null;
    switch (type) {
      case 'badge':         return '/authed/badges';
      case 'lesson':        return id ? `/authed/academy/course/${id}` : '/authed/academy';
      case 'challenge':     return '/authed/content';
      case 'task':          return '/authed/tasks';
      default:              return '/authed/user-dashboard';
    }
  }
}
