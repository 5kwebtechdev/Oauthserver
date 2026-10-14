import { NavigationEnd } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { notificationRoute, NotificationNavigationService } from './notification-navigation.service';
import { ProfileStoreService } from './profile-store.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationComponent } from '../components/user-profile/notification/notification.component';
import { Capacitor } from '@capacitor/core';

describe('Notification navigation', () => {
  const routes: [string, unknown, string][] = [
    ['HABIT', 455, '/authed/activity-detail/455?type=habits'],
    ['TASK', 12, '/authed/activity-detail/12?type=tasks'],
    ['ACTIVITY', 12, '/authed/activity-page'],
    ['VIEW_ALL_HABITS', 455, '/authed/activity-page?tab=habits'],
    ['VIEW_ALL_TASKS', null, '/authed/activity-page?tab=tasks'],
    ['JOURNAL', null, '/authed/journal-input'],
    ['LEARNING', null, '/authed/content'],
    ['COURSE', 56, '/authed/academy/course/56'],
    ['STREAK', null, '/authed/streaks'],
    ['HOME', null, '/home'],
    ['MOOD', null, '/home'],
    ['PARENT_DASHBOARD', 325, '/authed/parent-account'],
    ['COURSE', null, '/authed/academy'],
    ['HABIT', null, '/authed/activity-page?tab=habits'],
    ['TASK', 'bad/id', '/authed/activity-page?tab=tasks'],
    ['https://example.com', null, '/home']
  ];
  routes.forEach(([actionScreen, actionReferenceId, expected]) => {
    it(`routes ${actionScreen} (${actionReferenceId})`, () => {
      expect(notificationRoute({ actionScreen, actionReferenceId })).toBe(expected);
    });
  });
  ['FAMILY_MESSAGE', 'BIRTHDAY_SELF', 'CHILD_BIRTHDAY_PARENT', 'PARENT_MORNING_OVERVIEW'].forEach(type => {
    it(`uses actionScreen, not ${type}, as authority`, () => {
      const data = { type, actionScreen: type.startsWith('CHILD_') || type.startsWith('PARENT_') ? 'PARENT_DASHBOARD' : 'HOME', actionReferenceId: 325 };
      expect(notificationRoute(data)).toBe(data.actionScreen === 'HOME' ? '/home' : '/authed/parent-account');
    });
  });
  it('prefers actionReferenceId and supports old FCM referenceId', () => {
    expect(notificationRoute({actionScreen:'COURSE', referenceId:8})).toContain('/8');
    expect(notificationRoute({actionScreen:'COURSE', actionReferenceId:9, referenceId:8})).toContain('/9');
  });
  [0, -1, 1.5, {}, '1/../../home', '9007199254740992'].forEach(id => {
    it(`rejects invalid ID ${JSON.stringify(id)}`, () => {
      expect(notificationRoute({actionScreen:'COURSE', actionReferenceId:id})).toBe('/authed/academy');
    });
  });

  let service: NotificationNavigationService;
  let router: any;
  let http: any;
  let profiles: ProfileStoreService;
  beforeEach(() => {
    localStorage.setItem('auth_token', 'notification-test-token');
    localStorage.removeItem('mb_selected_child_id');
    router = { navigated:true, events:new Subject(), navigateByUrl:jasmine.createSpy().and.returnValue(Promise.resolve(true)) };
    http = {post:jasmine.createSpy().and.returnValue(of({}))};
    profiles = new ProfileStoreService();
    service = new NotificationNavigationService(router, http, profiles);
  });
  afterEach(() => {localStorage.removeItem('auth_token'); localStorage.removeItem('mb_selected_child_id');});
  it('preserves back history and marks only explicit notification ID read', () => {
    service.open({actionScreen:'COURSE', actionReferenceId:56, notificationId:1201});
    expect(router.navigateByUrl).toHaveBeenCalledWith('/authed/academy/course/56', {replaceUrl:false});
    expect(http.post.calls.mostRecent().args[0]).toMatch(/\/user\/notifications\/1201\/read$/);
  });
  it('never treats the entity reference as a notification ID', () => {
    service.open({actionScreen:'COURSE', actionReferenceId:56});
    expect(http.post).not.toHaveBeenCalled();
  });
  it('queues a terminated-app tap until initial routing completes', () => {
    router.navigated=false;
    service.open({actionScreen:'JOURNAL'});
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    router.navigated=true;
    router.events.next(new NavigationEnd(1,'/home','/home'));
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/authed/journal-input',{replaceUrl:false});
  });
  it('resumes a pending tap after authentication', () => {
    localStorage.removeItem('auth_token');
    service.open({actionScreen:'STREAK'});
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    localStorage.setItem('auth_token','notification-test-token');
    service.resume(); service.resume();
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });
  it('drops pending taps on logout', () => {
    router.navigated=false; service.open({actionScreen:'JOURNAL'}); service.cancelPending();
    router.navigated=true; service.resume();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
  it('selects the referenced child only from loaded family data', () => {
    service.open({actionScreen:'PARENT_DASHBOARD',actionReferenceId:325});
    expect(profiles.getSelectedChildSync()).toBeNull();
    profiles.setChildren([{id:1},{id:325}] as any);
    expect(profiles.getSelectedChildIdSync()).toBe(325);
  });
  it('does not select an unrelated child ID', () => {
    service.open({actionScreen:'PARENT_DASHBOARD',actionReferenceId:999});
    profiles.setChildren([{id:1}] as any);
    expect(profiles.getSelectedChildIdSync()).toBe(1);
  });
  it('refreshes count after a successful push read', () => {
    const changed=jasmine.createSpy(); service.changed$.subscribe(changed);
    service.open({actionScreen:'HOME',notificationId:1201});
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it('list tap with no reference navigates and marks read optimistically', () => {
    const component=new NotificationComponent(http, {getToken:()=> 'token'} as any,router,{detectChanges:()=>{}} as any,service,{setFromList:()=>{},beginRead:()=>{},finishRead:()=>{}} as any);
    const n:any={id:1201,type:'JOURNAL',actionScreen:'JOURNAL',actionReferenceId:null,readStatus:false};
    component.notifications=[n];component.onTap(n);
    expect(n.readStatus).toBeTrue();expect(component.unreadCount).toBe(0);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/authed/journal-input',{replaceUrl:false});
    expect(http.post).toHaveBeenCalledTimes(1);
  });
  it('restores unread state if marking read fails', () => {
    http.post.and.returnValue(throwError(()=>new Error('offline')));
    const component=new NotificationComponent(http, {getToken:()=> 'token'} as any,router,{detectChanges:()=>{}} as any,service,{setFromList:()=>{},beginRead:()=>{},finishRead:()=>{}} as any);
    const n:any={id:1201,actionScreen:'HOME',readStatus:false};
    component.onTap(n);expect(n.readStatus).toBeFalse();
  });
  it('mark all updates the visible unread count', () => {
    const component=new NotificationComponent(http, {getToken:()=> 'token'} as any,router,{detectChanges:()=>{}} as any,service,{setFromList:()=>{},beginRead:()=>{},finishRead:()=>{}} as any);
    component.notifications=[{id:1,readStatus:false},{id:2,readStatus:true}] as any;
    component.markAllAsRead();expect(component.unreadCount).toBe(0);
    expect(http.post.calls.mostRecent().args[0]).toMatch(/\/read-all$/);
  });

  describe('native listeners', () => {
    let callbacks:Record<string,Function>;
    let push:PushNotificationService;
    beforeEach(() => {
      callbacks={};
      spyOn(Capacitor,'getPlatform').and.returnValue('android');
      push=new PushNotificationService({} as any,router,{run:(fn:Function)=>fn()} as any,{} as any,{show:()=>{}} as any,{} as any,service);
      const plugin={addListener:(name:string,callback:Function)=>{callbacks[name]=callback;return Promise.resolve({remove:async()=>{}});}};
      (push as any).messaging=plugin;
      (push as any).localNotifications=plugin;
      spyOn<any>(push,'showAndroidForegroundNotification').and.returnValue(Promise.resolve());
    });
    it('foreground receipt never navigates', () => {
      (push as any).setupForegroundListener();
      callbacks['notificationReceived']({notification:{data:{actionScreen:'JOURNAL'}}});
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
    it('background push tap uses the shared actionReferenceId routing', () => {
      (push as any).setupNotificationTapListener();
      callbacks['notificationActionPerformed']({notification:{data:{actionScreen:'COURSE',actionReferenceId:56}}});
      expect(router.navigateByUrl).toHaveBeenCalledWith('/authed/academy/course/56',{replaceUrl:false});
    });
    it('foreground local notification tap navigates', () => {
      (push as any).setupLocalNotificationTapListener();
      callbacks['localNotificationActionPerformed']({notification:{extra:{actionScreen:'JOURNAL'}}});
      expect(router.navigateByUrl).toHaveBeenCalledWith('/authed/journal-input',{replaceUrl:false});
    });
  });
});
