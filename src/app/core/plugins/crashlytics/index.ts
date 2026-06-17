import { registerPlugin } from '@capacitor/core';

export interface CrashlyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  setUserId(options: { userId: string }): Promise<void>;
  log(options: { message: string }): Promise<void>;
  setCustomKey(options: { key: string; value: string }): Promise<void>;
  recordException(options: {
    name?: string;
    message: string;
    stack?: string;
    keys?: Record<string, string | number | boolean | null | undefined>;
  }): Promise<void>;
  forceCrash(): Promise<void>;
}

export const Crashlytics = registerPlugin<CrashlyticsPlugin>('Crashlytics');
