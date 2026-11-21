import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PkceAuthService } from './pkce-auth.service';
import { LoadingService } from './loading.service';
import { OnboardingStateService } from './onboarding-state.service';
import { sessionStorageAdapter as storage } from '../storage/session-storage';
import { GOOGLE_AUTH_WEB_CLIENT_ID, GOOGLE_AUTH_ANDROID_DEV_CLIENT_ID } from '../config/google-auth.config';

// Identity tokens here are synthetic test fixtures; no Google or backend request is made.
function googleToken(nonce: string, overrides: any = {}): string {
  const encode = (value: any) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return encode({ alg: 'RS256' }) + '.' + encode({ sub: 'test-google-subject', aud: GOOGLE_AUTH_WEB_CLIENT_ID, azp: GOOGLE_AUTH_ANDROID_DEV_CLIENT_ID, nonce, ...overrides }) + '.test-signature';
}
describe('DEV native Google code exchange', () => {
  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  afterEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  function create() {
    let loggedIn = false;
    const post = jasmine.createSpy().and.returnValue(of({ code: 'one-time-code', expires_in: 60 }));
    const router = { navigateByUrl: jasmine.createSpy().and.resolveTo(true), navigate: jasmine.createSpy().and.resolveTo(true) };
    const loading = { show: jasmine.createSpy().and.returnValue('google-loader'), hide: jasmine.createSpy() };
    const onboarding = { clearRegistrationDraft: jasmine.createSpy(), saveRegistrationDraft: jasmine.createSpy() };
    const oauth: any = { hasValidAccessToken: () => loggedIn, getAccessToken: () => 'test-access',
      tryLoginCodeFlow: jasmine.createSpy().and.callFake(async () => { loggedIn = true; }) };
    const service = new PkceAuthService(oauth, { get: (type: any) => type === HttpClient ? { post } : type === LoadingService ? loading : type === OnboardingStateService ? onboarding : router } as any);
    Object.defineProperty(service, 'nativeDev', { value: true }); Object.defineProperty(service, 'enabled', { value: true });
    Object.defineProperty(service, 'androidConfig', { value: { clientId: 'supermeapp-dev-android', redirectUri: 'superme://oauth/dev/callback', googleTurnstileSiteKey: 'public-test-key' } });
    spyOn(service as any, 'ensureNativeDiscovery').and.resolveTo();
    const sync = spyOn(service as any, 'syncSession');
    const captcha = spyOn(service as any, 'googleSecurityCheck').and.resolveTo({ ticket: 'test-handoff', transactionId: 'test-transaction', expiresAt: Date.now() + 300000 });
    spyOn(service as any, 'cancelGoogleTransaction').and.resolveTo();
    const sdk = spyOn(service as any, 'googleCredential').and.callFake(async (nonce: string) => ({ idToken: googleToken(nonce) }));
    const context = { state: 'separate-state', libraryState: 'saved-oidc-nonce', oidcNonce: 'saved-oidc-nonce', codeChallenge: 'a'.repeat(43), createdAt: Date.now() };
    storage.setItem('superme_oidc_android_pending', JSON.stringify(context));
    return { service, post, router, loading, onboarding, oauth, sync, captcha, sdk, context };
  }
  it('sends Google proof, fresh CAPTCHA, distinct nonces and challenge once, then uses the existing PKCE callback', async () => {
    const { service, post, oauth, sync } = create();
    await (service as any).completeNativeGoogle();
    expect(post.calls.count()).toBe(1);
    const [url, body] = post.calls.mostRecent().args;
    expect(url).toContain('/v1/auth/android-dev/google');
    expect(body.clientId).toBe('supermeapp-dev-android');
    expect(url).toContain('/google/exchange');
    expect(body.handoffTicket).toBe('test-handoff');
    expect(body.turnstileToken).toBeUndefined();
    expect(body.code_verifier).toBeUndefined(); expect(body.client_secret).toBeUndefined();
    expect(oauth.tryLoginCodeFlow).toHaveBeenCalledOnceWith({ customHashFragment: '?code=one-time-code&state=saved-oidc-nonce', preventClearHashAfterLogin: true });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('oauth_signup_id_token')).toBeNull();
  });
  it('fails closed before SDK launch if Turnstile fails', async () => {
    const { service, captcha, sdk, post } = create(); captcha.and.rejectWith(new Error('challenge failed'));
    await expectAsync((service as any).completeNativeGoogle()).toBeRejected();
    expect(sdk).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
    expect((service as any).nativeGoogleBusy).toBeFalse();
  });
  it('rejects a mismatched Google nonce before the exchange request', async () => {
    const { service, sdk, post, sync } = create(); sdk.and.resolveTo({ idToken: googleToken('wrong-nonce') });
    await expectAsync((service as any).completeNativeGoogle()).toBeRejected();
    expect(post).not.toHaveBeenCalled(); expect(sync).not.toHaveBeenCalled();
  });
  it('rejects wrong Google audience and authorized party', async () => {
    for (const overrides of [{ aud: 'other-client' }, { azp: 'other-android-client' }]) {
      const { service, sdk, post } = create(); sdk.and.callFake(async (nonce: string) => ({ idToken: googleToken(nonce, overrides) }));
      await expectAsync((service as any).completeNativeGoogle()).toBeRejected(); expect(post).not.toHaveBeenCalled();
    }
  });
  it('handles account-picker cancellation without an API call', async () => {
    const { service, sdk, post } = create(); sdk.and.rejectWith({ code: 'GOOGLE_CANCELLED' });
    await expectAsync((service as any).completeNativeGoogle()).toBeRejectedWithError(/cancelled/);
    expect(post).not.toHaveBeenCalled();
  });
  it('does not publish tokens if the OAuth ID-token validation fails', async () => {
    const { service, oauth, sync, post } = create(); oauth.tryLoginCodeFlow.and.rejectWith(new Error('Invalid OIDC nonce'));
    await expectAsync((service as any).completeNativeGoogle()).toBeRejected();
    expect(sync).not.toHaveBeenCalled(); expect(post.calls.count()).toBe(1);
    expect((service as any).stagedOidc).toBeUndefined();
  });
  it('routes a verified new identity to onboarding without creating a session or storing its Google token', async () => {
    const { service, post, onboarding, router, sync, oauth } = create();
    post.and.returnValue(throwError(() => ({ status: 409, error: { error: 'registration_required', email: 'new@example.invalid', name: 'Test User', pictureUrl: '' } })));
    await (service as any).completeNativeGoogle();
    expect(router.navigate).toHaveBeenCalledWith(['/signup'], { queryParams: { step: 1 }, replaceUrl: true });
    expect(onboarding.saveRegistrationDraft.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ email: 'new@example.invalid', nativeGoogleRegistration: true }));
    expect(onboarding.saveRegistrationDraft.calls.mostRecent().args[0].idToken).toBeUndefined();
    expect(sync).not.toHaveBeenCalled(); expect(oauth.tryLoginCodeFlow).not.toHaveBeenCalled();
    expect(service.getGoogleSignupProof()).toBeTruthy(); expect(sessionStorage.getItem('oauth_signup_id_token')).toBeNull();
  });
  it('never retries terminal API errors with the same Google proof', async () => {
    for (const [status, error] of [[401, 'captcha_failed'], [409, 'google_token_replayed'], [429, 'too_many_requests'], [503, 'client_not_ready']]) {
      const { service, post, oauth } = create(); post.and.returnValue(throwError(() => ({ status, error: { error } })));
      await expectAsync((service as any).completeNativeGoogle()).toBeRejected();
      expect(post.calls.count()).toBe(1); expect(oauth.tryLoginCodeFlow).not.toHaveBeenCalled();
    }
  });
  it('rejects a stale transaction after the native picker returns', async () => {
    const { service, sdk, post } = create(); sdk.and.callFake(async (nonce: string) => { storage.removeItem('superme_oidc_android_pending'); return { idToken: googleToken(nonce) }; });
    await expectAsync((service as any).completeNativeGoogle()).toBeRejected(); expect(post).not.toHaveBeenCalled();
  });
  it('opens only the hosted security URL and verifies its callback state before Google', async () => {
    const { service, post, captcha, context } = create(); captcha.and.callThrough();
    post.and.returnValue(of({ transactionId: 'tx', securityCheckUrl: 'https://auth.supermeapp.com/android-dev/google-security?transaction=tx', expires_in: 300 }));
    const browser = spyOn(service as any, 'launchAuthWebView').and.resolveTo({ callbackUrl: 'superme://oauth/dev/callback?android_google_ticket=opaque&state=separate-state' });
    const proof = await (service as any).googleSecurityCheck(context, 'google-nonce');
    expect(proof.ticket).toBe('opaque');
    expect(browser).toHaveBeenCalledTimes(1);
    expect(post.calls.first().args[1]).toEqual(jasmine.objectContaining({ state: context.state, oidcNonce: context.oidcNonce, googleNonce: 'google-nonce', codeChallenge: context.codeChallenge }));
  });
  it('rejects spoofed hosted URLs and mismatched callback states', async () => {
    for (const wrongHost of [true, false]) {
      const { service, post, captcha, context } = create(); captcha.and.callThrough();
      post.and.returnValue(of({ transactionId: 'tx', securityCheckUrl: 'https://' + (wrongHost ? 'evil.invalid' : 'auth.supermeapp.com') + '/android-dev/google-security?transaction=tx', expires_in: 300 }));
      const browser = spyOn(service as any, 'launchAuthWebView').and.resolveTo({ callbackUrl: 'superme://oauth/dev/callback?android_google_ticket=opaque&state=wrong' });
      await expectAsync((service as any).googleSecurityCheck(context, 'nonce')).toBeRejected();
      if (wrongHost) expect(browser).not.toHaveBeenCalled();
      expect((service as any).cancelGoogleTransaction).toHaveBeenCalledWith('tx');
    }
  });
  it('serializes repeated Google actions', async () => {
    const { service, captcha, sdk, post } = create(); let release!: (token: any) => void;
    captcha.and.returnValue(new Promise<any>(resolve => { release = resolve; }));
    const first = (service as any).completeNativeGoogle();
    await expectAsync((service as any).completeNativeGoogle()).toBeRejectedWithError(/already in progress/);
    release({ ticket: 'test-handoff', transactionId: 'test-transaction', expiresAt: Date.now() + 300000 }); await first;
    expect(sdk.calls.count()).toBe(1); expect(post.calls.count()).toBe(1);
  });
});
