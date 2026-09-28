import { FormControl, FormGroup } from '@angular/forms';
import { SignupComponent } from './signup.component';

describe('Signup DOB restriction', () => {
  let component: SignupComponent;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 28, 12));
    component = Object.create(SignupComponent.prototype) as SignupComponent;
    component.profileForm = new FormGroup({ dob: new FormControl('') }) as any;
    component.showAccessRestrictedModal = false;
    component.openBirthdayPicker = true;
  });

  afterEach(() => jasmine.clock().uninstall());

  it('shows the existing restriction popup immediately for an under-8 birthday', () => {
    component.birthdayChanged('2019-09-28T12:00:00.000Z');

    expect(component.showAccessRestrictedModal).toBeTrue();
    expect(component.openBirthdayPicker).toBeFalse();
    expect(component.profileForm.get('dob')?.value).toBe('2019-09-28');
  });

  it('does not restrict an eligible birthday and clears a previous restriction', () => {
    component.showAccessRestrictedModal = true;
    component.birthdayChanged('2018-09-28T12:00:00.000Z');

    expect(component.showAccessRestrictedModal).toBeFalse();
  });
});
