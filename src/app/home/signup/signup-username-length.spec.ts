import { FormControl } from '@angular/forms';
import { SignupComponent } from './signup.component';

describe('signup and social setup username length', () => {
  it('validates the username control used by both signup flows', () => {
    const validator = (SignupComponent.prototype as any).usernameRulesValidator();
    const control = new FormControl('ab', validator);
    expect(control.hasError('usernameMinLength')).toBeTrue();
    control.setValue('abc');
    expect(control.valid).toBeTrue();
    control.setValue('abcdefghij');
    expect(control.valid).toBeTrue();
    control.setValue('abcdefghijk');
    expect(control.hasError('usernameMaxLength')).toBeTrue();
  });
});
