import { registerPlugin } from '@capacitor/core';

export interface FirebaseAppCheckTokenResult {
  token: string;
  expireTimeMillis?: number;
}

export interface FirebaseAppCheckPlugin {
  getToken(options?: { forceRefresh?: boolean }): Promise<FirebaseAppCheckTokenResult>;
}

export const FirebaseAppCheck = registerPlugin<FirebaseAppCheckPlugin>('FirebaseAppCheck');
