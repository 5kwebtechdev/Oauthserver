import { FamilyActionsService } from './family-actions.service';
import { REGISTRATION_ONBOARDING_STATE_KEY } from './onboarding-state.service';

describe('Shared My Family actions', () => {
  let service: FamilyActionsService;
  let router: jasmine.SpyObj<any>;
  let auth: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<any>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    auth = jasmine.createSpyObj('AuthService', ['getUserData', 'beginManagedChildParentSession']);
    toast = jasmine.createSpyObj('CustomToastService', ['error', 'success']);
    service = new FamilyActionsService(router, auth, toast, { is: () => false } as any);
  });

  afterEach(() => {
    for (const key of ['managed_child_signup', 'managed_child_family_code', 'signup_role', 'familyCode']) {
      sessionStorage.removeItem(key);
    }
  });

  it('routes to My Family when the family code is unavailable', () => {
    service.openAddChild('');
    expect(router.navigate).toHaveBeenCalledWith(['/authed/family-connection']);
    expect(auth.beginManagedChildParentSession).not.toHaveBeenCalled();
  });

  it('starts the existing managed-child signup flow using the dynamic code', () => {
    auth.beginManagedChildParentSession.and.returnValue(true);
    localStorage.setItem(REGISTRATION_ONBOARDING_STATE_KEY, '{"onboardingStep":2}');
    service.openAddChild('FAMILY123');
    expect(sessionStorage.getItem('managed_child_signup')).toBe('true');
    expect(sessionStorage.getItem('managed_child_family_code')).toBe('FAMILY123');
    expect(localStorage.getItem(REGISTRATION_ONBOARDING_STATE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/signup'], {
      queryParams: { step: 0.1, role: 'child', managedChild: true }
    });
  });

  it('does not enter signup when the parent session cannot be retained', () => {
    auth.beginManagedChildParentSession.and.returnValue(false);
    service.openAddChild('FAMILY123');
    expect(toast.error).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

