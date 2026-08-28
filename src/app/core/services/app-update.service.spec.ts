import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { AppUpdateService } from './app-update.service';
import { InstalledAppInfoService } from './installed-app-info.service';
import { PlayStoreUpdateInfo, PlayStoreUpdateService } from './play-store-update.service';
import { RemoteConfigService } from './remote-config.service';

describe('AppUpdateService', () => {
  let platform: jasmine.SpyObj<Platform>;
  let remoteConfig: jasmine.SpyObj<RemoteConfigService>;
  let playStoreUpdates: jasmine.SpyObj<PlayStoreUpdateService>;
  let installedAppInfo: jasmine.SpyObj<InstalledAppInfoService>;
  let service: AppUpdateService;

  beforeEach(() => {
    platform = jasmine.createSpyObj<Platform>('Platform', ['is']);
    remoteConfig = jasmine.createSpyObj<RemoteConfigService>(
      'RemoteConfigService',
      ['initialize', 'getString', 'getBoolean']
    );
    playStoreUpdates = jasmine.createSpyObj<PlayStoreUpdateService>(
      'PlayStoreUpdateService',
      ['getUpdateInfo']
    );
    installedAppInfo = jasmine.createSpyObj<InstalledAppInfoService>(
      'InstalledAppInfoService',
      ['getInfo']
    );
    remoteConfig.initialize.and.resolveTo(true);
    remoteConfig.getString.and.callFake((_key: string, fallback = '') => fallback);
    remoteConfig.getBoolean.and.callFake((_key: string, fallback = false) => fallback);
    playStoreUpdates.getUpdateInfo.and.resolveTo(playStoreInfo());
    installedAppInfo.getInfo.and.resolveTo({
      id: 'com.superme.app',
      name: 'SuperMe',
      build: '34',
      version: '0.1.3'
    });
    localStorage.removeItem('superme.mandatoryUpdate.v1');
    service = new AppUpdateService(platform, remoteConfig, playStoreUpdates, installedAppInfo);
  });

  afterEach(() => {
    localStorage.removeItem('superme.mandatoryUpdate.v1');
  });

  it('does not force updates in the browser', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    platform.is.and.returnValue(false);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
    expect(result.verificationFailed).toBeFalse();
    expect(result.platform).toBeNull();
  });

  it('requires an update when Google Play exposes a higher Android version code', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    installedAppInfo.getInfo.and.resolveTo({
      id: 'com.superme.app',
      name: 'SuperMe',
      build: '34',
      version: '0.1.3'
    });
    remoteConfig.getBoolean.and.returnValue(false);
    playStoreUpdates.getUpdateInfo.and.resolveTo(playStoreInfo({
      installedVersionCode: 34,
      availableVersionCode: 35,
      updateAvailable: true,
      updateAvailability: 2
    }));

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeTrue();
    expect(result.blockReason).toBe('update-required');
    expect(result.source).toBe('play-store');
    expect(result.availableBuild).toBe(35);
  });

  it('does not show an update blocker when the Play Store build is current', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    installedAppInfo.getInfo.and.resolveTo({
      id: 'com.superme.app',
      name: 'SuperMe',
      build: '35',
      version: '0.1.4'
    });
    remoteConfig.getBoolean.and.returnValue(false);
    playStoreUpdates.getUpdateInfo.and.resolveTo(playStoreInfo({
      installedVersionCode: 35,
      availableVersionCode: 35
    }));

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
    expect(result.verificationFailed).toBeFalse();
    expect(result.blockReason).toBeNull();
  });

  it('uses the Android-specific minimum version when configured', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    installedAppInfo.getInfo.and.resolveTo({ id: 'com.superme.app', name: 'SuperMe', build: '31', version: '0.1.0' });
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
    installedAppInfo.getInfo.and.resolveTo({ id: 'com.superme.app', name: 'SuperMe', build: '31', version: '0.1.0' });
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
    installedAppInfo.getInfo.and.resolveTo({ id: 'com.supermeapp.app', name: 'SuperMe', build: '4', version: '1.10.0' });
    remoteConfig.getString.and.callFake((key: string, fallback = '') => {
      if (key === 'minimum_supported_version') return '1.9.9';
      if (key === 'ios_store_url') return 'https://apps.apple.com/in/app/superme/id1234567890';
      return fallback;
    });
    remoteConfig.getBoolean.and.returnValue(true);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
  });

  it('uses the live App Store listing when the remote URL is blank', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    installedAppInfo.getInfo.and.resolveTo({ id: 'com.supermeapp.app', name: 'SuperMe', build: '4', version: '1.0.1' });
    remoteConfig.getString.and.callFake((key: string, fallback = '') => {
      if (key === 'minimum_supported_version') return '2.0.0';
      if (key === 'ios_store_url') return '';
      return fallback;
    });
    remoteConfig.getBoolean.and.returnValue(true);

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeTrue();
    expect(result.storeUrl).toBe('https://apps.apple.com/us/app/supermeapp/id6781971277');
  });

  it('keeps a detected mandatory update locked when a later Play check fails', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    installedAppInfo.getInfo.and.resolveTo({
      id: 'com.superme.app',
      name: 'SuperMe',
      build: '34',
      version: '0.1.3'
    });
    remoteConfig.getBoolean.and.returnValue(false);
    playStoreUpdates.getUpdateInfo.and.returnValues(
      Promise.resolve(playStoreInfo({
        installedVersionCode: 34,
        availableVersionCode: 35,
        updateAvailable: true,
        updateAvailability: 2
      })),
      Promise.resolve(playStoreInfo({
        checkSucceeded: false,
        installedVersionCode: 34,
        availableVersionCode: 34,
        isPlayStoreInstall: true,
        errorCode: -2
      }))
    );

    const firstResult = await service.checkForUpdate();
    const secondResult = await service.checkForUpdate();

    expect(firstResult.updateRequired).toBeTrue();
    expect(secondResult.updateRequired).toBeTrue();
    expect(secondResult.source).toBe('cached-requirement');
    expect(secondResult.verificationFailed).toBeFalse();
  });

  it('blocks a production Play install when update verification fails', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    installedAppInfo.getInfo.and.resolveTo({
      id: 'com.superme.app',
      name: 'SuperMe',
      build: '35',
      version: '0.1.4'
    });
    remoteConfig.getBoolean.and.returnValue(false);
    playStoreUpdates.getUpdateInfo.and.resolveTo(playStoreInfo({
      checkSucceeded: false,
      installedVersionCode: 35,
      availableVersionCode: 35,
      isPlayStoreInstall: true,
      isDebuggable: false,
      errorCode: -100
    }));

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
    expect(result.verificationFailed).toBeTrue();
    expect(result.blockReason).toBe('verification-failed');
  });

  it('does not lock local debug builds when the Play update API is unavailable', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    installedAppInfo.getInfo.and.resolveTo({
      id: 'com.superme.app',
      name: 'SuperMe',
      build: '34',
      version: '0.1.3'
    });
    remoteConfig.getBoolean.and.returnValue(false);
    playStoreUpdates.getUpdateInfo.and.resolveTo(playStoreInfo({
      checkSucceeded: false,
      isPlayStoreInstall: false,
      isDebuggable: true,
      errorCode: -10
    }));

    const result = await service.checkForUpdate();

    expect(result.updateRequired).toBeFalse();
    expect(result.verificationFailed).toBeFalse();
  });
});

function playStoreInfo(overrides: Partial<PlayStoreUpdateInfo> = {}): PlayStoreUpdateInfo {
  return {
    checkSucceeded: true,
    updateAvailable: false,
    updateAvailability: 1,
    installedVersionCode: 34,
    availableVersionCode: 34,
    installerPackageName: 'com.android.vending',
    isPlayStoreInstall: true,
    isDebuggable: false,
    ...overrides
  };
}
