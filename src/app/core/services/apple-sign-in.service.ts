import { Injectable } from '@angular/core';
import {
  SignInWithApple,
  SignInWithAppleResponse
} from '@capacitor-community/apple-sign-in';
import { environment } from '../../../environments/environment';
import { createDevelopmentAppleResponse } from './apple-sign-in.development-mock';

export interface AppleIdentityClaims {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  nonce?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface AppleAuthorizationCredential {
  provider: 'apple';
  providerId: string;
  email: string;
  name: string;
  avatarUrl: '';
  idToken: string;
  identityToken: string;
  authorizationCode: string;
  rawNonce: string;
  clientId: string;
  isDevelopmentMock?: boolean;
}

interface CachedAppleProfile {
  providerId: string;
  email?: string;
  name?: string;
}

const APPLE_PROFILE_CACHE_KEY = 'superme_apple_profile_v1';
const APPLE_MOCK_ENABLED_KEY = 'superme_apple_mock_enabled';

@Injectable({ providedIn: 'root' })
export class AppleSignInService {
  private readonly config = environment.appleSignIn;

  isDevelopmentMockActive(): boolean {
    if (environment.production || !this.config.developmentMockEnabled) {
      return false;
    }

    try {
      return localStorage.getItem(APPLE_MOCK_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  async authorize(): Promise<AppleAuthorizationCredential> {
    const rawNonce = this.createRandomValue();
    const hashedNonce = await this.sha256(rawNonce);

    if (this.isDevelopmentMockActive()) {
      const mockResponse = createDevelopmentAppleResponse(
        this.config.nativeClientId,
        hashedNonce
      );
      const credential = this.normalizeCredential(mockResponse, rawNonce, hashedNonce);
      return { ...credential, isDevelopmentMock: true };
    }

    const state = this.createRandomValue();
    const result = await SignInWithApple.authorize({
      // The native iOS implementation authenticates the app's bundle ID.
      // These values are still supplied for plugin API compatibility and for
      // a future web implementation.
      clientId: this.config.nativeClientId,
      redirectURI: this.config.redirectUri,
      scopes: 'email name',
      state,
      nonce: hashedNonce
    });

    return this.normalizeCredential(result, rawNonce, hashedNonce);
  }

  normalizeCredential(
    result: SignInWithAppleResponse,
    rawNonce: string,
    hashedNonce: string
  ): AppleAuthorizationCredential {
    const response = result?.response;
    const identityToken = String(response?.identityToken || '').trim();
    const authorizationCode = String(response?.authorizationCode || '').trim();

    if (!identityToken) {
      throw this.createError(
        'APPLE_MISSING_IDENTITY_TOKEN',
        'Apple sign-in did not return an identity token.'
      );
    }
    if (!authorizationCode) {
      throw this.createError(
        'APPLE_MISSING_AUTHORIZATION_CODE',
        'Apple sign-in did not return an authorization code.'
      );
    }

    const claims = decodeAppleIdentityToken(identityToken);
    this.validatePublicClaims(claims, hashedNonce);

    const responseProviderId = String(response?.user || '').trim();
    const providerId = responseProviderId || String(claims.sub || '').trim();
    if (!providerId) {
      throw this.createError(
        'APPLE_MISSING_USER_ID',
        'Apple sign-in did not return a stable user identifier.'
      );
    }

    const cached = this.readCachedProfile(providerId);
    const email = String(response?.email || claims.email || cached?.email || '').trim();
    // The current native plugin returns givenName/familyName. Keep the
    // fullName fallbacks too so an upgrade or a platform-specific response
    // shape cannot silently discard the one-time Apple name payload.
    const responseWithNameFallbacks = response as unknown as {
      givenName?: string | null;
      familyName?: string | null;
      fullName?: string | { givenName?: string | null; familyName?: string | null } | null;
      name?: string | null;
    } | undefined;
    const nestedFullName = responseWithNameFallbacks?.fullName;
    const responseName = [
      String(responseWithNameFallbacks?.givenName || '').trim(),
      String(responseWithNameFallbacks?.familyName || '').trim(),
      typeof nestedFullName === 'object'
        ? String(nestedFullName?.givenName || '').trim()
        : '',
      typeof nestedFullName === 'object'
        ? String(nestedFullName?.familyName || '').trim()
        : ''
    ].filter(Boolean).join(' ');
    const fullNameString = typeof nestedFullName === 'string'
      ? nestedFullName.trim()
      : String(responseWithNameFallbacks?.name || '').trim();
    const name = responseName || fullNameString || String(cached?.name || '').trim();

    this.cacheFirstPartyProfile({ providerId, email, name });

    return {
      provider: 'apple',
      providerId,
      email,
      name,
      avatarUrl: '',
      idToken: identityToken,
      identityToken,
      authorizationCode,
      rawNonce,
      clientId: this.config.nativeClientId
    };
  }

  normalizeError(error: unknown): {
    cancelled: boolean;
    code: string;
    debugMessage: string;
    userMessage: string;
  } {
    const source = error as any;
    const message = String(source?.message || source || 'Unknown Apple sign-in error').trim();
    const code = String(source?.code || this.extractAuthorizationCode(message) || '').trim();
    const normalized = `${code} ${message}`.toLowerCase();
    const cancelled =
      code === '1001'
      || normalized.includes('canceled')
      || normalized.includes('cancelled')
      || normalized.includes('cancel')
      || normalized.includes('dismiss');

    return {
      cancelled,
      code,
      debugMessage: `[${code || 'NO_CODE'}] ${message}`,
      userMessage: cancelled
        ? ''
        : this.userMessageForCode(code, message)
    };
  }

  private validatePublicClaims(claims: AppleIdentityClaims, hashedNonce: string): void {
    if (claims.iss !== 'https://appleid.apple.com') {
      throw this.createError('APPLE_INVALID_ISSUER', 'Apple identity token has an invalid issuer.');
    }

    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.filter(Boolean).includes(this.config.nativeClientId)) {
      throw this.createError(
        'APPLE_INVALID_AUDIENCE',
        `Apple identity token audience does not match ${this.config.nativeClientId}.`
      );
    }

    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      throw this.createError('APPLE_EXPIRED_TOKEN', 'Apple identity token has expired.');
    }

    if (!claims.nonce || claims.nonce !== hashedNonce) {
      throw this.createError('APPLE_INVALID_NONCE', 'Apple identity token nonce validation failed.');
    }
  }

  private cacheFirstPartyProfile(profile: CachedAppleProfile): void {
    if (!profile.email && !profile.name) return;

    try {
      const existing = this.readCachedProfiles();
      const current: Partial<CachedAppleProfile> = existing[profile.providerId] || {};
      existing[profile.providerId] = {
        providerId: profile.providerId,
        email: profile.email || current.email || '',
        name: profile.name || current.name || ''
      };
      localStorage.setItem(APPLE_PROFILE_CACHE_KEY, JSON.stringify(existing));
    } catch {
      // The backend remains the source of truth. A disabled local cache must
      // never prevent Apple authentication.
    }
  }

  private readCachedProfile(providerId: string): CachedAppleProfile | null {
    try {
      return this.readCachedProfiles()[providerId] || null;
    } catch {
      return null;
    }
  }

  private readCachedProfiles(): Record<string, CachedAppleProfile> {
    const raw = localStorage.getItem(APPLE_PROFILE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  private createRandomValue(length = 32): string {
    if (!globalThis.crypto?.getRandomValues) {
      throw this.createError(
        'APPLE_CRYPTO_UNAVAILABLE',
        'Secure random number generation is unavailable.'
      );
    }

    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async sha256(value: string): Promise<string> {
    if (!globalThis.crypto?.subtle) {
      throw this.createError('APPLE_CRYPTO_UNAVAILABLE', 'Secure hashing is unavailable.');
    }
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private extractAuthorizationCode(message: string): string {
    return message.match(/(?:error\s+|code[=:\s]+)(\d{4})/i)?.[1] || '';
  }

  private userMessageForCode(code: string, message: string): string {
    if (code === '1000') {
      return "Apple sign-in could not be completed. Please verify the app's Apple Sign-In configuration.";
    }
    if (code === '1003') {
      return 'Apple sign-in could not process this request. Please try again.';
    }
    if (code === '1004') {
      return 'Apple sign-in is temporarily unavailable. Please try again later.';
    }
    if (code === 'APPLE_INVALID_AUDIENCE') {
      return 'Apple sign-in configuration does not match this app build.';
    }
    return message || 'Apple sign-in failed. Please try again.';
  }

  private createError(code: string, message: string): Error & { code: string } {
    return Object.assign(new Error(message), { code });
  }
}

export function decodeAppleIdentityToken(identityToken: string): AppleIdentityClaims {
  const parts = identityToken.split('.');
  if (parts.length !== 3 || !parts[1]) {
    throw Object.assign(new Error('Apple identity token is not a valid JWT.'), {
      code: 'APPLE_INVALID_TOKEN'
    });
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = decodeURIComponent(
      Array.from(atob(padded))
        .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(decoded) as AppleIdentityClaims;
  } catch {
    throw Object.assign(new Error('Apple identity token payload could not be decoded.'), {
      code: 'APPLE_INVALID_TOKEN'
    });
  }
}
