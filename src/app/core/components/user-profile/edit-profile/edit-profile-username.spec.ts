import { FormControl, FormGroup } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { EditProfileComponent } from './edit-profile.component';

describe('Edit profile one-time username change', () => {
  let component: EditProfileComponent;
  let toast: jasmine.Spy;

  beforeEach(() => {
    component = Object.create(EditProfileComponent.prototype) as EditProfileComponent;
    component.profileForm = new FormGroup({
      dob: new FormControl(null),
      phone: new FormControl(null),
      email: new FormControl('child@example.com')
    }) as any;
    component.selectedCountry = { code: '+91' } as any;
    component.avatarSuggestions = [];
    component.usernameStatusLoading = false;
    component.usernameStatusUnavailable = false;
    component.usernameChangeLocked = false;
    toast = jasmine.createSpy('triggerToasrt');
    (component as any).coreService = { triggerToasrt: toast };
  });

  it('locks the field when the profile API says usernameChanged', () => {
    (component as any).prefillFormFromUserData({ username: 'child9090', usernameChanged: true, name: 'Child' });

    expect(component.usernameChangeLocked).toBeTrue();
    expect(component.displayUsername).toBe('child9090');
  });

  it('does not submit another username after the one allowed change', () => {
    component.username = 'child9090';
    component.fullName = 'Child';
    (component as any).storeInitialValues();
    component.username = 'anothername';
    component.usernameChangeLocked = true;

    component.saveProfile();

    expect(component.username).toBe('child9090');
    expect(toast).toHaveBeenCalledWith(component.usernameLockedMessage);
  });

  it('sends a legacy profile identity edit as username rather than avatarName', () => {
    component.username = null;
    component.avatarName = 'oldavatar';
    component.fullName = 'Child';
    (component as any).storeInitialValues();
    component.username = 'newname';

    const payload = (component as any).buildChangedPayload();

    expect(payload.username).toBe('newname');
  });

  it('applies the new length rule only when editing the username', () => {
    const validate = (component as any).validateAvatarUsername.bind(component);
    validate('ab');
    expect(component.avatarNameError).toBe('Username must be at least 3 characters.');
    validate('abc');
    expect(component.showAvatarNameError).toBeFalse();
    validate('abcdefghij');
    expect(component.showAvatarNameError).toBeFalse();
    validate('abcdefghijk');
    expect(component.avatarNameError).toBe('Username cannot exceed 10 characters.');

    component.username = 'legacyusername';
    component.fullName = 'Child';
    (component as any).storeInitialValues();
    (component as any).avatarInput$ = { next: jasmine.createSpy('next') };
    component.onUsernameChange('legacyusername');
    expect(component.displayUsername).toBe('legacyusername');
    expect(component.showAvatarNameError).toBeFalse();
  });

  it('checks availability before allowing a changed username', fakeAsync(() => {
    component.username = 'oldname';
    component.fullName = 'Child';
    (component as any).storeInitialValues();
    (component as any).avatarInput$ = { next: jasmine.createSpy('next') };
    const checkUsernameExists = jasmine.createSpy('checkUsernameExists').and.returnValue(of(false));
    (component as any).coreAuthService = { checkUsernameExists };

    component.onUsernameChange('newname');
    expect(component.usernameAvailability).toBe('idle');
    tick(450);
    expect(checkUsernameExists).toHaveBeenCalledOnceWith('newname');
    expect(component.usernameAvailability).toBe('available');
    expect(component.showAvatarNameError).toBeFalse();
  }));

  it('rejects a taken username without consuming the one allowed change', fakeAsync(() => {
    component.username = 'oldname';
    component.fullName = 'Child';
    (component as any).storeInitialValues();
    (component as any).avatarInput$ = { next: jasmine.createSpy('next') };
    (component as any).coreAuthService = { checkUsernameExists: () => of(true) };

    component.onUsernameChange('takenname');
    tick(450);
    expect(component.usernameAvailability).toBe('taken');
    expect(component.usernameChangeLocked).toBeFalse();
    expect(component.isFormInvalid).toBeTrue();
  }));
});
