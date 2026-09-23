import { of, Subject, throwError } from 'rxjs';
import { DailyEntryComponent } from './daily-entry.component';
import { STREAK_MILESTONES, streakMilestoneWindow } from '../streak-milestone/streak-milestones';

describe('Daily entry flow', () => {
  let component: DailyEntryComponent;
  let auth: any;
  let api: any;
  let status: any;
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
    component = new DailyEntryComponent(auth, api, status, { url: '/activity-page' } as any, { run: () => {} } as any);
  });
  afterEach(() => { component.ngOnDestroy(); jasmine.clock().uninstall(); });

  it('shows a server daily reward on a notification destination without a new login', async () => {
    await component.check();
    expect(component.active).toBe('DAILY_LOGIN');
    expect(component.days).toBe(7);
  });

  it('does not repeat the reward after reopening, even if the server returns it again', async () => {
    await component.check();
    component.ngOnDestroy();
    component = new DailyEntryComponent(auth, api, status, { url: '/notes' } as any, { run: () => {} } as any);
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
    component = new DailyEntryComponent(auth, api, status, { url: '/notes' } as any, { run: () => {} } as any);
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
