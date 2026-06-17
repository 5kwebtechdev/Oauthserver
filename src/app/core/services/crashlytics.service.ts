import { isDevMode, Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Crashlytics } from '../plugins/crashlytics';

type CrashlyticsKeyValue = string | number | boolean | null | undefined;

@Injectable({ providedIn: 'root' })
export class CrashlyticsService {
  private ready = false;

  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
      this.ready = this.platform.is('capacitor');
      if (this.ready) {
        Crashlytics.setEnabled({ enabled: true }).catch(() => {});
      }
    });
  }

  setUserId(userId: string | number | null | undefined): void {
    if (!this.ready) return;
    Crashlytics.setUserId({ userId: userId == null ? '' : String(userId) }).catch(() => {});
  }

  clearUserId(): void {
    this.setUserId('');
  }

  log(message: string): void {
    if (!this.ready || !message) return;
    Crashlytics.log({ message }).catch(() => {});
  }

  setCustomKey(key: string, value: CrashlyticsKeyValue): void {
    if (!this.ready || !key) return;
    Crashlytics.setCustomKey({ key, value: value == null ? '' : String(value) }).catch(() => {});
  }

  recordException(error: unknown, keys?: Record<string, CrashlyticsKeyValue>): void {
    if (!this.ready) return;

    const normalized = this.normalizeError(error);
    Crashlytics.recordException({ ...normalized, keys }).catch(() => {});
  }

  forceTestCrash(): void {
    if (!this.ready || !isDevMode()) return;
    Crashlytics.forceCrash().catch(() => {});
  }

  private normalizeError(error: unknown): { name: string; message: string; stack?: string } {
    if (error instanceof Error) {
      return {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error,
      };
    }

    try {
      return {
        name: 'Error',
        message: JSON.stringify(error),
      };
    } catch {
      return {
        name: 'Error',
        message: 'Unknown non-fatal error',
      };
    }
  }
}
