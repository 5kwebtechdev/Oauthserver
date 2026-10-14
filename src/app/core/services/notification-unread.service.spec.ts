import { Subject } from 'rxjs';
import { NotificationUnreadService } from './notification-unread.service';
import { NotificationComponent } from '../components/user-profile/notification/notification.component';

describe('Notification unread state', () => {
  let requests: Subject<any>[];
  let http: any;
  let unread: NotificationUnreadService;
  beforeEach(() => {
    requests = [];
    http = {
      get: jasmine.createSpy().and.callFake(() => {
        const request = new Subject<any>();
        requests.push(request);
        return request;
      }),
      post: jasmine.createSpy().and.returnValue(new Subject<any>())
    };
    unread = new NotificationUnreadService(http);
  });

  it('counts only unread notifications returned by the backend, including old family messages', () => {
    unread.refresh('self-token');
    requests[0].next([
      { type: 'HABIT', readStatus: false, createdAt: '2026-10-12' },
      { type: 'TASK', readStatus: true, createdAt: '2026-10-12' },
      { type: 'FAMILY_MESSAGE', readStatus: false, createdAt: '2026-09-01' },
      { type: 'FAMILY_MESSAGE', readStatus: true, createdAt: '2026-09-01' }
    ]);
    expect(unread.count$.value).toBe(2);
  });

  it('does not count an old normal notification excluded by the backend list', () => {
    unread.refresh('self-token');
    requests[0].next([{ type: 'FAMILY_MESSAGE', readStatus: false, createdAt: '2026-09-01' }]);
    expect(unread.count$.value).toBe(1);
  });

  it('counts a null readStatus as unread, matching the deployed backend query', () => {
    unread.refresh('self-token');
    requests[0].next([{ readStatus: null }]);
    expect(unread.count$.value).toBe(1);
  });

  it('rejects an older Home response after the list confirms all read', () => {
    unread.refresh('self-token');
    unread.setFromList('self-token', [{ readStatus: true }, { readStatus: true }]);
    requests[0].next([{ readStatus: false }, { readStatus: false }]);
    expect(unread.count$.value).toBe(0);
  });

  it('holds the count steady while a mark-read request is pending', () => {
    unread.refresh('self-token');
    unread.beginRead('self-token', [{ readStatus: true }]);
    unread.refresh('self-token');
    expect(requests.length).toBe(1);
    requests[0].next([{ readStatus: false }]);
    expect(unread.count$.value).toBe(0);
    unread.finishRead('self-token');
    expect(requests.length).toBe(2);
    requests[1].next([{ readStatus: true }]);
    expect(unread.count$.value).toBe(0);
  });

  it('uses the latest request on app reopen and ignores an earlier response', () => {
    unread.refresh('self-token');
    unread.refresh('self-token');
    requests[1].next([{ readStatus: true }]);
    requests[0].next([{ readStatus: false }]);
    expect(unread.count$.value).toBe(0);
  });

  it('still displays a safe list response when a later badge refresh starts', () => {
    let visible = false;
    unread.load('self-token').subscribe(snapshot => visible = snapshot.current);
    unread.refresh('self-token');
    requests[0].next([{ readStatus: true }]);
    expect(visible).toBeTrue();
    requests[1].next([{ readStatus: false }]);
    expect(unread.count$.value).toBe(1);
  });

  it('keeps Parent, Child, and Self accounts separate', () => {
    unread.refresh('parent-token');
    unread.refresh('child-token');
    requests[0].next([{ readStatus: false }]);
    requests[1].next([{ readStatus: true }]);
    expect(unread.count$.value).toBe(0);
    unread.refresh('self-token');
    expect(unread.count$.value).toBe(0);
    requests[2].next([{ readStatus: false }, { readStatus: false }]);
    expect(unread.count$.value).toBe(2);
  });

  it('preserves the last confirmed count during a transient network error', () => {
    unread.refresh('self-token');
    requests[0].next([{ readStatus: false }]);
    unread.refresh('self-token');
    requests[1].error(new Error('offline'));
    expect(unread.count$.value).toBe(1);
  });

  it('clears the count on logout', () => {
    unread.refresh('self-token');
    requests[0].next([{ readStatus: false }]);
    unread.refresh(null);
    expect(unread.count$.value).toBe(0);
  });

  it('updates the shared badge immediately when one notification is opened', () => {
    const navigation: any = { open: jasmine.createSpy(), changed$: new Subject<void>() };
    const cdr: any = { detectChanges: jasmine.createSpy() };
    const component = new NotificationComponent(http, { getToken: () => 'self-token' } as any, {} as any, cdr, navigation, unread);
    component.notifications = [
      { id: 1, readStatus: false, actionScreen: 'HOME' },
      { id: 2, readStatus: false, actionScreen: 'HOME' }
    ] as any;
    unread.setFromList('self-token', component.notifications);
    component.onTap(component.notifications[0]);
    expect(unread.count$.value).toBe(1);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('sets the badge to zero immediately on Mark all, then restores it on failure', () => {
    const navigation: any = { open: jasmine.createSpy(), changed$: new Subject<void>() };
    const component = new NotificationComponent(http, { getToken: () => 'self-token' } as any, {} as any, { detectChanges: () => {} } as any, navigation, unread);
    component.notifications = [{ id: 1, readStatus: false }, { id: 2, readStatus: false }] as any;
    unread.setFromList('self-token', component.notifications);
    component.markAllAsRead();
    expect(unread.count$.value).toBe(0);
    (http.post.calls.mostRecent().returnValue as Subject<any>).error(new Error('offline'));
    expect(unread.count$.value).toBe(2);
  });
});
