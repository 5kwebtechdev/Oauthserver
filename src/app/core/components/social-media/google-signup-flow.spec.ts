import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { SocialMediaComponent } from './social-media.component';
import { AuthService } from '../../services/auth.service';
import { OnboardingStateService } from '../../services/onboarding-state.service';
import { SignupComponent } from '../../../home/signup/signup.component';
import { FamilyOnboardComponent } from '../../../home/family-onboard/family-onboard.component';

describe('Google signup request sequencing', () => {
  let http: HttpTestingController;
  let auth: any;
  let social: any;
  let signup: any;
  let onboarding: OnboardingStateService;
  let savedSession: Record<string, string>;
  let savedLocal: Record<string, string>;
  const identity = { provider: 'google', providerId: 'google-sub', email: 'new@example.test',
    name: 'Google Name', avatarUrl: '', idToken: 'google-proof' };
  const loading = { dismiss: jasmine.createSpy().and.resolveTo() };

  beforeEach(() => {
    savedSession = { ...sessionStorage };
    savedLocal = { ...localStorage };
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('signup_role', 'self');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    onboarding = new OnboardingStateService();
    auth = Object.create(AuthService.prototype);
    auth.http = TestBed.inject(HttpClient);
    auth.apiUrl = '/v1';
    auth.setSession = jasmine.createSpy();
    auth.updateUserData = jasmine.createSpy();
    auth.isLoggedIn = () => false;
    auth.getUserData = () => null;
    auth.getDashboardRoute = () => '/authenticated/user';
    social = Object.create(SocialMediaComponent.prototype);
    Object.assign(social, { authService: auth, onboardingState: onboarding,
      isSocialLoginInProgress: true,
      router: { navigate: jasmine.createSpy().and.resolveTo(true) },
      analytics: { logLogin: jasmine.createSpy(), setUserId: jasmine.createSpy() },
      crashlytics: { recordException: jasmine.createSpy() } });
    signup = Object.create(SignupComponent.prototype);
    Object.assign(signup, { authService: auth, onboardingState: onboarding,
      registrationInProgress: false, profileContinueInProgress: false, managedChildSignup: false,
      profileForm: new FormGroup({ name: new FormControl('Chosen Name'), username: new FormControl('chosenuser'),
        phone: new FormControl(''), dob: new FormControl('2000-01-01') }),
      avatarSelected: 1, gender: 'male', selectedCountry: { code: '+91' },
      loadingService: { show: jasmine.createSpy(), forceHide: jasmine.createSpy() },
      core: { triggerToasrt: jasmine.createSpy() },
      navCtrl: { navigateRoot: jasmine.createSpy().and.resolveTo(true) } });
    spyOn(signup, 'getAvatarDefinition').and.returnValue({ key: 'avatar_1', imageName: 'avatar.webp' });
    spyOn(signup, 'validateReferralBeforeContinue').and.resolveTo(true);
    spyOn(signup, 'getAgeSuggestionRoles').and.returnValue([]);
    spyOn(signup, 'navigateToSignupStep');
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
    Object.entries(savedSession).forEach(([key, value]) => sessionStorage.setItem(key, value));
    Object.entries(savedLocal).forEach(([key, value]) => localStorage.setItem(key, value));
  });

  async function authenticateNewUser() {
    const pending = social.continueGoogleAuthentication(identity, loading);
    const lookup = http.expectOne('/v1/api/public/check-mail-already-exists?email=new@example.test');
    expect(lookup.request.method).toBe('GET');
    lookup.flush({ exists: false });
    await pending;
    http.expectNone('/v1/auth/oauth2/mobile-login');
  }

  it('gets Google proof, opens details and makes no mobile-login request before Continue', async () => {
    await authenticateNewUser();
    expect(social.router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
      queryParams: { step: 2, role: 'self' }, replaceUrl: true
    });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
    expect(onboarding.getRegistrationState()?.savedData.socialDetailsCompleted).toBeFalse();
  });

  it('submits completed details once at Continue and uses mobile-login for later onboarding actions', async () => {
    await authenticateNewUser();
    await signup.registerOrProceed();
    await signup.registerOrProceed();
    const request = http.expectOne('/v1/auth/oauth2/mobile-login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(jasmine.objectContaining({
      provider: 'google', providerId: 'google-sub', idToken: 'google-proof',
      email: 'new@example.test', name: 'Chosen Name', username: 'chosenuser', dob: '2000-01-01', role: 'SELF'
    }));
    http.expectNone('/v1/api/auth/complete-google-profile');
    expect(signup.registrationInProgress).toBeTrue();
    request.flush({ token: 'superme-session', user: { id: 42, onboardingStep: 5 } });
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBeNull();
    expect(signup.navigateToSignupStep).toHaveBeenCalledWith(4);

    signup.completeGoogleOnboardingFlow('self');
    const completion = http.expectOne('/v1/auth/oauth2/mobile-login');
    expect(completion.request.body.providerId).toBe('google-sub');
    http.expectNone('/v1/api/auth/complete-google-profile');
    completion.flush({ user: { id: 42, onboardingStep: 5 } });
  });

  it('keeps existing-user Google login and session handling', async () => {
    const pending = social.continueGoogleAuthentication(identity, loading);
    http.expectOne('/v1/api/public/check-mail-already-exists?email=new@example.test').flush({ exists: true });
    await pending;
    const login = http.expectOne('/v1/auth/oauth2/mobile-login');
    login.flush({ token: 'existing-session', user: { id: 9, onboardingStep: 7 } });
    await Promise.resolve();
    await Promise.resolve();
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    expect(social.router.navigate).toHaveBeenCalledWith(['/authenticated/user'], { replaceUrl: true });
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBeNull();
  });

  it('does not create an account when the lookup fails', async () => {
    const pending = social.continueGoogleAuthentication(identity, loading);
    const rejected = expectAsync(pending).toBeRejected();
    http.expectOne('/v1/api/public/check-mail-already-exists?email=new@example.test')
      .flush({ message: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    await rejected;
    http.expectNone('/v1/auth/oauth2/mobile-login');
    expect(social.router.navigate).not.toHaveBeenCalled();
  });

  it('blocks repeated Continue while asynchronous validation is pending', async () => {
    await authenticateNewUser();
    let resolve!: (value: boolean) => void;
    signup.validateReferralBeforeContinue.and.returnValue(new Promise<boolean>(done => resolve = done));
    const first = signup.registerOrProceed();
    await signup.registerOrProceed();
    expect(signup.validateReferralBeforeContinue).toHaveBeenCalledTimes(1);
    resolve(true);
    await first;
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'session', user: { id: 42, onboardingStep: 5 } });
  });

  it('retains the details and Google proof on a failed submission so it can be retried', async () => {
    await authenticateNewUser();
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ message: 'Try again' }, { status: 503, statusText: 'Unavailable' });
    expect(signup.registrationInProgress).toBeFalse();
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'session', user: { id: 42, onboardingStep: 5 } });
  });

  it('submits parent details before family setup and saves family details through mobile-login', async () => {
    sessionStorage.setItem('signup_role', 'parent');
    await authenticateNewUser();
    await signup.registerOrProceed();
    const login = http.expectOne('/v1/auth/oauth2/mobile-login');
    expect(login.request.body.role).toBe('PARENT');
    login.flush({ token: 'parent-session', user: { id: 42, onboardingStep: 4 } });
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledWith('/home/instructions-for-parent', {
      queryParams: { role: 'parent' }, animated: false
    });
    const family: any = Object.create(FamilyOnboardComponent.prototype);
    Object.assign(family, { authService: auth, familyCode: 'ABC123', onboardingState: onboarding,
      core: { triggerToasrt: jasmine.createSpy() } });
    auth.isLoggedIn = () => true;
    spyOn(family, 'navigateWithoutHistory');
    family.completeGoogleParentSignup();
    const completion = http.expectOne('/v1/auth/oauth2/mobile-login');
    expect(completion.request.body.familyCode).toBe('ABC123');
    expect(completion.request.body.providerId).toBe('google-sub');
    http.expectNone('/v1/api/auth/complete-google-profile');
    completion.flush({ token: 'parent-session', user: { id: 42, onboardingStep: 6 } });
  });

  it('requires Google proof before a pending registration can submit', async () => {
    await authenticateNewUser();
    sessionStorage.removeItem('oauth_signup_id_token');
    await signup.registerOrProceed();
    http.expectNone('/v1/auth/oauth2/mobile-login');
    http.expectNone('/v1/api/auth/complete-google-profile');
    expect(signup.registrationInProgress).toBeFalse();
    expect(signup.errorMessage).toContain('sign in with Google again');
  });

  it('opens Home for the reported existing Parent with a family, without a signup guard loop', async () => {
    auth.getDashboardRoute = () => '/parent-account';
    sessionStorage.setItem('signup_role', 'child');
    signup.isEditingPendingChildOnboarding = false;
    await authenticateNewUser();
    await signup.registerOrProceed();
    const user = { id: 829, name: 'Existing Parent', username: 'existingparent',
      email: 'new@example.test', relationship: 'PARENT', gender: 'prefer_not_to_say',
      dateOfBirth: '1998-08-31', onboardingStep: 4, family: { id: 210 } };
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'valid-parent-session', user });
    expect(signup.errorMessage).toBeNull();
    expect(signup.registrationInProgress).toBeFalse();
    expect(auth.setSession).toHaveBeenCalledOnceWith(jasmine.objectContaining({ userId: 829, user }), false);
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBeNull();
    expect(onboarding.getRegistrationState()).toBeNull();
    expect(onboarding.getResumeNavigation(user)).toBeNull();
    expect(user.onboardingStep).toBe(4);
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledWith('/parent-account', { animated: false });
    expect(onboarding.getResumeNavigation({ ...user, id: 830 })).not.toBeNull();
    http.expectNone('/v1/auth/oauth2/mobile-login');
  });

  it('opens Parent Home when Continue returns the same Parent role at step 4 with an existing family', async () => {
    sessionStorage.setItem('signup_role', 'parent');
    auth.getDashboardRoute = () => '/parent-account';
    await authenticateNewUser();
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'parent-session',
      user: { id: 829, relationship: 'PARENT', onboardingStep: 4, family: { id: 210 } } });
    expect(signup.errorMessage).toBeNull();
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledOnceWith('/parent-account', { animated: false });
  });

  it('also opens Parent Home on subsequent Google login for that existing family account', async () => {
    auth.getDashboardRoute = () => '/parent-account';
    const pending = social.continueGoogleAuthentication(identity, loading);
    http.expectOne('/v1/api/public/check-mail-already-exists?email=new@example.test').flush({ exists: true });
    await pending;
    const user = { id: 829, relationship: 'PARENT', onboardingStep: 4, family: { id: 210 } };
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'parent-session', user });
    await Promise.resolve();
    await Promise.resolve();
    expect(social.router.navigate).toHaveBeenCalledOnceWith(['/parent-account'], { replaceUrl: true });
    expect(onboarding.getResumeNavigation(user)).toBeNull();
    expect(onboarding.getRegistrationState()).toBeNull();
  });

  it('resumes a valid login at an earlier server step without reporting a failed request', async () => {
    await authenticateNewUser();
    sessionStorage.removeItem('oauth_signup_pending_submission');
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'valid-session',
      user: { id: 42, relationship: 'SELF', onboardingStep: 4 } });
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    expect(signup.errorMessage).toBeNull();
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledWith('/signup', {
      queryParams: { step: 2, role: 'self' }, animated: false
    });
    expect(signup.navigateToSignupStep).not.toHaveBeenCalledWith(4);
  });

  it('advances a new pending Child after 201 even when the response is SELF + asChild at step 4', async () => {
    sessionStorage.setItem('signup_role', 'child');
    await authenticateNewUser();
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'created-child-session',
      user: { id: 900, relationship: 'SELF', asChild: true, onboardingStep: 4 } },
      { status: 201, statusText: 'Created' });
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    expect(signup.errorMessage).toBeNull();
    expect(signup.registrationInProgress).toBeFalse();
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBeNull();
    expect(onboarding.getRegistrationState()?.savedData.socialDetailsCompleted).toBeTrue();
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledOnceWith('/home/join-family', {
      queryParams: { role: 'child' }, animated: false
    });
    expect(onboarding.getResumeNavigation({ id: 900, relationship: 'SELF', asChild: true, onboardingStep: 4 }))
      .toEqual({ url: '/home/join-family', queryParams: { role: 'child' } });
    http.expectNone('/v1/auth/oauth2/mobile-login');
  });

  it('advances a new Self after 201 at step 4 instead of returning to details', async () => {
    await authenticateNewUser();
    await signup.registerOrProceed();
    const user = { id: 901, relationship: 'SELF', asChild: false, onboardingStep: 4 };
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'created-self-session', user },
      { status: 201, statusText: 'Created' });
    expect(signup.errorMessage).toBeNull();
    expect(signup.navigateToSignupStep).toHaveBeenCalledOnceWith(4);
    expect(onboarding.getResumeNavigation(user)).toEqual({ url: '/signup', queryParams: { step: 4, role: 'self' } });
    expect(signup.navCtrl.navigateRoot).not.toHaveBeenCalledWith('/signup', {
      queryParams: { step: 2, role: 'self' }, animated: false
    });
  });

  it('still rejects an invalid response without a session instead of advancing onboarding', async () => {
    await authenticateNewUser();
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ user: { id: 42, onboardingStep: 4 } });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(signup.errorMessage).toContain('invalid server response');
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
  });
});
