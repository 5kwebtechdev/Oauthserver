import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { RemoteConfigService } from './remote-config.service';

export interface AppUpdateCheckResult {
  updateRequired: boolean;
  currentVersion: string;
  minimumVersion: string;
  storeUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=com.superme.app';
  private readonly appStoreUrl = 'https://apps.apple.com/app/superme/id6744050186';
  private readonly androidPackageId = 'com.superme.app';

  constructor(
    private platform: Platform,
    private remoteConfig: RemoteConfigService
  ) { }

  /**
   * Checks the installed app version against the minimum supported version
   * published via Firebase Remote Config.
   *
   * force_update_required defaults to true so that if Remote Config is
   * unreachable the version comparison still runs (safe default).
   * minimum_supported_version defaults to '0.0.0' so that a Remote Config
   * outage never forces an update on its own.
   */
  async checkForUpdate(): Promise<AppUpdateCheckResult> {
    const minimumVersion = this.remoteConfig.getString('minimum_supported_version', '0.0.0');
    const forceUpdateEnabled = this.remoteConfig.getBoolean('force_update_required', true);
    const currentVersion = await this.getCurrentVersion();

    const versionTooOld = this.isVersionLower(currentVersion, minimumVersion);
    const updateRequired = forceUpdateEnabled && versionTooOld;

    console.group('%c[AppUpdate] Version check', 'color: #FF5722; font-weight: bold;');
    console.log('Current version    :', currentVersion);
    console.log('Minimum required   :', minimumVersion);
    console.log('force_update flag  :', forceUpdateEnabled);
    console.log('Version too old?   :', versionTooOld);
    console.log('Update required?   :', updateRequired);
    console.groupEnd();

    return {
      updateRequired,
      currentVersion,
      minimumVersion,
      storeUrl: this.playStoreUrl
    };
  }

  /**
   * Opens the appropriate app store.
   * On Android uses the market:// URI so the Play Store app opens directly
   * rather than an in-app browser tab.
   */
  openStore(): void {
    const platform = Capacitor.getPlatform();
    console.log('[AppUpdate] Opening store for platform:', platform);

    if (platform === 'android') {
      // market:// is intercepted by the Play Store app directly
      window.open(`market://details?id=${this.androidPackageId}`, '_system');
    } else if (platform === 'ios') {
      window.open(this.appStoreUrl, '_system');
    } else {
      window.open(this.playStoreUrl, '_blank', 'noopener,noreferrer');
    }
  }

  private async getCurrentVersion(): Promise<string> {
    if (!this.platform.is('capacitor')) return '0.0.0';
    try {
      const info = await App.getInfo();
      return info.version;
    } catch (error) {
      console.warn('[AppUpdateService] Unable to read app version:', error);
      return '0.0.0';
    }
  }

  /** Returns true if `current` is a lower semantic version than `minimum` */
  private isVersionLower(current: string, minimum: string): boolean {
    const currentParts = current.split('.').map(part => parseInt(part, 10) || 0);
    const minimumParts = minimum.split('.').map(part => parseInt(part, 10) || 0);
    const length = Math.max(currentParts.length, minimumParts.length);

    for (let i = 0; i < length; i++) {
      const c = currentParts[i] || 0;
      const m = minimumParts[i] || 0;
      if (c < m) return true;
      if (c > m) return false;
    }
    return false;
  }
}
