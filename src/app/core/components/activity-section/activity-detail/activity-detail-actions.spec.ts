import { ReplaySubject } from 'rxjs';
import { ActivityDetailComponent } from './activity-detail.component';
import { Habit } from '../habit.types';
import { HabitButtonLogicService } from '../habit-button-logic.service';

describe('Habit/Task details actions', () => {
  const activity = (type: 'habits' | 'tasks', status: 'pending' | 'completed'): Habit => ({
    id: '42', type, status, completed: status === 'completed',
    createdById: '7', endDate: new Date('2099-01-01')
  } as unknown as Habit);

  let detail: ActivityDetailComponent;

  beforeEach(() => {
    detail = Object.create(ActivityDetailComponent.prototype);
    (detail as any).authService = { getUserId: () => '7' };
  });

  for (const type of ['habits', 'tasks'] as const) {
    it(`tracks the selected occurrence's live progress for a recurring ${type}`, () => {
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 55).getTime();
      spyOn(Date, 'now').and.returnValue(start + 60_000);
      (detail as any).buttonLogic = new HabitButtonLogicService();
      (detail as any).selectedDateFromState = date;
      detail.habit = { ...activity(type, 'pending'), status: 'ongoing', startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-01'), startTime: '15:55', endTime: '15:57',
        startTimeStamp: start, endTimeStamp: start + 120_000 } as Habit;
      expect(detail.calculateProgressPercentage()).toBe(50);
      detail.startProgress();
      expect(detail.percentageCompleted).toBe(50);
      detail.clearProgress();
    });
    it(`allows Edit and Delete for an active ${type}`, () => {
      detail.habit = activity(type, 'pending');
      expect(detail.canEdit()).toBeTrue();
      expect(detail.canDelete()).toBeTrue();
    });

    it(`hides Edit but keeps Delete for a completed ${type}`, () => {
      detail.habit = activity(type, 'completed');
      expect(detail.canEdit()).toBeFalse();
      expect(detail.canDelete()).toBeTrue();
    });

    it(`reloads ${type} details after a successful update notification`, () => {
      const changes = new ReplaySubject<any>(1);
      changes.next({ type: 'habit', action: 'added' });
      (detail as any).habitService = { dataChanged$: changes.asObservable() };
      detail.habit = activity(type, 'pending');
      spyOn<any>(detail, 'initUserRole');
      spyOn<any>(detail, 'initNavigationState');
      spyOn<any>(detail, 'loadActivityFromRoute');
      spyOn<any>(detail, 'setupButtonStateChecker');
      const reload = spyOn(detail, 'loadDetail');

      detail.ngOnInit();
      detail.ionViewWillEnter();
      expect(reload).not.toHaveBeenCalled();
      (detail as any).awaitingEditReturn = true;
      changes.next({ type: type === 'tasks' ? 'task' : 'habit', action: 'updated' });
      expect(reload).not.toHaveBeenCalled();
      detail.ionViewWillEnter();
      expect(reload).toHaveBeenCalledOnceWith(42, type, undefined);
      detail.ngOnDestroy();
    });
  }
});
