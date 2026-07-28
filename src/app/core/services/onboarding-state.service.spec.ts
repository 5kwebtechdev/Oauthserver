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
      token: 'must-not-be-stored'
    }, 5, 'EMAIL');

    const restored = service.getRegistrationState();
    expect(restored?.onboardingStep).toBe(4);
    expect(restored?.savedData.name).toBe('Aarav Sharma');
    expect(restored?.savedData.petName).toBeNull();
    expect(restored?.savedData['password']).toBeUndefined();
    expect(restored?.savedData['token']).toBeUndefined();
    expect(localStorage.getItem(REGISTRATION_ONBOARDING_STATE_KEY)).not.toContain('must-not-be-stored');
  });

  it('maps backend steps to the existing signup screens', () => {
    expect(service.getResumeNavigation({ onboardingStep: 2 })?.queryParams?.['step']).toBe(0.2);
    expect(service.getResumeNavigation({ onboardingStep: 3 })?.queryParams?.['step']).toBe(0.3);
    expect(service.getResumeNavigation({
      onboardingStep: 4,
      relationship: 'CHILD'
    })).toEqual({
      url: '/home/sign-up',
      queryParams: { step: 2, role: 'child' }
    });
    expect(service.getResumeNavigation({
      onboardingStep: 5,
      relationship: 'SELF'
    })?.queryParams?.['step']).toBe(4);
    expect(service.getResumeNavigation({
      onboardingStep: 6,
      relationship: 'SELF'
    })).toBeNull();
  });

  it('clears only the temporary registration draft when onboarding completes', () => {
    service.markSplashCompleted();
    service.saveRegistrationDraft({ onboardingStep: 5, email: 'draft@example.com' }, 5);

    service.clearRegistrationDraft();

    expect(service.getRegistrationState()).toBeNull();
    expect(service.hasSeenSplash()).toBeTrue();
  });
});
