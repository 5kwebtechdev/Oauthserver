import { FormBuilder } from '@angular/forms';
import { convertToParamMap, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/services/onboarding-state.service';
import { guestGuard, startupGuard } from '../../core/authe-guard/authe-guard';
import { SignupComponent, shouldRefreshSignupOnboarding } from './signup.component';

describe('Signup profile back navigation', () => {
  function profileStep(social: boolean, password: string | null = 'saved-in-memory', managedChild = false) {
    const signup = Object.create(SignupComponent.prototype) as SignupComponent;
    const navigateRoot = jasmine.createSpy('navigateRoot').and.returnValue(Promise.resolve(true));
    signup.step = 2;
    signup.managedChildSignup = managedChild;
    signup.roleSelected = managedChild ? 'child' : 'self';
    signup.profileForm = new FormBuilder().group({ name: ['Entered name'], username: ['chosen-name'] });
    (signup as any).navCtrl = { navigateRoot };
    (signup as any).router = { url: '/signup?step=2' };
    (signup as any).ngZone = { run: (callback: () => void) => callback() };
    (signup as any).signupCredentialState = { getPassword: () => password };
    Object.defineProperty(signup, 'isOAuthSignup', { get: () => social });
    return { signup, navigateRoot };
  }

  it('returns Google/social profile setup to role selection without clearing entered details', () => {
    const { signup, navigateRoot } = profileStep(true);
    signup.goBack();
    expect(navigateRoot).toHaveBeenCalledWith('/signup', {
      queryParams: { step: 1, reviewPrevious: true }, animated: false, replaceUrl: true
    });
    expect(signup.profileForm.value).toEqual({ name: 'Entered name', username: 'chosen-name' });
  });

  it('returns email profile setup to password creation, retaining the in-memory password and details', () => {
    const { signup, navigateRoot } = profileStep(false);
    signup.goBack();
    expect(navigateRoot).toHaveBeenCalledWith('/signup', {
      queryParams: { step: 0.3, reviewPrevious: true }, animated: false, replaceUrl: true
    });
    expect(signup.profileForm.get('name')?.value).toBe('Entered name');
  });

  it('returns a resumed email/managed-child flow without an in-memory password to credential entry', () => {
    const { signup, navigateRoot } = profileStep(false, null, true);
    signup.goBack();
    expect(navigateRoot).toHaveBeenCalledWith('/signup', {
      queryParams: { step: 0.1, reviewPrevious: true, role: 'child', managedChild: true }, animated: false, replaceUrl: true
    });
  });

  it('uses the same transition for Android Back and passes Back through on other routes', () => {
    const { signup, navigateRoot } = profileStep(false);
    const next = jasmine.createSpy('next');
    (signup as any).handleSystemBack(next);
    expect(navigateRoot).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    (signup as any).router.url = '/login';
    (signup as any).handleSystemBack(next);
    expect(next).toHaveBeenCalled();
  });

  it('sends browser Back from the profile step to the previous wizard step', () => {
    const { signup, navigateRoot } = profileStep(false);
    (signup as any).handleBrowserBack();
    expect(navigateRoot).toHaveBeenCalledWith('/signup', {
      queryParams: { step: 0.3, reviewPrevious: true }, animated: false, replaceUrl: true
    });
  });

  it('does not auto-resume over a deliberate back/review route', () => {
    expect(shouldRefreshSignupOnboarding(1, true)).toBeFalse();
    expect(shouldRefreshSignupOnboarding(0.3, true)).toBeFalse();
    expect(shouldRefreshSignupOnboarding(1, false)).toBeTrue();
  });

  it('lets a social user review the previous role step without a guard redirect loop', () => {
    sessionStorage.removeItem('signup_via_google');
    sessionStorage.removeItem('signup_via_oauth');
    const router = { createUrlTree: jasmine.createSpy('createUrlTree') };
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: router },
      { provide: AuthService, useValue: {
        isLoggedIn: () => true, isPendingChild: () => false,
        getUserData: () => ({ onboardingStep: 4 })
      } },
      { provide: OnboardingStateService, useValue: {
        getResumeNavigation: () => ({ url: '/signup', queryParams: { step: 2, role: 'self' } }),
        isSocialOnboarding: () => true
      } }
    ] });
    const route = { queryParamMap: convertToParamMap({ step: '1', reviewPrevious: 'true' }) } as any;
    const state = { url: '/signup?step=1&reviewPrevious=true' } as any;
    expect(TestBed.runInInjectionContext(() => guestGuard(route, state))).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('exits social onboarding on a second Back instead of looping to the profile form', () => {
    const { signup, navigateRoot } = profileStep(true);
    const logout = jasmine.createSpy('logout').and.resolveTo();
    signup.step = 1;
    (signup as any).route = { snapshot: { queryParamMap: convertToParamMap({ reviewPrevious: 'true' }) } };
    (signup as any).authService = { logout };
    signup.goBack();
    expect(logout).toHaveBeenCalledOnceWith();
    expect(navigateRoot).not.toHaveBeenCalled();
  });

  it('returns guest role selection to the walkthrough, not back to Login', () => {
    const { signup, navigateRoot } = profileStep(false, null);
    signup.step = 1;
    signup.goBack();
    expect(navigateRoot).toHaveBeenCalledOnceWith('/home?reviewPrevious=true', { animated: false, replaceUrl: true });
  });

  it('allows an explicit walkthrough review without startup redirecting to Signup or Login', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: { parseUrl: jasmine.createSpy('parseUrl'), createUrlTree: jasmine.createSpy('createUrlTree') } },
      { provide: AuthService, useValue: { isLoggedIn: () => false } },
      { provide: OnboardingStateService, useValue: {
        getResumeNavigation: () => null, hasCompletedRoleSelection: () => true, hasSeenSplash: () => true
      } }
    ] });
    const route = { queryParamMap: convertToParamMap({ reviewPrevious: 'true' }) } as any;
    expect(TestBed.runInInjectionContext(() => startupGuard(route, {} as any))).toBeTrue();
  });
});
