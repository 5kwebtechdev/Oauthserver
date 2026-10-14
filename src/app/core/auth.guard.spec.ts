import { TestBed } from '@angular/core/testing';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  }

  it('allows navigation when logged in', () => {
    const authServiceStub = { isLoggedIn: () => true, login: jasmine.createSpy('login') };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authServiceStub }] });

    expect(runGuard()).toBeTrue();
    expect(authServiceStub.login).not.toHaveBeenCalled();
  });

  it('redirects to login and blocks navigation when not logged in', () => {
    const authServiceStub = { isLoggedIn: () => false, login: jasmine.createSpy('login') };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authServiceStub }] });

    expect(runGuard()).toBeFalse();
    expect(authServiceStub.login).toHaveBeenCalledTimes(1);
  });
});
