import { Subject } from 'rxjs';
import { ParentAccountComponent } from './parent-account.component';
import { VibesDisplayResponse } from '../../core/models/mood.model';

describe('ParentAccountComponent child analytics', () => {
  function vibe(userId: number, appScore: number): VibesDisplayResponse {
    return {
      userId,
      userName: `Child ${userId}`,
      relationship: 'CHILD',
      mood: 'HAPPY',
      audience: 'PARENT',
      title: '',
      description: '',
      emptyStateDescription: '',
      completedStateDescription: '',
      totalHabits: 4,
      completedHabits: 3,
      totalTasks: 5,
      completedTasks: 4,
      progressPercentage: 80,
      coins: userId * 10,
      trophies: 2,
      streak: 3,
      badges: 1,
      completionRate: appScore - 3,
      consistencyRate: appScore - 2,
      improvementRate: appScore - 1,
      appScore
    };
  }

  it('ignores an older response after the parent switches children', () => {
    const firstChildResponse = new Subject<VibesDisplayResponse[]>();
    const secondChildResponse = new Subject<VibesDisplayResponse[]>();
    const moodService = jasmine.createSpyObj('MoodService', ['getVibesDisplay']);
    moodService.getVibesDisplay.and.returnValues(firstChildResponse, secondChildResponse);
    const userService = jasmine.createSpyObj('UserService', ['saveUserStats']);

    const component = new ParentAccountComponent(
      {} as any,
      userService,
      moodService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    component.selectedChild = { id: 101, name: 'First child', avatarUrl: '' };
    (component as any).loadUserStats();

    component.selectedChild = { id: 202, name: 'Second child', avatarUrl: '' };
    component.appScore = 22;
    (component as any).loadUserStats();

    firstChildResponse.next([vibe(101, 91)]);
    expect(component.appScore).toBe(22);
    expect(component.performanceLoading).toBeTrue();

    secondChildResponse.next([vibe(101, 91), vibe(202, 76)]);
    expect(component.appScore).toBe(76);
    expect(component.userCoins).toBe(2020);
    expect(component.performanceLoading).toBeFalse();
    expect(moodService.getVibesDisplay.calls.allArgs()).toEqual([[101], [202]]);
  });
});
