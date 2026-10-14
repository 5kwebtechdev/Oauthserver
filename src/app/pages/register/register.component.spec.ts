import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '../../core/app-config';
import { RegisterComponent } from './register.component';

/**
 * Drives the page through the whole flow and asserts it makes the same five calls, in the same
 * order, that the real SuperMeApp frontend makes - this is the "does the frontend actually call
 * them" check, not just "does the service wrap them".
 */
describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let httpMock: HttpTestingController;
  const base = `${APP_CONFIG.authIssuer}/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('walks send-otp -> verify-otp -> register -> login, advancing a step each time', () => {
    component.email = 'tempchecky12@yopmail.com';

    // 1. send-otp
    component.sendOtp();
    httpMock.expectOne(`${base}/api/auth/send-otp`).flush({
      success: true,
      message: 'OTP sent successfully',
    });
    expect(component.step).toBe('otp');

    // 2. verify-otp
    component.otp = '1234';
    component.verifyOtp();
    httpMock.expectOne(`${base}/api/auth/verify-otp`).flush({
      success: true,
      message: 'OTP verified successfully',
      nextStep: 4,
    });
    expect(component.step).toBe('details');

    // 3. register, then 4. login - the page chains straight into signing in, as theirs does
    component.name = 'tempwew';
    component.username = 'adasdqwc';
    component.password = 'password@123';
    component.phone = '+918078567854';
    component.gender = 'male';
    component.dateOfBirth = '1996-10-06';
    component.relationship = 'SELF';
    component.avatarImageName = '18-plus-male-5.webp';
    component.register();

    const registerReq = httpMock.expectOne(`${base}/auth/register`);
    expect(registerReq.request.body.name).toBe('tempwew');
    expect(registerReq.request.body.phone).toBe('+918078567854');
    expect(registerReq.request.body.unlockPotential).toBe(false);
    // Blank optional fields go as null, not "" - theirs treats null as absent.
    expect(registerReq.request.body.petName).toBeNull();
    expect(registerReq.request.body.referralCode).toBeNull();
    registerReq.flush(
      { id: 1008, name: 'tempwew', avatarName: 'temp51216895', coins: 10, onboardingStep: 5 },
      { status: 201, statusText: 'Created' }
    );

    const loginReq = httpMock.expectOne(`${base}/auth/login`);
    expect(loginReq.request.body).toEqual({
      email: 'tempchecky12@yopmail.com',
      password: 'password@123',
    });
    loginReq.flush({ token: 'header.payload.signature', user: { id: 1008 } });

    expect(component.step).toBe('done');
    expect(component.registered?.id).toBe(1008);
    expect(component.loggedIn?.token).toBe('header.payload.signature');
  });

  it('checks username availability against check/alreadyRegistered', () => {
    component.username = 'adasdqwc';
    component.checkUsername();

    httpMock
      .expectOne((r) => r.url === `${base}/auth/check/alreadyRegistered`)
      .flush({ identifier: 'adasdqwc', message: 'User already registered!', status: true });

    expect(component.usernameState).toBe('taken');
  });

  it('surfaces the server message when an address already has an account', () => {
    component.email = 'taken@yopmail.com';
    component.sendOtp();

    httpMock.expectOne(`${base}/api/auth/send-otp`).flush(
      { success: false, message: 'Account already exists with this email.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.step).toBe('email');
    expect(component.error).toBe('Account already exists with this email.');
  });

  it('still reports the account as created when the follow-up login fails', () => {
    component.step = 'details';
    component.email = 'tempchecky12@yopmail.com';
    component.name = 'tempwew';
    component.password = 'password@123';
    component.dateOfBirth = '1996-10-06';
    component.register();

    httpMock.expectOne(`${base}/auth/register`).flush({ id: 1009, name: 'tempwew' },
      { status: 201, statusText: 'Created' });
    httpMock.expectOne(`${base}/auth/login`).flush(
      { message: 'Incorrect password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.step).toBe('done');
    expect(component.registered?.id).toBe(1009);
    expect(component.error).toContain('Incorrect password.');
  });
});
