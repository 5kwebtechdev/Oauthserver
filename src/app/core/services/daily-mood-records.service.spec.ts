import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { DailyMoodRecordsService, dailyMoodRecord, moodDateKey } from './daily-mood-records.service';

describe('Shared daily mood records', () => {
  function setup(current: any[] = [{ userId: 12, mood: 'HAPPY', moodSetCountToday: 1 }]) {
    const updates = new Subject<any>();
    const user = new BehaviorSubject<any>({ id: 12 });
    const moods = {
      dailyMoodStateUpdated$: updates,
      getVibesDisplay: jasmine.createSpy().and.returnValue(of(current)),
      getMoodTransitionsMonthly: jasmine.createSpy().and.returnValue(of([])),
    };
    const service = new DailyMoodRecordsService(moods as any,
      { userData$: user, getUserId: () => '12' } as any,
      { child$: new BehaviorSubject(null) } as any);
    return { service, moods, updates, user };
  }

  it('uses all six approved mood mappings, including backend aliases', () => {
    ['HAPPY', 'EXCITED', 'NEUTRAL'].forEach(mood => expect(dailyMoodRecord(mood)?.tone).toBe('great'));
    ['NERVOUS', 'UPSET'].forEach(mood => expect(dailyMoodRecord(mood)?.tone).toBe('okay'));
    expect(dailyMoodRecord('SAD')?.tone).toBe('low');
    expect(dailyMoodRecord('unknown')).toBeNull();
  });

  it('updates a saved-day display immediately without a journal write or reload', fakeAsync(() => {
    const { service, updates, moods } = setup();
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    expect(records[moodDateKey()].label).toBe('Happy');
    updates.next({ storageKey: `vibe_daily_state_12_${moodDateKey()}`, count: 2, mood: 'NEUTRAL' });
    expect(records[moodDateKey()].label).toBe('Calm');
    expect(moods.getVibesDisplay).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  }));

  it('ignores updates for another user or calendar day', fakeAsync(() => {
    const { service, updates } = setup();
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    updates.next({ storageKey: `vibe_daily_state_99_${moodDateKey()}`, count: 1, mood: 'SAD' });
    updates.next({ storageKey: 'vibe_daily_state_12_2000-01-01', count: 1, mood: 'SAD' });
    expect(records[moodDateKey()].label).toBe('Happy');
    subscription.unsubscribe();
  }));

  it('does not treat the default neutral mood as a completed check-in', fakeAsync(() => {
    const { service } = setup([{ userId: 12, mood: 'NEUTRAL', moodSetCountToday: 0 }]);
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    expect(records[moodDateKey()]).toBeNull();
    subscription.unsubscribe();
  }));

  it('uses the sole self-scoped response when profile and response IDs differ', fakeAsync(() => {
    const { service } = setup([{ userId: 99, mood: 'NEUTRAL', moodSetCountToday: 1 }]);
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    expect(records[moodDateKey()].label).toBe('Calm');
    subscription.unsubscribe();
  }));

  it('recognizes a selected Calm mood when the API serializes its count as text', fakeAsync(() => {
    const { service } = setup([{ userId: 12, mood: 'NEUTRAL', moodSetCountToday: '1' }]);
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    expect(records[moodDateKey()].label).toBe('Calm');
    subscription.unsubscribe();
  }));

  it('can load the authenticated self mood before profile data finishes loading', fakeAsync(() => {
    const { service, user } = setup([{ userId: 12, mood: 'HAPPY', moodSetCountToday: 1 }]);
    user.next(null);
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    expect(records[moodDateKey()].label).toBe('Happy');
    subscription.unsubscribe();
  }));

  it('does not use another user’s record for an explicitly selected child', fakeAsync(() => {
    const { service } = setup([{ userId: 99, mood: 'HAPPY', moodSetCountToday: 1 }]);
    (service as any).profiles.child$ = new BehaviorSubject(15);
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    expect(records[moodDateKey()]).toBeNull();
    subscription.unsubscribe();
  }));

  it('starts a new daily record after local midnight without reusing yesterday’s mood', fakeAsync(() => {
    const { service, moods } = setup();
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    const yesterday = moodDateKey();
    moods.getVibesDisplay.and.returnValue(of([{ userId: 12, mood: 'NEUTRAL', moodSetCountToday: 0 }]));
    tick(86400000);
    expect(moodDateKey()).not.toBe(yesterday);
    expect(records[moodDateKey()]).toBeNull();
    expect(records[yesterday]).toBeUndefined();
    expect(moods.getVibesDisplay).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  }));

  it('reads monthly daily moods even when no journal exists', fakeAsync(() => {
    const { service, moods } = setup();
    moods.getMoodTransitionsMonthly.and.returnValue(of([
      { userId: 12, date: '2026-09-30', fromMood: 'HAPPY', toMood: 'NERVOUS' },
    ]));
    let records: any;
    const subscription = service.watch(() => [new Date(2026, 8, 1)]).subscribe(value => records = value);
    tick(0);
    expect(records['2026-09-30'].tone).toBe('okay');
    subscription.unsubscribe();
  }));

  it('keeps a confirmed save when an older API response arrives afterwards', fakeAsync(() => {
    const { service, moods, updates } = setup();
    const response = new Subject<any[]>();
    moods.getVibesDisplay.and.returnValue(response);
    let records: any;
    const subscription = service.watch().subscribe(value => records = value);
    tick(0);
    updates.next({ storageKey: `vibe_daily_state_12_${moodDateKey()}`, count: 2, mood: 'SAD' });
    response.next([{ userId: 12, mood: 'HAPPY', moodSetCountToday: 1 }]);
    response.complete();
    expect(records[moodDateKey()].label).toBe('Sad');
    subscription.unsubscribe();
  }));
});
