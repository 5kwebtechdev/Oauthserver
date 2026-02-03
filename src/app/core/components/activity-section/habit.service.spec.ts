import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HabitService } from './habit.service';
import { HabitApi } from '../../api/habit.api';

describe('HabitService', () => {
    let service: HabitService;
    let mockHabitApi: any;

    beforeEach(() => {
        mockHabitApi = {
            getHabitsByDate: jasmine.createSpy('getHabitsByDate')
        };

        TestBed.configureTestingModule({
            providers: [
                HabitService,
                { provide: HabitApi, useValue: mockHabitApi }
            ]
        });

        service = TestBed.inject(HabitService);
    });

    it('should map response fields correctly from API', (done) => {
        const apiResp = [{
            id: 'abc',
            title: 'Test Habit',
            description: 'Notes',
            startDate: '2024-01-01',
            endDate: '2024-01-02',
            startTime: '07:00:00',
            endTime: '08:00:00',
            coinReward: 10,
            coinsEarned: 5,
            streak: 3,
            highestStreak: 7,
            completionPercentage: 80,
            totalCompletedDays: 10,
            milestoneBadges: [{ id: 'b1', title: 'Badge 1', progress: 1, target: 2 }],
            daysOfWeek: ['MONDAY', 'WEDNESDAY']
        }];

        mockHabitApi.getHabitsByDate.mockReturnValue(of(apiResp));

        service.loadHabitsForDate('2024-01-01').subscribe(() => {
            const habits = service.getCurrentHabits();
            expect(habits.length).toBe(1);
            const h = habits[0] as any;
            expect(h.id).toBe('abc');
            expect(h.coinsEarned).toBe(5);
            expect(h.streak).toBe(3);
            expect(h.highestStreak).toBe(7);
            expect(h.completionPercentage).toBe(80);
            expect(h.totalCompletedDays).toBe(10);
            expect(Array.isArray(h.milestoneBadges)).toBeTruthy();
            expect(h.selectedDays).toEqual(['MONDAY', 'WEDNESDAY']);
            done();
        });
    });
});
