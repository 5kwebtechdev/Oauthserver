import { FocusTimerService } from './focus-timer.service';

describe('FocusTimerService', () => {
  let service: FocusTimerService;
  let modals: any;
  let modal: any;
  const activity = { id: 42, type: 'tasks', title: 'Reading', status: 'ONGOING', startTimeStamp: 1800000000000, endTimeStamp: 1800003600000 };
  beforeEach(() => {
    modal = { present: jasmine.createSpy().and.resolveTo(), onDidDismiss: jasmine.createSpy().and.resolveTo({ data: { completed: true } }) };
    modals = { create: jasmine.createSpy().and.resolveTo(modal) };
    service = new FocusTimerService(modals);
  });
  it('opens a fullscreen focus screen using the active task schedule', async () => {
    expect(await service.open(activity)).toBeTrue();
    const options = modals.create.calls.mostRecent().args[0];
    expect(options.cssClass).toBe('activity-focus-timer');
    expect(options.backdropDismiss).toBeFalse();
    expect(options.componentProps).toEqual({ title: 'Reading', activityId: '42', activityType: 'tasks', startTime: activity.startTimeStamp, endTime: activity.endTimeStamp });
  });
  it('does not open pending, skipped, completed or missing activities', async () => {
    for (const status of ['pending', 'SKIPPED', 'completed']) {
      expect(await service.open({ ...activity, status })).toBeFalse();
    }
    expect(await service.open(null)).toBeFalse();
    expect(modals.create).not.toHaveBeenCalled();
  });
  it('prevents duplicate screens and allows reopening after dismissal', async () => {
    const opening = service.open(activity);
    expect(await service.open(activity)).toBeFalse();
    await opening;
    expect(modals.create).toHaveBeenCalledTimes(1);
    await service.open(activity);
    expect(modals.create).toHaveBeenCalledTimes(2);
  });
});
