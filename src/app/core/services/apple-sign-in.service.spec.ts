import { SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import {
  AppleIdentityClaims,
  AppleSignInService,
  decodeAppleIdentityToken
} from './apple-sign-in.service';

describe('AppleSignInService', () => {
  let service: AppleSignInService;

  beforeEach(() => {
    localStorage.clear();
    service = new AppleSignInService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('normalizes first-login name, email, tokens and stable provider ID', () => {
    const nonce = 'hashed-nonce';
    const result = createResponse({
      sub: 'apple-user-1',
      email: 'private@privaterelay.appleid.com',
      nonce
    }, {
      user: 'apple-user-1',
      email: 'private@privaterelay.appleid.com',
      givenName: 'Asha',
      familyName: 'Singh'
    });

    const credential = service.normalizeCredential(result, 'raw-nonce', nonce);

    expect(credential.providerId).toBe('apple-user-1');
    expect(credential.email).toBe('private@privaterelay.appleid.com');
    expect(credential.name).toBe('Asha Singh');
    expect(credential.identityToken).toBe(credential.idToken);
    expect(credential.authorizationCode).toBe('single-use-code');
    expect(credential.rawNonce).toBe('raw-nonce');
  });

  it('recovers returning-user email from the identity token and cached first-login name', () => {
    const nonce = 'hashed-nonce';
    service.normalizeCredential(
      createResponse(
        { sub: 'apple-user-2', email: 'saved@example.com', nonce },
        { user: 'apple-user-2', email: 'saved@example.com', givenName: 'Saved', familyName: 'Name' }
      ),
      'raw-nonce',
      nonce
    );

    const returning = service.normalizeCredential(
      createResponse(
        { sub: 'apple-user-2', email: 'saved@example.com', nonce },
        { user: 'apple-user-2', email: null, givenName: null, familyName: null }
      ),
      'next-raw-nonce',
      nonce
    );

    expect(returning.email).toBe('saved@example.com');
    expect(returning.name).toBe('Saved Name');
  });

  it('rejects a token issued for a different Apple client ID', () => {
    const result = createResponse({
      sub: 'apple-user-3',
      email: 'user@example.com',
      nonce: 'hashed-nonce',
      aud: 'com.example.wrong'
    });

    expect(() => service.normalizeCredential(result, 'raw-nonce', 'hashed-nonce'))
      .toThrowError(/audience/i);
  });

  it('rejects an expired Apple identity token', () => {
    const result = createResponse({
      sub: 'apple-user-expired',
      nonce: 'hashed-nonce',
      exp: Math.floor(Date.now() / 1000) - 1
    });

    expect(() => service.normalizeCredential(result, 'raw-nonce', 'hashed-nonce'))
      .toThrowError(/expired/i);
  });

  it('rejects an Apple identity token with a mismatched nonce', () => {
    const result = createResponse({
      sub: 'apple-user-wrong-nonce',
      nonce: 'different-nonce'
    });

    expect(() => service.normalizeCredential(result, 'raw-nonce', 'hashed-nonce'))
      .toThrowError(/nonce/i);
  });

  it('rejects an authorization response without a single-use code', () => {
    const result = createResponse(
      { sub: 'apple-user-no-code', nonce: 'hashed-nonce' },
      { authorizationCode: undefined }
    );

    expect(() => service.normalizeCredential(result, 'raw-nonce', 'hashed-nonce'))
      .toThrowError(/authorization code/i);
  });

  it('recognizes Apple authorization cancellation without showing an error', () => {
    const normalized = service.normalizeError(
      new Error("The operation couldn't be completed. AuthorizationError error 1001.")
    );

    expect(normalized.cancelled).toBeTrue();
    expect(normalized.userMessage).toBe('');
  });

  it('decodes the email and stable subject from an Apple identity token', () => {
    const token = createToken({
      sub: 'stable-apple-subject',
      email: 'relay@privaterelay.appleid.com',
      nonce: 'nonce'
    });

    const claims = decodeAppleIdentityToken(token);

    expect(claims.sub).toBe('stable-apple-subject');
    expect(claims.email).toBe('relay@privaterelay.appleid.com');
  });
});

function createResponse(
  claimOverrides: Partial<AppleIdentityClaims>,
  responseOverrides: Partial<SignInWithAppleResponse['response']> = {}
): SignInWithAppleResponse {
  return {
    response: {
      user: 'apple-user',
      email: 'user@example.com',
      givenName: 'Test',
      familyName: 'User',
      identityToken: createToken(claimOverrides),
      authorizationCode: 'single-use-code',
      ...responseOverrides
    }
  };
}

function createToken(overrides: Partial<AppleIdentityClaims>): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: AppleIdentityClaims = {
    iss: 'https://appleid.apple.com',
    aud: 'com.supermeapp.app',
    sub: 'apple-user',
    email: 'user@example.com',
    nonce: 'hashed-nonce',
    iat: now,
    exp: now + 600,
    ...overrides
  };

  return [
    base64Url({ alg: 'RS256', kid: 'test-key' }),
    base64Url(claims),
    'test-signature'
  ].join('.');
}

function base64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
