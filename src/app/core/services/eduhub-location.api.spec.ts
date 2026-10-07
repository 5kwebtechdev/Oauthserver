import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { EduHubLocationApi } from './eduhub-location.api';

describe('EduHubLocationApi', () => {
  let api: EduHubLocationApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EduHubLocationApi, { provide: AuthService, useValue: { getToken: () => 'test-token' } }]
    });
    api = TestBed.inject(EduHubLocationApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends coordinates only when device location is available', () => {
    api.resolve({ lat: 30.7, lng: 76.71 }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/eduhub/location/resolve`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ lat: 30.7, lng: 76.71 });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ country: 'India', state: 'Punjab', city: 'Mohali', source: 'device' });
  });

  it('uses IP resolution without sending coordinates after denial or failure', () => {
    api.resolve().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/eduhub/location/resolve`);
    expect(request.request.body).toEqual({});
    request.flush({ country: 'India', state: 'Maharashtra', city: 'Mumbai', source: 'default' });
  });
});
