import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { RemoteConfigService } from './remote-config.service';
import { PlayStoreUpdateInfo, PlayStoreUpdateService } from './play-store-update.service';
import { InstalledAppInfoService } from './installed-app-info.service';
import { APP_STORE_URL } from '../constants/external-links';

export type MobileAppPlatform = 'android' | 'ios';
export type AppUpdateBlockReason = 'update-required' | 'verification-failed' | null;

export interface AppUpdateCheckResult {
  updateRequired: boolean;
  verificationFailed: boolean;
  blockReason: AppUpdateBlockReason;
  currentVersion: string;
  currentBuild: number;
  minimumVersion: string;
  availableBuild: number | null;
  storeUrl: string;
  platform: MobileAppPlatform | null;
  source: 'play-store' | 'remote-config' | 'cached-requirement' | 'none';
  errorMessage?: string;
}

interface InstalledAppInfo {
  version: string;
  build: number;
}

interface CachedUpdateRequirement {
  detectedForBuild: number;
  requiredBuild: number | null;
  minimumVersion: string;
  detectedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=com.superme.app';
  private readonly appStoreUrl = APP_STORE_URL;
  private readonly androidPackageId = 'com.superme.app';
  private readonly updateRequirementCacheKey = 'superme.mandatoryUpdate.v1';
  private readonly remoteConfigTimeoutMs = 5000;
  private readonly playStoreCheckTimeoutMs = 10000;

  constructor(
    private platform: Platform,
    private remoteConfig: RemoteConfigService,
    private playStoreUpdates: PlayStoreUpdateService,
    private installedAppInfo: InstalledAppInfoService
  ) { }

