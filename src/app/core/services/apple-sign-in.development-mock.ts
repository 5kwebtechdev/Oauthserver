import { SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';

type AppleMockScenario = 'first-login' | 'returning-login' | 'cancelled' | 'error';

const APPLE_MOCK_SCENARIO_KEY = 'superme_apple_mock_scenario';

export function createDevelopmentAppleResponse(
  clientId: string,
  hashedNonce: string
): SignInWithAppleResponse {
  const scenario = getMockScenario();
  if (scenario === 'cancelled') {
    throw Object.assign(new Error('The user canceled the authorization request.'), {
      code: '1001'
    });
  }
  if (scenario === 'error') {
    throw Object.assign(new Error('Development Apple sign-in failure.'), {
      code: 'MOCK_APPLE_FAILURE'
    });
  }

  const returning = scenario === 'returning-login';
  const providerId = returning ? 'dev.apple.returning-user' : 'dev.apple.first-user';
  const email = returning ? 'returning.apple@example.test' : 'first.apple@example.test';
  const now = Math.floor(Date.now() / 1000);
  const mockToken = [
    toBase64Url({ alg: 'none', kid: 'development-mock' }),
    toBase64Url({
      iss: 'https://appleid.apple.com',
      aud: clientId,
      sub: providerId,
      email,
      email_verified: true,
      nonce: hashedNonce,
      iat: now,
      exp: now + 600
    }),
    'development-mock-signature'
  ].join('.');

  return {
    response: {
      user: providerId,
      email: returning ? null : email,
      givenName: returning ? null : 'Apple',
      familyName: returning ? null : 'Tester',
      identityToken: mockToken,
      authorizationCode: `development-code-${Date.now()}`
    }
  };
}

function getMockScenario(): AppleMockScenario {
  try {
    const value = localStorage.getItem(APPLE_MOCK_SCENARIO_KEY) as AppleMockScenario | null;
    if (value && ['first-login', 'returning-login', 'cancelled', 'error'].includes(value)) {
      return value;
    }
  } catch {
    // Use the safe first-login scenario when local storage is unavailable.
  }
  return 'first-login';
}

function toBase64Url(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
