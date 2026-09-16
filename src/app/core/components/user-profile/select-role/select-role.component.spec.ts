import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { RoleSelectComponent } from './select-role.component';

describe('RoleSelectComponent', () => {
  let component: RoleSelectComponent;
  let router: jasmine.SpyObj<any>;
  let familyService: jasmine.SpyObj<any>;
  let authService: jasmine.SpyObj<any>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('user_data');

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    familyService = jasmine.createSpyObj('FamilyService', ['joinFamilyWithCode']);
    authService = jasmine.createSpyObj('AuthService', ['getUserData', 'setUserData', 'replaceAuthToken']);
    authService.getUserData.and.returnValue({ relationship: 'SELF' });

    const toastController = jasmine.createSpyObj('ToastController', ['create']);
    toastController.create.and.resolveTo({ present: () => Promise.resolve() });

    component = new RoleSelectComponent(
      router,
      {} as any,
      familyService,
      toastController,
      authService
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

    expect(sessionStorage.getItem('family_connected_ack')).toBe('Child');
    expect(router.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
  }));

  it('queues the Parent acknowledgment before opening Parent Home', async () => {
    await component.beginParentAccount();

    expect(sessionStorage.getItem('family_connected_ack')).toBe('Parent');
    expect(router.navigate).toHaveBeenCalledWith(['/authed/parent-account'], { replaceUrl: true });
  });

  it('does not offer Parent when the authenticated user is already a Parent', () => {
    authService.getUserData.and.returnValue({
      relationship: 'PARENT',
      family: { familyCode: 'FAMILY01', familyName: 'My Family' }
    });

    component.ionViewWillEnter();

    expect(component.shouldShowParentRole()).toBeFalse();
    expect(component.shouldShowChildRole()).toBeTrue();
  });

  it('does not offer Child when the authenticated user is already a Child', () => {
    authService.getUserData.and.returnValue({ relationship: 'CHILD' });

    component.ionViewWillEnter();

    expect(component.shouldShowChildRole()).toBeFalse();
    expect(component.shouldShowParentRole()).toBeTrue();
  });

  it('refreshes a cached page and clears a role that is no longer available', () => {
    component.selectedRole = 'parent';
    authService.getUserData.and.returnValue({ relationship: 'CO_PARENT' });

    component.ionViewWillEnter();

    expect(component.userAccountType).toBe('parent');
    expect(component.selectedRole).toBeNull();
    expect(component.shouldShowParentRole()).toBeFalse();
  });
});
