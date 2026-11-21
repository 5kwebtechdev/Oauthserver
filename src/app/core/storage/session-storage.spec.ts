import { Capacitor } from '@capacitor/core';
import { initializeSecureSession, flushSecureSession, sessionStorageAdapter, secureSessionBridge } from './session-storage';

describe('Android secure session storage', () => {
  beforeEach(() => {
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(secureSessionBridge, 'read').and.resolveTo({ value: '{}' });
    spyOn(secureSessionBridge, 'write').and.resolveTo();
    window.localStorage.removeItem('auth_token');
  });
  it('opens a fresh install without an unnecessary encrypted write', async () => {
    await initializeSecureSession();
    expect(sessionStorageAdapter.getItem('auth_token')).toBeNull();
    expect(secureSessionBridge.write).not.toHaveBeenCalled();
  });
  it('matches browser key coercion for an undefined key during initialization', async () => {
    await initializeSecureSession();
    expect(sessionStorageAdapter.getItem(undefined as any)).toBeNull();
    sessionStorageAdapter.setItem(123 as any, 'value');
    expect(sessionStorageAdapter.getItem('123')).toBe('value');
    sessionStorageAdapter.removeItem(123 as any);
  });
  it('migrates a token and removes plaintext only after native persistence', async () => {
    window.localStorage.setItem('auth_token', 'legacy-token');
    await initializeSecureSession();
    expect(sessionStorageAdapter.getItem('auth_token')).toBe('legacy-token');
    expect(window.localStorage.getItem('auth_token')).toBeNull();
    expect(secureSessionBridge.write).toHaveBeenCalled();
  });
  it('preserves plaintext for a safe retry when migration cannot persist', async () => {
    window.localStorage.setItem('auth_token', 'legacy-token');
    (secureSessionBridge.write as jasmine.Spy).and.rejectWith(new Error('unavailable'));
    await expectAsync(initializeSecureSession()).toBeRejected();
    expect(window.localStorage.getItem('auth_token')).toBe('legacy-token');
  });
  it('persists updated tokens without creating a localStorage copy and clears on logout', async () => {
    await initializeSecureSession();
    sessionStorageAdapter.setItem('auth_token', 'access');
    sessionStorageAdapter.setItem('refresh_token', 'rotated');
    await flushSecureSession();
    expect(window.localStorage.getItem('auth_token')).toBeNull();
    const saved = JSON.parse((secureSessionBridge.write as jasmine.Spy).calls.mostRecent().args[0].value);
    expect(saved.refresh_token).toBe('rotated');
    sessionStorageAdapter.clear();
    await flushSecureSession();
    expect(sessionStorageAdapter.getItem('auth_token')).toBeNull();
  });
});
