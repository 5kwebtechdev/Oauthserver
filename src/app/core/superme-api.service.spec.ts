import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from './app-config';
import { SupermeApiService } from './superme-api.service';

/**
 * Pins the wire contract: these are the exact five calls the real SuperMeApp frontend makes, so a
 * replica built against this server has to produce the same URLs, methods and bodies. A change here
 * means a client written against the real API would break.
 */
describe('SupermeApiService', () => {
  let service: SupermeApiService;
  let httpMock: HttpTestingController;
  const base = `${APP_CONFIG.authIssuer}/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupermeApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupermeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the OTP request to /v1/api/auth/send-otp', () => {
    service.sendOtp('tempchecky12@yopmail.com').subscribe();

    const req = httpMock.expectOne(`${base}/api/auth/send-otp`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'tempchecky12@yopmail.com' });
    req.flush({ success: true, message: 'OTP sent successfully' });
  });

  it('verifies the OTP against /v1/api/auth/verify-otp', () => {
    service.verifyOtp('tempchecky12@yopmail.com', '1234').subscribe();

    const req = httpMock.expectOne(`${base}/api/auth/verify-otp`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'tempchecky12@yopmail.com', otp: '1234' });
    req.flush({ success: true, message: 'OTP verified successfully', nextStep: 4 });
  });

  it('checks availability with the identifier as a query parameter', () => {
    service.checkAlreadyRegistered('adasdqwc').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/auth/check/alreadyRegistered` && r.params.get('identifier') === 'adasdqwc'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ identifier: 'adasdqwc', message: 'User not found!', status: false });
  });

  it('posts the registration body SuperMeBE expects, including a +country-code phone', () => {
    service
      .register({
        name: 'tempwew',
        username: 'adasdqwc',
        gender: 'male',
        relationship: 'SELF',
        password: 'password@123',
        avatarImageName: '18-plus-male-5.webp',
        referralCode: null,
        unlockPotential: false,
        email: 'tempchecky12@yopmail.com',
        phone: '+918078567854',
        dateOfBirth: '1996-10-06',
      })
      .subscribe();

    const req = httpMock.expectOne(`${base}/auth/register`);
    expect(req.request.method).toBe('POST');
    // The "+91..." form their own frontend sends - the server must not apply the dead @Pattern
    // that would reject it (ARCHITECTURE.md section 20).
    expect(req.request.body.phone).toBe('+918078567854');
    expect(req.request.body.dateOfBirth).toBe('1996-10-06');
    expect(req.request.body.relationship).toBe('SELF');
    req.flush({ id: 1008, name: 'tempwew' }, { status: 201, statusText: 'Created' });
  });

  it('logs in by email, and by phone, against /v1/auth/login', () => {
    service.login({ email: 'tempchecky12@yopmail.com' }, 'password@123').subscribe();
    const byEmail = httpMock.expectOne(`${base}/auth/login`);
    expect(byEmail.request.body).toEqual({
      email: 'tempchecky12@yopmail.com',
      password: 'password@123',
    });
    byEmail.flush({ token: 'jwt', user: {} });

    service.login({ phone: '+918078567854' }, 'password@123').subscribe();
    const byPhone = httpMock.expectOne(`${base}/auth/login`);
    expect(byPhone.request.body).toEqual({ phone: '+918078567854', password: 'password@123' });
    byPhone.flush({ token: 'jwt', user: {} });
  });
});
