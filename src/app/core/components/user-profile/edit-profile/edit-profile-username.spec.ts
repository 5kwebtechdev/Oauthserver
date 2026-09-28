import { FormControl, FormGroup } from '@angular/forms';
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
});
