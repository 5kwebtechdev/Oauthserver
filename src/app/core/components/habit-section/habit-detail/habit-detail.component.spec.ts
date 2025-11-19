import { HabitDetailComponent } from './habit-detail.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Habit } from '../habit.types';

describe('HabitDetailComponent', () => {
    let component: HabitDetailComponent;

    beforeEach(() => {
        // instantiate without Angular testbed to avoid template dependency resolution
        component = new HabitDetailComponent(null as any, null as any, null as any);
    });

    it('should display Everyday when everyday flag is true', () => {
        component.habit = { id: '1', title: 'Test', notes: '', startDate: new Date(), endDate: new Date(), startTime: '07:00:00', endTime: '08:00:00', startTimeStamp: Date.now(), endTimeStamp: Date.now(), type: 'habits', isPrivate: false, selectedRoutine: 'MORNING', routineTags: [], everyday: true, selectedDays: ['MONDAY', 'TUESDAY'], priority: 'medium', routine: 'MORNING', status: 'pending', createdAt: new Date() } as Habit;
        expect(component.shortDaysOfWeek).toBe('Everyday');
    });

    it('should display Sat, Sun for weekend only', () => {
        component.habit = { id: '1', title: 'Test', notes: '', startDate: new Date(), endDate: new Date(), startTime: '07:00:00', endTime: '08:00:00', startTimeStamp: Date.now(), endTimeStamp: Date.now(), type: 'habits', isPrivate: false, selectedRoutine: 'MORNING', routineTags: [], everyday: false, selectedDays: ['SATURDAY', 'SUNDAY'], priority: 'medium', routine: 'MORNING', status: 'pending', createdAt: new Date(), daysOfWeek: ['SATURDAY', 'SUNDAY'] } as Habit;
        expect(component.shortDaysOfWeek).toBe('Sat, Sun');
    });

    it('should order partial days as Mon, Tue, Wed in canonical order', () => {
        component.habit = { id: '1', title: 'Test', notes: '', startDate: new Date(), endDate: new Date(), startTime: '07:00:00', endTime: '08:00:00', startTimeStamp: Date.now(), endTimeStamp: Date.now(), type: 'habits', isPrivate: false, selectedRoutine: 'MORNING', routineTags: [], everyday: false, selectedDays: ['WEDNESDAY', 'MONDAY', 'TUESDAY'], priority: 'medium', routine: 'MORNING', status: 'pending', createdAt: new Date(), daysOfWeek: ['WEDNESDAY', 'MONDAY', 'TUESDAY'] } as Habit;
        expect(component.shortDaysOfWeek).toBe('Mon, Tue, Wed');
    });
});
