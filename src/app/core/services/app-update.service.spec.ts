import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { AppUpdateService } from './app-update.service';
import { RemoteConfigService } from './remote-config.service';

describe('AppUpdateService', () => {
  let platform: jasmine.SpyObj<Platform>;
  let remoteConfig: jasmine.SpyObj<RemoteConfigService>;
  let service: AppUpdateService;

  beforeEach(() => {
    platform = jasmine.createSpyObj<Platform>('Platform', ['is']);
    remoteConfig = jasmine.createSpyObj<RemoteConfigService>('RemoteConfigService', ['getString', 'getBoolean']);
    remoteConfig.getString.and.callFake((_key: string, fallback = '') => fallback);
    remoteConfig.getBoolean.and.callFake((_key: string, fallback = false) => fallback);
    service = new AppUpdateService(platform, remoteConfig);
  });

  it('does not force updates in the browser', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    platform.is.and.returnValue(false);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
    expect(result.platform).toBeNull();
  });

  it('uses the Android-specific minimum version when configured', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(App, 'getInfo').and.resolveTo({ id: 'com.superme.app', name: 'SuperMe', build: '31', version: '0.1.0' });
    remoteConfig.getString.and.callFake((key: string, fallback = '') => {
      if (key === 'minimum_supported_version') return '0.0.2';
      if (key === 'android_minimum_supported_version') return '0.2.0';
      return fallback;
    });
    remoteConfig.getBoolean.and.returnValue(true);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeTrue();
    expect(result.currentVersion).toBe('0.1.0');
    expect(result.minimumVersion).toBe('0.2.0');
    expect(result.platform).toBe('android');
  });

  it('falls back to the shared minimum when the platform override is blank', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(App, 'getInfo').and.resolveTo({ id: 'com.superme.app', name: 'SuperMe', build: '31', version: '0.1.0' });
    remoteConfig.getString.and.callFake((key: string, fallback = '') => {
      if (key === 'minimum_supported_version') return '0.2.0';
      if (key === 'android_minimum_supported_version') return '';
      return fallback;
    });
    remoteConfig.getBoolean.and.returnValue(true);

    const result = await service.checkForUpdate();

    expect(result.minimumVersion).toBe('0.2.0');
    expect(result.updateRequired).toBeTrue();
  });

  it('compares each semantic version segment numerically', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    spyOn(App, 'getInfo').and.resolveTo({ id: 'com.supermeapp.app', name: 'SuperMe', build: '4', version: '1.10.0' });
    remoteConfig.getString.and.callFake((key: string, fallback = '') => {
      if (key === 'minimum_supported_version') return '1.9.9';
      if (key === 'ios_store_url') return 'https://apps.apple.com/in/app/superme/id1234567890';
      return fallback;
    });
    remoteConfig.getBoolean.and.returnValue(true);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
  });

  it('does not lock iOS users out when the App Store listing is not configured', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    spyOn(App, 'getInfo').and.resolveTo({ id: 'com.supermeapp.app', name: 'SuperMe', build: '4', version: '1.0.1' });
    remoteConfig.getString.and.callFake((key: string, fallback = '') => {
      if (key === 'minimum_supported_version') return '2.0.0';
      if (key === 'ios_store_url') return '';
      return fallback;
    });
    remoteConfig.getBoolean.and.returnValue(true);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
    expect(result.storeUrl).toBe('');
  });
});
