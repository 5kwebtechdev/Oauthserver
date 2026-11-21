import { Capacitor, registerPlugin } from '@capacitor/core';

const nativeSession = registerPlugin<{ read(): Promise<{ value: string }>; write(options: { value: string }): Promise<void> }>('SecureSession');
export const secureSessionBridge = {
  read: () => nativeSession.read(),
  write: (options: { value: string }) => nativeSession.write(options)
};
const android = () => Capacitor.getPlatform() === 'android';
// User data may contain the authentication response, so it is protected too.
const protectedKey = (value: unknown) => {
  const key = String(value);
  return /token|secret|verifier/i.test(key) || ['user_data', 'user_id'].includes(key) || key.startsWith('superme_oidc_');
};
let secrets: Record<string, string> = {};
let ready = false;
let pending = Promise.resolve();
let storageFailure: unknown;

export async function initializeSecureSession(): Promise<void> {
  if (!android()) return;
  const stored = JSON.parse((await secureSessionBridge.read()).value);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid secure session');
  secrets = {};
  for (const key of Object.keys(stored)) if (typeof stored[key] === 'string') secrets[key] = stored[key];
  const legacyKeys = Object.keys(window.localStorage).filter(protectedKey);
  // An established secure session wins over stale legacy values.
  for (const key of legacyKeys) if (!(key in secrets)) secrets[key] = window.localStorage.getItem(key)!;
  // Do not create/write a Keystore key for an empty first-install session.
  if (legacyKeys.length) await secureSessionBridge.write({ value: JSON.stringify(secrets) });
  for (const key of legacyKeys) window.localStorage.removeItem(key);
  const sessionKeys = Object.keys(window.sessionStorage).filter(protectedKey);
  for (const key of sessionKeys) if (!('session:' + key in secrets)) secrets['session:' + key] = window.sessionStorage.getItem(key)!;
  if (sessionKeys.length) await secureSessionBridge.write({ value: JSON.stringify(secrets) });
  for (const key of sessionKeys) window.sessionStorage.removeItem(key);
  ready = true;
}

export async function flushSecureSession(): Promise<void> {
  await pending;
  if (storageFailure) throw storageFailure;
}
function save(): void {
  pending = pending.then(() => secureSessionBridge.write({ value: JSON.stringify(secrets) })).catch(error => {
    storageFailure = error;
    // Never fall back to unencrypted persistence.
    window.dispatchEvent(new CustomEvent('superme:secure-storage-error'));
  });
}
function keys(): string[] { return [...new Set([...Object.keys(window.localStorage), ...Object.keys(secrets)])]; }
const adapter: Storage = {
  get length() { return android() ? keys().length : window.localStorage.length; },
  key(index) { return android() ? keys()[index] ?? null : window.localStorage.key(index); },
  getItem(key) {
    key = String(key);
    if (!android() || !protectedKey(key)) return window.localStorage.getItem(key);
    if (!ready) throw new Error('Secure session not initialized');
    return secrets[key] ?? null;
  },
  setItem(key, value) {
    key = String(key);
    if (!android() || !protectedKey(key)) { window.localStorage.setItem(key, value); return; }
    if (!ready) throw new Error('Secure session not initialized');
    secrets[key] = String(value); save();
  },
  removeItem(key) {
    key = String(key);
    if (!android() || !protectedKey(key)) { window.localStorage.removeItem(key); return; }
    if (!ready) throw new Error('Secure session not initialized');
    delete secrets[key]; save();
  },
  clear() {
    if (android()) { secrets = {}; save(); }
    window.localStorage.clear();
  }
};
// Preserve enumeration used by logout and OIDC cleanup without exposing methods as storage keys.
export const sessionStorageAdapter: Storage = new Proxy(adapter, {
  ownKeys: () => android() ? keys() : Object.keys(window.localStorage),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
});

/** Protect temporary social-signup tokens using the same native session blob. */
export const secureTemporaryStorage: Storage = {
  get length() { return window.sessionStorage.length; },
  key: index => window.sessionStorage.key(index),
  getItem: key => android() && protectedKey(key) ? adapter.getItem('session:' + key) : window.sessionStorage.getItem(key),
  setItem: (key, value) => android() && protectedKey(key) ? adapter.setItem('session:' + key, value) : window.sessionStorage.setItem(key, value),
  removeItem: key => android() && protectedKey(key) ? adapter.removeItem('session:' + key) : window.sessionStorage.removeItem(key),
  clear: () => {
    if (android()) for (const key of Object.keys(secrets)) if (key.startsWith('session:')) adapter.removeItem(key);
    window.sessionStorage.clear();
  }
};
