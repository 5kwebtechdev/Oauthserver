import { Injectable } from '@angular/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getApps } from 'firebase/app';
import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import { GOOGLE_AUTH_INIT_OPTIONS } from '../config/google-auth.config';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionCleanupService {
  private googleInitialized = false;

  async initializeGoogleAuth(): Promise<void> {
    if (this.googleInitialized) return;

    try {
      await GoogleAuth.initialize(GOOGLE_AUTH_INIT_OPTIONS);
      this.googleInitialized = true;
    } catch (error) {
      console.warn('[AuthSessionCleanup] GoogleAuth initialization failed:', error);
    }
  }

  async prepareGoogleSignIn(): Promise<void> {
    await this.initializeGoogleAuth();
    await this.signOutGoogle(false);
  }

  async clearExternalAuthSessions(): Promise<void> {
    await Promise.all([
      this.signOutGoogle(true),
      this.signOutFirebase()
    ]);
  }

  clearBrowserStorage(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('[AuthSessionCleanup] Unable to clear sessionStorage:', error);
    }

    try {
      localStorage.clear();
    } catch (error) {
      console.warn('[AuthSessionCleanup] Unable to clear localStorage:', error);
    }
  }

  private async signOutGoogle(initializeFirst: boolean): Promise<void> {
    if (initializeFirst) {
      await this.initializeGoogleAuth();
    }

    try {
      await GoogleAuth.signOut();
    } catch (error) {
      console.warn('[AuthSessionCleanup] Google sign-out skipped or failed:', error);
    }
  }

  private async signOutFirebase(): Promise<void> {
    const apps = getApps();
    if (!apps.length) return;

    await Promise.all(
      apps.map(async app => {
        try {
          await firebaseSignOut(getAuth(app));
        } catch (error) {
          console.warn(`[AuthSessionCleanup] Firebase sign-out failed for ${app.name}:`, error);
        }
      })
    );
  }
}
