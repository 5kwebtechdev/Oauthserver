import { convertToParamMap } from '@angular/router';
import { ActivityPageComponent } from './activity-page.component';
import { ActivityInputComponent } from '../activity-input/activity-input.component';

describe('View All add navigation', () => {
  let originalState: any;
  beforeEach(() => originalState = history.state);
  afterEach(() => history.replaceState(originalState, ''));

  for (const [category, target] of [['habit', 'habits'], ['task', 'tasks'], ['planner', 'timetable'], ['all', 'timetable']] as const) {
    it(`opens a fresh ${target} form from ${category}, including cached re-entry`, () => {
      const navigate = jasmine.createSpy('navigate').and.resolveTo(true);
      const page = new ActivityPageComponent({ navigate, url: '/activity-page' } as any, {} as any);
      page.habitContent = { isPlannerCalendarDesign: true, childCalendarTab: category } as any;
      page.onAddHabit();
      expect(navigate).toHaveBeenCalledWith(['/activity-input'], {
        queryParams: { createType: target },
        state: { currentActive: target, origin: '/activity-page' }
      });

      // Simulate the previous Planner screen surviving in Ionic's outlet,
      // with an old edit payload but no current Router navigation object.
      history.replaceState({ currentActive: 'timetable', habit: { id: 91, plannerType: 'TIMETABLE' } }, '');
      const form = new ActivityInputComponent(
        {} as any, {} as any, { getCurrentNavigation: () => null } as any,
        { snapshot: { queryParamMap: convertToParamMap({ createType: target }) } } as any,
        {} as any, {} as any, {} as any, {} as any, {} as any,
        {} as any, {} as any, {} as any, {} as any, {} as any
      );
      form.currentActive = 'timetable';
      form.title = 'Previous planner title';
      form.editingId = 91;
      form.ionViewWillEnter();
      expect(form.currentActive).toBe(target);
      expect(form.title).toBe('');
      expect(form.editingId).toBeUndefined();
      expect(form.originalHabit).toBeNull();
    });
  }

  it('keeps the legacy Tasks list add action on Tasks', () => {
    const navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    const page = new ActivityPageComponent({ navigate, url: '/activity-page' } as any, {} as any);
    page.habitContent = { isPlannerCalendarDesign: false, currentMainTab: 'tasks' } as any;
    page.onAddHabit();
    expect(navigate.calls.mostRecent().args[1].queryParams.createType).toBe('tasks');
  });
});
