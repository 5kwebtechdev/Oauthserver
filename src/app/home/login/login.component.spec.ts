import { ElementRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NEVER, throwError } from 'rxjs';
import { LoginComponent } from './login.component';

describe('LoginComponent password handling', () => {
  let component: LoginComponent;
  let credentialSaver: jasmine.SpyObj<any>;
  let authService: jasmine.SpyObj<any>;

  beforeEach(() => {
    credentialSaver = jasmine.createSpyObj('CredentialSaverService', ['suggest', 'save']);
    credentialSaver.suggest.and.resolveTo(null);
    authService = jasmine.createSpyObj('AuthService', ['login']);

    component = new LoginComponent(
      new FormBuilder(),
      authService,
      {} as any,
      {} as any,
      { snapshot: { queryParams: {} } } as any,
      credentialSaver,
      {} as any,
      {} as any
    );
    component.passwordInputRef = new ElementRef(document.createElement('input'));
  });

  afterEach(() => component.ngOnDestroy());

  it('starts blank and clears restored values on revisit and page restore while retaining email', () => {
    component.signInForm.patchValue({ email: 'user@example.com', password: 'old-password' });
    component.passwordInputRef.nativeElement.value = 'old-password';
    component.hidePassword = false;
    component.ngOnInit();

    expect(component.email?.value).toBe('user@example.com');
    expect(component.password?.value).toBe('');
    expect(component.passwordInputRef.nativeElement.value).toBe('');
    expect(component.hidePassword).toBeTrue();

    component.password?.setValue('old-password');
    component.ionViewWillEnter();
    expect(component.password?.value).toBe('');

    component.password?.setValue('old-password');
    component.onPageShow({ persisted: true } as PageTransitionEvent);
    expect(component.password?.value).toBe('');
  });

  it('accepts a valid password and keeps it while typing or after the password picker returns', () => {
    component.signInForm.patchValue({ email: 'user@example.com', password: 'first' });
    component.password?.setValue('valid-password');
    component.onPageShow({ persisted: false } as PageTransitionEvent);

    expect(component.password?.value).toBe('valid-password');
    expect(component.isLoginFormValid()).toBeTrue();
  });

  it('rejects an empty password without changing the login password rules', () => {
    component.signInForm.patchValue({ email: 'user@example.com', password: '' });
    expect(component.password?.hasError('required')).toBeTrue();
    expect(component.isLoginFormValid()).toBeFalse();
  });

  it('toggles visibility without clearing or changing the password', () => {
    component.password?.setValue('valid-password');
    component.togglePasswordVisibility();
    expect(component.hidePassword).toBeFalse();
    expect(component.password?.value).toBe('valid-password');
    component.togglePasswordVisibility();
    expect(component.hidePassword).toBeTrue();
    expect(component.password?.value).toBe('valid-password');
  });

  it('accepts a pasted password and submits the exact value', () => {
    authService.login.and.returnValue(NEVER);
    component.signInForm.patchValue({ email: 'user@example.com', password: 'pasted password' });
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledOnceWith({
      email: 'user@example.com', password: 'pasted password'
    });
    expect(component.password?.value).toBe('pasted password');
    expect(component.loading).toBeTrue();
  });

  it('uses a saved identifier without restoring its password', async () => {
    credentialSaver.suggest.and.resolveTo({
      identifier: 'saved@example.com', password: 'old-password', mode: 'email'
    });
    component.ngOnInit();
    await Promise.resolve();

    expect(component.email?.value).toBe('saved@example.com');
    expect(component.password?.value).toBe('');
  });

  it('does not replace the email selected by the system password manager with a stale saved identifier', async () => {
    credentialSaver.suggest.and.resolveTo({
      identifier: 'old@example.com', password: 'old-password', mode: 'email'
    });
    component.ngOnInit();
    component.signInForm.patchValue({ email: 'chosen@example.com', password: 'chosen-password' });
    await Promise.resolve();

    expect(component.email?.value).toBe('chosen@example.com');
    expect(component.password?.value).toBe('chosen-password');
  });

  it('clears the password after a failed login but keeps the email and error', () => {
    authService.login.and.returnValue(throwError(() => ({
      status: 401, error: { message: 'Incorrect password.' }
    })));
    component.signInForm.patchValue({ email: 'user@example.com', password: 'wrong-password' });
    component.onSubmit();

    expect(component.email?.value).toBe('user@example.com');
    expect(component.password?.value).toBe('');
    expect(component.loginError).toBe('Incorrect password.');
    expect(component.loading).toBeFalse();
  });
});
