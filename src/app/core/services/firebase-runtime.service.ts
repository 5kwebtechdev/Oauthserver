import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import {
  AppCheck,
  ReCaptchaV3Provider,
  getToken as getWebAppCheckToken,
  initializeAppCheck,
} from 'firebase/app-check';
import {
  RemoteConfig,
  fetchAndActivate,
  getBoolean,
  getNumber,
  getRemoteConfig,
  getString,
} from 'firebase/remote-config';
import { environment } from '../../../environments/environment';
import { FirebaseAppCheck } from '../plugins/firebase-app-check';

type RemoteConfigDefaults = Record<string, string | number | boolean>;

@Injectable({ providedIn: 'root' })
export class FirebaseRuntimeService {
  private app?: FirebaseApp;
  private remoteConfig?: RemoteConfig;
  private appCheck?: AppCheck;
  private initStarted = false;
  private remoteConfigReady = false;
  private cachedNativeAppCheckToken?: { token: string; expiresAt: number };

  initialize(): void {
    if (this.initStarted) return;
    this.initStarted = true;

    const firebaseConfig = this.getFirebaseConfig();
    if (!firebaseConfig) {
      console.warn('[FirebaseRuntime] Firebase config missing. Remote Config and App Check are disabled.');
      return;
    }

    this.app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    this.initializeRemoteConfig();
    this.initializeWebAppCheck();
  }

  async fetchRemoteConfig(): Promise<boolean> {
    this.initialize();
    if (!this.remoteConfig) return false;

    try {
      this.remoteConfigReady = await fetchAndActivate(this.remoteConfig);
      return this.remoteConfigReady;
    } catch (error) {
      console.warn('[FirebaseRuntime] Remote Config fetch failed:', error);
      return false;
    }
  }

  getRemoteString(key: string, fallback = ''): string {
    this.initialize();
    if (!this.remoteConfig) return fallback;
    const value = getString(this.remoteConfig, key);
    return value || fallback;
  }

  getRemoteBoolean(key: string, fallback = false): boolean {
    this.initialize();
    if (!this.remoteConfig) return fallback;
    try {
      return getBoolean(this.remoteConfig, key);
    } catch {
      return fallback;
    }
  }

  getRemoteNumber(key: string, fallback = 0): number {
    this.initialize();
    if (!this.remoteConfig) return fallback;
    const value = getNumber(this.remoteConfig, key);
    return Number.isFinite(value) ? value : fallback;
  }

  async getAppCheckToken(forceRefresh = false): Promise<string | null> {
    this.initialize();

    const nativeToken = await this.getNativeAppCheckToken(forceRefresh);
    if (nativeToken) return nativeToken;

    if (!this.appCheck) return null;

    try {
      const result = await getWebAppCheckToken(this.appCheck, forceRefresh);
      return result.token || null;
    } catch (error) {
      console.warn('[FirebaseRuntime] App Check token unavailable:', error);
      return null;
    }
  }

  shouldAttachAppCheck(url: string): boolean {
    const appCheckConfig = environment.firebase?.appCheck;
    if (!appCheckConfig?.enabled) return false;
    if (!url || url.includes('googleapis.com') || url.includes('firebaseio.com')) return false;

    try {
      const apiUrl = new URL(environment.apiUrl);
      const requestUrl = new URL(url, window.location.origin);
      return requestUrl.host === apiUrl.host;
    } catch {
      return url.startsWith(environment.apiUrl);
    }
  }

  get isRemoteConfigReady(): boolean {
    return this.remoteConfigReady;
  }

  private initializeRemoteConfig(): void {
    if (!this.app || typeof window === 'undefined') return;

    try {
      const remoteConfigOptions = environment.firebase?.remoteConfig;
      this.remoteConfig = getRemoteConfig(this.app);
      this.remoteConfig.settings.minimumFetchIntervalMillis =
        remoteConfigOptions?.minimumFetchIntervalMillis ?? (environment.production ? 3600000 : 60000);
      this.remoteConfig.defaultConfig = (remoteConfigOptions?.defaults ?? {}) as RemoteConfigDefaults;
    } catch (error) {
      console.warn('[FirebaseRuntime] Remote Config initialization failed:', error);
    }
  }

  private initializeWebAppCheck(): void {
    if (!this.app || typeof window === 'undefined') return;

    const appCheckConfig = environment.firebase?.appCheck;
    if (!appCheckConfig?.enabled || !appCheckConfig.recaptchaSiteKey) return;

    try {
      if (appCheckConfig.debugToken) {
        (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
          appCheckConfig.debugToken;
      }

      this.appCheck = initializeAppCheck(this.app, {
        provider: new ReCaptchaV3Provider(appCheckConfig.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.warn('[FirebaseRuntime] Web App Check initialization failed:', error);
    }
  }

  private async getNativeAppCheckToken(forceRefresh: boolean): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;

    const now = Date.now();
    if (!forceRefresh && this.cachedNativeAppCheckToken && this.cachedNativeAppCheckToken.expiresAt > now + 60000) {
      return this.cachedNativeAppCheckToken.token;
    }

    try {
      const result = await FirebaseAppCheck.getToken({ forceRefresh });
      if (!result?.token) return null;

      this.cachedNativeAppCheckToken = {
        token: result.token,
        expiresAt: result.expireTimeMillis ?? now + 30 * 60 * 1000,
      };
      return result.token;
    } catch (error) {
      return null;
    }
  }

  private getFirebaseConfig(): FirebaseOptions | null {
    const config = environment.firebase;
    if (!config?.apiKey || !config.projectId || !config.appId) return null;

    return {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };
  }
}
