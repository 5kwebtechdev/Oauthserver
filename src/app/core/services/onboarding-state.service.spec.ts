import {
  HAS_LOGGED_IN_BEFORE_KEY,
  OnboardingStateService,
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
});
