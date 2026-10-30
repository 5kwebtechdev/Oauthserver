import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { RoleSelectComponent } from './select-role.component';

describe('RoleSelectComponent', () => {
  let component: RoleSelectComponent;
  let router: jasmine.SpyObj<any>;
  let familyService: jasmine.SpyObj<any>;
  let authService: jasmine.SpyObj<any>;
  let roleEligibilityService: jasmine.SpyObj<any>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('user_data');

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    familyService = jasmine.createSpyObj('FamilyService', ['joinFamilyWithCode']);
    authService = jasmine.createSpyObj('AuthService', ['getUserData', 'setUserData', 'replaceAuthToken', 'refreshUserData']);
    authService.getUserData.and.returnValue({ relationship: 'SELF' });
    roleEligibilityService = jasmine.createSpyObj('RoleEligibilityService', ['options', 'confirmAgeSwitch']);
    roleEligibilityService.options.and.returnValue(of({
      age: 30, currentRole: 'SELF', linked: null, ageLocked: false,
      ageSwitchConfirmationRequired: false,
      options: [
        { role: 'SELF', eligible: false, current: true, reason: 'This is already the current role.', action: null },
        { role: 'CHILD', eligible: false, current: false, reason: 'The Child role is for ages 8 to 17.', action: null },
        { role: 'PARENT', eligible: true, current: false, reason: null, action: 'POST /family/convert-to-parent' },
      ]
    }));

    const toastController = jasmine.createSpyObj('ToastController', ['create']);
    toastController.create.and.resolveTo({ present: () => Promise.resolve() });

    component = new RoleSelectComponent(
      router,
      {} as any,
      familyService,
      toastController,
      authService,
      roleEligibilityService
    );
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('queues the Child acknowledgment after joining a family', fakeAsync(() => {
    familyService.joinFamilyWithCode.and.returnValue(of({ familyCode: 'FAMILY01' }));
    component.selectedRole = 'child';
    component.selectedFamilyAction = 'join';
    component.familyInput = 'FAMILY01';

    component.finish();
    tick();

    expect(JSON.parse(sessionStorage.getItem('family_connected_ack') || '{}').role).toBe('Child');
    expect(router.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
  }));

  it('queues the Parent acknowledgment before opening Parent Home', async () => {
    await component.beginParentAccount();

    expect(JSON.parse(sessionStorage.getItem('family_connected_ack') || '{}').role).toBe('Parent');
    expect(router.navigate).toHaveBeenCalledWith(['/authed/parent-account'], { replaceUrl: true });
  });

  it('does not offer Parent when the authenticated user is already a Parent', () => {
    authService.getUserData.and.returnValue({
      relationship: 'PARENT',
      family: { familyCode: 'FAMILY01', familyName: 'My Family' }
    });

    component.ionViewWillEnter();

    expect(component.shouldShowParentRole()).toBeFalse();
    expect(component.shouldShowChildRole()).toBeFalse();
  });

  it('does not offer Child when the authenticated user is already a Child', () => {
    authService.getUserData.and.returnValue({ relationship: 'CHILD' });

    component.ionViewWillEnter();

    expect(component.shouldShowChildRole()).toBeFalse();
    expect(component.shouldShowParentRole()).toBeFalse();
  });

  it('refreshes a cached page and clears a role that is no longer available', () => {
    component.selectedRole = 'parent';
    authService.getUserData.and.returnValue({ relationship: 'CO_PARENT' });

    component.ionViewWillEnter();

    expect(component.userAccountType).toBe('parent');
    expect(component.selectedRole).toBeNull();
    expect(component.shouldShowParentRole()).toBeFalse();
  });

  it('sends an unlinked child check with linked=false and offers age confirmation', fakeAsync(() => {
    authService.getUserData.and.returnValue({ relationship: 'SELF', asChild: true, age: 18 });
    roleEligibilityService.options.and.returnValue(of({
      age: 18, currentRole: 'CHILD', linked: false, ageLocked: true,
      ageSwitchConfirmationRequired: true,
      options: [
        { role: 'SELF', eligible: true, current: false, reason: null, action: 'POST /family/confirm-age-switch' },
        { role: 'CHILD', eligible: false, current: true, reason: 'Confirm the switch first.', action: null },
        { role: 'PARENT', eligible: false, current: false, reason: "A child can't become a parent.", action: null },
      ]
    }));
    roleEligibilityService.confirmAgeSwitch.and.returnValue(of({}));
    authService.refreshUserData.and.returnValue(of(true));

    component.ionViewWillEnter();
    expect(roleEligibilityService.options).toHaveBeenCalledWith(18, 'CHILD', false);
    component.selectRole('self');
    component.save();
    tick();

    expect(roleEligibilityService.confirmAgeSwitch).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
  }));
});