  /**
   * Checks both update sources in parallel:
   * 1. Google Play's official update availability API on Android.
   * 2. The minimum supported semantic version in Firebase Remote Config.
   *
   * A detected requirement is persisted for the affected build. A later
   * network/Play Store error therefore cannot unlock that same outdated build.
   */
  async checkForUpdate(): Promise<AppUpdateCheckResult> {
    const platform = this.getMobilePlatform();
    if (!platform) {
      return {
        updateRequired: false,
        verificationFailed: false,
        blockReason: null,
        currentVersion: 'web',
        currentBuild: 0,
        minimumVersion: '0.0.0',
        availableBuild: null,
        storeUrl: this.playStoreUrl,
        platform: null,
        source: 'none'
      };
    }

    const remoteConfigRefresh = this.withTimeout<boolean>(
      this.remoteConfig.initialize(),
      this.remoteConfigTimeoutMs,
      false
    );
    const installedAppInfoPromise = this.getCurrentAppInfo();
    const playStoreInfoPromise = platform === 'android'
      ? this.getPlayStoreUpdateInfo()
      : Promise.resolve<PlayStoreUpdateInfo | null>(null);

    const [, installedApp, playStoreInfo] = await Promise.all([
      remoteConfigRefresh,
      installedAppInfoPromise,
      playStoreInfoPromise
    ]);

    const minimumVersion = this.getMinimumVersion(platform);
    const forceUpdateEnabled = this.getForceUpdateEnabled(platform);
    const storeUrl = this.getStoreUrl(platform);
    const storeDestinationAvailable = this.isStoreDestinationValid(platform, storeUrl);
    const remoteConfigRequiresUpdate =
      forceUpdateEnabled
      && this.isVersionLower(installedApp.version, minimumVersion)
      && storeDestinationAvailable;

    const currentBuild = playStoreInfo?.installedVersionCode || installedApp.build;
    const cachedRequirement = this.getOutstandingCachedRequirement(installedApp, currentBuild);
    const playStoreRequiresUpdate = !!(
      playStoreInfo?.checkSucceeded
      && playStoreInfo.updateAvailable
      && playStoreInfo.availableVersionCode > currentBuild
    );

    let source: AppUpdateCheckResult['source'] = 'none';
    if (playStoreRequiresUpdate) {
      source = 'play-store';
    } else if (remoteConfigRequiresUpdate) {
      source = 'remote-config';
    } else if (cachedRequirement) {
      source = 'cached-requirement';
    }

    const updateRequired =
      playStoreRequiresUpdate || remoteConfigRequiresUpdate || cachedRequirement !== null;

    if (updateRequired) {
      this.cacheUpdateRequirement({
        detectedForBuild: currentBuild,
        requiredBuild: this.maxRequiredBuild(
          cachedRequirement?.requiredBuild ?? null,
          playStoreRequiresUpdate ? playStoreInfo!.availableVersionCode : null
        ),
        minimumVersion: this.maxVersion(
          cachedRequirement?.minimumVersion || '0.0.0',
          remoteConfigRequiresUpdate ? minimumVersion : '0.0.0'
        ),
        detectedAt: cachedRequirement?.detectedAt || new Date().toISOString()
      });
    }

    const verificationFailed = this.shouldBlockForVerificationFailure(
      platform,
      playStoreInfo,
      updateRequired
    );

    if (
      forceUpdateEnabled
      && this.isVersionLower(installedApp.version, minimumVersion)
      && !storeDestinationAvailable
    ) {
      console.error(`[AppUpdate] ${platform}_store_url is missing or invalid.`);
    }

    console.group('%c[AppUpdate] Version check', 'color: #FF5722; font-weight: bold;');
    console.log('Current version    :', installedApp.version);
    console.log('Current build      :', currentBuild);
    console.log('Minimum required   :', minimumVersion);
    console.log('Remote force flag  :', forceUpdateEnabled);
    console.log('Play update        :', playStoreInfo);
    console.log('Cached requirement :', cachedRequirement);
    console.log('Update required?   :', updateRequired);
    console.log('Verification block :', verificationFailed);
    console.groupEnd();

    return {
      updateRequired,
      verificationFailed,
      blockReason: updateRequired
        ? 'update-required'
        : verificationFailed
          ? 'verification-failed'
          : null,
      currentVersion: installedApp.version,
      currentBuild,
      minimumVersion,
      availableBuild: playStoreRequiresUpdate
        ? playStoreInfo!.availableVersionCode
        : cachedRequirement?.requiredBuild ?? null,
      storeUrl,
      platform,
      source,
      errorMessage: playStoreInfo?.errorMessage
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

  private async getCurrentAppInfo(): Promise<InstalledAppInfo> {
    try {
      const info = await this.installedAppInfo.getInfo();
      return {
        version: info.version,
        build: this.toPositiveInteger(info.build)
      };
    } catch (error) {
      console.warn('[AppUpdateService] Unable to read app version:', error);
      return { version: '0.0.0', build: 0 };
    }
  }

  private async getPlayStoreUpdateInfo(): Promise<PlayStoreUpdateInfo | null> {
    try {
      return await this.withTimeout<PlayStoreUpdateInfo | null>(
        this.playStoreUpdates.getUpdateInfo(),
        this.playStoreCheckTimeoutMs,
        null
      );
    } catch (error) {
      console.warn('[AppUpdate] Google Play update check failed:', error);
      return null;
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
    const configuredUrl = this.remoteConfig.getString(`${platform}_store_url`, fallback).trim() || fallback;
    return this.isStoreDestinationValid(platform, configuredUrl) ? configuredUrl : fallback;
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

  private shouldBlockForVerificationFailure(
    platform: MobileAppPlatform,
    playStoreInfo: PlayStoreUpdateInfo | null,
    updateRequired: boolean
  ): boolean {
    if (platform !== 'android' || updateRequired) return false;

    // A successful Google Play response proves that this installed build is
    // current for the user's track.
    if (playStoreInfo?.checkSucceeded) return false;

    // Debug and non-Play installs cannot reliably use Play's update API. They
    // remain governed by Remote Config so local/Firebase testing is possible.
    if (playStoreInfo && (playStoreInfo.isDebuggable || !playStoreInfo.isPlayStoreInstall)) {
      return false;
    }

    // Production Play installs fail closed. The user can retry or open the
    // store, but cannot continue into the app with an unverified version.
    return true;
  }

  private getOutstandingCachedRequirement(
    installedApp: InstalledAppInfo,
    currentBuild: number
  ): CachedUpdateRequirement | null {
    const cached = this.readCachedUpdateRequirement();
    if (!cached) return null;

    const buildRequirementMet =
      cached.requiredBuild === null || currentBuild >= cached.requiredBuild;
    const versionRequirementMet =
      !this.isVersionLower(installedApp.version, cached.minimumVersion);

    if (buildRequirementMet && versionRequirementMet) {
      this.clearCachedUpdateRequirement();
      return null;
    }

    return cached;
  }

  private readCachedUpdateRequirement(): CachedUpdateRequirement | null {
    try {
      const raw = localStorage.getItem(this.updateRequirementCacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CachedUpdateRequirement>;
      if (
        typeof parsed.detectedForBuild !== 'number'
        || (parsed.requiredBuild !== null && typeof parsed.requiredBuild !== 'number')
        || typeof parsed.minimumVersion !== 'string'
        || typeof parsed.detectedAt !== 'string'
      ) {
        this.clearCachedUpdateRequirement();
        return null;
      }
      return parsed as CachedUpdateRequirement;
    } catch {
      return null;
    }
  }

  private cacheUpdateRequirement(requirement: CachedUpdateRequirement): void {
    try {
      localStorage.setItem(this.updateRequirementCacheKey, JSON.stringify(requirement));
    } catch (error) {
      console.warn('[AppUpdate] Unable to persist mandatory update state:', error);
    }
  }

  private clearCachedUpdateRequirement(): void {
    try {
      localStorage.removeItem(this.updateRequirementCacheKey);
    } catch {
      // Storage can be unavailable in restrictive WebView modes.
    }
  }

  private maxRequiredBuild(first: number | null, second: number | null): number | null {
    if (first === null) return second;
    if (second === null) return first;
    return Math.max(first, second);
  }

  private maxVersion(first: string, second: string): string {
    return this.isVersionLower(first, second) ? second : first;
  }

  private toPositiveInteger(value: string | number | undefined): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private withTimeout<T>(promise: Promise<unknown>, timeoutMs: number, fallback: T): Promise<T> {
    return new Promise<T>(resolve => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(fallback);
      }, timeoutMs);

      promise.then(value => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(value as T);
      }).catch(error => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.warn('[AppUpdate] Version check dependency failed:', error);
        resolve(fallback);
      });
    });
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
