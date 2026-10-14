import { of } from 'rxjs';
import { UserDashboardComponent } from './user-dashboard.component';

describe('Home habit streak mapping', () => {
  it('uses the current habit streak returned by the calendar API', () => {
    const dashboard = Object.create(UserDashboardComponent.prototype) as UserDashboardComponent;
    const state = dashboard as any;
    state.glanceRequestId = 0;
    state.calendarService = {
      getUserCalendar: () => of({
        habits: [{ id: 535, title: 'Math', status: 'pending', currentHabitStreak: 4,
          startTime: '15:30:00', endTime: '16:00:00' }],
        tasks: [], events: []
      })
    };
    state.buttonLogic = {
      calculateTimestamps: () => ({ startTimeStamp: Date.now(), endTimeStamp: Date.now() + 60000 }),
      homeTiming: () => ({ visible: true })
    };
    state.updatePetMessageWithCounts = () => {};

    state.loadRecentHabitsAndTasks();

    expect(dashboard.recentHabits.length).toBe(1);
    expect(dashboard.recentHabits[0].currentHabitStreak).toBe(4);
    expect(dashboard.recentHabits[0].coinReward).toBe(0);
  });
});
