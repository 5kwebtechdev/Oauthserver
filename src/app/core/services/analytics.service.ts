import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private ready = false;

  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
      if (this.platform.is('capacitor')) {
        FirebaseAnalytics.setEnabled({ enabled: true })
          .then(() => { this.ready = true; })
          .catch((e: any) => console.warn('[Analytics] init error:', e));
      }
    });
  }

  setScreen(screenName: string): void {
    if (!this.ready) return;
    FirebaseAnalytics.setCurrentScreen({ screenName }).catch(() => {});
  }

  setUserId(userId: string): void {
    if (!this.ready) return;
    FirebaseAnalytics.setUserId({ userId }).catch(() => {});
  }

  logEvent(name: string, params?: Record<string, string | number | boolean>): void {
    if (!this.ready) return;
    FirebaseAnalytics.logEvent({ name, params }).catch(() => {});
  }

  // Pre-built event helpers
  logLogin(method: string): void {
    this.logEvent('login', { method });
  }

  logSignUp(method: string): void {
    this.logEvent('sign_up', { method });
  }

  logScreenView(screenName: string, screenClass?: string): void {
    this.logEvent('screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenClass ?? screenName,
    });
  }
}
