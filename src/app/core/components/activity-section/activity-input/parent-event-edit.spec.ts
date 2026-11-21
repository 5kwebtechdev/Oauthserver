import { convertToParamMap } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { ActivityInputComponent } from './activity-input.component';

describe('Planner event pencil/edit loading', () => {
  let originalState: unknown;
  beforeEach(() => {
    originalState = history.state;
    history.replaceState({}, '');
  });
  afterEach(() => history.replaceState(originalState, ''));

  const event = {
    id: 1102, name: 'Child birthday', eventType: 'BIRTHDAY',
    eventStartDate: '2026-11-20', eventEndDate: '2026-11-20',
    allDay: true, recurrence: 'YEARLY', note: 'Family celebration'
  };

  function setup(parent: boolean, childId: number | null) {
    const api = jasmine.createSpyObj('EventApi', ['getEvent', 'getChildEvent', 'updateEvent', 'updateChildEvent', 'createEvent']);
    api.getEvent.and.returnValue(of(event));
    api.getChildEvent.and.returnValue(of(event));
    api.updateEvent.and.returnValue(NEVER);
    api.updateChildEvent.and.returnValue(NEVER);
    api.createEvent.and.returnValue(NEVER);
    const form = new ActivityInputComponent(
      {} as any, {} as any, { getCurrentNavigation: () => null } as any,
      { snapshot: { queryParamMap: convertToParamMap({ editEventId: '1102' }) } } as any,
      {} as any, {} as any, api, {} as any, {} as any,
      { isParentUser: () => parent } as any,
      { getChildId: () => childId } as any,
      {} as any, {} as any, {} as any
    );
    return { form, api };
  }

  it('loads and prefills the selected child’s event for a parent', () => {
    const { form, api } = setup(true, 1112);
    form.retryLoadEditEvent();
    expect(api.getChildEvent).toHaveBeenCalledOnceWith('1102', 1112);
    expect(api.getEvent).not.toHaveBeenCalled();
    expect(form.currentActive).toBe('events');
    expect(form.editingId).toBe('1102');
    expect(form.title).toBe('Child birthday');
    expect(form.notes).toBe('Family celebration');
    expect(form.eventDate?.getDate()).toBe(20);
    expect(form.eventRecurrence).toBe('YEARLY');
    expect(form.loadingEditEvent).toBeFalse();
    expect(form.eventEditLoadFailed).toBeFalse();
  });

  it('keeps self/child editing on the original endpoint even with stale child selection', () => {
    const { form, api } = setup(false, 1112);
    form.retryLoadEditEvent();
    expect(api.getEvent).toHaveBeenCalledOnceWith('1102');
    expect(api.getChildEvent).not.toHaveBeenCalled();
    expect(form.title).toBe('Child birthday');
  });

  it('keeps a parent’s own-event editing on the original endpoint', () => {
    const { form, api } = setup(true, null);
    form.retryLoadEditEvent();
    expect(api.getEvent).toHaveBeenCalledOnceWith('1102');
    expect(api.getChildEvent).not.toHaveBeenCalled();
  });

  it('retries the child endpoint after a failed load without falling back to the parent’s events', () => {
    const { form, api } = setup(true, 1112);
    api.getChildEvent.and.returnValues(throwError(() => ({ status: 400 })), of(event));
    form.retryLoadEditEvent();
    expect(form.eventEditLoadFailed).toBeTrue();
    expect(form.loadingEditEvent).toBeFalse();
    form.retryLoadEditEvent();
    expect(api.getChildEvent).toHaveBeenCalledTimes(2);
    expect(api.getEvent).not.toHaveBeenCalled();
    expect(form.eventEditLoadFailed).toBeFalse();
    expect(form.serverErrorMessage).toBe('');
    expect(form.title).toBe('Child birthday');
  });
  for (const [parent, childId, method] of [
    [true, 1112, 'updateChildEvent'], [false, 1112, 'updateEvent'], [true, null, 'updateEvent']
  ] as const) {
    it(`saves through ${method} for parent=${parent}, child=${childId}`, () => {
      const { form, api } = setup(parent, childId);
      form.retryLoadEditEvent();
      spyOn<any>(form, 'computeValidations').and.returnValue({});
      (form as any).submitEvent();
      const calls = api[method].calls;
      expect(calls.count()).toBe(1);
      expect(calls.mostRecent().args[0]).toBe('1102');
      const payload = calls.mostRecent().args[method === 'updateChildEvent' ? 2 : 1];
      if (method === 'updateChildEvent') expect(calls.mostRecent().args[1]).toBe(1112);
      expect(payload.name).toBe('Child birthday');
      expect(payload.forUserId).toBeUndefined();
      expect(api[method === 'updateChildEvent' ? 'updateEvent' : 'updateChildEvent']).not.toHaveBeenCalled();
      expect(api.createEvent).not.toHaveBeenCalled();
      (form as any).submitEvent();
      expect(calls.count()).toBe(1);
    });
  }

  it('keeps creating a new event on the existing creation endpoint', () => {
    const { form, api } = setup(true, 1112);
    form.title = 'New event';
    form.notes = '';
    form.eventDate = new Date('2026-11-20');
    form.eventAllDay = true;
    spyOn<any>(form, 'computeValidations').and.returnValue({});
    (form as any).submitEvent();
    expect(api.createEvent).toHaveBeenCalledTimes(1);
    expect(api.updateChildEvent).not.toHaveBeenCalled();
    expect(api.updateEvent).not.toHaveBeenCalled();
  });

});
