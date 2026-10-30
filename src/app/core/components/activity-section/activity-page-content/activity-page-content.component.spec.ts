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
                queryParams: { createType: expected },
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
                authService: { isParentUser: () => false },
                eventApi: { getEvents: () => of([]) },
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
            // The selected month's calendar and the next month are both
            // needed for the selected-date 30-day Upcoming Events window.
            expect(c.calendarService.getUserPlannerCalendarMonth).toHaveBeenCalledTimes(2);
            c.subscriptions.unsubscribe();
        });
    }
});

describe('Planner events in the calendar', () => {
    it('opens the separate Events screen with the selected child’s calendar records', () => {
        const c: any = Object.create(ActivityPageContentComponent.prototype);
        const navigate = jasmine.createSpy().and.returnValue(Promise.resolve(true));
        Object.assign(c, {
            authService: { isParentUser: () => true },
            profileSelector: { getChildId: () => 42 },
            router: { url: '/activity-page?tab=planner', navigate },
            childEventItems: [{ id: 7, title: 'Math exam', startDate: '2026-11-05' }]
        });
        c.openAllEvents();
        expect(navigate).toHaveBeenCalledOnceWith(['/events-list'], {
            state: { origin: '/activity-page?tab=planner', childId: 42,
                calendarEvents: [{ id: 7, title: 'Math exam', name: 'Math exam', startDate: '2026-11-05', eventDate: '2026-11-05' }] }
        });
    });

    it('marks and displays an event saved through the Event API', () => {
        const c: any = Object.create(ActivityPageContentComponent.prototype);
        const selected = new Date(2026, 9, 9);
        const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const event = { id: 31, name: 'School event', eventDate: '2026-10-09', eventType: 'OTHER', recurrence: 'ONE_TIME' };
        Object.assign(c, {
            selectedDate: selected, childCarouselStartDate: selected, childCalendarTab: 'planner',
            plannerRequestId: 0, subscriptions: new Subscription(), childDateActivities: {},
            habitService: { formatDateToYYYYMMDD: key },
            authService: { isParentUser: () => false },
            eventApi: { getEvents: () => of([event]) },
            cdr: { detectChanges() {} },
            getPlannerContextKey: () => 'self',
            calendarService: { getUserPlannerCalendarMonth: () => of({ habits: [], tasks: [], events: [] }) }
        });

        c.loadChildCalendarData();

        expect(c.getChildDateActivities(selected).planner).toBeTrue();
        expect(c.childEventItems.length).toBe(1);
        expect(c.childEventItems[0]).toEqual(jasmine.objectContaining(event));
        expect(c.childEventItems[0].__plannerEventDate).toEqual(selected);
        expect(c.showsPlannerEvents).toBeTrue();
        expect(c.hasChildCalendarContent).toBeFalse();
        c.subscriptions.unsubscribe();
    });
});

describe('Planner upcoming event window', () => {
    it('keeps Upcoming Events above the activity tabs for empty and populated tabs', () => {
        const c: any = Object.create(ActivityPageContentComponent.prototype);
        c.childEventItems = [];
        for (const tab of ['all', 'habit', 'task', 'planner']) {
            c.childCalendarTab = tab;
            expect(c.showsPlannerEvents).toBeTrue();
            c.childEventItems = [{ id: 1, name: 'Birthday' }];
            expect(c.showsPlannerEvents).toBeTrue();
            c.childEventItems = [];
        }
    });
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
