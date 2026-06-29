import { Injectable } from '@angular/core';

const STORAGE_KEY = 'mb_saved_creds';
const ACCEPTED_KEY = 'mb_save_password_accepted';
const DISMISSED_KEY = 'mb_save_password_dismissed';

export interface SavedCredentials {
  identifier: string;
  password: string;
  mode: 'email' | 'phone';
  countryCode?: string;
}

@Injectable({ providedIn: 'root' })
export class CredentialSaverService {
  async save(creds: SavedCredentials): Promise<boolean> {
    this.clearLegacySavedCredentials();
    this.markAccepted();
    return this.storeWithDevicePasswordManager(creds);
  }

  load(): SavedCredentials | null {
    this.clearLegacySavedCredentials();
    return null;
  }

  clear(): void {
    this.clearLegacySavedCredentials();
    try {
      localStorage.removeItem(ACCEPTED_KEY);
      localStorage.removeItem(DISMISSED_KEY);
    } catch {}
  }

  hasSaved(): boolean {
    return this.hasAcceptedSave();
  }

  hasAcceptedSave(): boolean {
    try {
      return localStorage.getItem(ACCEPTED_KEY) === '1';
    } catch {
      return false;
    }
  }

  shouldAskToSave(): boolean {
    return !this.hasAcceptedSave() && !this.wasDismissed();
  }

  dismissPrompt(): void {
    this.clearLegacySavedCredentials();
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
  }

  wasDismissed(): boolean {
    try {
      return !!localStorage.getItem(DISMISSED_KEY);
    } catch {
      return false;
    }
  }

  clearLegacySavedCredentials(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private markAccepted(): void {
    try {
      localStorage.setItem(ACCEPTED_KEY, '1');
      localStorage.removeItem(DISMISSED_KEY);
    } catch {}
  }

  private async storeWithDevicePasswordManager(creds: SavedCredentials): Promise<boolean> {
    const username = this.getCredentialUsername(creds);
    const password = creds.password;
    const credentialApi = (window.navigator as any)?.credentials;
    const PasswordCredentialCtor = (window as any)?.PasswordCredential;

    if (!credentialApi?.store || !PasswordCredentialCtor || !username || !password) {
      return false;
    }

    try {
      const credential = new PasswordCredentialCtor({
        id: username,
        name: username,
        password,
      });
      await credentialApi.store(credential);
      return true;
    } catch {
      return false;
    }
  }

  private getCredentialUsername(creds: SavedCredentials): string {
    if (creds.mode === 'phone') {
      const identifier = (creds.identifier || '').trim();
      if (!identifier) return '';
      if (identifier.startsWith('+')) return identifier;
      return `${creds.countryCode || ''}${identifier}`;
    }

    return (creds.identifier || '').trim();
  }
}
