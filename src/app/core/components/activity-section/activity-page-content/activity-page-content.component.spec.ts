import { ActivityPageContentComponent } from './activity-page-content.component';
import { of, Subscription } from 'rxjs';
import { ActivityPageComponent } from '../activity-page/activity-page.component';

describe('activity page Add navigation', () => {
    for (const [selectedTab, expected] of [['habit', 'habits'], ['task', 'tasks'], ['planner', 'timetable'], ['all', 'timetable']]) {
        it(`opens ${expected} creation from ${selectedTab}`, () => {
            const router = { url: '/authed/activity?tab=habits', navigate: jasmine.createSpy().and.returnValue(Promise.resolve(true)) };
            const page = new ActivityPageComponent(router as any, {} as any);
            page.habitContent = { isPlannerCalendarDesign: true, childCalendarTab: selectedTab } as any;
            page.onAddHabit();
            expect(router.navigate).toHaveBeenCalledOnceWith(['/activity-input'], {
                state: { currentActive: expected, origin: router.url }
            });
        });
    }
});

describe('visible calendar week dots', () => {
    for (const [year, month] of [[2026, 8], [2026, 11]]) {
        it(`loads both visible months before selection at ${year}-${month + 1}`, () => {
            const c: any = Object.create(ActivityPageContentComponent.prototype);
            const selected = new Date(year, month + 1, 0);
            const next = new Date(year, month + 1, 1);
            const second = new Date(year, month + 1, 2);
            const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            Object.assign(c, {
                selectedDate: selected, childCarouselStartDate: selected,
                plannerRequestId: 0, subscriptions: new Subscription(), childDateActivities: {},
                habitService: { formatDateToYYYYMMDD: key },
                cdr: { detectChanges() {} },
                getPlannerContextKey: () => 'self',
                calendarService: { getUserPlannerCalendarMonth: jasmine.createSpy().and.callFake((date: string) => of({
                    habits: [{ completionDate: date }],
                    tasks: date === key(next) ? [{ completionDate: key(next) }] : [],
                    events: date === key(next) ? [{ type: 'TIMETABLE', completionDate: key(second), startDate: key(second), endDate: key(second) }] : []
                })) }
            });
            c.loadChildCalendarData();
            expect(c.calendarService.getUserPlannerCalendarMonth.calls.allArgs()).toEqual([[key(selected)], [key(next)]]);
            expect(c.childDateActivities[key(selected)].habit).toBeTrue();
            expect(c.childDateActivities[key(next)]).toEqual({ habit: true, task: true });
            expect(c.childDateActivities[key(second)].planner).toBeTrue();
            expect(c.selectedDate).toBe(selected);
            expect(c.childPlannerItems).toEqual([]);

            c.calendarService.getUserPlannerCalendarMonth.calls.reset();
            c.selectedDate = new Date(year, month, 10);
            c.childCarouselStartDate = c.selectedDate;
            c.loadChildCalendarData();
            expect(c.calendarService.getUserPlannerCalendarMonth).toHaveBeenCalledTimes(1);
            c.subscriptions.unsubscribe();
        });
    }
});

describe('planner schedule card', () => {
    it('keeps entries from other weekdays visible without counting them as today', () => {
        const component = Object.create(ActivityPageContentComponent.prototype) as ActivityPageContentComponent;
        (component as any).habitService = {
            formatDateToYYYYMMDD: (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        };
        component.selectedDate = new Date(2026, 8, 25); // Friday
        component.childPlannerItems = [{
            id: 41,
            title: 'Viva Prep',
            startDate: '2026-09-24',
            endDate: '2026-10-06',
            activities: [
                { entryId: 1, title: 'HRM', startTime: '09:30', endTime: '10:17', daysOfWeek: ['FRIDAY'] },
                { entryId: 2, title: 'BRM', startTime: '19:00', endTime: '19:00', daysOfWeek: ['FRIDAY'] },
                { entryId: 3, title: 'OB', startTime: '20:00', endTime: '20:45', daysOfWeek: ['SATURDAY'] }
            ]
        }];

        const [card] = component.childPlannerCards;
        expect(card.entries.map(entry => entry.title)).toEqual(['HRM', 'BRM']);
        expect(card.otherEntries.map(entry => entry.title)).toEqual(['OB']);
        expect(card.totalEntries).toBe(3);
        expect(component.getPlannerEntryDaysLabel(card.otherEntries[0], card.source)).toBe('Sat');

    });
});
