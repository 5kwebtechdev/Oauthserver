import { Injectable, Injector } from '@angular/core';
import { NotesService } from '../components/notes/notes.service';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getApps } from 'firebase/app';
import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import { GOOGLE_AUTH_INIT_OPTIONS } from '../config/google-auth.config';
import { TaskApi } from '../api/task.api';
import { UserService } from './user.service';
import { ProfileStoreService } from './profile-store.service';
import { LearningService } from './learning.service';
import { TutorService } from './tutor.service';
import { CoinService } from './coin.service';
import { AddressService } from './address.service';
import { CartService } from './cart.service';
import { PetAgeService } from './pet-age.service';
import { TutorLikeService } from './tutor-like.service';
import { BadgeSocketService } from './badge-socket.service';
import { LoadingService } from './loading.service';
import { PERSISTENT_DEVICE_PREFERENCE_KEYS } from './onboarding-state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionCleanupService {
  private googleInitialized = false;

  constructor(private injector: Injector) {}

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
    const persistentDevicePreferences = new Map<string, string>();

    try {
      PERSISTENT_DEVICE_PREFERENCE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          persistentDevicePreferences.set(key, value);
        }
      });
    } catch (error) {
      console.warn('[AuthSessionCleanup] Unable to read persistent device preferences:', error);
    }

    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('[AuthSessionCleanup] Unable to clear sessionStorage:', error);
    }

    try {
      localStorage.clear();
      persistentDevicePreferences.forEach((value, key) => {
        localStorage.setItem(key, value);
      });
    } catch (error) {
      console.warn('[AuthSessionCleanup] Unable to clear localStorage:', error);
    }
  }

  /**
   * Clear singleton state that survives local/session storage removal.
   * Injector lookup keeps cleanup centralized without creating constructor
   * cycles with services that themselves depend on AuthService.
   */
  clearInMemoryUserData(): void {
    const resets: Array<[string, () => void]> = [
      ['notes', () => this.injector.get(NotesService).clear()],
      ['tasks/calendar', () => this.injector.get(TaskApi).clearCache()],
      ['user profile', () => this.injector.get(UserService).clearUserProfile()],
      ['selected child', () => this.injector.get(ProfileStoreService).reset()],
      ['learning', () => this.injector.get(LearningService).clearCache()],
      ['tutors', () => this.injector.get(TutorService).clearCache()],
      ['coins', () => this.injector.get(CoinService).reset()],
      ['addresses', () => this.injector.get(AddressService).reset()],
      ['cart', () => this.injector.get(CartService).reset()],
      ['pet state', () => this.injector.get(PetAgeService).clearSessionData()],
      ['tutor likes', () => this.injector.get(TutorLikeService).reset()],
      ['badge socket', () => {
        const socket = this.injector.get(BadgeSocketService);
        socket.disconnect();
        socket.clearQueue();
      }],
      ['loading state', () => this.injector.get(LoadingService).reset()]
    ];

    resets.forEach(([name, reset]) => {
      try {
        reset();
      } catch (error) {
        console.warn(`[AuthSessionCleanup] Unable to reset ${name}:`, error);
      }
    });
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
