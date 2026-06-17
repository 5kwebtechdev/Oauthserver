import { Injectable } from '@angular/core';

const STORAGE_KEY = 'mb_saved_creds';

export interface SavedCredentials {
  identifier: string;
  password: string;
  mode: 'email' | 'phone';
  countryCode?: string;
}

@Injectable({ providedIn: 'root' })
export class CredentialSaverService {
  save(creds: SavedCredentials): void {
    try {
      localStorage.setItem(STORAGE_KEY, btoa(unescape(encodeURIComponent(JSON.stringify(creds)))));
    } catch {}
  }

  load(): SavedCredentials | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!parsed?.identifier || !parsed?.password || !parsed?.mode) return null;
      return parsed as SavedCredentials;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  hasSaved(): boolean {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }
}
