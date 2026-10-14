import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { StreaksService } from './streaks.service';
import { environment } from 'src/environments/environment';

describe('StreaksService leaderboard cohort', () => {
    let service: StreaksService;
    let http: HttpTestingController;
    let auth: jasmine.SpyObj<AuthService>;

    beforeEach(() => {
        auth = jasmine.createSpyObj<AuthService>('AuthService', ['getUserData', 'getCurrentUserAge']);
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [{ provide: AuthService, useValue: auth }]
        });
        service = TestBed.inject(StreaksService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('lets the backend derive the age band from DOB', () => {
        auth.getUserData.and.returnValue({ dateOfBirth: '2006-10-12', age: 19 });
        service.getLeaderboard(0, 1).subscribe();
        const request = http.expectOne(`${environment.apiUrl}/auth/leaderboard/streaks?page=0&size=1`);
        expect(request.request.params.has('age')).toBeFalse();
        expect(auth.getCurrentUserAge).not.toHaveBeenCalled();
        request.flush({});
    });

    it('sends a stored age only when the account has no DOB', () => {
        auth.getUserData.and.returnValue({ age: 20 });
        auth.getCurrentUserAge.and.returnValue(20);
        service.getLeaderboard().subscribe();
        const request = http.expectOne(req => req.url === `${environment.apiUrl}/auth/leaderboard/streaks`);
        expect(request.request.params.get('age')).toBe('20');
        request.flush({});
    });

    it('omits age when the account has neither DOB nor an age fallback', () => {
        auth.getUserData.and.returnValue({});
        auth.getCurrentUserAge.and.returnValue(null);
        service.getLeaderboard().subscribe();
        const request = http.expectOne(req => req.url === `${environment.apiUrl}/auth/leaderboard/streaks`);
        expect(request.request.params.has('age')).toBeFalse();
        request.flush({});
    });
});
