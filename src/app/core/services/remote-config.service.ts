import { Injectable } from '@angular/core';
import { FirebaseRuntimeService } from './firebase-runtime.service';

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  constructor(private firebaseRuntime: FirebaseRuntimeService) {}

  initialize(): Promise<boolean> {
    return this.firebaseRuntime.fetchRemoteConfig();
  }

  getBoolean(key: string, fallback = false): boolean {
    return this.firebaseRuntime.getRemoteBoolean(key, fallback);
  }

  getString(key: string, fallback = ''): string {
    return this.firebaseRuntime.getRemoteString(key, fallback);
  }

  getNumber(key: string, fallback = 0): number {
    return this.firebaseRuntime.getRemoteNumber(key, fallback);
  }

  isFeatureEnabled(key: string, fallback = true): boolean {
    return this.getBoolean(key, fallback);
  }
}
