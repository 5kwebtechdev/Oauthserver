import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthApi } from './auth.api';
import { environment } from '../../../environments/environment';

import { of } from 'rxjs';
import { EventApi, EventPayload } from './event.api';

describe('EventApi recurrence response', () => {
  const payload: EventPayload = {
    name: 'Pay rent', isPrivate: false, highPriority: false, eventType: 'medical_test',
    allDay: true, eventStartDate: '2026-01-20', eventEndDate: '2026-03-05',
    recurrence: 'MONTHLY', reminderMinutesBefore: null, note: null
  };

  it('sends the selected date range and normalizes every created series entry', () => {
    const post = jasmine.createSpy('post').and.returnValue(of([
      { id: 1, eventStartDate: '2026-01-20', eventEndDate: '2026-01-31', seriesId: 7 },
      { id: 2, eventStartDate: '2026-02-01', eventEndDate: '2026-02-28', seriesId: 7 }
    ]));
    const api = new EventApi({ post } as any, { getToken: () => 'redacted' } as any);

    api.createEvent(payload).subscribe(events => {
      expect(events.length).toBe(2);
      expect(events.map(event => event.eventDate)).toEqual(['2026-01-20', '2026-02-01']);
      expect(events.map(event => event.eventEndDate)).toEqual(['2026-01-31', '2026-02-28']);
      expect(events.every(event => event.seriesId === 7)).toBeTrue();
    });
    expect(post.calls.mostRecent().args[1]).toEqual(payload);
    expect(post.calls.mostRecent().args[1].eventDate).toBeUndefined();
  });

  it('keeps a legacy single-event response usable', () => {
    const post = jasmine.createSpy('post').and.returnValue(of({ id: 3, eventDate: '2026-10-27' }));
    const api = new EventApi({ post } as any, { getToken: () => null } as any);
    api.createEvent({ ...payload, eventStartDate: '2026-10-27', eventEndDate: '2026-10-27', recurrence: 'ONE_TIME' })
      .subscribe(events => {
        expect(events.length).toBe(1);
        expect(events[0].eventStartDate).toBe('2026-10-27');
        expect(events[0].eventEndDate).toBe('2026-10-27');
      });
  });
});

describe('Event detail endpoint contracts', () => {
  let api: EventApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), EventApi,
      { provide: AuthApi, useValue: { getToken: () => 'test-parent-token' } }
    ] });
    api = TestBed.inject(EventApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('keeps the original own-event URL and normalization unchanged', () => {
    let result: any;
    api.getEvent(43).subscribe(event => result = event);
    const request = http.expectOne(`${environment.apiUrl}/events/43`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('forUserId')).toBeFalse();
    request.flush({ id: 43, eventDate: '2026-11-16' });
    expect(result.eventStartDate).toBe('2026-11-16');
    expect(result.eventEndDate).toBe('2026-11-16');
  });

  it('uses the child endpoint, explicit child ID and existing Bearer header', () => {
    let result: any;
    api.getChildEvent(43, 1112).subscribe(event => result = event);
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/events/for-child/43`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('forUserId')).toBe('1112');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-parent-token');
    request.flush({ id: 43, name: 'Child event', eventStartDate: '2026-11-16', eventEndDate: '2026-11-17' });
    expect(result.name).toBe('Child event');
    expect(result.eventDate).toBe('2026-11-16');
    expect(result.eventEndDate).toBe('2026-11-17');
  });
});

describe('Parent event update contract', () => {
  const payload: EventPayload = {
    name: 'Birthday', isPrivate: false, highPriority: false, eventType: 'BIRTHDAY',
    allDay: true, eventStartDate: '2026-11-20', eventEndDate: '2026-11-20',
    recurrence: 'ONE_TIME', reminderMinutesBefore: null, note: null
  };
  let api: EventApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), EventApi,
      { provide: AuthApi, useValue: { getToken: () => 'test-parent-token' } }
    ] });
    api = TestBed.inject(EventApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('puts child ID only in the query and normalizes the returned event list', () => {
    let result: any;
    const input = { ...payload, forUserId: 9999 };
    api.updateChildEvent(1102, 1112, input).subscribe(events => result = events);
    const req = http.expectOne(r => r.url === `${environment.apiUrl}/events/for-child/update/1102`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.params.get('forUserId')).toBe('1112');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-parent-token');
    expect(input.forUserId).toBe(9999);
    req.flush([{ id: 1102, eventStartDate: '2026-11-20', eventEndDate: '2026-11-20' }]);
    expect(result.length).toBe(1);
    expect(result[0].eventDate).toBe('2026-11-20');
  });

  it('keeps the original own-event update URL and body unchanged', () => {
    api.updateEvent(1102, payload).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/events/update/1102`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.params.has('forUserId')).toBeFalse();
    req.flush([{ id: 1102, eventDate: '2026-11-20' }]);
  });
});
