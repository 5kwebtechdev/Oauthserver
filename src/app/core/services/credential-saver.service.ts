import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface SavedCredentials {
  identifier: string;
  password: string;
  mode: 'email' | 'phone';
  countryCode?: string;
}

interface NativeCredentialResult {
  saved?: boolean;
  identifier?: string;
  password?: string;
}

interface NativeCredentialsPlugin {
  savePassword(options: { identifier: string; password: string }): Promise<NativeCredentialResult>;
  getPassword(): Promise<NativeCredentialResult>;
}

const NativeCredentials = registerPlugin<NativeCredentialsPlugin>('NativeCredentials');

@Injectable({ providedIn: 'root' })
export class CredentialSaverService {
  constructor() {
    // Remove plaintext keys created by older builds. New credentials stay in the OS password manager.
    try {
      localStorage.removeItem('mb_saved_creds');
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('login_password');
    } catch {}
  }

  async save(creds: SavedCredentials): Promise<boolean> {
    const identifier = this.getCredentialIdentifier(creds);
    if (!identifier || !creds.password || Capacitor.getPlatform() !== 'android') {
      // iOS Password AutoFill is driven by the associated WKWebView form fields.
      return false;
    }

    try {
      const result = await NativeCredentials.savePassword({
        identifier,
        password: creds.password
      });
      return result.saved === true;
    } catch (error) {
      console.warn('[Credentials] Device password manager did not save the credential', error);
      return false;
    }
  }

  async suggest(): Promise<SavedCredentials | null> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return null;
    }

    try {
      const result = await NativeCredentials.getPassword();
      const identifier = (result.identifier || '').trim();
      const password = result.password || '';
      if (!identifier || !password) {
        return null;
      }

      return {
        identifier,
        password,
        mode: identifier.includes('@') ? 'email' : 'phone'
      };
    } catch (error) {
      // Cancellation and an empty password manager are normal login states.
      console.debug('[Credentials] No device credential selected', error);
      return null;
    }
  }

  private getCredentialIdentifier(creds: SavedCredentials): string {
    const identifier = (creds.identifier || '').trim();
    if (creds.mode !== 'phone' || !identifier || identifier.startsWith('+')) {
      return identifier;
    }

    return `${creds.countryCode || ''}${identifier}`;
  }
}
