import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
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
      isSocialLoginInProgress: true, pkceAuth: { enabled: false },
      router: { navigate: jasmine.createSpy().and.resolveTo(true) },
      analytics: { logLogin: jasmine.createSpy(), setUserId: jasmine.createSpy() },
      crashlytics: { recordException: jasmine.createSpy() } });
    signup = Object.create(SignupComponent.prototype);
    Object.assign(signup, { authService: auth, onboardingState: onboarding,
      pkceAuth: { enabled: false, googleLogin: jasmine.createSpy().and.resolveTo() },
      pets: [{ name: "Dragon", apiName: "Dragon-Age1-Happy.webp" }], selectedPetIndex: 0,
      registrationInProgress: false, profileContinueInProgress: false, managedChildSignup: false,
      signupCredentialState: { getPassword: () => null },
      signupForm: new FormGroup({ email: new FormControl(identity.email) }),
      profileForm: new FormGroup({ name: new FormControl('Chosen Name'), username: new FormControl('chosenuser'),
        phone: new FormControl(''), dob: new FormControl('2000-01-01') }),
      avatarSelected: 1, gender: 'male', selectedCountry: { code: '+91' },
      loadingService: { show: jasmine.createSpy(), forceHide: jasmine.createSpy() },
      core: { triggerToasrt: jasmine.createSpy() },
      router: { navigate: jasmine.createSpy().and.resolveTo(true) },
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

  it('retains the Google signup path when only the verified submission marker remains', () => {
    sessionStorage.removeItem('signup_via_google');
    sessionStorage.removeItem('signup_via_oauth');
    sessionStorage.removeItem('oauth_signup_provider');
    sessionStorage.removeItem('google_signup_provider_id');
    sessionStorage.setItem('oauth_signup_pending_submission', 'true');

    expect(signup.isOAuthSignup).toBeTrue();
  });

  it('routes an unregistered Apple account through the FE signup wizard', fakeAsync(() => {
    const appleIdentity = {
      provider: 'apple', providerId: 'apple-sub', email: 'new.apple@example.test',
      name: 'Apple Name', avatarUrl: '', idToken: 'apple-proof',
      identityToken: 'apple-proof', authorizationCode: 'apple-code',
      rawNonce: 'nonce', clientId: 'apple-client'
    };
    const toast = spyOn(social, 'presentToast').and.resolveTo();

    social.loginWithOAuthProfile(appleIdentity, loading, 'apple');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush(
      { message: 'User not found.' }, { status: 404, statusText: 'Not Found' }
    );
    tick();

    expect(social.router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
      queryParams: { step: 1 }, replaceUrl: true
    });
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
    expect(sessionStorage.getItem('oauth_signup_provider')).toBe('apple');
    expect(sessionStorage.getItem('oauth_signup_identity_token')).toBe('apple-proof');
    expect(sessionStorage.getItem('signup_role')).toBeNull();
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  }));

  it('does not start a second Google authorization while sign-in is in progress', async () => {
    const signIn = spyOn(social, 'signInWithGoogle');
    await social.open('google');
    expect(signIn).not.toHaveBeenCalled();
    http.expectNone('/v1/auth/oauth2/mobile-login');
  });

  it('surfaces backend rollback without a session or automatic retry, then permits a manual retry', fakeAsync(() => {
    const toast = spyOn(social, 'presentToast').and.resolveTo();
    const message = 'OAuth2 login failed: Transaction silently rolled back because it has been marked as rollback-only';
    social.loginWithOAuthProfile(identity, loading, 'google');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ message },
      { status: 500, statusText: 'Internal Server Error' });
    tick();
    expect(toast).toHaveBeenCalledWith(message);
    expect(social.isSocialLoginInProgress).toBeFalse();
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(social.router.navigate).not.toHaveBeenCalled();
    http.expectNone('/v1/auth/oauth2/mobile-login');

    social.loginWithOAuthProfile(identity, loading, 'google');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'retry-token',
      user: { id: 42, email: identity.email, relationship: 'SELF', onboardingStep: 7 } });
    tick();
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    http.expectNone('/v1/auth/oauth2/mobile-login');
  }));

  async function authenticateNewUser(role: 'self' | 'child' | 'parent' | null = 'self') {
    const pending = social.continueGoogleAuthentication(identity, loading);
    const lookup = http.expectOne('/v1/api/public/check-mail-already-exists?email=new@example.test');
    expect(lookup.request.method).toBe('GET');
    lookup.flush({ exists: false });
    await pending;
    // Most tests model the user selecting a role on the FE role screen after
    // the social callback. Pass null when asserting the initial screen.
    if (role) sessionStorage.setItem('signup_role', role);
    http.expectNone('/v1/auth/oauth2/mobile-login');
  }

  it('clears stale managed-child mode and sends every social role to Step 4 after role selection', async () => {
    sessionStorage.setItem('managed_child_signup', 'true');
    sessionStorage.setItem('managed_child_family_code', 'OLD-FAMILY');

    await authenticateNewUser(null);

    expect(sessionStorage.getItem('managed_child_signup')).toBeNull();
    expect(sessionStorage.getItem('managed_child_family_code')).toBeNull();
    expect((signup as any).isOAuthSignup).toBeTrue();

    for (const role of ['self', 'child', 'parent'] as const) {
      signup.roleSelected = role;
      signup.proceedWithRole();
      expect(signup.navigateToSignupStep).toHaveBeenCalledWith(2);
      signup.navigateToSignupStep.calls.reset();
    }
  });

  it('gets Google proof, opens role selection and makes no mobile-login request before Continue', async () => {
    await authenticateNewUser(null);
    expect(social.router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
      queryParams: { step: 1 }, replaceUrl: true
    });
    expect(sessionStorage.getItem('signup_role')).toBeNull();
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
    expect(onboarding.getRegistrationState()?.savedData.socialDetailsCompleted).toBeFalse();
    expect(onboarding.getRegistrationState()?.savedData.socialRolePending).toBeTrue();
  });

  it('preserves the Google SDK identity when registration-required omits identity fields', async () => {
    social.pkceAuth.enabled = true;
    social.pkceAuth.googleLogin = jasmine.createSpy().and.rejectWith({
      status: 404,
      error: { registrationRequired: true, handoffTicket: 'ticket' }
    });

    await social.continueGoogleAuthentication(identity, loading);

    expect(sessionStorage.getItem('google_signup_email')).toBe(identity.email);
    expect(sessionStorage.getItem('google_signup_provider_id')).toBe(identity.providerId);
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe(identity.idToken);
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
    expect(onboarding.getRegistrationState()?.savedData.email).toBe(identity.email);
    http.expectNone('/v1/auth/oauth2/mobile-login');
  });

  it('uses the same-tab Google proof cache if session storage loses the token before Pet submit', () => {
    sessionStorage.setItem('oauth_signup_pending_submission', 'true');
    sessionStorage.setItem('google_signup_email', identity.email);
    sessionStorage.setItem('google_signup_provider_id', identity.providerId);
    sessionStorage.setItem('signup_pet', 'Dragon-Age1-Happy.webp');
    signup.pkceAuth.getGoogleSignupProof = jasmine.createSpy().and.returnValue(identity.idToken);

    signup.completeGoogleOnboardingFlow('self', true, true);

    const request = http.expectOne('/v1/auth/oauth2/mobile-login');
    expect(request.request.body.idToken).toBe(identity.idToken);
    expect(request.request.body.email).toBe(identity.email);
    request.flush({ token: 'signup-session', user: { id: 42, onboardingStep: 7 } });
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBeNull();
  });

  it('hydrates a BE-started Google signup at role selection and skips OTP/password for every role', async () => {
    sessionStorage.setItem('managed_child_signup', 'true');
    auth.exchangeGoogleSignupHandoff = jasmine.createSpy().and.returnValue(of(identity));
    await (signup as any).completeGoogleSignupHandoff('opaque-ticket');

    expect(auth.exchangeGoogleSignupHandoff).toHaveBeenCalledOnceWith('opaque-ticket');
    expect(signup.router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
      queryParams: { step: 1 }, replaceUrl: true
    });
    expect(signup.step).toBe(1);
    expect(signup.signupForm.get('email')?.value).toBe(identity.email);
    expect(signup.profileForm.get('name')?.value).toBe(identity.name);
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe(identity.idToken);
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
    expect(sessionStorage.getItem('signup_role')).toBeNull();
    expect(sessionStorage.getItem('managed_child_signup')).toBeNull();
    expect((signup as any).isOAuthSignup).toBeTrue();

    for (const role of ['self', 'child', 'parent'] as const) {
      signup.roleSelected = role;
      signup.proceedWithRole();
      expect(signup.navigateToSignupStep).toHaveBeenCalledWith(2);
      signup.navigateToSignupStep.calls.reset();
    }
  });

  it('starts a reused deleted email with a fresh draft and current Google proof', async () => {
    sessionStorage.setItem('signup_profile', JSON.stringify({ name: 'Deleted profile', phone: 'old-phone' }));
    sessionStorage.setItem('signup_pet', 'old-pet');
    sessionStorage.setItem('familyCode', 'old-family');
    onboarding.saveRegistrationDraft({ email: identity.email, socialDetailsCompleted: true, onboardingStep: 7 }, 7, 'EMAIL');
    await authenticateNewUser();
    expect(sessionStorage.getItem('signup_profile')).toBeNull();
    expect(sessionStorage.getItem('signup_pet')).toBeNull();
    expect(sessionStorage.getItem('familyCode')).toBeNull();
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
    await signup.registerOrProceed();
    http.expectNone('/v1/auth/oauth2/mobile-login');
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(signup.navigateToSignupStep).toHaveBeenCalledWith(4);
    expect(signup.registrationInProgress).toBeFalse();
  });

  it('releases Next and retains Google proof if the submission times out', fakeAsync(() => {
    sessionStorage.setItem('oauth_signup_pending_submission', 'true');
    sessionStorage.setItem('google_signup_email', identity.email);
    sessionStorage.setItem('google_signup_provider_id', identity.providerId);
    sessionStorage.setItem('oauth_signup_id_token', identity.idToken);
    signup.completeGoogleOnboardingFlow('self');
    http.expectOne('/v1/auth/oauth2/mobile-login');
    tick(30001);
    expect(signup.registrationInProgress).toBeFalse();
    expect(signup.loadingService.forceHide).toHaveBeenCalled();
    expect(signup.errorMessage).toContain('tap Next again');
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe(identity.idToken);
  }));

  for (const role of ['self', 'child'] as const) {
    it(`submits ${role} profile, pet and completion once and waits for PKCE`, async () => {
      await authenticateNewUser(role);
      signup.pkceAuth.enabled = true;
      let finish!: () => void;
      signup.pkceAuth.googleLogin.and.returnValue(new Promise<void>(resolve => finish = resolve));
      await signup.registerOrProceed();
      http.expectNone('/v1/auth/oauth2/mobile-login');
      expect(auth.setSession).not.toHaveBeenCalled();
      expect(signup.navigateToSignupStep).toHaveBeenCalledWith(4);
      signup.step = 4;
      signup.proceedWithAvatar();
      signup.proceedWithAvatar();
      const request = http.expectOne(req => req.url.endsWith('/api/auth/register'));
      const expectedRegistration: any = {
        googleIdToken: 'google-proof', email: 'new@example.test', name: 'Google Name',
        username: 'chosenuser', dateOfBirth: '2000-01-01', relationship: 'SELF',
        petName: 'Dragon', unlockPotential: true
      };
      if (role === 'child') expectedRegistration.asChild = true;
      expect(request.request.body).toEqual(jasmine.objectContaining(expectedRegistration));
      request.flush({ access_token: 'auth-server-token', redirectTo: '/oauth2/authorize' });
      expect(auth.setSession).not.toHaveBeenCalled();
      expect(signup.pkceAuth.googleLogin).toHaveBeenCalledOnceWith('google-proof', true);
      expect(signup.registrationInProgress).toBeTrue();
      signup.proceedWithAvatar();
      http.expectNone('/v1/auth/oauth2/mobile-login');
      expect(signup.navCtrl.navigateRoot).not.toHaveBeenCalled();
      finish();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }

  it('keeps the profile draft when mobile-login returns step 3 without saving it', async () => {
    await authenticateNewUser();
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({
      token: 'premature-session', user: { id: 42, relationship: 'SELF', onboardingStep: 3 }
    });
    expect(signup.errorMessage).toContain('profile was not saved');
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(signup.navigateToSignupStep).not.toHaveBeenCalled();
    http.expectNone('/v1/auth/oauth2/mobile-login');
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
    http.expectNone('/v1/auth/oauth2/mobile-login');
    expect(signup.navigateToSignupStep).toHaveBeenCalledWith(4);
  });

  it('retains the details and Google proof on a failed submission so it can be retried', async () => {
    await authenticateNewUser();
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ message: 'Try again' }, { status: 503, statusText: 'Unavailable' });
    expect(signup.registrationInProgress).toBeFalse();
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'session', user: { id: 42, onboardingStep: 5 } });
  });

  it('submits parent details before family setup and saves family details through mobile-login', async () => {
    sessionStorage.setItem('signup_role', 'parent');
    await authenticateNewUser('parent');
    await signup.registerOrProceed();
    const login = http.expectOne('/v1/auth/oauth2/mobile-login');
    expect(login.request.body.role).toBe('PARENT');
    login.flush({ token: 'parent-session', user: { id: 42, onboardingStep: 4 } });
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledWith('/home/instructions-for-parent', {
      queryParams: { role: 'parent' }, animated: false
    });
    const family: any = Object.create(FamilyOnboardComponent.prototype);
    Object.assign(family, { authService: auth, pkceAuth: { enabled: false }, familyCode: 'ABC123', onboardingState: onboarding,
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

  for (const provider of ['google', 'apple'] as const) {
    it(`requires Parent DOB for ${provider} just as for Email signup`, () => {
      sessionStorage.setItem('signup_role', 'parent');
      sessionStorage.setItem('signup_via_oauth', 'true');
      sessionStorage.setItem('oauth_signup_provider', provider);
      const validate = signup.profileIdentityValidator([Validators.required]);
      expect(validate(new FormControl(''))).toEqual({ required: true });
      expect(validate(new FormControl('1990-01-01'))).toBeNull();
      sessionStorage.removeItem('signup_via_oauth');
      expect(validate(new FormControl(''))).toEqual({ required: true });
    });

    it(`keeps new ${provider} Parents in family setup after saving profile details`, async () => {
      sessionStorage.setItem('signup_role', 'parent');
      await authenticateNewUser('parent');
      sessionStorage.setItem('oauth_signup_provider', provider);
      await signup.registerOrProceed();
      const request = http.expectOne('/v1/auth/oauth2/mobile-login');
      expect(request.request.body.provider).toBe(provider);
      request.flush({ token: 'session', user: {
        id: 42, relationship: 'PARENT', onboardingStep: 4, family: { id: 11 }
      } });
      expect(signup.navCtrl.navigateRoot).toHaveBeenCalledOnceWith('/home/instructions-for-parent', {
        queryParams: { role: 'parent' }, animated: false
      });
      expect(onboarding.getResumeNavigation()).toEqual({
        url: '/home/instructions-for-parent', queryParams: { role: 'parent' }
      });
      http.expectNone('/v1/auth/oauth2/mobile-login');
      const family: any = Object.create(FamilyOnboardComponent.prototype);
      Object.assign(family, { authService: auth, pkceAuth: { enabled: false }, familyCode: 'ABC123', onboardingState: onboarding,
        core: { triggerToasrt: jasmine.createSpy() } });
      spyOn(family, 'navigateWithoutHistory');
      family.completeGoogleParentSignup();
      const familyRequest = http.expectOne('/v1/auth/oauth2/mobile-login');
      expect(familyRequest.request.body.provider).toBe(provider);
      familyRequest.flush({ token: 'session', user: { id: 42, relationship: 'PARENT', onboardingStep: 4 } });
      expect(family.navigateWithoutHistory).toHaveBeenCalledOnceWith('/signup', { step: 5, role: 'parent' });
      expect(new OnboardingStateService().getResumeNavigation({ id: 42, onboardingStep: 4 })).toEqual({
        url: '/signup', queryParams: { step: 5, role: 'parent' }
      });
      expect(onboarding.isOnboardingComplete()).toBeFalse();
      expect(sessionStorage.getItem('oauth_signup_provider')).toBe(provider);
    });

    it(`sends completed ${provider} Parents directly Home`, async () => {
      social.loginWithOAuthProfile({ ...identity, provider }, loading, provider);
      http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'session', user: {
        id: 42, relationship: 'PARENT', onboardingStep: 7, family: { id: 11 }
      } });
      await Promise.resolve();
      await Promise.resolve();
      expect(social.router.navigate).toHaveBeenCalledOnceWith(['/authenticated/user'], { replaceUrl: true });
      expect(onboarding.getRegistrationState()).toBeNull();
    });

    it(`retains saved ${provider} Parent progress when logging in again`, async () => {
      onboarding.saveRegistrationDraft({ id: 42, onboardingStep: 4, authProvider: provider,
        selectedSignupRole: 'parent', socialDetailsCompleted: true, socialFamilyCompleted: true });
      social.loginWithOAuthProfile({ ...identity, provider }, loading, provider);
      http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'session', user: {
        id: 42, relationship: 'PARENT', onboardingStep: 4, family: { id: 11 }
      } });
      await Promise.resolve();
      await Promise.resolve();
      expect(social.router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
        queryParams: { step: 5, role: 'parent' }, replaceUrl: true
      });
    });
  }

  it('requires Google proof before a pending registration can submit', async () => {
    await authenticateNewUser();
    sessionStorage.removeItem('oauth_signup_id_token');
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    http.expectNone('/v1/auth/oauth2/mobile-login');
    http.expectNone('/v1/api/auth/complete-google-profile');
    expect(signup.registrationInProgress).toBeFalse();
    expect(signup.errorMessage).toContain('sign in with Google again');
  });

  it('opens Home for a completed Parent returned during a different-role signup', async () => {
    auth.getDashboardRoute = () => '/parent-account';
    sessionStorage.setItem('signup_role', 'child');
    signup.isEditingPendingChildOnboarding = false;
    await authenticateNewUser('child');
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    const user = { id: 829, name: 'Existing Parent', username: 'existingparent',
      email: 'new@example.test', relationship: 'PARENT', gender: 'prefer_not_to_say',
      dateOfBirth: '1998-08-31', onboardingStep: 7, family: { id: 210 } };
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'valid-parent-session', user });
    expect(signup.errorMessage).toBeNull();
    expect(signup.registrationInProgress).toBeFalse();
    expect(auth.setSession).toHaveBeenCalledOnceWith(jasmine.objectContaining({ userId: 829, user }), false);
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBeNull();
    expect(onboarding.getRegistrationState()).toBeNull();
    expect(onboarding.getResumeNavigation(user)).toBeNull();
    expect(user.onboardingStep).toBe(7);
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledWith('/parent-account', { animated: false, replaceUrl: true });
    http.expectNone('/v1/auth/oauth2/mobile-login');
  });

  it('continues to family setup after Parent details even when the backend already created a family', async () => {
    sessionStorage.setItem('signup_role', 'parent');
    auth.getDashboardRoute = () => '/parent-account';
    await authenticateNewUser('parent');
    await signup.registerOrProceed();
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'parent-session',
      user: { id: 829, relationship: 'PARENT', onboardingStep: 4, family: { id: 210 } } });
    expect(signup.errorMessage).toBeNull();
    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledOnceWith('/home/instructions-for-parent', {
      queryParams: { role: 'parent' }, animated: false
    });
  });

  it('resumes incomplete Google Parent details instead of treating family membership as completion', async () => {
    sessionStorage.setItem('signup_role', 'parent');
    auth.getDashboardRoute = () => '/parent-account';
    const pending = social.continueGoogleAuthentication(identity, loading);
    http.expectOne('/v1/api/public/check-mail-already-exists?email=new@example.test').flush({ exists: true });
    await pending;
    const user = { id: 829, relationship: 'PARENT', onboardingStep: 4, family: { id: 210 } };
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'parent-session', user });
    await Promise.resolve();
    await Promise.resolve();
    expect(social.router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
      queryParams: { step: 2, role: 'parent' }, replaceUrl: true
    });
    expect(onboarding.getResumeNavigation(user)?.queryParams?.['step']).toBe(2);
    expect(onboarding.getRegistrationState()).not.toBeNull();
  });

  it('continues submitted Google details when the server still reports profile step 4', async () => {
    await authenticateNewUser();
    sessionStorage.removeItem('oauth_signup_pending_submission');
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'valid-session',
      user: { id: 42, relationship: 'SELF', onboardingStep: 4 } });
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    expect(signup.errorMessage).toBeNull();
    expect(signup.navigateToSignupStep).toHaveBeenCalledWith(4);
    expect(onboarding.getRegistrationState()?.savedData.socialDetailsCompleted).toBeTrue();
    expect(onboarding.getResumeNavigation()?.queryParams?.['step']).toBe(4);
  });

  it('advances a new pending Child after 201 even when the response is SELF + asChild at step 4', async () => {
    sessionStorage.setItem('signup_role', 'child');
    await authenticateNewUser('child');
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
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
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
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
    signup.completeGoogleOnboardingFlow(sessionStorage.getItem('signup_role') || 'self');
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ user: { id: 42, onboardingStep: 4 } });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(signup.errorMessage).toContain('invalid server response');
    expect(sessionStorage.getItem('oauth_signup_pending_submission')).toBe('true');
  });
  it('retries only the session handoff after registration succeeds', async () => {
    await authenticateNewUser();
    signup.pkceAuth.enabled = true;
    signup.pkceAuth.googleLogin.and.rejectWith(new Error('Network unavailable'));
    await signup.registerOrProceed();
    signup.step = 4;
    signup.proceedWithAvatar();
    http.expectOne(req => req.url.endsWith('/api/auth/register')).flush({
      access_token: 'auth-server-token', redirectTo: '/oauth2/authorize'
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(signup.navCtrl.navigateRoot).not.toHaveBeenCalled();
    expect(signup.errorMessage).toContain('account is saved');
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
    signup.pkceAuth.googleLogin.and.resolveTo();
    signup.proceedWithAvatar();
    await new Promise(resolve => setTimeout(resolve, 0));
    http.expectNone('/v1/auth/oauth2/mobile-login');
    expect(signup.pkceAuth.googleLogin).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBeNull();
  });

  it('routes a new Google parent to family choices before registration', async () => {
    await authenticateNewUser('parent');
    signup.pkceAuth.enabled = true;
    await signup.registerOrProceed();

    expect(signup.navCtrl.navigateRoot).toHaveBeenCalledOnceWith('/home/instructions-for-parent', {
      queryParams: { role: 'parent' }, animated: false
    });
    http.expectNone(req => req.url.endsWith('/api/auth/register'));
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(signup.pkceAuth.googleLogin).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBe('google-proof');
  });

  it('uses PKCE for returning web Google users without a legacy local session', async () => {
    social.pkceAuth = { enabled: true, googleLogin: jasmine.createSpy().and.resolveTo() };
    await social.continueGoogleAuthentication(identity, loading);
    expect(social.pkceAuth.googleLogin).toHaveBeenCalledOnceWith('google-proof');
    http.expectNone('/v1/auth/oauth2/mobile-login');
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(social.router.navigate).not.toHaveBeenCalled();
  });

  it('uses backend-verified identity for new web Google users', async () => {
    social.pkceAuth = { enabled: true, googleLogin: jasmine.createSpy().and.rejectWith({
      status: 404, error: { registrationRequired: true, email: identity.email,
        name: 'Verified Name', providerId: identity.providerId }
    }) };
    await social.continueGoogleAuthentication(identity, loading);
    expect(sessionStorage.getItem('google_signup_name')).toBe('Verified Name');
    expect(social.router.navigate).toHaveBeenCalledWith(['/signup'], {
      queryParams: { step: 1 }, replaceUrl: true
    });
    http.expectNone('/v1/auth/oauth2/mobile-login');
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('does not start registration when web Google verification fails', async () => {
    social.pkceAuth = { enabled: true, googleLogin: jasmine.createSpy().and.rejectWith({ status: 401 }) };
    await expectAsync(social.continueGoogleAuthentication(identity, loading)).toBeRejected();
    expect(social.router.navigate).not.toHaveBeenCalled();
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it('preserves the real PKCE token while Parent family details are saved', () => {
    const family: any = Object.create(FamilyOnboardComponent.prototype);
    Object.assign(family, { authService: auth, pkceAuth: { enabled: true },
      familyCode: 'ABC123', onboardingState: onboarding, core: { triggerToasrt: jasmine.createSpy() } });
    sessionStorage.setItem('oauth_signup_provider', 'google');
    sessionStorage.setItem('google_signup_provider_id', identity.providerId);
    sessionStorage.setItem('google_signup_email', identity.email);
    sessionStorage.setItem('oauth_signup_id_token', identity.idToken);
    spyOn(family, 'navigateWithoutHistory');
    family.completeGoogleParentSignup();
    const user = { id: 42, relationship: 'PARENT', onboardingStep: 6 };
    http.expectOne('/v1/auth/oauth2/mobile-login').flush({ token: 'legacy-token', user });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(auth.updateUserData).toHaveBeenCalledWith(user);
    expect(family.navigateWithoutHistory).toHaveBeenCalledWith('/signup', { step: 5, role: 'parent' });
  });

});
