import { ActivityPageContentComponent } from './activity-page-content.component';

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
