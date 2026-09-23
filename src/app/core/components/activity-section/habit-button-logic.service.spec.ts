import { HabitButtonLogicService } from './habit-button-logic.service';

describe('HabitButtonLogicService', () => {
  const logic = new HabitButtonLogicService();

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
