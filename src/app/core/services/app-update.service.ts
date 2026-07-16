import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { RemoteConfigService } from './remote-config.service';

export type MobileAppPlatform = 'android' | 'ios';

export interface AppUpdateCheckResult {
  updateRequired: boolean;
  currentVersion: string;
  minimumVersion: string;
  storeUrl: string;
  platform: MobileAppPlatform | null;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=com.superme.app';
  private readonly appStoreUrl = '';
  private readonly androidPackageId = 'com.superme.app';

  constructor(
    private platform: Platform,
    private remoteConfig: RemoteConfigService
  ) { }

  /**
   * Checks the installed app version against the minimum supported version
   * published via Firebase Remote Config.
   *
   * Platform-specific keys take precedence over the shared keys. This is
   * important because Android and iOS can have different release versions.
   */
  async checkForUpdate(): Promise<AppUpdateCheckResult> {
    const platform = this.getMobilePlatform();
    if (!platform) {
      return {
        updateRequired: false,
        currentVersion: 'web',
        minimumVersion: '0.0.0',
        storeUrl: this.playStoreUrl,
        platform: null
      };
    }

    const minimumVersion = this.getMinimumVersion(platform);
    const forceUpdateEnabled = this.getForceUpdateEnabled(platform);
    const currentVersion = await this.getCurrentVersion();
    const storeUrl = this.getStoreUrl(platform);

    const versionTooOld = this.isVersionLower(currentVersion, minimumVersion);
    const storeDestinationAvailable = this.isStoreDestinationValid(platform, storeUrl);
    const updateRequired = forceUpdateEnabled && versionTooOld && storeDestinationAvailable;

    if (forceUpdateEnabled && versionTooOld && !storeDestinationAvailable) {
      console.error(`[AppUpdate] Force update skipped: ${platform}_store_url is missing or invalid.`);
    }

    console.group('%c[AppUpdate] Version check', 'color: #FF5722; font-weight: bold;');
    console.log('Current version    :', currentVersion);
    console.log('Minimum required   :', minimumVersion);
    console.log('force_update flag  :', forceUpdateEnabled);
    console.log('Version too old?   :', versionTooOld);
    console.log('Store configured?  :', storeDestinationAvailable);
    console.log('Update required?   :', updateRequired);
    console.groupEnd();

    return {
      updateRequired,
      currentVersion,
      minimumVersion,
      storeUrl,
      platform
    };
  }

  /**
   * Opens the native store app and falls back to its HTTPS listing if the
   * device cannot handle the store-specific scheme.
   */
  async openStore(): Promise<boolean> {
    const platform = this.getMobilePlatform();
    console.log('[AppUpdate] Opening store for platform:', platform);

    if (platform === 'android') {
      const storeUrl = this.getStoreUrl(platform);
      const packageId = this.getAndroidPackageId(storeUrl);
      return this.openNativeUrl(`market://details?id=${packageId}`, storeUrl);
    }

    if (platform === 'ios') {
      const storeUrl = this.getStoreUrl(platform);
      const appStoreId = this.getIosAppStoreId(storeUrl);
      if (!appStoreId || !this.isStoreDestinationValid(platform, storeUrl)) {
        console.error('[AppUpdate] Cannot open App Store: ios_store_url is missing or invalid.');
        return false;
      }
      return this.openNativeUrl(`itms-apps://apps.apple.com/app/id${appStoreId}`, storeUrl);
    }

    window.open(this.playStoreUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  isNativeMobilePlatform(): boolean {
    return this.getMobilePlatform() !== null;
  }

  private async getCurrentVersion(): Promise<string> {
    try {
      const info = await App.getInfo();
      return info.version;
    } catch (error) {
      console.warn('[AppUpdateService] Unable to read app version:', error);
      return '0.0.0';
    }
  }

  private getMobilePlatform(): MobileAppPlatform | null {
    if (!Capacitor.isNativePlatform() && !this.platform.is('capacitor')) return null;

    const platform = Capacitor.getPlatform();
    return platform === 'android' || platform === 'ios' ? platform : null;
  }

  private getMinimumVersion(platform: MobileAppPlatform): string {
    const sharedMinimum = this.remoteConfig.getString('minimum_supported_version', '0.0.0');
    return this.remoteConfig.getString(`${platform}_minimum_supported_version`, '').trim() || sharedMinimum;
  }

  private getForceUpdateEnabled(platform: MobileAppPlatform): boolean {
    const sharedValue = this.remoteConfig.getBoolean('force_update_required', true);
    const platformValue = this.remoteConfig.getString(`${platform}_force_update_required`, '').trim().toLowerCase();

    if (platformValue === 'true') return true;
    if (platformValue === 'false') return false;
    return sharedValue;
  }

  private getStoreUrl(platform: MobileAppPlatform): string {
    const fallback = platform === 'android' ? this.playStoreUrl : this.appStoreUrl;
    return this.remoteConfig.getString(`${platform}_store_url`, fallback).trim() || fallback;
  }

  private isStoreDestinationValid(platform: MobileAppPlatform, storeUrl: string): boolean {
    try {
      const url = new URL(storeUrl);
      if (url.protocol !== 'https:') return false;

      if (platform === 'android') {
        return url.hostname === 'play.google.com'
          && url.pathname === '/store/apps/details'
          && !!url.searchParams.get('id');
      }

      return url.hostname === 'apps.apple.com' && !!this.getIosAppStoreId(storeUrl);
    } catch {
      return false;
    }
  }

  private async openNativeUrl(primaryUrl: string, fallbackUrl: string): Promise<boolean> {
    try {
      const primaryResult = await AppLauncher.openUrl({ url: primaryUrl });
      if (primaryResult.completed) return true;
    } catch (error) {
      console.warn('[AppUpdate] Native store scheme failed, using HTTPS fallback:', error);
    }

    try {
      const fallbackResult = await AppLauncher.openUrl({ url: fallbackUrl });
      return fallbackResult.completed;
    } catch (error) {
      console.error('[AppUpdate] Unable to open app store:', error);
      return false;
    }
  }

  private getAndroidPackageId(storeUrl: string): string {
    try {
      return new URL(storeUrl).searchParams.get('id') || this.androidPackageId;
    } catch {
      return this.androidPackageId;
    }
  }

  private getIosAppStoreId(storeUrl: string): string | null {
    return storeUrl.match(/\/id(\d+)/i)?.[1] || null;
  }

  /** Returns true if `current` is a lower semantic version than `minimum` */
  private isVersionLower(current: string, minimum: string): boolean {
    const currentParts = this.getNumericVersionParts(current);
    const minimumParts = this.getNumericVersionParts(minimum);
    const length = Math.max(currentParts.length, minimumParts.length);

    for (let i = 0; i < length; i++) {
      const c = currentParts[i] || 0;
      const m = minimumParts[i] || 0;
      if (c < m) return true;
      if (c > m) return false;
    }
    return false;
  }

  private getNumericVersionParts(version: string): number[] {
    const releaseVersion = String(version || '').trim().split(/[+-]/, 1)[0];
    return releaseVersion.split('.').map(part => {
      const numericPart = part.match(/^\d+/)?.[0];
      return numericPart ? Number(numericPart) : 0;
    });
  }
}
