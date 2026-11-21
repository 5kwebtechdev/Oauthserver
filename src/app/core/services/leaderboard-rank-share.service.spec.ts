import { Capacitor } from '@capacitor/core';
import { Directory } from '@capacitor/filesystem';
import { of, throwError, NEVER } from 'rxjs';
import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { LeaderboardRankShareService } from './leaderboard-rank-share.service';

describe('Leaderboard image sharing', () => {
  const browserOverrides = ['canShare', 'share', 'userActivation', 'clipboard'] as const;
  let browserDescriptors: Array<PropertyDescriptor | undefined>;
  beforeEach(() => {
    browserDescriptors = browserOverrides.map(key => Object.getOwnPropertyDescriptor(navigator, key));
  });
  afterEach(() => {
    browserOverrides.forEach((key, index) => {
      const descriptor = browserDescriptors[index];
      if (descriptor) Object.defineProperty(navigator, key, descriptor);
      else delete (navigator as any)[key];
    });
  });

  function browserSharing(supported = true, active = true) {
    const share = jasmine.createSpy('browserShare').and.resolveTo();
    Object.defineProperty(navigator, 'canShare', { value: () => supported, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'userActivation', { value: { isActive: active }, configurable: true });
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    return share;
  }
  function setup(rank: number | null = 2, referralCode = 'ACTUAL123') {
    const leaderboard = { getLeaderboard: jasmine.createSpy().and.returnValue(of({
      scope: 'GLOBAL', state: 'OK', currentUser: { userId: 99, rank }
    })) };
    const auth = {
      getUserId: jasmine.createSpy().and.returnValue('99'),
      generateReferralCode: jasmine.createSpy().and.returnValue(of({ referralCode }))
    };
    const native = {
      writeFile: jasmine.createSpy('writeFile').and.resolveTo({ uri: 'file:///cache/rank.png' }),
      share: jasmine.createSpy('share').and.resolveTo({})
    };
    const service = new LeaderboardRankShareService(leaderboard as any, auth as any, native);
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(
      new Blob(['image-fixture'], { type: 'image/png' }), { status: 200 }
    ));
    spyOn<any>(service, 'personalizeImage').and.callFake((image: Blob) => Promise.resolve(image));
    spyOn<any>(service, 'base64').and.resolveTo('aW1hZ2U=');
    return { service, leaderboard, auth, native };
  }

  it('releases a stalled leaderboard request with a useful retry error', fakeAsync(() => {
    const { service, leaderboard, native } = setup();
    leaderboard.getLeaderboard.and.returnValue(NEVER);
    let error: Error | undefined;
    service.share().catch(value => error = value);
    tick(15000);
    flushMicrotasks();
    expect(error?.message).toContain('rank could not be loaded in time');
    expect(native.share).not.toHaveBeenCalled();
  }));

  it('releases a stalled referral request without sharing incomplete data', fakeAsync(() => {
    const { service, auth, native } = setup();
    auth.generateReferralCode.and.returnValue(NEVER);
    let error: Error | undefined;
    service.share().catch(value => error = value);
    flushMicrotasks();
    tick(15000);
    flushMicrotasks();
    expect(error?.message).toContain('referral code could not be loaded in time');
    expect(native.share).not.toHaveBeenCalled();
  }));

  for (const stalledBody of [false, true]) {
    it('aborts a stalled image ' + (stalledBody ? 'body' : 'request'), fakeAsync(() => {
      const { service, native } = setup();
      (fetch as jasmine.Spy).and.returnValue(stalledBody
        ? Promise.resolve({ ok: true, blob: () => new Promise(() => {}) })
        : new Promise(() => {}));
      let error: Error | undefined;
      service.share().catch(value => error = value);
      flushMicrotasks();
      const signal = (fetch as jasmine.Spy).calls.mostRecent().args[1].signal;
      tick(25000);
      flushMicrotasks();
      expect(signal.aborted).toBeTrue();
      expect(error?.message).toContain('image took too long');
      expect(native.share).not.toHaveBeenCalled();
    }));
  }

  it('times out a stalled native file write before opening the sheet', fakeAsync(() => {
    const { service, native } = setup();
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn<any>(service, 'loadImage').and.resolveTo(new Blob(['png'], { type: 'image/png' }));
    native.writeFile.and.returnValue(new Promise(() => {}));
    let error: Error | undefined;
    service.share().catch(value => error = value);
    flushMicrotasks();
    tick(15000);
    flushMicrotasks();
    expect(error?.message).toContain('image could not be saved');
    expect(native.share).not.toHaveBeenCalled();
  }));

  it('releases the share attempt when the native chooser never replies', fakeAsync(() => {
    const { service, native } = setup();
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn<any>(service, 'loadImage').and.resolveTo(new Blob(['png'], { type: 'image/png' }));
    native.share.and.returnValue(new Promise(() => {}));

    let error: Error | undefined;
    service.share().catch(value => error = value);
    flushMicrotasks();
    expect(native.share).toHaveBeenCalledTimes(1);
    tick(60000);
    expect(error?.message).toContain('Sharing did not finish');
  }));

  it('leaves manual copying available when clipboard permission never resolves', fakeAsync(() => {
    const { service } = setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise(() => {}) } });
    let copied: boolean | undefined;
    service.copyMessage('actual code').then(value => copied = value);
    tick(3000);
    flushMicrotasks();
    expect(copied).toBeFalse();
  }));

  it('uses the API referral code to personalize the image before browser sharing', async () => {
    const { service } = setup(1, 'APIREF123');
    browserSharing(false);
    const personalized = new Blob(['personalized PNG'], { type: 'image/png' });
    (service as any).personalizeImage.and.resolveTo(personalized);
    const result = await service.share();
    expect(await result?.file.text()).toBe('personalized PNG');
    expect((service as any).personalizeImage).toHaveBeenCalledOnceWith(jasmine.any(Blob), 'APIREF123');
    expect(result?.text).toContain('APIREF123');
  });

  for (const platform of ['android', 'ios']) {
    it('attaches the Figma image and complete message through Capacitor on ' + platform, async () => {
      const { service, leaderboard, native } = setup();
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      spyOn(Capacitor, 'getPlatform').and.returnValue(platform);
      const write = native.writeFile;
      const share = native.share;
      await service.share();
      expect(leaderboard.getLeaderboard).toHaveBeenCalledOnceWith('GLOBAL', 0, 10);
      expect(write).toHaveBeenCalledWith(jasmine.objectContaining({ directory: Directory.Cache, path: 'rank-share/SuperMeApp-rank-2.png' }));
      const payload = share.calls.mostRecent().args[0]!;
      expect(payload.files).toEqual(['file:///cache/rank.png']);
      expect(payload.text).toBe(service.message('ACTUAL123'));
      expect(payload.text).toContain('https://go.supermeapp.com/google-early-access');
      expect(payload.text).toContain('https://go.supermeapp.com/apple-early-access');
      expect(payload.url).toBeUndefined();
    });
  }

  for (const rank of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    it('selects the exact exported card for rank ' + rank, async () => {
      const { service, native } = setup(rank);
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      await service.share();
      expect(String((fetch as jasmine.Spy).calls.mostRecent().args[0])).toContain('/leaderboard/share/rank-' + rank + '.png');
    });
  }

  for (const rank of [null, 0, 11, 2.5]) {
    it('rejects an ineligible fresh rank ' + rank, async () => {
      const { service, auth } = setup(rank);
      await expectAsync(service.share()).toBeRejectedWithError(/outside the top 10/);
      expect(auth.generateReferralCode).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });
  }

  it('fails safely if the image file is missing', async () => {
    const { service, native } = setup(1);
    (fetch as jasmine.Spy).and.resolveTo(new Response('', { status: 404 }));
    await expectAsync(service.share()).toBeRejectedWithError(/image could not be loaded/);
    expect(native.share).not.toHaveBeenCalled();
  });

  it('accepts lossless WebP input and prepares a PNG attachment', async () => {
    const { service } = setup(1);
    browserSharing(true, false);
    (fetch as jasmine.Spy).and.resolveTo(new Response(new Blob(['webp'], { type: 'image/webp' })));
    (service as any).personalizeImage.and.resolveTo(new Blob(['png'], { type: 'image/png' }));
    const result = await service.share();
    expect(result?.file.type).toBe('image/png');
    expect((service as any).personalizeImage.calls.mostRecent().args[0].type).toBe('image/webp');
  });

  it('rejects an HTML fallback instead of attaching it as a PNG', async () => {
    const { service, native } = setup(1);
    (fetch as jasmine.Spy).and.resolveTo(new Response('<html></html>', {
      headers: { 'Content-Type': 'text/html' }
    }));
    await expectAsync(service.share()).toBeRejectedWithError(/image could not be loaded/);
    expect(native.writeFile).not.toHaveBeenCalled();
  });

  it('shares an image file and the complete message through the browser file-share API', async () => {
    const { service, native } = setup(10, 'USERCODE10');
    const share = browserSharing();
      await service.share();
      const payload = share.calls.mostRecent().args[0];
      expect(payload.files[0].name).toBe('SuperMeApp-rank-10.png');
      expect(payload.files[0].type).toBe('image/png');
      expect(payload.files[0].size).toBeGreaterThan(0);
      expect(payload.text).toBe(service.message('USERCODE10'));
      expect(native.share).not.toHaveBeenCalled();
  });

  it('prepares the original PNG and full message for unsupported browsers', async () => {
    const { service, native } = setup(4, 'REALCODE4');
    const share = browserSharing(false);
    const result = await service.share();
    expect(result?.file.name).toBe('SuperMeApp-rank-4.png');
    expect(await result?.file.text()).toBe('image-fixture');
    expect(result?.text).toBe(service.message('REALCODE4'));
    expect(result?.canShare).toBeFalse();
    expect(share).not.toHaveBeenCalled();
    expect(native.share).not.toHaveBeenCalled();
    expect(native.writeFile).not.toHaveBeenCalled();
  });

  it('retains a prepared file for a fresh click when activation expired during loading', async () => {
    const { service } = setup();
    const share = browserSharing(true, false);
    const result = await service.share();
    expect(result?.canShare).toBeTrue();
    expect(share).not.toHaveBeenCalled();
    // A second explicit click invokes navigator.share before any await.
    const pending = service.shareInBrowser(result!.file, result!.text);
    expect(share).toHaveBeenCalledTimes(1);
    expect(await pending).toBeTrue();
  });

  it('returns the download fallback when the browser denies sharing', async () => {
    const { service } = setup();
    const share = browserSharing();
    share.and.rejectWith(new DOMException('Blocked by policy', 'NotAllowedError'));
    expect((await service.share())?.file.name).toBe('SuperMeApp-rank-2.png');
  });

  it('retains the prepared card when the browser cancels without a visible sheet', async () => {
    const { service } = setup();
    const share = browserSharing();
    const error = new DOMException('', 'AbortError');
    share.and.rejectWith(error);
    const prepared = await service.share();
    expect(prepared?.file.name).toBe('SuperMeApp-rank-2.png');
    expect(prepared?.text).toContain('ACTUAL123');
  });

  it('handles missing or throwing browser share APIs', async () => {
    const { service } = setup();
    browserSharing();
    Object.defineProperty(navigator, 'canShare', { value: () => { throw new TypeError('Unsupported files'); }, configurable: true });
    expect((await service.share())?.canShare).toBeFalse();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    expect(await service.shareInBrowser(new File(['png'], 'card.png'), 'message')).toBeFalse();
  });

  it('copies the complete sharing message and reports clipboard denial safely', async () => {
    const { service } = setup();
    const writeText = jasmine.createSpy('writeText').and.resolveTo();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(await service.copyMessage(service.message('REALCODE'))).toBeTrue();
    expect(writeText).toHaveBeenCalledOnceWith(service.message('REALCODE'));
    writeText.and.rejectWith(new DOMException('Clipboard denied', 'NotAllowedError'));
    expect(await service.copyMessage('message')).toBeFalse();
  });

  it('stops when a referral API response is empty', async () => {
    const { service } = setup(2, '');
    await expectAsync(service.share()).toBeRejectedWithError(/referral code/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('encodes the image bytes correctly when writing the native cache file', async () => {
    const { service, native } = setup();
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    (service as any).base64.and.callThrough();
    await service.share();
    expect(native.writeFile.calls.mostRecent().args[0].data).toBe('aW1hZ2UtZml4dHVyZQ==');
  });

  it('stops if the account changes while writing the native cache file', async () => {
    const { service, native, auth } = setup();
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    auth.getUserId.and.returnValues('99', '99', '99', '100');
    await expectAsync(service.share()).toBeRejectedWithError(/session changed/);
    expect(native.share).not.toHaveBeenCalled();
  });

  it('does not share after account switching', async () => {
    const { service, auth } = setup();
    auth.getUserId.and.returnValues('99', '100');
    await expectAsync(service.share()).toBeRejectedWithError(/session changed/);
  });

  it('propagates API failures without sharing a text fallback', async () => {
    const { service, auth } = setup();
    auth.generateReferralCode.and.returnValue(throwError(() => new Error('offline')));
    await expectAsync(service.share()).toBeRejectedWithError('offline');
    expect(fetch).not.toHaveBeenCalled();
  });
});
