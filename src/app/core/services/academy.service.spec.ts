import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AcademyService } from './academy.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('Academy category request context', () => {
  let http: jasmine.SpyObj<HttpClient>;
  let service: AcademyService;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValue(of([]));
    service = new AcademyService(http, {
      getToken: () => 'parent-token',
      getCurrentUserAge: () => 41,
    } as AuthService);
  });

  it('sends the selected child ID and age with the parent bearer token', () => {
    service.getCategories(11, 301).subscribe();

    const [url, options] = http.get.calls.mostRecent().args as any[];
    expect(url).toBe(`${environment.apiUrl}/category`);
    expect(options.params.get('age')).toBe('11');
    expect(options.params.get('forUserId')).toBe('301');
    expect(options.headers.get('Authorization')).toBe('Bearer parent-token');
  });

  it('does not add a child target to the signed-in account category request', () => {
    service.getCategories().subscribe();

    const [, options] = http.get.calls.mostRecent().args as any[];
    expect(options.params.get('age')).toBe('41');
    expect(options.params.has('forUserId')).toBeFalse();
  });

  it('keeps Academy feed account-scoped until its backend accepts forUserId', () => {
    service.getAcademyFeed(41).subscribe();

    const [url, options] = http.get.calls.mostRecent().args as any[];
    expect(url).toBe(`${environment.apiUrl}/courses/academy-feed`);
    expect(options.params.get('age')).toBe('41');
    expect(options.params.has('forUserId')).toBeFalse();
    expect(options.headers.get('X-Skip-Profile-Selector')).toBe('true');
    expect(options.headers.get('Authorization')).toBe('Bearer parent-token');
  });
});
