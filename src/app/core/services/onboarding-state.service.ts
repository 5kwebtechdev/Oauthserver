import { Injectable } from '@angular/core';

export const SPLASH_COMPLETED_KEY = 'superme_splash_completed_v1';
export const ROLE_SELECTION_COMPLETED_KEY = 'superme_role_selection_completed_v1';
export const HAS_LOGGED_IN_BEFORE_KEY = 'has_logged_in_before';
export const REGISTRATION_ONBOARDING_STATE_KEY = 'superme_registration_onboarding_v1';

export const PERSISTENT_DEVICE_PREFERENCE_KEYS = [
  SPLASH_COMPLETED_KEY,
  ROLE_SELECTION_COMPLETED_KEY,
  HAS_LOGGED_IN_BEFORE_KEY
] as const;

export interface RegistrationDraftData {
  userId?: number;
  email?: string;
  phone?: string;
  name?: string;
  username?: string;
  gender?: string;
  dateOfBirth?: string | number;
  dob?: string | number;
  birthDate?: string | number;
  age?: number;
  relationship?: string;
  role?: string;
  onboardingStep?: number;
  emailVerified?: boolean;
  avatarName?: string;
  avatarImageName?: string;
  petName?: string | null;
  familyCode?: string | null;
  familyName?: string | null;
  familyRole?: string | null;
  asChild?: boolean;
  authProvider?: 'google' | 'apple';
  socialProviderId?: string;
  socialOnboarding?: boolean;
  socialDetailsCompleted?: boolean;
  socialRolePending?: boolean;
  selectedSignupRole?: 'child' | 'parent' | 'self';
  familyLinkSkipped?: boolean;
  [key: string]: unknown;
}

export interface RegistrationOnboardingState {
  onboardingStep: number;
  savedData: RegistrationDraftData;
  identifierType?: 'EMAIL' | 'PHONE';
  updatedAt: number;
}

