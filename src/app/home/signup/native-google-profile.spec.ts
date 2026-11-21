import { FormControl, Validators } from '@angular/forms';
import { SignupComponent } from './signup.component';
describe('Native Google onboarding required fields', () => {
  it('requires identity fields for the DEV native Google registration contract', () => {
    const validator = (SignupComponent.prototype as any).profileIdentityValidator.call({ isOAuthSignup: true, currentRole: 'self', pkceAuth: { nativeDev: true }, onboardingState: { getRegistrationState: () => ({ savedData: { nativeGoogleRegistration: true } }) } }, [Validators.required]);
    expect(validator(new FormControl(''))).toEqual({ required: true });
  });
  it('preserves the existing website social registration validation', () => {
    const validator = (SignupComponent.prototype as any).profileIdentityValidator.call({ isOAuthSignup: true, currentRole: 'self', pkceAuth: { nativeDev: false } }, [Validators.required]);
    expect(validator(new FormControl(''))).toBeNull();
  });
});
