import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { App } from '@capacitor/app';
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

  constructor(
    private platform: Platform,
    private remoteConfig: RemoteConfigService
  ) { }

  /**
   * Checks the installed app version against the minimum supported version
   * published via Firebase Remote Config.
   */
  async checkForUpdate(): Promise<AppUpdateCheckResult> {
    const minimumVersion = this.remoteConfig.getString('minimum_supported_version', '0.0.0');
    const forceUpdateEnabled = this.remoteConfig.getBoolean('force_update_required', false);
    const currentVersion = await this.getCurrentVersion();

    const updateRequired = forceUpdateEnabled && this.isVersionLower(currentVersion, minimumVersion);

    return {
      updateRequired,
      currentVersion,
      minimumVersion,
      storeUrl: this.playStoreUrl
    };
  }

  /** Opens the Play Store listing for the app */
  openStore(): void {
    window.open(this.playStoreUrl, '_blank', 'noopener,noreferrer');
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