export interface OnboardingResumeNavigation {
  url: string;
  queryParams?: Record<string, string | number>;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingStateService {
  private readonly legacyOnboardingKey = 'onboardingComplete';
  // The backend uses step 6 for the final "Unlock My Potential" action and
  // returns step 7 only after that action has completed successfully.
  private readonly completedOnboardingStep = 7;

  getRegistrationState(): RegistrationOnboardingState | null {
    try {
      const raw = localStorage.getItem(REGISTRATION_ONBOARDING_STATE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<RegistrationOnboardingState>;
      const onboardingStep = this.normalizeOnboardingStep(
        parsed.savedData?.onboardingStep ?? parsed.onboardingStep
      );
      if (!onboardingStep) return null;

      return {
        onboardingStep,
        savedData: this.sanitizeDraftData(parsed.savedData || {}),
        identifierType: parsed.identifierType === 'PHONE' ? 'PHONE' : 'EMAIL',
        updatedAt: Number(parsed.updatedAt) || Date.now()
      };
    } catch (error) {
      console.warn('[OnboardingState] Unable to restore registration draft', error);
      return null;
    }
  }

  saveRegistrationDraft(
    savedData: RegistrationDraftData,
    fallbackStep?: unknown,
    identifierType?: 'EMAIL' | 'PHONE'
  ): RegistrationOnboardingState | null {
    const current = this.getRegistrationState();
    const sanitizedData = this.sanitizeDraftData(savedData);
    const onboardingStep = this.normalizeOnboardingStep(
      sanitizedData.onboardingStep ?? fallbackStep ?? current?.onboardingStep
    );
    if (!onboardingStep) return current;

    const mergedData = this.sanitizeDraftData({
      ...(current?.savedData || {}),
      ...sanitizedData,
      onboardingStep
    });
    const nextState: RegistrationOnboardingState = {
      onboardingStep,
      savedData: mergedData,
      identifierType: identifierType || current?.identifierType,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(REGISTRATION_ONBOARDING_STATE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.warn('[OnboardingState] Unable to persist registration draft', error);
    }

    return nextState;
  }

  updateRegistrationDraft(
    patch: RegistrationDraftData,
    onboardingStep?: unknown
  ): RegistrationOnboardingState | null {
    return this.saveRegistrationDraft(patch, onboardingStep);
  }

  setRegistrationStep(onboardingStep: unknown): RegistrationOnboardingState | null {
    const normalizedStep = this.normalizeOnboardingStep(onboardingStep);
    if (!normalizedStep) return this.getRegistrationState();
    return this.saveRegistrationDraft({ onboardingStep: normalizedStep }, normalizedStep);
  }

  clearRegistrationDraft(): void {
    this.removeItem(REGISTRATION_ONBOARDING_STATE_KEY);
  }

  getOnboardingStep(source?: RegistrationDraftData | null): number | null {
    if (source !== undefined && source !== null) {
      return this.normalizeOnboardingStep(source.onboardingStep);
    }
    return this.normalizeOnboardingStep(this.getRegistrationState()?.onboardingStep);
  }

  isOnboardingIncomplete(source?: RegistrationDraftData | null): boolean {
    const step = this.getOnboardingStep(source);
    return step !== null && step < this.completedOnboardingStep;
  }

  isOnboardingComplete(source?: RegistrationDraftData | null): boolean {
    const step = this.getOnboardingStep(source);
    return step !== null && step >= this.completedOnboardingStep;
  }

  getResumeNavigation(source?: RegistrationDraftData | null): OnboardingResumeNavigation | null {
    const state = this.getRegistrationState();
    const savedData = this.sanitizeDraftData({
      ...(state?.savedData || {}),
      ...(source || {})
    });
    const backendStep = this.normalizeOnboardingStep(
      source !== undefined && source !== null
        ? source.onboardingStep
        : state?.onboardingStep
    );
    const localStep = this.normalizeOnboardingStep(state?.onboardingStep);

    if (this.isSocialOnboarding(savedData)) {
      return this.getSocialResumeNavigation(savedData, backendStep, localStep);
    }

    if (!backendStep || backendStep >= this.completedOnboardingStep) return null;

    let signupStep: number;
    if (backendStep === 1) {
      signupStep = 0.1;
    } else if (backendStep === 2) {
      signupStep = 0.2;
    } else if (backendStep === 3) {
      signupStep = 0.3;
    } else if (backendStep === 4) {
      signupStep = 2;
    } else if (backendStep === 5) {
      signupStep = this.getSignupRole(savedData) === 'parent' ? 5 : 4;
    } else {
      // Backend step 6 means a pet has been saved and only the final
      // activation action remains. Never send the user back to Pet.
      signupStep = 5;
    }

    const role = this.getSignupRole(savedData);
    return {
      url: '/signup',
      queryParams: {
        step: signupStep,
        ...(role ? { role } : {})
      }
    };
  }

  getSignupRole(source?: RegistrationDraftData | null): 'child' | 'parent' | 'self' | null {
    const combined = {
      ...(this.getRegistrationState()?.savedData || {}),
      ...(source || {})
    };
    const explicitlySelectedRole = String(combined.selectedSignupRole || '').trim().toLowerCase();
    if (
      explicitlySelectedRole === 'child'
      || explicitlySelectedRole === 'parent'
      || explicitlySelectedRole === 'self'
    ) {
      return explicitlySelectedRole;
    }

    if (combined.socialRolePending === true) {
      try {
        const pendingSessionRole = sessionStorage.getItem('signup_role');
        return pendingSessionRole === 'child' || pendingSessionRole === 'parent' || pendingSessionRole === 'self'
          ? pendingSessionRole
          : null;
      } catch {
        return null;
      }
    }

    const relationship = String(combined.relationship || combined.role || '').trim().toUpperCase();

    if (relationship === 'CHILD') return 'child';
    if (relationship === 'PARENT') return 'parent';
    if (relationship === 'SELF') return combined.asChild ? 'child' : 'self';
    try {
      const sessionRole = sessionStorage.getItem('signup_role');
      if (sessionRole === 'child' || sessionRole === 'parent' || sessionRole === 'self') {
        return sessionRole;
      }
    } catch {}
    return null;
  }

  isSocialOnboarding(source?: RegistrationDraftData | null): boolean {
    const combined = {
      ...(this.getRegistrationState()?.savedData || {}),
      ...(source || {})
    };
    return combined.socialOnboarding === true
      || combined.authProvider === 'google'
      || combined.authProvider === 'apple';
  }

  getSocialProvider(source?: RegistrationDraftData | null): 'google' | 'apple' | null {
    const combined = {
      ...(this.getRegistrationState()?.savedData || {}),
      ...(source || {})
    };
    return combined.authProvider === 'apple' || combined.authProvider === 'google'
      ? combined.authProvider
      : null;
  }

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

  private normalizeOnboardingStep(value: unknown): number | null {
    const step = Number(value);
    if (!Number.isInteger(step) || step < 1 || step > 7) return null;
    return step;
  }

  private getSocialResumeNavigation(
    savedData: RegistrationDraftData,
    backendStep: number | null,
    localStep: number | null
  ): OnboardingResumeNavigation | null {
    const effectiveStep = Math.max(backendStep || 0, localStep || 0);
    if (effectiveStep >= this.completedOnboardingStep) return null;

    const role = this.getSignupRole(savedData);
    if (!role) {
      return {
        url: '/signup',
        queryParams: { step: 1 }
      };
    }

    const detailsCompleted = savedData.socialDetailsCompleted === true || effectiveStep >= 5;
    if (!detailsCompleted) {
      return {
        url: '/signup',
        queryParams: { step: 2, role }
      };
    }

    if (effectiveStep >= 6) {
      return {
        url: '/signup',
        queryParams: { step: 5, role }
      };
    }

    if (role === 'parent') {
      return {
        url: '/home/instructions-for-parent',
        queryParams: { role: 'parent' }
      };
    }

    if (role === 'child') {
      const linkedToFamily = String(savedData.relationship || '').toUpperCase() === 'CHILD'
        && savedData.asChild !== true;
      if (savedData.familyLinkSkipped === true || linkedToFamily) {
        return {
          url: '/signup',
          queryParams: { step: 4, role: 'child' }
        };
      }
      return {
        url: '/home/join-family',
        queryParams: { role: 'child' }
      };
    }

    return {
      url: '/signup',
      queryParams: { step: 4, role: 'self' }
    };
  }

  private sanitizeDraftData(data: RegistrationDraftData): RegistrationDraftData {
    const sanitized = { ...(data || {}) };
    // Registration passwords and auth tokens must never be written to browser
    // storage. The backend draft remains the source of truth for saved steps.
    delete sanitized['password'];
    delete sanitized['confirmPassword'];
    delete sanitized['token'];
    // OAuth proof values are short-lived credentials. They belong only in
    // the native/session authentication hand-off and must never be copied to
    // the resumable local registration draft.
    delete sanitized['idToken'];
    delete sanitized['accessToken'];
    delete sanitized['serverAuthCode'];
    delete sanitized['identityToken'];
    delete sanitized['authorizationCode'];
    delete sanitized['rawNonce'];
    return sanitized;
  }
}
