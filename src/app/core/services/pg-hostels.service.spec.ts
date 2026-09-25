import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { PgHostelsService } from './pg-hostels.service';
import { environment } from '../../../environments/environment';

describe('PgHostelsService', () => {
  let http: jasmine.SpyObj<HttpClient>;
  let service: PgHostelsService;

  beforeEach(() => {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    service = new PgHostelsService(http, { getToken: () => 'test-token' } as AuthService);
  });

  it('sends the supplied filters to the paged PG / Hostels endpoint', () => {
    http.get.and.returnValue(of({ content: [{ id: 7, name: 'City PG' }], number: 0, size: 10, totalElements: 1, totalPages: 1 }));
    service.list(0, 10, { city: 'Mumbai', state: 'Maharashtra', accommodationType: 'PG', suitableFor: 'Boys', foodAvailable: true })
      .subscribe(page => expect(page.content[0].name).toBe('City PG'));

    expect(http.get).toHaveBeenCalled();
    const [url, options] = http.get.calls.mostRecent().args as [string, any];
    expect(url).toBe(`${environment.apiUrl}/pg-hostels`);
    expect(options.params.get('page')).toBe('0');
    expect(options.params.get('size')).toBe('10');
    expect(options.params.get('city')).toBe('Mumbai');
    expect(options.params.get('state')).toBe('Maharashtra');
    expect(options.params.get('accommodationType')).toBe('PG');
    expect(options.params.get('suitableFor')).toBe('Boys');
    expect(options.params.get('foodAvailable')).toBe('true');
    expect(options.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('loads details from the requested listing id', () => {
    http.get.and.returnValue(of({ id: 7, name: 'City PG' }));
    service.get(7).subscribe(item => expect(item.id).toBe(7));
    expect(http.get.calls.mostRecent().args[0]).toBe(`${environment.apiUrl}/pg-hostels/7`);
  });
});
