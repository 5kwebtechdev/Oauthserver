import {
  HAS_LOGGED_IN_BEFORE_KEY,
  OnboardingStateService,
  REGISTRATION_ONBOARDING_STATE_KEY,
  ROLE_SELECTION_COMPLETED_KEY,
  SPLASH_COMPLETED_KEY
} from './onboarding-state.service';

describe('OnboardingStateService', () => {
  let service: OnboardingStateService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    service = new OnboardingStateService();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps a brand-new install in the splash flow', () => {
    expect(service.hasSeenSplash()).toBeFalse();
    expect(service.hasCompletedRoleSelection()).toBeFalse();
  });

  it('persists splash and role-selection completion independently', () => {
    service.markSplashCompleted();

    expect(localStorage.getItem(SPLASH_COMPLETED_KEY)).toBe('true');
    expect(service.hasSeenSplash()).toBeTrue();
    expect(service.hasCompletedRoleSelection()).toBeFalse();

    service.markRoleSelectionCompleted();

    expect(localStorage.getItem(ROLE_SELECTION_COMPLETED_KEY)).toBe('true');
    expect(service.hasCompletedRoleSelection()).toBeTrue();
  });

  it('reopens role selection without replaying the splash screens', () => {
    service.markRoleSelectionCompleted();
    sessionStorage.setItem('signup_role', 'parent');

    service.resetRoleSelection();

    expect(service.hasSeenSplash()).toBeTrue();
    expect(service.hasCompletedRoleSelection()).toBeFalse();
    expect(sessionStorage.getItem('signup_role')).toBeNull();
  });

  it('migrates returning users from existing persisted state', () => {
    localStorage.setItem(HAS_LOGGED_IN_BEFORE_KEY, 'true');

    expect(service.hasCompletedRoleSelection()).toBeTrue();
    expect(localStorage.getItem(SPLASH_COMPLETED_KEY)).toBe('true');
    expect(localStorage.getItem(ROLE_SELECTION_COMPLETED_KEY)).toBe('true');
  });

  it('persists a backend draft without storing credentials', () => {
    service.saveRegistrationDraft({
      email: 'aarav@example.com',
      name: 'Aarav Sharma',
      relationship: 'CHILD',
      onboardingStep: 4,
      emailVerified: true,
      petName: null,
      password: 'must-not-be-stored',
      token: 'must-not-be-stored',
      idToken: 'oauth-proof-must-not-be-stored',
      authorizationCode: 'oauth-code-must-not-be-stored'
    }, 5, 'EMAIL');

    const restored = service.getRegistrationState();
    expect(restored?.onboardingStep).toBe(4);
    expect(restored?.savedData.name).toBe('Aarav Sharma');
    expect(restored?.savedData.petName).toBeNull();
    expect(restored?.savedData['password']).toBeUndefined();
    expect(restored?.savedData['token']).toBeUndefined();
    expect(restored?.savedData['idToken']).toBeUndefined();
    expect(restored?.savedData['authorizationCode']).toBeUndefined();
    expect(localStorage.getItem(REGISTRATION_ONBOARDING_STATE_KEY)).not.toContain('must-not-be-stored');
    expect(localStorage.getItem(REGISTRATION_ONBOARDING_STATE_KEY)).not.toContain('oauth-proof');
  });

  it('maps backend steps to the existing signup screens', () => {
    expect(service.getResumeNavigation({ onboardingStep: 2 })?.queryParams?.['step']).toBe(0.2);
    expect(service.getResumeNavigation({ onboardingStep: 3 })?.queryParams?.['step']).toBe(0.3);
    expect(service.getResumeNavigation({
      onboardingStep: 4,
      relationship: 'CHILD'
    })).toEqual({
      url: '/signup',
      queryParams: { step: 2, role: 'child' }
    });
    expect(service.getResumeNavigation({
      onboardingStep: 5,
      relationship: 'SELF'
    })?.queryParams?.['step']).toBe(4);
    expect(service.getResumeNavigation({
      onboardingStep: 6,
      relationship: 'SELF'
    })?.queryParams?.['step']).toBe(5);
  });

  for (const provider of ['google', 'apple'] as const) {
    it(`resumes ${provider} Parent family completion at activation without a loop`, () => {
      service.saveRegistrationDraft({ id: 42, onboardingStep: 4, authProvider: provider,
        selectedSignupRole: 'parent', socialDetailsCompleted: true, socialFamilyCompleted: true });
      const restored = new OnboardingStateService();
      expect(restored.getResumeNavigation({ id: 42, onboardingStep: 4 })).toEqual({
        url: '/signup', queryParams: { step: 5, role: 'parent' }
      });
      expect(restored.isOnboardingComplete()).toBeFalse();
      expect(restored.getResumeNavigation({ id: 42, onboardingStep: 7 })).toBeNull();
    });

    it(`does not let a stale completed draft skip pending ${provider} Parent setup`, () => {
      service.saveRegistrationDraft({ id: 42, onboardingStep: 7, authProvider: provider,
        selectedSignupRole: 'parent', socialDetailsCompleted: true });
      expect(service.getResumeNavigation({ id: 42, onboardingStep: 4 })).toEqual({
        url: '/home/instructions-for-parent', queryParams: { role: 'parent' }
      });
    });
  }

  it('does not reuse another account’s saved family progress', () => {
    service.saveRegistrationDraft({ id: 1, onboardingStep: 6, authProvider: 'apple',
      selectedSignupRole: 'parent', socialDetailsCompleted: true, socialFamilyCompleted: true });
    service.saveRegistrationDraft({ id: 2, onboardingStep: 4, authProvider: 'google', selectedSignupRole: 'parent' });
    expect(service.getResumeNavigation()?.queryParams?.['step']).toBe(2);
    expect(service.getRegistrationState()?.savedData.socialFamilyCompleted).toBeUndefined();
  });

  it('keeps Email Parent profile and activation steps unchanged', () => {
    expect(service.getResumeNavigation({ relationship: 'PARENT', onboardingStep: 4 }))
      .toEqual({ url: '/signup', queryParams: { step: 2, role: 'parent' } });
    expect(service.getResumeNavigation({ relationship: 'PARENT', onboardingStep: 5 }))
      .toEqual({ url: '/signup', queryParams: { step: 5, role: 'parent' } });
    expect(service.getResumeNavigation({ relationship: 'PARENT', onboardingStep: 7 })).toBeNull();
  });

  it('never maps social onboarding to OTP or password screens', () => {
    service.saveRegistrationDraft({
      onboardingStep: 3,
      authProvider: 'apple',
      socialOnboarding: true,
      socialDetailsCompleted: false,
      selectedSignupRole: 'parent',
      relationship: 'PARENT'
    }, 3);

    expect(service.getResumeNavigation({ onboardingStep: 3 })).toEqual({
      url: '/signup',
      queryParams: { step: 2, role: 'parent' }
    });
  });

  it('resumes each social role at its role-specific screen after Details', () => {
    const base = {
      onboardingStep: 5,
      authProvider: 'google' as const,
      socialOnboarding: true,
      socialDetailsCompleted: true
    };

    expect(service.getResumeNavigation({
      ...base,
      selectedSignupRole: 'parent'
    })).toEqual({
      url: '/home/instructions-for-parent',
      queryParams: { role: 'parent' }
    });
    expect(service.getResumeNavigation({
      ...base,
      selectedSignupRole: 'self'
    })).toEqual({
      url: '/signup',
      queryParams: { step: 4, role: 'self' }
    });
    expect(service.getResumeNavigation({
      ...base,
      selectedSignupRole: 'child'
    })).toEqual({
      url: '/home/join-family',
      queryParams: { role: 'child' }
    });
    expect(service.getResumeNavigation({
      ...base,
      selectedSignupRole: 'child',
      familyLinkSkipped: true
    })).toEqual({
      url: '/signup',
      queryParams: { step: 4, role: 'child' }
    });
  });

  it('clears only the temporary registration draft when onboarding completes', () => {
    service.markSplashCompleted();
    service.saveRegistrationDraft({ onboardingStep: 5, email: 'draft@example.com' }, 5);

    service.clearRegistrationDraft();

    expect(service.getRegistrationState()).toBeNull();
    expect(service.hasSeenSplash()).toBeTrue();
  });
});
