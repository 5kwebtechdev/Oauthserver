import { SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';

/**
 * Production replacement for the development Apple mock.
 * It contains no mock identity data and can never create an authenticated user.
 */
export function createDevelopmentAppleResponse(
  _clientId: string,
  _hashedNonce: string
): SignInWithAppleResponse {
  throw Object.assign(new Error('Apple development mock is disabled in production.'), {
    code: 'APPLE_MOCK_DISABLED'
  });
}
