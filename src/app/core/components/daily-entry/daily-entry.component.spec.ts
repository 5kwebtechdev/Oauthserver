import { of, Subject, throwError } from 'rxjs';
import { DailyEntryComponent } from './daily-entry.component';
import { STREAK_MILESTONES, streakMilestoneWindow } from '../streak-milestone/streak-milestones';

describe('Daily entry flow', () => {
  let component: DailyEntryComponent;
  let auth: any;
  let api: any;
  let status: any;
  let userService: any;
  let storage: Map<string, string>;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 23, 12));
    storage = new Map();
    spyOn(localStorage, 'getItem').and.callFake(key => storage.get(key) ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key, value) => { storage.set(key, value); });
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    auth = { getUserData: () => ({ id: 94, relationship: 'CHILD' }), isLoggedIn: () => true,
      isFirstLoggedForTheDay: () => false };
    api = {
      getHomeOverlay: jasmine.createSpy().and.returnValue(of({ hasOverlay: true, overlayType: 'DAILY_LOGIN' })),
      dismissHomeOverlay: jasmine.createSpy().and.returnValue(of({}))
    };
    status = { getStreakStatus: jasmine.createSpy().and.returnValue(of({ currentStreak: 7, canRestore: false })) };
    userService = { updateStreakAfterRestore: jasmine.createSpy(), refreshStats: jasmine.createSpy().and.returnValue(of(null)) };
    component = new DailyEntryComponent(auth, api, status, { url: '/activity-page' } as any, { run: () => {} } as any, userService);
  });
  afterEach(() => { component.ngOnDestroy(); jasmine.clock().uninstall(); });

  it('shows a server daily reward on a notification destination without a new login', async () => {
    await component.check();
    expect(component.active).toBe('DAILY_LOGIN');
    expect(component.days).toBe(7);
  });

  it('shows both referral directions and dismisses the exact event', async () => {
    for (const type of ['REFERRAL_RECEIVED', 'REFERRAL_JOINED'] as const) {
      api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: type, eventId: type, amount: 100 }));
      await component.check();
      expect(component.active).toBe(type);
      expect(component.referralEvent?.amount).toBe(100);
      expect(storage.size).toBe(type === 'REFERRAL_RECEIVED' ? 0 : 1);
      api.getHomeOverlay.and.returnValue(of({ hasOverlay: false, overlayType: 'NONE' }));
      await component.dismiss();
      await Promise.resolve();
      expect(api.dismissHomeOverlay).toHaveBeenCalledWith(type, type);
      jasmine.clock().tick(30_000);
    }
    expect(userService.refreshStats.calls.count()).toBe(2);
  });

  it('shows a second referral on the same day and preserves the first receipt across days', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 'one' }));
    await component.check();
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 'two' }));
    await component.dismiss();
    await Promise.resolve();
    expect(component.referralEvent?.eventId).toBe('two');
    Object.assign(component, { active: null });
    jasmine.clock().mockDate(new Date(2026, 8, 24, 12));
    api.getHomeOverlay.and.returnValues(
      of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 'one' }),
      of({ hasOverlay: true, overlayType: 'MOOD_PROMPT' })
    );
    await component.check();
    expect(component.active).toBe('MOOD_PROMPT');
    expect(api.dismissHomeOverlay).toHaveBeenCalledWith('REFERRAL_JOINED', 'one');
  });

  it('keeps failed referral dismissal visible and retryable without a receipt', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'REFERRAL_RECEIVED', eventId: 'retry' }));
    await component.check();
    api.dismissHomeOverlay.and.returnValue(throwError(() => new Error('offline')));
    await component.dismiss();
    expect(component.active).toBe('REFERRAL_RECEIVED');
    expect(component.notice).toContain('try again');
    expect(storage.size).toBe(0);
    api.dismissHomeOverlay.and.returnValue(of({}));
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: false, overlayType: 'NONE' }));
    await component.dismiss();
    await Promise.resolve();
    expect(component.active).toBeNull();
  });

  it('sends only one request for repeated close clicks and one for a retry', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'REFERRAL_RECEIVED', eventId: 'same-event' }));
    await component.check();
    const first = new Subject<unknown>();
    api.dismissHomeOverlay.and.returnValue(first);

    const closing = component.dismiss();
    await component.dismiss();
    expect(api.dismissHomeOverlay).toHaveBeenCalledOnceWith('REFERRAL_RECEIVED', 'same-event');
    first.error(new Error('network failure'));
    await closing;
    expect(component.active).toBe('REFERRAL_RECEIVED');
    expect(component.referralEvent?.eventId).toBe('same-event');

    const second = new Subject<unknown>();
    api.dismissHomeOverlay.and.returnValue(second);
    const retrying = component.dismiss();
    await component.dismiss();
    expect(api.dismissHomeOverlay.calls.count()).toBe(2);
    expect(api.dismissHomeOverlay.calls.mostRecent().args).toEqual(['REFERRAL_RECEIVED', 'same-event']);
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: false, overlayType: 'NONE' }));
    second.next({});
    second.complete();
    await retrying;
    await Promise.resolve();
    expect(component.active).toBeNull();
    expect(api.getHomeOverlay.calls.count()).toBe(2);
  });

  it('disables only referral presentation and advances to the normal queue', async () => {
    Object.defineProperty(component, 'referralTestUiEnabled', { value: false });
    api.getHomeOverlay.and.returnValues(
      of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 17 }),
      of({ hasOverlay: true, overlayType: 'DAILY_LOGIN' })
    );
    await component.check();
    expect(api.dismissHomeOverlay).toHaveBeenCalledOnceWith('REFERRAL_JOINED', 17);
    expect(component.active).toBe('DAILY_LOGIN');
    expect(component.referralEvent).toBeNull();
  });

  it('never dismisses a malformed referral without an eventId', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED' }));
    await component.check();
    expect(component.active).toBeNull();
    expect(api.dismissHomeOverlay).not.toHaveBeenCalled();
  });

  it('supports parent referrals without displaying child daily prompts', async () => {
    auth.getUserData = () => ({ id: 94, relationship: 'PARENT' });
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 20 }));
    await component.check();
    expect(component.active).toBe('REFERRAL_JOINED');
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'DAILY_LOGIN' }));
    await component.dismiss();
    await Promise.resolve();
    expect(component.active).toBeNull();
    expect(status.getStreakStatus).not.toHaveBeenCalled();
  });

  it('dismisses a parent BONUS_COINS without eventId and immediately shows REFERRAL_RECEIVED', async () => {
    auth.getUserData = () => ({ id: 94, relationship: 'PARENT' });
    api.getHomeOverlay.and.returnValues(
      of({ hasOverlay: true, overlayType: 'BONUS_COINS', eventId: null }),
      of({ hasOverlay: true, overlayType: 'REFERRAL_RECEIVED', eventId: 'parent-event', amount: 100,
        relatedUser: { id: 95, name: 'Child', username: 'child', avatar: null } }),
      of({ hasOverlay: false, overlayType: 'NONE' })
    );

    await component.check();
    expect(api.getHomeOverlay.calls.count()).toBe(2);
    expect(api.dismissHomeOverlay).toHaveBeenCalledOnceWith('BONUS_COINS', undefined, true);
    expect(component.active).toBe('REFERRAL_RECEIVED');
    expect(component.referralEvent?.relatedUser?.username).toBe('child');
    expect(component.referralEvent?.amount).toBe(100);
    expect(status.getStreakStatus).not.toHaveBeenCalled();

    await component.dismiss();
    await Promise.resolve();
    expect(api.dismissHomeOverlay).toHaveBeenCalledWith('REFERRAL_RECEIVED', 'parent-event');
    expect(api.getHomeOverlay.calls.count()).toBe(3);
    expect(component.active).toBeNull();
  });

  it('skips the duplicate child BONUS_COINS sheet and continues to the next overlay', async () => {
    api.getHomeOverlay.and.returnValues(
      of({ hasOverlay: true, overlayType: 'BONUS_COINS', eventId: null }),
      of({ hasOverlay: true, overlayType: 'REFERRAL_JOINED', eventId: 'child-event', amount: 100 })
    );

    await component.check();
    expect(api.dismissHomeOverlay).toHaveBeenCalledOnceWith('BONUS_COINS', undefined, true);
    expect(api.getHomeOverlay.calls.count()).toBe(2);
    expect(component.active).toBe('REFERRAL_JOINED');
    expect(component.referralEvent?.eventId).toBe('child-event');
  });

  it('keeps a failed parent BONUS_COINS dismissal retryable instead of advancing the queue', async () => {
    auth.getUserData = () => ({ id: 94, relationship: 'PARENT' });
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'BONUS_COINS', eventId: null }));
    api.dismissHomeOverlay.and.returnValue(throwError(() => new Error('offline')));

    await component.check();
    expect(api.dismissHomeOverlay).toHaveBeenCalledOnceWith('BONUS_COINS', undefined, true);
    expect(api.getHomeOverlay.calls.count()).toBe(1);
    expect(component.active).toBeNull();
    expect(storage.size).toBe(0);
  });

  it('publishes the restored streak and remaining coins while the popup is still open', async () => {
    status.getStreakStatus.and.returnValue(of({ currentStreak: 1, canRestore: true, restoreToStreak: 3, restoreCost: 5, coins: 50 }));
    status.postRestoreStreak = jasmine.createSpy().and.returnValue(of({ currentStreak: 3 }));
    await component.check();
    await component.restore();
    expect(userService.updateStreakAfterRestore).toHaveBeenCalledOnceWith(3, 45);
    expect(component.days).toBe(3);
    expect(component.notice).toBe('Streak restored!');
  });

  it('does not repeat the reward after reopening, even if the server returns it again', async () => {
    await component.check();
    component.ngOnDestroy();
    component = new DailyEntryComponent(auth, api, status, { url: '/notes' } as any, { run: () => {} } as any, userService);
    await component.check();
    expect(component.active).toBeNull();
    expect(api.dismissHomeOverlay).toHaveBeenCalled();
    expect(api.getHomeOverlay.calls.count()).toBeLessThanOrEqual(6);
  });

  it('checks again on the next day on the same screen', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: false, overlayType: 'NONE' }));
    await component.check();
    jasmine.clock().mockDate(new Date(2026, 8, 24, 12));
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'DAILY_LOGIN' }));
    await component.check();
    expect(component.active).toBe('DAILY_LOGIN');
  });

  it('retries after a network failure without consuming the daily popup', async () => {
    api.getHomeOverlay.and.returnValue(throwError(() => new Error('offline')));
    await component.check();
    expect(storage.size).toBe(0);
    jasmine.clock().tick(30_000);
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'DAILY_LOGIN' }));
    await component.check();
    expect(component.active).toBe('DAILY_LOGIN');
  });

  it('ignores a response received after switching accounts', async () => {
    const response = new Subject<any>();
    api.getHomeOverlay.and.returnValue(response);
    const pending = component.check();
    auth.getUserData = () => ({ id: 95, relationship: 'CHILD' });
    response.next({ hasOverlay: true, overlayType: 'DAILY_LOGIN' });
    await pending;
    expect(component.active).toBeNull();
    expect(storage.size).toBe(0);
  });

  it('serializes simultaneous resume and navigation checks', async () => {
    const response = new Subject<any>();
    api.getHomeOverlay.and.returnValue(response);
    const pending = component.check();
    await component.check();
    expect(api.getHomeOverlay.calls.count()).toBe(1);
    response.next({ hasOverlay: true, overlayType: 'MOOD_PROMPT' });
    await pending;
    expect(component.active).toBe('MOOD_PROMPT');
  });

  it('shows the live MOOD_PROMPT response without consuming it before a mood is saved', async () => {
    api.getHomeOverlay.and.returnValue(of({
      petMood: 'PLAYFUL',
      message: "Hey Vivek Sharma! How are you feeling today? Let's set your mood!",
      petAgeStage: 1, overlayType: 'MOOD_PROMPT', hasOverlay: true, streakMilestone: null
    }));
    await component.check();
    expect(component.active).toBe('MOOD_PROMPT');
    expect(component.message).toContain('How are you feeling today?');
    expect(storage.size).toBe(0);

    component.ngOnDestroy();
    component = new DailyEntryComponent(auth, api, status, { url: '/notes' } as any, { run: () => {} } as any, userService);
    await component.check();
    expect(component.active).toBe('MOOD_PROMPT');
    expect(api.dismissHomeOverlay).not.toHaveBeenCalled();
  });

  it('records the mood prompt only after a successful save and dismissal', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'MOOD_PROMPT' }));
    await component.check();
    expect(storage.size).toBe(0);
    await component.dismiss();
    expect(Array.from(storage.keys()).some(key => key.endsWith(':MOOD_PROMPT'))).toBeTrue();
  });

  it('matches all supplied milestone rewards and celebrates only the exact day', () => {
    expect(STREAK_MILESTONES.map(item => item.coins)).toEqual([25, 40, 90, 200, 410, 750, 1200, 2600]);
    expect(streakMilestoneWindow(7).reachedToday?.coins).toBe(40);
    expect(streakMilestoneWindow(8).reachedToday).toBeNull();
    expect(streakMilestoneWindow(2).reachedToday).toBeNull();
  });

  it('shows the mood prompt after dismissing the daily reward', async () => {
    await component.check();
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: true, overlayType: 'MOOD_PROMPT' }));
    await component.dismiss();
    await Promise.resolve();
    expect(component.active).toBe('MOOD_PROMPT');
  });

  it('uses a fresh first-login flag as a fallback when no overlay is returned', async () => {
    auth.isFirstLoggedForTheDay = () => true;
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: false, overlayType: 'NONE' }));
    await component.check();
    expect(component.active).toBe('DAILY_LOGIN');
  });

  it('does not invent a reward when neither API confirms one', async () => {
    api.getHomeOverlay.and.returnValue(of({ hasOverlay: false, overlayType: 'NONE' }));
    await component.check();
    expect(component.active).toBeNull();
    expect(status.getStreakStatus).not.toHaveBeenCalled();
  });

  it('waits for an update or badge popup before consuming the daily entry', async () => {
    component.blocked = true;
    await component.check();
    expect(api.getHomeOverlay).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
    component.blocked = false;
    await component.check();
    expect(component.active).toBe('DAILY_LOGIN');
  });
});
