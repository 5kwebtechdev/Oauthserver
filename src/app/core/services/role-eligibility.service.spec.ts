import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { RoleEligibilityService } from './role-eligibility.service';

describe('RoleEligibilityService', () => {
  let service: RoleEligibilityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RoleEligibilityService,
        { provide: AuthService, useValue: { getToken: () => 'parent-token' } },
      ],
    });
    service = TestBed.inject(RoleEligibilityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests public onboarding eligibility with only the numeric age', () => {
    service.onboarding(25).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/role-eligibility/onboarding?age=25`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(request.request.params.keys()).toEqual(['age']);
    request.flush({ age: 25, ageGroup: 'AGE_18_TO_29', eligibleToOnboard: true, selfLocked: true, roles: [] });
  });

  it('sends an unlinked child role check as the signed-in account', () => {
    service.options(17, 'CHILD', false).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/role-eligibility/options?age=17&currentRole=CHILD&linked=false`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer parent-token');
    expect(request.request.headers.get('X-Skip-Profile-Selector')).toBe('true');
    expect(request.request.params.has('forUserId')).toBeFalse();
    request.flush({ age: 17, currentRole: 'CHILD', linked: false, ageLocked: false, ageSwitchConfirmationRequired: false, options: [] });
  });
});
