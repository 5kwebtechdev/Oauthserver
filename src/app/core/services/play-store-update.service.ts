import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

export interface PlayStoreUpdateInfo {
  checkSucceeded: boolean;
  updateAvailable: boolean;
  updateAvailability: number;
  installedVersionCode: number;
  availableVersionCode: number;
  updatePriority?: number;
  clientVersionStalenessDays?: number | null;
  installerPackageName?: string;
  isPlayStoreInstall: boolean;
  isDebuggable: boolean;
  errorCode?: number;
  errorMessage?: string;
}

interface PlayStoreUpdatePlugin {
  getUpdateInfo(): Promise<PlayStoreUpdateInfo>;
}

const PlayStoreUpdate = registerPlugin<PlayStoreUpdatePlugin>('PlayStoreUpdate');

@Injectable({ providedIn: 'root' })
export class PlayStoreUpdateService {
  getUpdateInfo(): Promise<PlayStoreUpdateInfo> {
    return PlayStoreUpdate.getUpdateInfo();
  }
}
