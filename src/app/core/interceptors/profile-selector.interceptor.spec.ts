import { HttpHandler, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ProfileSelectorInterceptor } from './profile-selector.interceptor';
import { ProfileSelectorService } from '../services/profile-selector-service';

describe('ProfileSelectorInterceptor account-level overlays', () => {
  for (const resource of ['courses', 'challenges', 'articles']) {
    it(`does not add forUserId to ${resource} assignment`, () => {
      const selector = {
        child$: new BehaviorSubject<number | null>(123),
      } as unknown as ProfileSelectorService;
      TestBed.configureTestingModule({ providers: [{ provide: ProfileSelectorService, useValue: selector }] });
      const interceptor = TestBed.runInInjectionContext(() => new ProfileSelectorInterceptor());
      const handler = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
      handler.handle.and.returnValue(of(new HttpResponse({ status: 200 })));
      const body = { childIds: [123], extraCoinsByParent: 0 };
      interceptor.intercept(new HttpRequest('POST', `/v1/${resource}/assign`, body), handler).subscribe();
      expect(handler.handle.calls.mostRecent().args[0].body).toEqual(body);
      expect(handler.handle.calls.mostRecent().args[0].params.has('forUserId')).toBeFalse();
    });
  }

  it('keeps the referral dismissal body empty and strips the internal bypass header', () => {
    const selector = {
      child$: new BehaviorSubject<number | null>(123),
    } as unknown as ProfileSelectorService;
    TestBed.configureTestingModule({ providers: [{ provide: ProfileSelectorService, useValue: selector }] });
    const interceptor = TestBed.runInInjectionContext(() => new ProfileSelectorInterceptor());
    const handler = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    handler.handle.and.returnValue(of(new HttpResponse({ status: 200 })));
    const request = new HttpRequest('POST', '/v1/pet-message/home/overlay/dismiss', null, {
      headers: new HttpHeaders().set('X-Skip-Profile-Selector', 'true'),
    });

    interceptor.intercept(request, handler).subscribe();
    const forwarded = handler.handle.calls.mostRecent().args[0];
    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(forwarded.body).toBeNull();
    expect(forwarded.params.has('forUserId')).toBeFalse();
    expect(forwarded.headers.has('X-Skip-Profile-Selector')).toBeFalse();
  });
});
