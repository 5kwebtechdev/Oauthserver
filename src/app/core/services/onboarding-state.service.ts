import { Injectable } from '@angular/core';

export const SPLASH_COMPLETED_KEY = 'superme_splash_completed_v1';
export const ROLE_SELECTION_COMPLETED_KEY = 'superme_role_selection_completed_v1';
export const HAS_LOGGED_IN_BEFORE_KEY = 'has_logged_in_before';

export const PERSISTENT_DEVICE_PREFERENCE_KEYS = [
  SPLASH_COMPLETED_KEY,
  ROLE_SELECTION_COMPLETED_KEY,
  HAS_LOGGED_IN_BEFORE_KEY
] as const;

@Injectable({
  providedIn: 'root'
})
export class OnboardingStateService {
  private readonly legacyOnboardingKey = 'onboardingComplete';

  hasSeenSplash(): boolean {
    this.migrateLegacyState();
    return this.readBoolean(SPLASH_COMPLETED_KEY);
  }

  hasCompletedRoleSelection(): boolean {
    this.migrateLegacyState();
    return this.readBoolean(ROLE_SELECTION_COMPLETED_KEY);
  }

  markSplashCompleted(): void {
    this.writeBoolean(SPLASH_COMPLETED_KEY);
  }

  markRoleSelectionCompleted(): void {
    this.writeBoolean(SPLASH_COMPLETED_KEY);
    this.writeBoolean(ROLE_SELECTION_COMPLETED_KEY);
  }

  markExistingUser(): void {
    this.markRoleSelectionCompleted();
    this.writeBoolean(HAS_LOGGED_IN_BEFORE_KEY);
  }

  /**
   * Reopens role selection without replaying the splash screens. This is used
   * when a guest backs out of login or the first signup credential step after
   * choosing the wrong role.
   */
  resetRoleSelection(): void {
    this.writeBoolean(SPLASH_COMPLETED_KEY);
    this.removeItem(ROLE_SELECTION_COMPLETED_KEY);
    this.removeItem(this.legacyOnboardingKey);

    try {
      sessionStorage.removeItem('signup_role');
    } catch (error) {
      console.warn('[OnboardingState] Unable to clear the selected signup role', error);
    }
  }

  private migrateLegacyState(): void {
    const completedLegacyOnboarding = this.readBoolean(this.legacyOnboardingKey);
    const hasLoggedInBefore = this.readBoolean(HAS_LOGGED_IN_BEFORE_KEY);

    if (completedLegacyOnboarding || hasLoggedInBefore) {
      this.markRoleSelectionCompleted();
    }
  }

  private readBoolean(key: string): boolean {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  private writeBoolean(key: string): void {
    try {
      localStorage.setItem(key, 'true');
    } catch (error) {
      console.warn(`[OnboardingState] Unable to persist ${key}`, error);
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[OnboardingState] Unable to clear ${key}`, error);
    }
  }
}
