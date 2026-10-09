import { ElementRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { throwError } from 'rxjs';
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
    component.onPageShow();
    expect(component.password?.value).toBe('');
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
