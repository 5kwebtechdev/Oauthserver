import { HabitButtonLogicService } from './habit-button-logic.service';

describe('HabitButtonLogicService', () => {
  const logic = new HabitButtonLogicService();

  for (const type of ['habits', 'tasks']) {
    for (const [offset, visible, letsGo, done] of [
      [-300001, true, false, false],
      [-300000, true, true, false],
      [599999, true, true, false],
      [600000, true, false, true],
      [600001, true, false, true],
      [5099999, true, false, true],
      [5100000, true, false, true],
      [5100001, false, false, false],
    ] as const) {
      it(`uses exact Home boundaries for ${type} at offset ${offset}`, () => {
        const start = new Date(2026, 8, 29, 8).getTime();
        const timing = logic.homeTiming({ type, startTimeStamp: start,
          endTimeStamp: start + 75 * 60_000, expired: true }, start + offset);
        expect([timing.visible, timing.letsGo, timing.done]).toEqual([visible, letsGo, done]);
      });
    }
  }

  it('normalizes seconds and anchors recurring Home dates to today', () => {
    const start = new Date(2026, 8, 29, 8).getTime();
    const seconds = logic.homeTiming({ startTimeStamp: start / 1000,
      endTimeStamp: (start + 75 * 60_000) / 1000 }, start);
    const recurring = logic.homeTiming({ everyday: true, startDate: '2026-01-01',
      endDate: '2026-01-01', startTime: '08:00', endTime: '09:15' }, start);
    expect(seconds).toEqual(recurring);
    expect(seconds.letsGo).toBeTrue();
  });

  function item(type: 'habits' | 'tasks', start: Date, expired = true) {
    return { type, status: 'pending', expired, startTimeStamp: start.getTime() };
  }

  for (const type of ['habits', 'tasks'] as const) {
    it(`allows today's expired ${type} to be marked done`, () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
      spyOn(Date, 'now').and.returnValue(start.getTime() + 10 * 60_000);

      const activity = item(type, start);
      expect(logic.isDoneVisible(activity)).toBeTrue();
      expect(logic.isDoneEnabled(activity)).toBeTrue();
    });
  }

  it('opens Let’s Go ten minutes before start and closes it five minutes after', () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
    const activity = { status: 'pending', startTimeStamp: start };
    const clock = spyOn(Date, 'now');

    clock.and.returnValue(start - 10 * 60_000 - 1);
    expect(logic.isLetsGoEnabled(activity)).toBeFalse();
    clock.and.returnValue(start - 10 * 60_000);
    expect(logic.isLetsGoEnabled(activity)).toBeTrue();
    clock.and.returnValue(start + 5 * 60_000);
    expect(logic.isLetsGoEnabled(activity)).toBeTrue();
    expect(logic.isDoneEnabled(activity)).toBeFalse();
    clock.and.returnValue(start + 5 * 60_000 + 1);
    expect(logic.isLetsGoEnabled(activity)).toBeFalse();
    expect(logic.isDoneEnabled(activity)).toBeTrue();
    clock.and.returnValue(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime());
    expect(logic.isDoneEnabled(activity)).toBeTrue();
  });

  it('does not allow a past-day item to be marked done', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activity = item('tasks', yesterday);
    expect(logic.isDoneVisible(activity)).toBeFalse();
    expect(logic.isDoneEnabled(activity)).toBeFalse();
  });

  it('does not show Done for a completed item', () => {
    const activity = { ...item('habits', new Date()), status: 'completed' };
    expect(logic.isDoneVisible(activity)).toBeFalse();
    expect(logic.isDoneEnabled(activity)).toBeFalse();
  });
});
