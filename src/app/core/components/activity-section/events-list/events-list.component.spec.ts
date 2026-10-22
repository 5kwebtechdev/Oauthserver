import { of, Subscription } from 'rxjs';
import { EventsListComponent } from './events-list.component';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { legacyAuthedRedirectGuard } from '../../../authe-guard/authe-guard';

@Component({ standalone: true, template: '' })
class EventsRouteTestPage {}

describe('Calendar events navigation through the actual legacy guard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideLocationMocks(),
      provideRouter([
        { path: 'authed', canActivateChild: [legacyAuthedRedirectGuard], children: [
          { path: 'events-list', component: EventsRouteTestPage }
        ] },
        { path: 'app', redirectTo: '', pathMatch: 'prefix' },
        { path: 'events-list', component: EventsRouteTestPage }
      ])
    ] });
  });

  it('reproduces lost state on the legacy route and preserves it on the canonical route', async () => {
    await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    const state = { childId: 42, calendarEvents: [{ id: 7, name: 'Math exam', eventDate: '2026-11-05' }] };
    await router.navigate(['/authed/events-list'], { state });
    expect((location.getState() as any).calendarEvents).toBeUndefined();
    await router.navigate(['/events-list'], { state, onSameUrlNavigation: 'reload' });
    expect((location.getState() as any).calendarEvents).toEqual(state.calendarEvents);
    expect((location.getState() as any).childId).toBe(42);
  });
});

describe('parent Events View all', () => {
  const originalState = history.state;

  afterEach(() => history.replaceState(originalState, ''));

  function component(childId: number): any {
    const page: any = Object.create(EventsListComponent.prototype);
    page.profileSelector = { getChildId: () => childId };
    page.api = { getEvents: () => of([]), getEventTypes: () => of([]) };
    page.subscriptions = new Subscription();
    page.requestId = 0;
    return page;
  }

  it('shows real selected-child calendar events when /events/all is empty', () => {
    history.replaceState({ childId: 42, calendarEvents: [
      { id: 1, name: 'Math exam', eventDate: '2026-11-05', recurrence: 'ONE_TIME' },
      { id: 2, name: 'Science exam', eventDate: '2026-11-06', recurrence: 'ONE_TIME' }
    ] }, '');
    const page = component(42);
    page.load();
    expect(page.events.map((event: any) => event.name)).toEqual(['Math exam', 'Science exam']);
    page.subscriptions.unsubscribe();
  });

  it('never carries another child’s Calendar events into the list', () => {
    history.replaceState({ childId: 42, calendarEvents: [
      { id: 1, name: 'Math exam', eventDate: '2026-11-05' }
    ] }, '');
    const page = component(43);
    page.load();
    expect(page.events).toEqual([]);
    page.subscriptions.unsubscribe();
  });

  it('keeps the full events API response authoritative when available', () => {
    history.replaceState({ childId: 42, calendarEvents: [
      { id: 1, name: 'Calendar event', eventDate: '2026-11-05' }
    ] }, '');
    const page = component(42);
    page.api.getEvents = () => of([{ id: 2, name: 'API event', eventDate: '2026-12-01' }]);
    page.load();
    expect(page.events.map((event: any) => event.name)).toEqual(['API event']);
    page.subscriptions.unsubscribe();
  });
});
