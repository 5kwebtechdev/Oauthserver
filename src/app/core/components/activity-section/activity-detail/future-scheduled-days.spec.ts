import { of } from 'rxjs';
import { ActivityDetailComponent } from './activity-detail.component';

describe('Activity detail future scheduled days', () => {
  let component: ActivityDetailComponent;
  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 29, 12));
    component = new ActivityDetailComponent(null!, null!, null!, null!, null!,
      { detectChanges() {} } as any, null!, null!, null!, null!, null!, null!);
    component.habit = {
      id: '1', type: 'tasks', startDate: new Date(2026, 8, 29), endDate: new Date(2026, 9, 29),
      everyday: false, selectedDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY', 'SUNDAY']
    } as any;
  });
  afterEach(() => jasmine.clock().uninstall());

  it('marks future repeat days across months, excluding today, Fridays and dates outside the range', () => {
    const september = (component as any).getFutureScheduledStatuses(new Date(2026, 8, 1));
    expect(Object.keys(september)).toEqual(['2026-09-30']);
    const october = (component as any).getFutureScheduledStatuses(new Date(2026, 9, 1));
    expect(october['2026-10-01']).toBe('PENDING');
    expect(october['2026-10-02']).toBeUndefined();
    expect(october['2026-10-29']).toBe('PENDING');
    expect(october['2026-10-30']).toBeUndefined();
    expect(october['2026-10-31']).toBeUndefined();
  });

  for (const type of ['habits', 'tasks'] as const) {
    it(`preserves API completion statuses when merging the ${type} schedule`, () => {
      component.habit!.type = type;
      const response = of({ monthlyCompletion: [{ date: '2026-09-30', status: 'SKIPPED' }], completedDays: 2, skippedDays: 1 });
      (component as any).habitApi = { getHabitMonthlyCompletion: () => response };
      (component as any).taskApi = { getTaskMonthlyCompletion: () => response };
      component.loadMonthlyStatus(new Date(2026, 8, 1));
      expect(component.calendarStatusData['2026-09-30']).toBe('SKIPPED');
      expect(component.completedDays).toBe(2);
      expect(component.skippedDays).toBe(1);
    });
  }

  it('marks every day for everyday schedules and respects the inclusive end date', () => {
    component.habit!.everyday = true;
    component.habit!.endDate = new Date(2026, 9, 2);
    const statuses = (component as any).getFutureScheduledStatuses(new Date(2026, 9, 1));
    expect(Object.keys(statuses)).toEqual(['2026-10-01', '2026-10-02']);
  });
});
