import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../package/api/auth.service';
import { EduHubCityService } from './eduhub-city.service';
import { TutorService } from './tutor.service';

describe('Tutor directory location requests', () => {
  let service: TutorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TutorService,
        { provide: AuthService, useValue: { getToken: () => 'test-token' } },
        { provide: EduHubCityService, useValue: { filter: { state: 'Maharashtra', city: 'Mumbai' } } }
      ]
    });
    service = TestBed.inject(TutorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('omits the selected location for a universal tutor directory', () => {
    service.getTutorsByEntityType('INDIVIDUAL', undefined, false).subscribe();
    const request = http.expectOne(req => req.url.endsWith('/tutors'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('entityType')).toBe('TUTOR');
    expect(request.request.params.has('city')).toBeFalse();
    expect(request.request.params.has('state')).toBeFalse();
    request.flush([]);
  });

  it('retains location filtering for an explicit city directory', () => {
    service.getTutorsByEntityType('INDIVIDUAL').subscribe();
    const request = http.expectOne(req => req.url.endsWith('/tutors'));
    expect(request.request.params.get('city')).toBe('Mumbai');
    expect(request.request.params.get('state')).toBe('Maharashtra');
    request.flush([]);
  });

  it('finds tutors in another city from the unscoped results', () => {
    service.setCacheAndApply([
      { id: 1, name: 'Asha', city: 'Mumbai', location: 'Mumbai', createdAt: '2026-10-01' },
      { id: 2, name: 'Ravi', city: 'Delhi', location: 'Delhi', createdAt: '2026-10-02' }
    ] as any);
    let names: string[] = [];
    service.tutors$.subscribe(items => names = items.map(item => item.name));
    service.searchTutors('Delhi');
    expect(names).toEqual(['Ravi']);
    service.searchTutors('  ');
    expect(names).toEqual(['Ravi', 'Asha']);
  });
});
