import { of } from 'rxjs';
import { EventDetailComponent } from './event-detail.component';

describe('Event detail actions', () => {
  const event = {
    id: 43, name: 'test event', eventDate: '2026-09-23', eventType: 'PERSONAL',
    allDay: false, startTime: '16:46:00', endTime: '16:51:00'
  };

  function setup(isParent = false, childId: number | null = null) {
    const router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    router.url = '/authed/event-detail/43';
    const api = jasmine.createSpyObj('EventApi', ['getEvent', 'getChildEvent', 'deleteEvent']);
    api.getEvent.and.returnValue(of(event));
    api.getChildEvent.and.returnValue(of(event));
    api.deleteEvent.and.returnValue(of('deleted'));
    const alert = jasmine.createSpyObj('AlertController', ['create']);
    const popup = { present: jasmine.createSpy('present').and.resolveTo() };
    alert.create.and.resolveTo(popup);
    const habits = jasmine.createSpyObj('HabitService', ['notifyEventDeleted']);
    const component = new EventDetailComponent(
      { snapshot: { paramMap: { get: () => '43' } } } as any,
      router as any, api as any, alert as any, habits as any,
      { isParentUser: () => isParent } as any,
      { getChildId: () => childId } as any
    );
    component.ngOnInit();
    return { component, router, api, alert, habits };
  }

  it('loads a selected child’s event through the parent endpoint', () => {
    const { component, api } = setup(true, 1112);
    expect(api.getChildEvent).toHaveBeenCalledOnceWith('43', 1112);
    expect(api.getEvent).not.toHaveBeenCalled();
    expect(component.eventName).toBe('test event');
    component.ionViewWillEnter();
    expect(api.getChildEvent).toHaveBeenCalledTimes(2);
    expect(api.getEvent).not.toHaveBeenCalled();
  });

  it('keeps the existing endpoint for a parent viewing their own event', () => {
    const { api } = setup(true);
    expect(api.getEvent).toHaveBeenCalledOnceWith('43');
    expect(api.getChildEvent).not.toHaveBeenCalled();
  });

  it('does not switch self/child users to the parent endpoint for stale child state', () => {
    const { api } = setup(false, 1112);
    expect(api.getEvent).toHaveBeenCalledOnceWith('43');
    expect(api.getChildEvent).not.toHaveBeenCalled();
  });

  it('loads the event and sends the correct record to the edit form', () => {
    const { component, router, api } = setup();
    expect(api.getEvent).toHaveBeenCalledWith('43');
    expect(component.eventName).toBe('test event');
    component.edit();
    expect(router.navigate).toHaveBeenCalledWith(['/authed/activity-input'], jasmine.objectContaining({
      queryParams: { editEventId: 43 },
      state: jasmine.objectContaining({
        currentActive: 'events',
        habit: jasmine.objectContaining({ id: 43, type: 'events' })
      })
    }));
  });

  it('deletes only after confirmation and refreshes Home events', async () => {
    const { component, api, alert, habits, router } = setup();
    await component.confirmDelete();
    expect(api.deleteEvent).not.toHaveBeenCalled();
    const config = alert.create.calls.mostRecent().args[0];
    const remove = config.buttons.find((button: any) => button.role === 'destructive');
    remove.handler();
    expect(api.deleteEvent).toHaveBeenCalledWith('43');
    expect(habits.notifyEventDeleted).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalled();
  });
});
